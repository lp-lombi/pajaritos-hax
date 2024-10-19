const NodeHaxball = require("node-haxball")();
/**
 * @param {NodeHaxball} API
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

    /**
     * @typedef {Object} Comando
     * @property {string} prefix
     * @property {string} desc
     * @property {Boolean} admin
     * @property {Boolean} hidden
     * @property {Function} exec
     */

    /**
     * @type {Comando[]}
     */
    var commands = [];

    var kits = [],
        kickBanAllowed = false,
        that = this;

    this.data = {
        discord: "https://discord.gg/Y5ZWvjftP6",
        webApi: {
            url: "",
            key: "",
        },
    };

    this.utils = Utils;

    this.initQueue = [];
    this.onPlayerJoinQueue = [];
    this.onPlayerLeaveQueue = [];
    this.onGameStartQueue = [];
    this.onGameEndQueue = [];
    this.onTeamGoalQueue = [];
    this.sendInputQueue = [];

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

    this.db = null;
    const dbPath = path.join(__dirname, "res/cmd.db");
    function initDb() {
        if (fs.existsSync(dbPath)) {
            that.db = new sqlite3.Database(dbPath);
        } else {
            const createFromSchema = require(path.join(
                __dirname,
                "res/cmdschema.js"
            ));
            createFromSchema(dbPath)
                .then((db) => {
                    that.db = db;
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

    function fetchKits() {
        if (that.db) {
            try {
                that.db.all("SELECT * FROM kits", (err, rows) => {
                    if (err) throw err;
                    kits = rows;
                });
            } catch (e) {
                console.log("Error en la base de datos: " + e);
            }
        }
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
                                        if (
                                            data &&
                                            data.user &&
                                            data.user.role >= 2 &&
                                            msg.byId !== 0
                                        ) {
                                            let authPlugin =
                                                that.room.plugins.find(
                                                    (p) => p.name === "lmbAuth"
                                                );
                                            if (authPlugin) {
                                                let isLogged = authPlugin
                                                    .getLoggedPlayers()
                                                    .find(
                                                        (lp) => lp.id === msg.id
                                                    );
                                                if (isLogged) {
                                                    that.room.setPlayerAdmin(
                                                        msg.byId,
                                                        false
                                                    );
                                                    that.printchat(
                                                        "FLASHASTE UNA BANDA",
                                                        msg.byId,
                                                        "error"
                                                    );
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
                    that.room.fakeKickPlayer(
                        msg.id,
                        msg.reason,
                        msg.ban,
                        msg.byId
                    );

                    kickBanAllowed = false;
                }
            }
        } catch (e) {
            console.log(e);
        }
    }

    function isAdmin(id) {
        var player = that.getPlayers().find((p) => p.id === id);
        return !player ? false : player.isAdmin ? true : false;
    }

    /**
     * Escribe algo en el chat con estilos predeterminados
     * @param {string} msg Texto del mensaje
     * @param {Number | null} targetId Id del destinatario o null para todos
     * @param {"info" | "alert" | "error" | "announcement" | "announcement-mute" | "hint" | "chat" | "pm" | "tm" | "stat" | null} type Estilo del mensaje
     * @param {Number | null} byId Si el mensaje fue emitido por alguien
     */
    this.printchat = function (
        msg,
        targetId = null,
        type = "info",
        byId = null
    ) {
        switch (type) {
            case "info":
                that.room.sendAnnouncement(
                    msg,
                    targetId,
                    COLORS.beige,
                    "small-bold"
                );
                break;
            case "alert":
                that.room.sendAnnouncement(
                    msg,
                    targetId,
                    COLORS.beige,
                    "small-bold",
                    2
                );
                break;
            case "error":
                that.room.sendAnnouncement(
                    msg,
                    targetId,
                    COLORS.pink,
                    "small-bold"
                );
                break;
            case "announcement":
                that.room.sendAnnouncement(
                    msg,
                    targetId,
                    COLORS.green,
                    "small-bold"
                );
                break;
            case "announcement-mute":
                that.room.sendAnnouncement(
                    msg,
                    targetId,
                    COLORS.green,
                    "small-bold",
                    0
                );
                break;
            case "hint":
                that.room.sendAnnouncement(
                    msg,
                    targetId,
                    COLORS.gray,
                    "small-bold",
                    0
                );
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

                    let authPlugin = that.room.plugins.find(
                        (p) => p.name === "lmbAuth"
                    );

                    if (authPlugin) {
                        if (authPlugin.isPlayerLogged(p.id)) {
                            loggedEmoji = "✔️ ";
                        }
                        if (authPlugin.isPlayerSubscribed(p.id)) {
                            let subscription = authPlugin.getPlayerSubscription(
                                p.id
                            );
                            if (
                                subscription &&
                                subscription &&
                                subscription.tier >= 1
                            ) {
                                if (tColor) {
                                    let color = chroma(
                                        tColor.toString(16).padStart(6, "0")
                                    );
                                    tColor = parseInt(
                                        color
                                            .saturate(3)
                                            .brighten(0.2)
                                            .hex()
                                            .substring(1),
                                        16
                                    );
                                } else {
                                    tColor = COLORS.vip;
                                }
                                loggedEmoji = "⭐ ";
                            }
                        }
                    }

                    let str = `${subEmoji}${loggedEmoji}[${ballEmoji}] ${p.name}: ${msg}`;
                    that.room.sendAnnouncement(str, null, tColor);
                }
                break;
            case "pm":
                let fromP = that.getPlayers().find((p) => p.id === byId);
                let toP = that.getPlayers().find((p) => p.id === targetId);
                if (fromP && toP) {
                    that.room.sendAnnouncement(
                        `[privado] ${fromP.name}: ${msg}`,
                        toP.id,
                        COLORS.lime,
                        "italic",
                        2
                    );
                    that.room.sendAnnouncement(
                        `[privado] ${fromP.name} a ${toP.name}: ${msg}`,
                        byId,
                        COLORS.lime,
                        "italic"
                    );
                }
                break;
            case "tm":
                let tMsgSender = that
                    .getPlayers()
                    .find((p) => p.id === targetId);
                if (tMsgSender) {
                    let t = tMsgSender.team.id;
                    let tColor =
                        t === 0
                            ? null
                            : t === 1
                            ? parseInt("FF9898", 16)
                            : parseInt("9B98FF", 16);
                    let teamPlayers = that
                        .getPlayers()
                        .filter((p) => p.team.id === t);
                    teamPlayers.forEach((tp) => {
                        that.room.sendAnnouncement(
                            `[equipo] ${tMsgSender.name}: ${msg}`,
                            tp.id,
                            tColor,
                            "italic"
                        );
                    });
                }
                break;
            case "stat":
                that.room.sendAnnouncement(
                    msg.title,
                    targetId,
                    COLORS.lime,
                    "small-bold",
                    0
                );
                that.room.sendAnnouncement(
                    msg.body,
                    targetId,
                    COLORS.lime,
                    "small-bold",
                    0
                );
                break;
        }
    };

    /**
     *
     * @returns {sqlite3.Database}
     */
    this.getDb = function () {
        return that.db;
    };

    this.getPlayers = function () {
        if (that.room && that.room.players) {
            return that.room.players;
        } else {
            return [];
        }
    };

    this.getColors = function () {
        return COLORS;
    };

    this.getCommands = function () {
        return commands;
    };

    this.registerCommand = function (
        prefix,
        name,
        callback,
        desc = "",
        admin = false,
        hidden = false
    ) {
        commands.push({
            prefix: prefix,
            name: name,
            desc: desc,
            admin: admin,
            hidden: hidden,
            exec: callback,
        });
    };

    this.processBans = function () {
        fetch(that.data.webApi.url + "/bans/all", {
            method: "GET",
            headers: { "x-api-key": that.data.webApi.key },
        })
            .then((res) => res.json())
            .then((bans) => {
                if (!bans || bans.length === 0) return;
                bans.forEach((b) => {
                    if (b.ip) {
                        that.room.addIpBan(b.ip);
                    }
                    if (b.auth) {
                        that.room.addAuthBan(b.auth);
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

    this.initialize = function () {
        if (customData.webApi) {
            that.data.webApi = customData.webApi;
        }

        fetchKits();
        that.processBans();
        initDb();
        sleep(1000).then(() => {
            that.initQueue.forEach((action) => action());
        });

        // Aca se registran los comandos
        commands = [
            {
                prefix: "!",
                name: "help",
                desc: "Lista de comandos disponibles.",
                admin: false,
                hidden: false,
                exec: (msg, args) => {
                    if (args.length === 0) {
                        let commandsString =
                            "Lista de comandos disponibles: \n";
                        commands.forEach((c) => {
                            if (!c.hidden && !c.admin) {
                                let cmd = c.prefix + c.name;
                                commandsString += cmd + "\n" + c.desc + "\n\n";
                            }
                        });
                        if (isAdmin(msg.byId)) {
                            commandsString +=
                                "Hay comandos adicionales para administradores. Usa ' !help admin ' para verlos.\n";
                        }
                        that.printchat(commandsString, msg.byId);
                    } else if (args[0] === "admin") {
                        if (isAdmin(msg.byId)) {
                            let commandsString =
                                "Lista de comandos para administradores: \n";
                            commands.forEach((c) => {
                                if (!c.hidden) {
                                    if (c.admin) {
                                        let cmd = c.prefix + c.name;
                                        commandsString +=
                                            cmd + "\n" + c.desc + "\n\n";
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
                            let name = args[0]
                                .substring(1)
                                .replaceAll("_", " ");
                            let p = that
                                .getPlayers()
                                .find((p) => p.name === name);
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
                        let p = that
                            .getPlayers()
                            .find((p) => p.id === msg.byId);

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
                    that.room.setPlayerAdmin(msg.byId, !isAdmin(msg.byId));
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
                        that.room.fakeKickPlayer(msg.byId, "nv");
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
                name: "casaca",
                desc: 'Cambiar camisetas | para asignar: " !casaca <equipo> <nombre> " | para listar todas: " !casaca " | para agregar: " !casaca add <nombre> <cfg> "',
                admin: true,
                hidden: false,
                exec: (msg, args) => {
                    if (isAdmin(msg.byId)) {
                        if (args.length === 0) {
                            let kitsString = "Lista de camisetas: \n";
                            kits.forEach((k) => {
                                kitsString += "   " + k.name + "   -";
                            });
                            kitsString +=
                                "\n Uso: !casaca <equipo> <nombre> | ej ' !casaca red independiente '";
                            that.printchat(kitsString, msg.byId);
                        } else if (args.length > 0) {
                            if (args[0] === "red" || args[0] === "blue") {
                                if (args.length === 2) {
                                    let k = kits.find(
                                        (k) => k.name === args[1]
                                    );
                                    if (k) {
                                        let colorsList = k.cfg.split(/[ ]+/);
                                        let angle = parseInt(
                                            colorsList.splice(0, 1)[0]
                                        );

                                        let t =
                                            args[0] === "red"
                                                ? 1
                                                : args[0] === "blue"
                                                ? 2
                                                : null;

                                        t
                                            ? that.room.setTeamColors(
                                                  t,
                                                  angle,
                                                  ...colorsList.map((c) => c)
                                              )
                                            : that.printchat(
                                                  "Equipo inválido.",
                                                  msg.byId
                                              );
                                    } else {
                                        that.printchat(
                                            "Camiseta no encontrada.",
                                            msg.byId
                                        );
                                    }
                                }
                            } else if (args[0] === "add") {
                                if (args.length >= 4) {
                                    let kitName = args[1];
                                    let angle = isNaN(args[2])
                                        ? null
                                        : parseInt(args[2]);
                                    let fontColor =
                                        args[3].length === 6 ? args[3] : null;
                                    let color1 =
                                        args[4]?.length === 6 ? args[4] : null;
                                    let color2 =
                                        args[5]?.length === 6 ? args[5] : null;
                                    let color3 =
                                        args[6]?.length === 6 ? args[6] : null;

                                    if (
                                        kitName !== null &&
                                        angle !== null &&
                                        fontColor !== null &&
                                        color1 !== null
                                    ) {
                                        let cfg = `${angle} ${fontColor} ${color1}`;
                                        if (color2) cfg += ` ${color2}`;
                                        if (color3) cfg += ` ${color3}`;

                                        let error = false;

                                        that.db.run(
                                            `INSERT INTO kits (name, cfg) VALUES ("${kitName}", "${cfg}")`,
                                            (err) => {
                                                error = true;
                                                console.log(err);
                                            }
                                        );
                                        if (error) {
                                            that.printchat(
                                                "No se pudo guardar la camiseta.",
                                                msg.byId,
                                                "error"
                                            );
                                        } else {
                                            fetchKits();
                                            that.printchat(
                                                "Se guardó la camiseta correctamente.",
                                                msg.byId
                                            );
                                        }
                                        return;
                                    }
                                }
                                that.printchat(
                                    "Uso incorrecto del comando. ej: ' !casaca add independiente 0 CF0C0C FF0505 CF0C05 '",
                                    msg.byId,
                                    "error"
                                );
                            }
                        }
                    }
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
                        for (let i = 0; i < that.room.banList.length; i++) {
                            banString +=
                                "[" +
                                (i + 1) +
                                "] " +
                                that.room.banList[i].name +
                                " | " +
                                that.room.banList[i].ips[0] +
                                "\n ";
                        }
                        banString =
                            that.room.banList.length === 0
                                ? "No hay bans."
                                : banString;

                        that.printchat("Baneados: \n" + banString, msg.byId);
                    } else if (args.length === 2) {
                        if (args[0] === "clear") {
                            if (!isNaN(args[1])) {
                                let p =
                                    that.room.banList[parseInt(args[1]) - 1];
                                if (p) {
                                    that.room.clearBan(p.id);

                                    that.printchat(
                                        "Se eliminó el ban para " + p.name,
                                        msg.byId
                                    );
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
                        that.room.setDiscProperties(0, obj);
                    }
                },
            },
        ];

        that.room.onAutoTeams = (
            playerId1,
            teamId1,
            playerId2,
            teamId2,
            byId
        ) => {
            if (playerId1 === 0 || playerId2 === 0) {
                that.room.setPlayerTeam(0, 0);
            }
        };

        that.room.onAfterTeamGoal = (teamId, customData) => {
            that.onTeamGoalQueue.forEach((action) =>
                action(teamId, customData)
            );
        };

        that.room.onAfterGameStart = (byId, customData) => {
            that.onGameStartQueue.forEach((action) => action(byId, customData));
        };

        that.room.onAfterGameEnd = (winningTeamId, customData) => {
            that.onGameEndQueue.forEach((action) =>
                action(winningTeamId, customData)
            );
        };

        that.room.onOperationReceived = (type, msg) => {
            try {
                if (type === OperationType.SendChat) {
                    var isCommand = commands.find(
                        (c) => c.prefix === msg.text.charAt(0)
                    );
                    if (isCommand) {
                        var args = msg.text.split(/[ ]+/);
                        var cmd = args.splice(0, 1)[0];
                        var recognizedCommand = commands.find((c) => {
                            return cmd === c.prefix + c.name;
                        });
                        if (recognizedCommand) {
                            if (recognizedCommand.admin && !isAdmin(msg.byId)) {
                                that.printchat(
                                    "Comando desconocido.",
                                    msg.byId
                                );
                                return false;
                            }
                            recognizedCommand.exec(msg, args);
                        } else {
                            that.printchat("Comando desconocido.", msg.byId);
                        }
                    } else {
                        let p = that
                            .getPlayers()
                            .find((p) => p.id === msg.byId);
                        if (
                            msg.text.toUpperCase() === "MTM" ||
                            msg.text.toUpperCase() === "METEME"
                        ) {
                            sleep(750).then(() => {
                                that.printchat(
                                    `la pinga en la cola`,
                                    msg.byId,
                                    "chat"
                                );
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

    return that;
};
