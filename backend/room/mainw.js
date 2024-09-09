const API = require("node-haxball")();

// PLUGINS
const powerShot = require("./plugins/powerShot");
const commands = require("./plugins/commands");
const matchHistory = require("./plugins/matchHistory");
const auth = require("./plugins/auth");
const autobot = require("./plugins/autobot");
const announcements = require("./plugins/announcements");
const voteKick = require("./plugins/voteKick");
const customDisc = require("./plugins/customDisc");
const subsFeatures = require("./plugins/subsFeatures");

// ROOM
async function run(config, DEV = false) {
    return new Promise((resolve, reject) => {
        var createParams = {
            name: DEV ? "X" : config.roomName,
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
        DEV ? (createParams["password"] = "121") : null;

        var client = API.Room.create(createParams, {
            plugins: [
                new powerShot(API),
                new commands(API, { webApi: config.webApi }),
                new matchHistory(API),
                new auth(API),
                new autobot(API),
                new announcements(API),
                new voteKick(API),
                new customDisc(API),
                new subsFeatures(API),
            ],
            storage: {
                player_name: config.botName,
                avatar: "",
            },
            onSuccess: (room) => {
                r = room;

                commandsPlugin = room.plugins.find(
                    (p) => p.name === "lmbCommands"
                );

                console.log("\nPlugins activos: ");
                room.plugins.forEach((p) => {
                    console.log(" - " + p.name);
                });
                console.log("");

                room.onAfterRoomLink = (roomLink) => {
                    console.log("Link de la sala:", roomLink);
                    room.lockTeams();

                    resolve(room);
                };
            },
        });

        client.onRequestRecaptcha = (token) => {
            console.log("Token expirado");
            client.room.leave();
            reject({
                room: client.room,
                msg: "Token expirado. Generá uno nuevo.",
            });
        };
    });
}

exports.run = run;
