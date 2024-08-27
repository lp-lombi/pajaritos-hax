const express = require("express");
const players = express.Router();

players.get("/all", global.verifyToken, (req, res) => {
    if (global.room) {
        let playersData = {
            players: [],
        };
        if (global.room.players) {
            global.room.players.forEach((p) => {
                playersData.players.push({
                    id: p.id,
                    name: p.name,
                    team: p.team.id,
                    admin: p.isAdmin,
                });
            });
        }

        res.send(JSON.stringify(playersData));
    } else {
        res.status(400).send("No room open");
    }
});

players.get("/logged", global.verifyToken, (req, res) => {
    if (global.room) {
        let auth = global.room.plugins.find((p) => p.name === "lmbAuth");
        if (auth) {
            let players = auth.getLoggedPlayers();
            let playersData = players.map((p) => {
                return {
                    id: p.id,
                    name: p.name,
                    team: p.team.id,
                    admin: p.isAdmin,
                    isLoggedIn: p.isLoggedIn,
                };
            });

            res.send(JSON.stringify(playersData));
        } else {
            res.status(400).send("No auth plugin");
        }
    } else {
        res.status(400).send("No room open");
    }
});

module.exports = players;
