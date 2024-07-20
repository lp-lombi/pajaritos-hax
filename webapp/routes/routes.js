const express = require("express");
const router = express.Router();

var roomCreator = require("../../server/mainw");
var config = JSON.parse(require("fs").readFileSync("../server/config.json"));
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
router.get("/start", function (req, res) {
    roomCreator.run(config).then((r) => {
        if (r) {
            room = r;
            res.send("Host open");
        }
    });
});

module.exports = router;
