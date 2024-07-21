const express = require("express");
const router = express.Router();

var roomCreator = require("../../room/mainw");
var room;

//
// VIEWS
//
router.get("/", function (req, res) {
    res.render("index");
});

//
// ENDPOINTS
//
router.get("/status", function (req, res) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ open: room ? true : false }));
});

router.get("/defaultConfig", function (req, res) {
    var config = JSON.parse(require("fs").readFileSync("./config.json"));

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(config));
});

router.post("/start", function (req, res) {
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
        dr = room;
    } else {
        res.send("Host already open");
    }
});

router.post("/stop", function (req, res) {
    if (room) {
        try {
            room.leave();
            room = null;
            console.log("Sala cerrada.");
        } catch (e) {
            console.log(e);
        }
    }
});

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
