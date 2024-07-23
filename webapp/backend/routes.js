const express = require("express");
const router = express.Router();

var roomCreator = require("../../room/mainw");
var room;

var stadiumsPath = "../../room/stadiums/";

//
// ENDPOINTS
//
router.get("/status", function (req, res) {
    let data = {
        status: "closed",
    };

    if (room) {
        if (room.link.startsWith("https://www.haxball.com/")) {
            data.status = "open";
        } else if (room.link.startsWith("Waiting")) {
            data.status = "token";
        }
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
});

router.get("/room", function (req, res) {
    if (room) {
        let roomData = {
            name: room.name,
            link: room.link,
            stadiumName: room.stadium.name,
            plugins: [],
            stadiums: [],
        };
        room.plugins.forEach((pl) => {
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
            roomData.stadiums = require("fs")
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

router.get("/room/config", function (req, res) {
    var config = JSON.parse(require("fs").readFileSync("./config.json"));

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(config));
});

router.post("/room/start", function (req, res) {
    if (!room) {
        var config = req.body;
        config.db = "../../room/plugins/res/commands.db";

        roomCreator.run(config, true).then((r) => {
            if (r) {
                room = r;
                res.send("Host open");
                // se guarda la configuracion
                require("fs").writeFile(
                    "./config.json",
                    JSON.stringify(config),
                    function (err) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                    }
                );
            }
        });
        DEBUGROOM = room;
    } else {
        res.send("Host already open");
    }
});

router.post("/room/stop", function (req, res) {
    if (room) {
        try {
            room.leave();
            room = null;
            console.log("Sala cerrada.");
            res.end("Sala cerrada.");
        } catch (e) {
            console.log(e);
        }
    }
});

router.post("/room/setting", function (req, res) {
    if (room) {
        let pluginName = req.body.pluginName;
        let settingName = req.body.settingName;
        let value = req.body.value;

        if (!pluginName || !settingName || !value) {
            res.status(400).send("Missing arguments");
            return;
        } else {
            let plugin = room.plugins.find((p) => p.name === pluginName);
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

// GAME FUNCTIONS
router.get("/game/start", function (req, res) {
    if (!room) {
        res.send("Host not open");
    } else {
        try {
            room.startGame();
            res.send("Game started");
        } catch (e) {
            console.log(e);
        }
    }
});

router.get("/game/stop", function (req, res) {
    if (!room) {
        res.send("Host not open");
    } else {
        try {
            room.stopGame();
            res.send("Game stopped");
        } catch (e) {
            console.log(e);
        }
    }
});

router.get("/game/kick", function (req, res) {
    if (!room) {
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

            room.kickPlayer(playerId, reason, ban, 0);
            res.send("Player kick request processed");
        } catch (e) {
            console.log(e);
        }
    }
});

router.post("/game/chat", function (req, res) {
    if (!room) {
        res.send("Host not open");
    } else {
        try {
            let msg = req.body.msg;
            room.sendChat(msg);
            res.send("Message sent");
        } catch (e) {
            console.log(e);
        }
    }
});

router.post("/game/stadium", function (req, res) {
    if (!room) {
        res.send("Host not open");
    } else {
        try {
            require("fs").readFile(
                stadiumsPath + req.body.stadium,
                "utf8",
                function (err, data) {
                    if (!err) {
                        let c = room.plugins.find(
                            (p) => p.name === "lmbCommands"
                        );
                        if (c) {
                            let err = null;
                            let stadium = c.utils.parseStadium(data, () => {
                                err = true;
                                res.status(400).send("Stadium parse error");
                            });
                            if (!err) {
                                room.stopGame();
                                room.setCurrentStadium(stadium);
                            }
                        }
                    }
                }
            );
            try {
                res.send("Stadium loaded");
            } catch (e) {
                res.status(400).send("Error :" + e);
            }
        } catch (e) {
            console.log(e);
        }
    }
});

router.post("/game/stadium/save", function (req, res) {
    if (!room) {
        res.send("Host not open");
    } else {
        try {
            let c = room.plugins.find((p) => p.name === "lmbCommands");
            if (c) {
                let stadiumData = c.utils.exportStadium(room.stadium);
                if (stadiumData) {
                    require("fs").writeFile(
                        stadiumsPath + req.body.stadiumName + ".hbs",
                        stadiumData,
                        (err) => {
                            if (err) {
                                res.status(400).send(
                                    "No se pudo guardar el estadio: " + err
                                );
                            } else {
                                res.send("Estadio guardado");
                            }
                        }
                    );
                    return;
                }
            }
        } catch (e) {
            console.log(e);
        }
    }
});

//

router.get("/players/all", function (req, res) {
    if (room) {
        let playersData = {
            players: [],
        };
        if (room.players) {
            room.players.forEach((p) => {
                playersData.players.push({
                    id: p.id,
                    name: p.name,
                    team: p.team.id,
                });
            });
        }

        res.send(JSON.stringify(playersData));
    } else {
        res.status(400).send("No room open");
    }
});

module.exports = router;
