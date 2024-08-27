const API = require("node-haxball")();

// PLUGINS
const powerShot = require("./plugins/powerShot");
const matchHistory = require("./plugins/matchHistory");
const commands = require("./plugins/commands");
const auth = require("./plugins/auth");
const autobot = require("./plugins/autobot");
const announcements = require("./plugins/announcements");
const voteKick = require("./plugins/voteKick");

// AJUSTES
const config = JSON.parse(require("fs").readFileSync("~/config.json"));

const DEV = true;
const createParams = {
    name: DEV ? "X" : config.roomName,
    geo: {
        // san bernardo
        lat: -36.310826904052284,
        lon: -60.45336889643611,
        flag: "ar",
    },
    showInRoomList: true,
    maxPlayerCount: config.maxPlayers,
    token: config.token,
};
DEV ? (createParams["password"] = "121") : null;

// ROOM
API.Room.create(createParams, {
    plugins: [
        new powerShot(API),
        new commands(API, config.APIURL ? config.APIURL : null),
        new matchHistory(API),
        new auth(API),
        new autobot(API),
        new announcements(API),
        new voteKick(API),
    ],
    storage: {
        player_name: config.botName,
        avatar: "",
    },
    onSuccess: (room) => {
        r = room;

        commandsPlugin = room.plugins.find((p) => p.name === "lmbCommands");
        commandsPlugin ? (commandsPlugin.isSaludoActive = config.greet) : null;

        console.log("\nPlugins activos: ");
        room.plugins.forEach((p) => {
            console.log(" - " + p.name);
        });
        console.log("");

        room.onAfterRoomLink = (roomLink) => {
            console.log("room link:", roomLink);
        };
    },
});
