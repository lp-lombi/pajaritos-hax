module.exports = function (API) {
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

    var commands,
        kits,
        kickBanAllowed = false,
        that = this;

    this.data = {
        discord: "https://discord.gg/U7Tc9uKg",
        //APIUrl: "http://localhost:7999",
        APIUrl: "https://vps-4333390-x.dattaweb.com",
    };

    this.utils = Utils;

    this.chatLog = [];

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
    };

    const path = require("path");
    const fs = require("fs");
    const sqlite3 = require("sqlite3");
    db = new sqlite3.Database(path.join(__dirname, "res/commands.db"));

    // FUNCIONES
    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    function fetchKits() {
        try {
            db.all("SELECT * FROM kits", (err, rows) => {
                if (err) throw err;
                kits = rows;
            });
        } catch (e) {
            console.log("Error en la base de datos: " + e);
        }
    }

    async function handleKickBanPlayer(msg, force = false) {
        try {
            let p = that.room.players.find((p) => p.id === msg.id);
            let allowed = new Promise((resolve, reject) => {
                if (force) resolve(true);
                if (p) {
                    fetch(that.data.APIUrl + "/users/getuser", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
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

    function getValue(string) {
        const regex = /((?:\d+\.\d*)|(?:\d*\.?\d+))/g;
        let n = string.match(regex);
        n = n.join("");
        return parseFloat(n);
    }

    function isAdmin(id) {
        var player = that.room.players.find((p) => p.id === id);
        if (!player) return false;
        else return player.isAdmin;
    }

    // METODOS
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
                let p = that.room.players.find((p) => p.id === targetId);
                if (p) {
                    // a veces se crashea si muchos idiotas spamean
                    let ballEmoji,
                        loggedEmoji = "",
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
                    authPlugin
                        ? authPlugin.isPlayerLogged(p.id)
                            ? (loggedEmoji = "⚡")
                            : null
                        : null;

                    let str = `${loggedEmoji} [${ballEmoji}] ${p.name}: ${msg}`;
                    that.room.sendAnnouncement(str, null, tColor);
                }
                break;
            case "pm":
                let fromP = that.room.players.find((p) => p.id === byId);
                let toP = that.room.players.find((p) => p.id === targetId);
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
                let tMsgSender = that.room.players.find(
                    (p) => p.id === targetId
                );
                if (tMsgSender) {
                    let t = tMsgSender.team.id;
                    let tColor =
                        t === 0
                            ? null
                            : t === 1
                            ? parseInt("FF9898", 16)
                            : parseInt("9B98FF", 16);
                    let teamPlayers = that.room.players.filter(
                        (p) => p.team.id === t
                    );
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

    this.getDb = function () {
        return db;
    };

    this.getColors = function () {
        return COLORS;
    };

    this.getCommands = function () {
        return commands;
    };

    this.log = function (text, color, style) {
        let maxLines = 50;

        that.chatLog.push({ text, color, style });

        maxLines > that.chatLog.length
            ? null
            : that.chatLog.splice(0, that.chatLog.length - maxLines);
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
        try {
            db.all("SELECT * FROM bans", (err, rows) => {
                if (err) {
                    console.log(err);
                    return;
                }
                bans = rows;
                bans.forEach((b) => {
                    if (b.ip) {
                        that.room.addIpBan(b.ip);
                    }
                    if (b.auth) {
                        that.room.addAuthBan(b.auth);
                    }
                });
            });
        } catch (e) {
            console.log("Error en la base de datos: " + e);
        }
    };

    this.permaBan = function (playerName, ip = "", auth = "") {
        db.run(
            `INSERT INTO bans (name, ip, auth) VALUES ("${playerName}", "${ip}", "${auth}")`,
            (err) => {
                if (err) console.log(err);
            }
        );
    };

    this.initialize = function () {
        fetchKits();
        that.processBans();
        // fs.writeFileSync(path.join(__dirname, "res/log.txt"), ""); // Se limpia el log del chat
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
                            let p = that.room.players.find(
                                (p) => p.name === name
                            );
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
                        let p = that.room.players.find(
                            (p) => p.id === msg.byId
                        );

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

                                        db.run(
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
                name: "ps", // Power Shot settings
                desc: 'Ajustes del plugin Powershot.  !ps c <valor> ": cambia la comba | " !ps f <valor> ": cambia la fuerza | " !ps preset <valor> ": cambia el preset',
                admin: true,
                hidden: false,
                exec: (msg, args) => {
                    if (isAdmin(msg.byId)) {
                        var powerShotPlugin = that.room.plugins.find(
                            (p) => p.name === "powerShot"
                        );
                        if (powerShotPlugin) {
                            if (args[0] === "c") {
                                const defaultValue = 0.075;
                                let v = getValue(args[1]);
                                isNaN(v) ? (v = defaultValue) : null;
                                powerShotPlugin.swingGravity = v;

                                that.printchat(
                                    "Cambiando la comba a " + v,
                                    msg.byId
                                );
                            } else if (args[0] === "f") {
                                const defaultValue = 14;
                                let v = getValue(args[1]);
                                isNaN(v) ? (v = defaultValue) : null;
                                powerShotPlugin.ballSpeed = v;

                                that.printchat(
                                    "Cambiando la fuerza a " + v,
                                    msg.byId
                                );
                            } else if (args[0] === "preset") {
                                switch (args[1]) {
                                    case "1":
                                        powerShotPlugin.ballSpeed = 12;
                                        powerShotPlugin.swingGravity = 0.075;

                                        that.printchat(
                                            "Fuerza: " +
                                                13 +
                                                " | Comba: " +
                                                0.075,
                                            msg.byId
                                        );
                                        break;
                                    case "2":
                                        powerShotPlugin.ballSpeed = 15;
                                        powerShotPlugin.swingGravity = 0.08;

                                        that.printchat(
                                            "Fuerza: " +
                                                15 +
                                                " | Comba: " +
                                                0.08,
                                            msg.byId
                                        );
                                        break;
                                    case "3":
                                        powerShotPlugin.ballSpeed = 20;
                                        powerShotPlugin.swingGravity = 0.08;

                                        that.printchat(
                                            "Fuerza: " +
                                                20 +
                                                " | Comba: " +
                                                0.08,
                                            msg.byId
                                        );
                                        break;
                                }
                            }
                        } else {
                            console.log("No se encontró el plugin powershot.");
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
                        let p = that.room.players.find(
                            (p) => p.id === msg.byId
                        );
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
                        //return true;
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
