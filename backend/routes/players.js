const express = require("express");
const players = express.Router();

players.get("/all", function (req, res) {
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

module.exports = players;
