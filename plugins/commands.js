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

    const COLORS = {
        beige: parseInt("EAD9AA", 16),
        pink: parseInt("EAB2AA", 16),
        red: parseInt("EA5F60", 16),
        redTeam: parseInt("FFD9D9", 16),
        blueTeam: parseInt("DBD9FF", 16),
    };

    const sqlite3 = require("sqlite3");
    db = new sqlite3.Database("./plugins/res/commands.db");

    var commands,
        kits,
        kickBanAllowed = false,
        that = this;

    this.onPlayerLeaveQueue = [];
    this.onGameEndQueue = [];
    this.sendInputQueue = [];

    this.saludo = `╔══════════════════════════════════════════════════════╗
║       PAJARITOS HAX       ║  !help !hist !stats !login !bb  ║
╚══════════════════════════════════════════════════════╝\n\n\n\n\n\n`;

    this.isSaludoActive = false;

    // FUNCIONES
    function sleep(ms) {
        return new Promise((r) => setTimeout(r, 1000));
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
                    db.all(
                        `SELECT username, role FROM users WHERE username = "${p.name}"`,
                        (err, rows) => {
                            if (err) return resolve(true); // si falla, se usa el comportamiento normal de Haxball
                            if (rows.length > 0) {
                                if (rows[0].role >= 2 && msg.reason !== null) {
                                    let authPlugin = that.room.plugins.find(
                                        (p) => p.name === "lmbAuth"
                                    );
                                    if (authPlugin) {
                                        let isLogged = authPlugin
                                            .getLoggedPlayers()
                                            .find((lp) => lp.id === msg.id);
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
                            }
                            resolve(true);
                        }
                    );
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

    function hexToNumber(hex) {
        hex = hex.replace(/^#/, "");
        return parseInt(hex, 16);
    }

    function isAdmin(id) {
        var player = that.room.players.find((p) => p.id === id);
        if (!player) return false;
        else return player.isAdmin;
    }

    //
    this.printchat = function (msg, targetId = null, type = "info") {
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
                    COLORS.red,
                    "small-bold"
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
        }
    };

    this.getDb = function () {
        return db;
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

    this.initialize = function () {
        fetchKits();

        // Aca se registran los comandos
        commands = [
            {
                prefix: "!",
                name: "help",
                desc: "Lista de comandos disponibles.",
                admin: false,
                hidden: false,
                exec: (msg, args) => {
                    let commandsString = "Lista de comandos disponibles: \n";
                    commands.forEach((c) => {
                        if (!c.hidden) {
                            if (
                                c.admin === isAdmin(msg.byId) ||
                                c.admin === false
                            ) {
                                let cmd = c.prefix + c.name;
                                commandsString += cmd + "\n" + c.desc + "\n\n";
                            }
                        }
                    });
                    that.printchat(commandsString, msg.byId);
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
                                                12 +
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
            byId,
            customData
        ) => {
            if (playerId1 === 0 || playerId2 === 0) {
                that.room.setPlayerTeam(0, 0);
            }
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
                            sleep(300).then(() => {
                                that.printchat(
                                    "la pinga en la cola",
                                    msg.byId,
                                    "chat"
                                );
                            });
                        }
                        // Temporal hasta acostumbrarse por seguridad
                        if (
                            msg.text.startsWith(":godinetes") ||
                            msg.text.startsWith(":login")
                        ) {
                            return false;
                        }
                        // Mensaje normal
                        that.printchat(msg.text, msg.byId, "chat");
                        //return true;
                    }
                    return false;
                } else if (type === OperationType.KickBanPlayer) {
                    handleKickBanPlayer(msg);
                    return kickBanAllowed;
                } else if (type === OperationType.JoinRoom) {
                    if (that.isSaludoActive) {
                        that.printchat(that.saludo, msg.id, "alert");
                    }
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
