const express = require("express");
const router = express.Router();

function runServer() {
    console.log("server running");
}

router.get("/", function (req, res) {
    res.render("index", {
        runServer: "runServer();",
    });
});

router.get("/start", function (req, res) {
    room.run();
});

module.exports = router;
