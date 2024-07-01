const API = require("node-haxball")();

// PLUGINS
const powerShot = require("./plugins/powerShot");
const matchHistory = require("./plugins/matchHistory");
const lmbCommands = require("./plugins/commands");
const auth = require("./plugins/auth");

// AJUSTES
const DEV = true;
const SUPERADMIN_NAME = "Bochini";
const SALUDO = true;
const createParams = {
    name: DEV ? "X" : " 🕊️ FUTSAL CON COMBA 💫 ",
    geo: {
        // san bernardo
        lat: -36.310826904052284,
        lon: -60.45336889643611,
        flag: "ar",
    },
    showInRoomList: true,
    maxPlayerCount: 30,
    token: "thr1.AAAAAGaCMHfEQgT36V9QGw.gRsGEMcO4bU",
};
DEV ? (createParams["password"] = "121") : null;

// ROOM
API.Room.create(createParams, {
    plugins: [
        new powerShot(API),
        new lmbCommands(API),
        new matchHistory(API),
        new auth(API),
    ],
    storage: {
        player_name: "Cristo",
        avatar: "",
    },
    onSuccess: (room) => {
        r = room;

        commandsPlugin = room.plugins.find((p) => p.name === "lmbCommands");
        commandsPlugin ? (commandsPlugin.isSaludoActive = SALUDO) : null;

        console.log("\nPlugins activos: ");
        room.plugins.forEach((p) => {
            console.log(" - " + p.name);
        });
        console.log("");

        room.onAfterRoomLink = (roomLink) => {
            console.log("room link:", roomLink);
        };

        room.onPlayerJoin = (p, d) => {
            if (p.name === SUPERADMIN_NAME && p.id === 1) {
                room.setPlayerAdmin(p.id, true);
                if (commandsPlugin) commandsPlugin.SUPERADMIN = p;
            }
        };
    },
});
