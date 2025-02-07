const API = require("node-haxball")();

// PLUGINS
const commands = require("./plugins/commands");
const comba = require("./plugins/comba");
const kits = require("./plugins/kits");
const matchHistory = require("./plugins/matchHistory");
const auth = require("./plugins/auth");
const autobot = require("./plugins/autobot");
const announcements = require("./plugins/announcements");
const voteKick = require("./plugins/voteKick");
const customDisc = require("./plugins/customDisc");
const subsFeatures = require("./plugins/subsFeatures");
const adminFeatures = require("./plugins/adminFeatures");
const orbs = require("./plugins/orbs");
const gamemodes = require("./plugins/gamemodes");

var roomObj;

// ROOM
async function run(config, DEV = false) {
    return new Promise((resolve, reject) => {
        var createParams = {
            name: config.roomName,
            geo: {
                lat: -36.310826904052284,
                lon: -60.45336889643611,
                flag: "ar",
            },
            showInRoomList: true,
            maxPlayerCount: config.maxPlayers,
            token: config.token,
            password: config.roomPassword,
            onError: (err) => {
                console.log("Error: " + err);
            },
        };

        var client = API.Room.create(createParams, {
            plugins: [
                new commands(API, { webApi: config.webApi }),
                new comba(API),
                new kits(API),
                new matchHistory(API),
                new auth(API),
                new autobot(API),
                new announcements(API),
                new voteKick(API),
                new customDisc(API),
                new subsFeatures(API),
                new adminFeatures(API),
                new orbs(API),
                new gamemodes(API),
            ],
            storage: {
                player_name: config.botName,
                avatar: "",
            },
            onOpen: (room) => {
                r = roomObj = room;
                utils = API.Utils;

                commandsPlugin = room.plugins.find((p) => p.name === "lmbCommands");

                console.log("\nPlugins activos: ");
                room.plugins.forEach((p) => {
                    console.log(" - " + p.name);
                });

                room.onAfterRoomLink = (roomLink) => {
                    console.log("\nLink de la sala:", roomLink);
                    room.lockTeams();

                    resolve(room);
                };
            },
            onClose: (msg) => {
                if (msg?.code === 38) {
                    console.log("Token expirado");
                    client.cancel();
                    reject({
                        room: roomObj,
                        msg: "Token expirado. Generá uno nuevo.",
                    });
                } else {
                    //console.log("Sala cerrada: ", msg);
                }
            },
        });
    });
}

exports.run = run;
