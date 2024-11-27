const express = require("express");
const game = express.Router();
const { Utils } = require("node-haxball")();

var stadiumsPath = "./room/stadiums/";

game.get("/start", global.verifyToken, function (req, res) {
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

game.get("/pause", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            global.room.pauseGame();
            res.send("Game paused");
        } catch (e) {
            console.log(e);
        }
    }
});

game.get("/stop", global.verifyToken, function (req, res) {
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

game.get("/data", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            let data = {
                redScore: global.room.redScore,
                blueScore: global.room.blueScore,
                state: global.room.isGamePaused() ? "paused" : global.room.gameState ? "playing" : "stopped",
            };
            res.send(JSON.stringify(data));
        } catch (e) {
            console.log(e);
        }
    }
});

game.post("/stadium/load", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            require("fs").readFile(stadiumsPath + req.body.stadium, "utf8", function (err, data) {
                if (!err) {
                    let c = global.room.plugins.find((p) => p.name === "lmbCommands");
                    if (c) {
                        let err = null;
                        let stadium = Utils.parseStadium(data, () => {
                            err = true;
                            res.status(400).send("Stadium parse error");
                        });
                        if (!err) {
                            global.room.stopGame();
                            global.room.setCurrentStadium(stadium);
                        }
                    }
                }
            });
            res.send("Stadium loaded");
        } catch (e) {
            console.log(e);
        }
    }
});

game.post("/stadium/save", global.verifyToken, function (req, res) {
    if (!global.room) {
        res.send("Host not open");
    } else {
        try {
            let c = global.room.plugins.find((p) => p.name === "lmbCommands");
            if (c) {
                let stadiumData = Utils.exportStadium(global.room.stadium);
                if (stadiumData) {
                    require("fs").writeFile(stadiumsPath + req.body.stadiumName + ".hbs", stadiumData, (err) => {
                        if (err) {
                            res.status(400).send("No se pudo guardar el estadio: " + err);
                        } else {
                            res.send("Estadio guardado");
                        }
                    });
                    return;
                }
            }
        } catch (e) {
            console.log(e);
        }
    }
});

module.exports = game;
