const API = require("node-haxball")();

// PLUGINS
const powerShot = require("./plugins/powerShot");
const matchHistory = require("./plugins/matchHistory");
const lmbCommands = require("./plugins/commands");

// AJUSTES
const DEV = true;
const SUPERADMIN_NAME = "Bochini";
const createParams = {
    name: DEV ? "X" : "*-*-*- FUTSAL CON COMBA *-*-*-",
    geo: {
        // san bernardo
        lat: -36.310826904052284,
        lon: -60.45336889643611,
        flag: "ar",
    },
    showInRoomList: true,
    maxPlayerCount: 30,
    token: "thr1.AAAAAGZ9qMTgIfa0xZIyUg.xcDgJxkaZH4",
};
DEV ? (createParams["password"] = "121") : null;

// ROOM
API.Room.create(createParams, {
    plugins: [new powerShot(API), new matchHistory(API), new lmbCommands(API)],
    storage: {
        player_name: "Cristo",
        avatar: "",
    },
    onSuccess: (room) => {
        r = room;
        commandsPlugin = room.plugins.find((p) => p.name === "lmbCommands");

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
