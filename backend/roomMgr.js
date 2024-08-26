/*  */
var cors = require("cors");
var express = require("express");
var app = express();

var port = 42925;

global.room = null;

const room = require("./routes/room");
const game = require("./routes/game");
const players = require("./routes/players");

app.use(express.json());
app.use(cors());
app.use(express.static("views/dist"));

app.use("/room", room);
app.use("/game", game);
app.use("/players", players);

app.get("/app", (req, res) => {
    res.sendFile(__dirname + "/views/dist/index.html");
});

function start(ttl = 10) {
    app.listen(port)
        .once("listening", () => {
            console.log(`Servidor web corriendo en http://localhost:${port}/`);
        })
        .once("error", (err) => {
            if (err.code === "EADDRINUSE") {
                if (ttl > 0) {
                    port++;
                    start(ttl - 1);
                    console.log(
                        `El puerto ${port} está en uso, utilizando el siguiente`
                    );
                } else {
                    console.error("Máximo de intentos alcanzados.");
                    process.exit(1);
                }
            }
        });
}

start();
