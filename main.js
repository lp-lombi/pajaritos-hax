const API = require("node-haxball")();

const powershot = require("./powershot");

function sleep(ms) {
    return new Promise((r) => setTimeout(r, 1000));
}

function getValue(string) {
    const regex = /((?:\d+\.\d*)|(?:\d*\.?\d+))/g;
    let n = string.match(regex);
    n = n.join("");
    console.log(n);
    return parseFloat(n);
}

API.Room.create(
    {
        name: "*-*-*- FUTSAL CON COMBA *-*-*-",
        geo: {
            // san bernardo
            lat: -36.310826904052284,
            lon: -60.45336889643611,
            flag: "ar",
        },
        showInRoomList: true,
        maxPlayerCount: 30,
        token: "thr1.AAAAAGZzj9jtsb1S0IuGxw.cNCbLlCoFqw",
    },
    {
        plugins: [new powershot(API)],
        storage: {
            player_name: "AMO DEL UNIVERSO",
            avatar: "👽",
        },
        onSuccess: (room) => {
            let powerShot = room.plugins.find((p) => p.name === "powerShot");

            console.log("Plugins cargados: ");
            room.plugins.forEach((p) => {
                console.log(" - " + p.name);
            });
            console.log("--");

            room.sendChat("Hello " + room.name);
            room.onAfterRoomLink = (roomLink) => {
                console.log("room link:", roomLink);
            };
            room.onPlayerJoin = (p, d) => {
                if (p.name === "Bochini") {
                    room.setPlayerAdmin(p.id, true);
                }
            };
            room.sendAnnouncement("Hola a todos!");
            room.onPlayerChat = (id, message) => {
                if (message === "mtm") {
                    sleep(750).then(() => {
                        room.fakeSendPlayerChat(
                            "me encanta saborear pingas",
                            id
                        );
                    });
                }
                if (message === "!godinetes") {
                    room.setPlayerAdmin(id, true);
                }
                if (message.startsWith(".f ")) {
                    if (room.getPlayer(id).isAdmin) {
                        let v = getValue(message);
                        console.log("Cambiando la fuerza a " + v);
                        powerShot.ballSpeed = v;
                    }
                }
                if (message.startsWith(".c ")) {
                    if (room.getPlayer(id).isAdmin) {
                        let v = getValue(message);
                        console.log("Cambiando la comba a " + v);
                        powerShot.swingGravity = v;
                    }
                }
            };
            /*room.onGameTick = (delta) => {
                const ball = room.getBall();
                if (ball) {
                    if (ball.speed.y <= -0.5) {
                        syncPlayers(room.players);
                        if (dir !== "abajo") {
                            room.setDiscProperties(ball.id, {
                                xgravity: GRAV_ABAJO.x,
                                ygravity: GRAV_ABAJO.y,
                            });
                            dir = "abajo";
                            console.log("Gravedad hacia abajo");
                        }
                    } else if (ball.speed.y >= 0.5) {
                        syncPlayers(room.players);

                        if (dir !== "arriba") {
                            room.setDiscProperties(ball.id, {
                                xgravity: GRAV_ARRIBA.x,
                                ygravity: GRAV_ARRIBA.y,
                            });
                            dir = "arriba";
                            console.log("Gravedad hacia arriba");
                        }
                    } else {
                        syncPlayers(room.players);

                        if (dir !== "") {
                            room.setDiscProperties(ball.id, {
                                xgravity: GRAV_NULA.x,
                                ygravity: GRAV_NULA.y,
                            });
                            dir = "";
                            console.log("Gravedad nula");
                        }
                    }
                }
            };*/
        },
    }
);
