const express = require("express");
const game = express.Router();

var stadiumsPath = "./room/stadiums/";

game.get("/start", function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            global.room.startGame();
            res.send("Game started");
        } catch (e) {
            console.log(e);
        }
    }
});

game.get("/stop", function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            global.room.stopGame();
            res.send("Game stopped");
        } catch (e) {
            console.log(e);
        }
    }
});

game.get("/kick", function (req, res) {
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

game.post("/stadium/load", function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            require("fs").readFile(
                stadiumsPath + req.body.stadium,
                "utf8",
                function (err, data) {
                    if (!err) {
                        let c = global.room.plugins.find(
                            (p) => p.name === "lmbCommands"
                        );
                        if (c) {
                            let err = null;
                            let stadium = c.utils.parseStadium(data, () => {
                                err = true;
                                res.status(400).send("Stadium parse error");
                            });
                            if (!err) {
                                global.room.stopGame();
                                global.room.setCurrentStadium(stadium);
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

game.post("/stadium/save", function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            let c = global.room.plugins.find((p) => p.name === "lmbCommands");
            if (c) {
                let stadiumData = c.utils.exportStadium(global.room.stadium);
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

module.exports = game;
