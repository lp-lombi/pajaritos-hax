/**
 * @param {import('./types').API} API
 * @param {Object} customData
 */
module.exports = function (API, customData = {}) {
    const {
        OperationType,
        VariableType,
        ConnectionState,
        AllowFlags,
        Direction,
        CollisionFlags,
        CameraFollow,
        BackgroundType,
        GamePlayState,
        Callback,
        Utils,
        Room,
        Replay,
        Query,
        Library,
        RoomConfig,
        Plugin,
        Renderer,
        Errors,
        Language,
        EventFactory,
        Impl,
    } = API;

    Object.setPrototypeOf(this, Plugin.prototype);
    Plugin.call(this, "lmbCommands", true, {
        version: "0.1",
        author: "lombi",
        description: `Comandos básicos.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    this.Utils = Utils;

    this.commandsList = [];
    this.data = {
        discord: "https://discord.gg/Y5ZWvjftP6",
        webApi: {
            url: "",
            key: "",
        },
    };
    this.chatLog = [];
    this.initQueue = [];
    this.onPlayerJoinQueue = [];
    this.onPlayerLeaveQueue = [];
    this.onGameStartQueue = [];
    this.onGameEndQueue = [];
    this.onTeamGoalQueue = [];
    this.sendInputQueue = [];
    this.isAdmin = (id) => {
        var player = that.getPlayers().find((p) => p.id === id);
        return !player ? false : player.isAdmin ? true : false;
    };
    this.printchat = function (msg, targetId = null, type = "info", byId = null) {
        switch (type) {
            case "info":
                room.sendAnnouncement(msg, targetId, COLORS.beige, "small-bold");
                break;
            case "alert":
                room.sendAnnouncement(msg, targetId, COLORS.beige, "small-bold", 2);
                break;
            case "error":
                room.sendAnnouncement(msg, targetId, COLORS.pink, "small-bold");
                break;
            case "announcement":
                room.sendAnnouncement(msg, targetId, COLORS.green, "small-bold");
                break;
            case "announcement-mute":
                room.sendAnnouncement(msg, targetId, COLORS.green, "small-bold", 0);
                break;
            case "hint":
                room.sendAnnouncement(msg, targetId, COLORS.gray, "small-bold", 0);
                break;
            case "chat":
                let p = that.getPlayers().find((p) => p.id === targetId);
                if (p) {
                    // a veces se crashea si muchos idiotas spamean
                    let ballEmoji,
                        loggedEmoji = "      ",
                        subEmoji = "",
                        tColor;

                    switch (p.team.id) {
                        case 0:
                            ballEmoji = "⚪";
                            tColor = null;
                            break;
                        case 1:
                            ballEmoji = "🔴";
                            tColor = COLORS.redTeam;
                            break;
                        case 2:
                            ballEmoji = "🔵";
                            tColor = COLORS.blueTeam;
                            break;
                    }

                    let authPlugin = room.plugins.find((p) => p.name === "lmbAuth");

                    if (authPlugin) {
                        if (authPlugin.isPlayerLogged(p.id)) {
                            loggedEmoji = "✔️ ";
                        }
                        if (authPlugin.isPlayerSubscribed(p.id)) {
                            let subscription = authPlugin.getPlayerSubscription(p.id);
                            if (subscription && subscription && subscription.tier >= 1) {
                                if (tColor) {
                                    let color = chroma(tColor.toString(16).padStart(6, "0"));
                                    tColor = parseInt(color.saturate(3).brighten(0.2).hex().substring(1), 16);
                                } else {
                                    tColor = COLORS.vip;
                                }
                                loggedEmoji = "⭐ ";
                            }
                        }
                    }

                    let str = `${subEmoji}${loggedEmoji}[${ballEmoji}] ${p.name}: ${msg}`;
                    room.sendAnnouncement(str, null, tColor);
                }
                break;
            case "pm":
                let fromP = that.getPlayers().find((p) => p.id === byId);
                let toP = that.getPlayers().find((p) => p.id === targetId);
                if (fromP && toP) {
                    room.sendAnnouncement(`[privado] ${fromP.name}: ${msg}`, toP.id, COLORS.lime, "italic", 2);
                    room.sendAnnouncement(`[privado] ${fromP.name} a ${toP.name}: ${msg}`, byId, COLORS.lime, "italic");
                }
                break;
            case "warn":
                let fromA = that.getPlayers().find((p) => p.id === byId);
                let toU = that.getPlayers().find((p) => p.id === targetId);
                if (fromA && toU) {
                    room.sendAnnouncement(`⚠️ [ADVERTENCIA DE ${fromA.name}] ${msg} ⚠️`, toU.id, COLORS.red, "bold", 2);
                    room.sendAnnouncement(`⚠️ [ADVERTENCIA DE ${fromA.name} A ${toU.name}] ${msg} ⚠️`, byId, COLORS.red, "bold");
                    room.sendAnnouncement(`El jugador " ${toU.name} " fue advertido por un administrador`, null, COLORS.orange, "bold");
                }
                break;
            case "tm":
                let tMsgSender = that.getPlayers().find((p) => p.id === targetId);
                if (tMsgSender) {
                    let t = tMsgSender.team.id;
                    let tColor = t === 0 ? null : t === 1 ? parseInt("FF9898", 16) : parseInt("9B98FF", 16);
                    let teamPlayers = that.getPlayers().filter((p) => p.team.id === t);
                    teamPlayers.forEach((tp) => {
                        room.sendAnnouncement(`[equipo] ${tMsgSender.name}: ${msg}`, tp.id, tColor, "italic");
                    });
                }
                break;
            case "stat":
                room.sendAnnouncement(msg.title, targetId, COLORS.lime, "small-bold", 0);
                room.sendAnnouncement(msg.body, targetId, COLORS.lime, "small-bold", 0);
                break;
            case "vip-message":
                room.sendAnnouncement(msg, targetId, COLORS.lightOrange, "bold", 2);
        }
    };
    this.getDb = function () {
        return db;
    };
    this.getPlayers = function () {
        if (room && room.players) {
            return room.players;
        } else {
            return [];
        }
    };
    this.getColors = function () {
        return COLORS;
    };
    this.getCommands = function () {
        return that.commandsList;
    };
    this.log = function (text, color, style) {
        let maxLines = 50;

        that.chatLog.push({ text, color, style });

        maxLines > that.chatLog.length ? null : that.chatLog.splice(0, that.chatLog.length - maxLines);
    };
    this.registerCommand = function (prefix, name, callback, desc = "", admin = false, hidden = false) {
        that.commandsList.push({
            prefix: prefix,
            name: name,
            desc: desc,
            admin: admin,
            hidden: hidden,
            exec: callback,
        });
    };

    // Hay que revisar estos 2 para ver si corresponde que esten acá o por fuera
    this.processBans = function () {
        fetch(that.data.webApi.url + "/bans/all", {
            method: "GET",
            headers: { "x-api-key": that.data.webApi.key },
        })
            .then((res) => res.json())
            .then((bans) => {
                if (!bans || bans.length === 0 || bans.constructor !== Array) return;
                bans.forEach((b) => {
                    if (b.ip) {
                        room.addIpBan(b.ip);
                    }
                    if (b.auth) {
                        room.addAuthBan(b.auth);
                    }
                });
            })
            .catch((err) => console.log(err));
    };

    this.permaBan = function (playerName, ip = "", auth = "") {
        fetch(that.data.webApi.url + "/bans/new", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": that.data.webApi.key,
            },
            body: JSON.stringify({
                name: playerName,
                ip,
                auth,
            }),
        });
    };

    /**
     * @type {import('./types').CommandsPlugin}
     */
    var that = this;

    /**
     * @type {import('./types').Room}
     */
    var room;
    var kickBanAllowed = false;

    const COLORS = {
        beige: parseInt("EAD9AA", 16),
        pink: parseInt("EAB2AA", 16),
        red: parseInt("EA5F60", 16),
        green: parseInt("90F06A", 16),
        gray: parseInt("CCCBCB", 16),
        lime: parseInt("CCE9C1", 16),
        lightOrange: parseInt("FFC977", 16),
        orange: parseInt("FFB84C", 16),
        redTeam: parseInt("FFD9D9", 16),
        blueTeam: parseInt("DBD9FF", 16),
        vip: parseInt("FFDCB3", 16),
    };

    const path = require("path");
    const fs = require("fs");
    const sqlite3 = require("sqlite3");
    const chroma = require("chroma-js");

    var db = null;
    const dbPath = path.join(__dirname, "res/cmd.db");
    function initDb() {
        if (fs.existsSync(dbPath)) {
            db = new sqlite3.Database(dbPath);
        } else {
            const createFromSchema = require(path.join(__dirname, "res/cmdschema.js"));
            createFromSchema(dbPath)
                .then((newDb) => {
                    db = newDb;
                    console.log("commands: Base de datos creada.");
                })
                .catch((err) => {
                    throw err;
                });
        }
    }

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    async function handleKickBanPlayer(msg, force = false) {
        try {
            let p = that.getPlayers().find((p) => p.id === msg.id);
            let allowed = new Promise((resolve, reject) => {
                if (force) resolve(true);
                if (p) {
                    fetch(that.data.webApi.url + "/users/getuser", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": that.data.webApi.key,
                        },
                        body: JSON.stringify({
                            username: p.name,
                        }),
                    })
                        .then((res) => {
                            if (res.ok) {
                                res.json()
                                    .then((data) => {
                                        if (data && data.user && data.user.role >= 2 && msg.byId !== 0) {
                                            let authPlugin = room.plugins.find((p) => p.name === "lmbAuth");
                                            if (authPlugin) {
                                                let isLogged = authPlugin
                                                    .getLoggedPlayers()
                                                    .find((lp) => lp.id === msg.id);
                                                if (isLogged) {
                                                    room.setPlayerAdmin(msg.byId, false);
                                                    that.printchat("FLASHASTE UNA BANDA", msg.byId, "error");
                                                    resolve(false);
                                                }
                                            }
                                        }
                                        resolve(true);
                                    })
                                    .catch((err) => {
                                        // si falla, se usa el comportamiento normal de Haxball
                                        console.log(err);
                                        resolve(true);
                                    });
                            } else resolve(true);
                        })
                        .catch((err) => {
                            console.log(err);
                            resolve(true);
                        });
                }
            });

            if (!kickBanAllowed) {
                // Este código es ejecutado solo una vez, a diferencia del de OperationType el cual
                // se ejecuta al menos dos veces ya que se lo llama recursivamente
                if (await allowed) {
                    kickBanAllowed = true;

                    that.onPlayerLeaveQueue.forEach((action) => action(msg.id));
                    room.fakeKickPlayer(msg.id, msg.reason, msg.ban, msg.byId);

                    kickBanAllowed = false;
                }
            }
        } catch (e) {
            console.log(e);
        }
    }

    this.initialize = function () {
        if (customData.webApi) {
            that.data.webApi = customData.webApi;
        }

        room = that.room;

        that.processBans();
        initDb();
        sleep(1000).then(() => {
            that.initQueue.forEach((action) => action());
        });

        // Aca se registran los comandos
        that.commandsList = [
            {
                prefix: "!",
                name: "help",
                desc: "Lista de comandos disponibles.",
                admin: false,
                hidden: false,
                exec: (msg, args) => {
                    if (args.length === 0) {
                        let commandsString = "Lista de comandos disponibles: \n";
                        that.commandsList.forEach((c) => {
                            if (!c.hidden && !c.admin) {
                                let cmd = c.prefix + c.name;
                                commandsString += cmd + "\n" + c.desc + "\n\n";
                            }
                        });
                        if (that.isAdmin(msg.byId)) {
                            commandsString +=
                                "Hay comandos adicionales para administradores. Usa ' !help admin ' para verlos.\n";
                        }
                        that.printchat(commandsString, msg.byId);
                    } else if (args[0] === "admin") {
                        if (that.isAdmin(msg.byId)) {
                            let commandsString = "Lista de comandos para administradores: \n";
                            that.commandsList.forEach((c) => {
                                if (!c.hidden) {
                                    if (c.admin) {
                                        let cmd = c.prefix + c.name;
                                        commandsString += cmd + "\n" + c.desc + "\n\n";
                                    }
                                }
                            });
                            that.printchat(commandsString, msg.byId);
                        }
                    }
                },
            },
            {
                prefix: "!",
                name: "pm",
                desc: "Enviar un mensaje privado a un jugador | !pm @nombre Hola!",
                admin: false,
                hidden: false,
                exec: (msg, args) => {
                    if (args.length < 2) {
                        that.printchat("Uso: !pm @nombre Hola!", msg.byId);
                    } else {
                        if (args[0].startsWith("@")) {
                            let name = args[0].substring(1).replaceAll("_", " ");
                            let p = that.getPlayers().find((p) => p.name === name);
                            if (p) {
                                let text = args.slice(1).join(" ");
                                that.printchat(text, p.id, "pm", msg.byId);
                            }
                        }
                    }
                },
            },
            {
                prefix: "!",
                name: "tm",
                desc: "Enviar un mensaje al equipo | !tm Hola!",
                admin: false,
                hidden: false,
                exec: (msg, args) => {
                    if (args.length < 1) {
                        that.printchat("Uso: !tm Hola!", msg.byId);
                    } else {
                        let p = that.getPlayers().find((p) => p.id === msg.byId);

                        if (p) {
                            let text = args.join(" ");
                            that.printchat(text, p.id, "tm");
                        }
                    }
                },
            },
            {
                prefix: "!",
                name: "godinetes",
                desc: "comando secreto para dar admin.",
                admin: false,
                hidden: true,
                exec: (msg, args) => {
                    room.setPlayerAdmin(msg.byId, !that.isAdmin(msg.byId));
                },
            },
            {
                prefix: "!",
                name: "bb",
                desc: "Desconectarse.",
                admin: false,
                hidden: false,
                exec: (msg, args) => {
                    if (!kickBanAllowed) {
                        kickBanAllowed = true;
                        room.fakeKickPlayer(msg.byId, "nv");
                        kickBanAllowed = false;
                    }
                },
            },
            {
                prefix: "!",
                name: "discord",
                desc: "Muestra el enlace del servidor de discord.",
                admin: false,
                hidden: false,
                exec: (msg, args) => {
                    that.printchat(that.data.discord, msg.byId);
                },
            },
            {
                prefix: "!",
                name: "banlist",
                desc: "Muestra y permite modificar la lista de bans. ' !banlist ' los lista, ' !banlist clear <n> ' lo saca de la lista. ",
                admin: true,
                hidden: false,
                exec: (msg, args) => {
                    if (args.length === 0) {
                        let banString = "";
                        for (let i = 0; i < room.banList.length; i++) {
                            banString +=
                                "[" + (i + 1) + "] " + room.banList[i].name + " | " + room.banList[i].ips[0] + "\n ";
                        }
                        banString = room.banList.length === 0 ? "No hay bans." : banString;

                        that.printchat("Baneados: \n" + banString, msg.byId);
                    } else if (args.length === 2) {
                        if (args[0] === "clear") {
                            if (!isNaN(args[1])) {
                                let p = room.banList[parseInt(args[1]) - 1];
                                if (p) {
                                    room.clearBan(p.id);

                                    that.printchat("Se eliminó el ban para " + p.name, msg.byId);
                                }
                            }
                        }
                    }
                },
            },
            {
                prefix: "!",
                name: "ball",
                desc: "' !ball reset ' resetea la bola al centro de la cancha.",
                admin: true,
                hidden: false,
                exec: (msg, args) => {
                    if (args.length === 1 && args[0] === "reset") {
                        var obj = { x: 0, y: 0, xspeed: 0, yspeed: 0 };
                        room.setDiscProperties(0, obj);
                    }
                },
            },
        ];

        room.onAutoTeams = (playerId1, teamId1, playerId2, teamId2, byId) => {
            if (playerId1 === 0 || playerId2 === 0) {
                room.setPlayerTeam(0, 0);
            }
        };

        room.onAfterTeamGoal = (teamId, customData) => {
            that.onTeamGoalQueue.forEach((action) => action(teamId, customData));
        };

        room.onAfterGameStart = (byId, customData) => {
            that.onGameStartQueue.forEach((action) => action(byId, customData));
        };

        room.onAfterGameEnd = (winningTeamId, customData) => {
            that.onGameEndQueue.forEach((action) => action(winningTeamId, customData));
        };

        room.onOperationReceived = (type, msg) => {
            try {
                if (type === OperationType.SendChat) {
                    var isCommand = that.commandsList.find((c) => c.prefix === msg.text.charAt(0));
                    if (isCommand) {
                        var args = msg.text.split(/[ ]+/);
                        var cmd = args.splice(0, 1)[0];
                        var recognizedCommand = that.commandsList.find((c) => {
                            return cmd === c.prefix + c.name;
                        });
                        if (recognizedCommand) {
                            if ((recognizedCommand.admin && that.isAdmin(msg.byId)) || !recognizedCommand.admin) {
                                recognizedCommand.exec(msg, args);
                                return false;
                            }
                        }
                        that.printchat("Comando desconocido.", msg.byId);
                    } else {
                        let p = that.getPlayers().find((p) => p.id === msg.byId);
                        if (msg.text.toUpperCase() === "MTM" || msg.text.toUpperCase() === "METEME") {
                            sleep(750).then(() => {
                                if (p) {
                                    that.printchat(`la pinga en la cola`, msg.byId, "chat");
                                }
                            });
                        }
                        // Mensaje normal
                        that.printchat(msg.text, msg.byId, "chat");
                    }
                    return false;
                } else if (type === OperationType.SendAnnouncement) {
                    if (msg._TP === null || msg._TP === 0) {
                        that.log(msg.Tc, msg.color, msg.style);
                    }
                } else if (type === OperationType.KickBanPlayer) {
                    handleKickBanPlayer(msg);
                    return kickBanAllowed;
                } else if (type === OperationType.JoinRoom) {
                    that.onPlayerJoinQueue.forEach((action) => action(msg));
                } else if (type === OperationType.SendInput) {
                    that.sendInputQueue.forEach((action) => action(msg));
                }
                return true;
            } catch (e) {
                console.log(e);
            }
        };
    };
};
