const express = require("express");
const fs = require("fs");
const room = express.Router();

var roomCreator = require("../room/mainw");
// var discordBot = require("../discord/main");

var stadiumsPath = "./room/stadiums/";

const DEBUG = true;

room.post("/start", function (req, res) {
    if (!global.room) {
        var config = req.body;
        config.db = "../../room/plugins/res/commands.db";

        roomCreator
            .run(config, DEBUG)
            .then((r) => {
                if (r) {
                    global.room = r;
                    res.send("Host open");

                    if (!DEBUG) {
                        if (discordBot) {
                            setTimeout(() => {
                                if (global.room.link.startsWith("https://")) {
                                    discordBot.chat(
                                        "Host abierto: " + global.room.link
                                    );
                                }
                            }, 6000);
                        }
                    }

                    // se guarda la configuracion
                    setTimeout(() => {
                        fs.writeFileSync(
                            "./config.json",
                            JSON.stringify(config),
                            function (err) {
                                if (err) {
                                    console.log(err);
                                    return;
                                }
                            }
                        );
                    }, 500);
                }
            })
            .catch((err) => {
                res.status(500).send(err.msg);
            });

        DEBUGROOM = global.room;
    } else {
        res.send("Host already open");
    }
});

room.post("/stop", function (req, res) {
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

room.get("/", function (req, res) {
    if (global.room) {
        let roomData = {
            name: global.room.name,
            link: global.room.link,
            stadiumName: global.room.stadium.name,
            plugins: [],
            stadiums: [],
            bannedPlayers: global.room.banList,
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
            roomData.stadiums = fs
                .readdirSync(stadiumsPath)
                .filter((s) => s.toUpperCase().endsWith(".HBS"));
        } catch (e) {
            console.log(e);
        }

        res.send(JSON.stringify(roomData));
    } else {
        res.status(400).send("No room open");
    }
});

room.get("/status", function (req, res) {
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

room.get("/config", function (req, res) {
    var config = "";

    try {
        config = JSON.parse(fs.readFileSync("./config.json"));
    } catch (e) {
        console.log(e);
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(config));
});

room.post("/setting", function (req, res) {
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
                let setting = plugin.settings.find(
                    (s) => s.name === settingName
                );
                if (setting) {
                    setting.exec(value);
                }
            }
        }
    } else {
        res.status(400).send("No room open");
    }
});

room.get("/chat", function (req, res) {
    if (global.room) {
        let commands = global.room.plugins.find(
            (p) => p.name === "lmbCommands"
        );
        if (commands) {
            // let chat = commands.chatLog.join("\n");
            res.send(JSON.stringify({ chat: commands.chatLog }));
        }
    } else {
        res.status(400).send("No room open");
    }
});

room.post("/chat", function (req, res) {
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

room.post("/kick", function (req, res) {
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

room.post("/kick/permaban", function (req, res) {
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

            let commands = global.room.plugins.find(
                (p) => p.name === "lmbCommands"
            );
            if (commands) {
                commands.permaBan(name, ip, auth);
                res.send("Plaker banned permanently");
                return;
            }

            res.send("Unable to find commands plugin");
        } catch (e) {
            console.log(e);
        }
    }
});

room.post("/kick/unban", function (req, res) {
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
