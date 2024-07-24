//
var cors = require("cors");
var express = require("express");
var app = express();

const port = 8000;

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

// app.get("/", function (req, res) {
//     res.sendFile(__dirname + "/views/home/index.html");
// });

app.listen(port);

console.log(`Servidor web corriendo en http://localhost:${port}/`);
