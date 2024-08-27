/*  */
var cors = require("cors");
var fs = require("fs");
var express = require("express");
var app = express();
const jwt = require("jsonwebtoken");

var port = 42925;

global.room = null;
fs.readFile("config.json", (err, data) => {
    if (!err) {
        data = JSON.parse(data.toString());
        global.webApi = data.webApi;
        global.secretKey = data.secretKey;
    } else {
        if (err.code === "ENOENT") {
            fs.writeFile(
                "config.json",
                JSON.stringify({
                    webApi: { url: "", key: "" },
                    secretKey: "",
                }),
                (err) => {
                    if (!err) {
                        console.log(
                            "No se encontró archivo config.json, creando config.json, por favor editarlo"
                        );
                        process.exit(0);
                    } else {
                        console.log(err);
                        process.exit(0);
                    }
                }
            );
        }
    }
});
global.verifyToken = (req, res, next) => {
    const token = req.headers["token"];
    if (!token) return res.status(403).send("Token requerido");

    jwt.verify(token, global.secretKey, (err, decoded) => {
        if (err) return res.status(401).send("Token inválido");
        req.user = decoded;
        next();
    });
};

const login = require("./routes/login");
const room = require("./routes/room");
const game = require("./routes/game");
const players = require("./routes/players");

app.use(express.json());
app.use(cors());
app.use(express.static("views/dist"));

app.use("/login", login);
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
