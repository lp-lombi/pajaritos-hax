const express = require("express");
const fs = require("fs");
const room = express.Router();

var roomCreator = require("../room/mainw");

var stadiumsPath = "./room/stadiums/";

const DEBUG = false;

var sendStatusInterval = setInterval(() => {
    if (global.room && global.room.players && global.room.password !== "") {
        fetch(`${global.webApi.url}/rooms/add`, {
            method: "POST",
            headers: {
                "x-api-key": global.webApi.key,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: global.room.name,
                link: global.room.link,
                players: global.room.players.length,
                maxPlayers: global.room.maxPlayerCount,
            }),
        }).catch((err) => {
            console.log(err);
        });
    }
}, 15000);

room.post("/start", global.verifyToken, function (req, res) {
    if (!global.room) {
        var config = req.body;
        config.webApi = global.webApi;

        roomCreator
            .run(config, DEBUG)
            .then((r) => {
                if (r) {
                    global.room = r;
                    res.send("Host open");

                    // se guarda la configuracion
                    setTimeout(() => {
                        fs.writeFileSync("./room/config.json", JSON.stringify(config), function (err) {
                            if (err) {
                                console.log(err);
                                return;
                            }
                        });
                    }, 500);
                }
            })
            .catch((err) => {
                res.status(500).send(err.msg);
                console.log(err);
            });

        DEBUGROOM = global.room;
    } else {
        res.send("Host already open");
    }
});

room.post("/stop", global.verifyToken, function (req, res) {
    if (global.room) {
        try {
            global.room.leave();
            global.room = null;
            console.log("Sala cerrada.");
            res.end("Sala cerrada.");
        } catch (e) {
            console.log(e);
        }
    }
});

room.get("/", global.verifyToken, function (req, res) {
    if (global.room) {
        let roomData = {
            name: global.room.name,
            link: global.room.link,
            stadiumName: global.room.stadium.name,
            plugins: [],
            stadiums: [],
            bannedPlayers: global.room.banList.map((b) => {
                let banData = {
                    id: b.id,
                    type: b.type,
                };
                if (b.type === 0) {
                    banData.value = {
                        pId: b.value.pId,
                        pName: b.value.pName,
                        auth: b.value.auth,
                        ips: b.value.ips,
                    };
                } else if (b.type === 1) {
                    banData.value = {
                        ip: b.value.ip,
                        mask: b.value.mask,
                    };
                } else if (b.type === 2) {
                    banData.value = banData.value;
                }
                return banData;
            }),
        };

        global.room.plugins.forEach((pl) => {
            let settings = pl.publicSettings ? pl.publicSettings : null;
            if (settings) {
                settings.forEach((s) => {
                    s["value"] = s.getValue();
                });
            }

            roomData.plugins.push({
                name: pl.name,
                settings: settings,
            });
        });

        try {
            roomData.stadiums = fs.readdirSync(stadiumsPath).filter((s) => s.toUpperCase().endsWith(".HBS"));
        } catch (e) {
            console.log(e);
        }

        res.send(JSON.stringify(roomData));
    } else {
        res.status(400).send("No room open");
    }
});

room.get("/status", global.verifyToken, function (req, res) {
    let data = {
        status: "closed",
    };

    if (global.room) {
        if (global.room.link.startsWith("https://www.haxball.com/")) {
            data.status = "open";
        } else if (global.room.link.startsWith("Waiting")) {
            data.status = "token";
        }
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
});

room.get("/config", global.verifyToken, function (req, res) {
    var config = "";

    try {
        config = JSON.parse(fs.readFileSync("./room/config.json"));
    } catch (e) {
        console.log(e);
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(config));
});

room.post("/setting", global.verifyToken, function (req, res) {
    if (global.room) {
        let pluginName = req.body.pluginName;
        let settingName = req.body.settingName;
        let value = req.body.value;

        if (!pluginName || !settingName || !value) {
            res.status(400).send("Missing arguments");
            return;
        } else {
            let plugin = global.room.plugins.find((p) => p.name === pluginName);
            if (plugin) {
                let setting = plugin.settings.find((s) => s.name === settingName);
                if (setting) {
                    setting.exec(value);
                }
            }
        }
    } else {
        res.status(400).send("No room open");
    }
});

room.get("/chat", global.verifyToken, function (req, res) {
    if (global.room) {
        let commands = global.room.plugins.find((p) => p.name === "lmbCommands");
        if (commands) {
            // let chat = commands.chatLog.join("\n");
            res.send(JSON.stringify({ chat: commands.chatLog }));
        }
    } else {
        res.status(400).send("No room open");
    }
});

room.post("/chat", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            let msg = req.body.msg;
            global.room.sendChat(msg);
            res.send("Message sent");
        } catch (e) {
            console.log(e);
        }
    }
});

room.post("/kick", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            let playerId = isNaN(req.query.id) ? null : parseInt(req.query.id);
            let reason = req.query.reason;
            let ban = req.query.ban === "true";

            if (!playerId) {
                res.send("Invalid player id");
                return;
            }

            global.room.kickPlayer(playerId, reason, ban, 0);
            res.send("Player kick request processed");
        } catch (e) {
            console.log(e);
        }
    }
});

room.post("/kick/permaban", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            let name = req.body.name;
            let ip = req.body.ip;
            let auth = req.body.auth;

            if (!name) {
                res.send("Name required");
                return;
            }

            let commands = global.room.plugins.find((p) => p.name === "lmbCommands");
            if (commands) {
                commands.permaBan(name, ip, auth);
                res.send("Player banned permanently");
                return;
            }

            res.send("Unable to find commands plugin");
        } catch (e) {
            console.log(e);
        }
    }
});

room.post("/kick/unban", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        let playerId = isNaN(req.query.id) ? null : parseInt(req.query.id);

        if (!playerId) {
            res.send("Invalid player id");
        } else {
            try {
                global.room.clearBan(playerId);
                res.send("Unbanned");
            } catch (e) {
                console.log(e);
            }
        }
    }
});

module.exports = room;
