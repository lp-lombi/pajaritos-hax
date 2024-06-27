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
        that = this;

    this.defineVariable({
        name: "SUPERADMIN",
        type: VariableType.String,
        value: null,
        description: "Color of the ball while being shot with power.",
    });

    // FUNCIONES
    function sleep(ms) {
        return new Promise((r) => setTimeout(r, 1000));
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

    `╔══════════════════════════════════════════════════════╗
║                        𝗛𝗔𝗫𝗠𝗢𝗗𝗦.𝗖𝗢𝗠              ʟᴏɢɪɴ sᴛᴀᴛᴜs 🔴║
║                   ᴡғʟ ғᴜᴛsᴀʟ ᴀᴜᴛᴏ ʀᴏᴏᴍ                    ║
║              !ᴅɪsᴄᴏʀᴅ discord.gg/h5cqupFRVR               ║
╟──────────────────────────────────────────────────────╢
║           !ᴀғᴋ !ʙʙ !ʜᴇʟᴘ !ʟᴏɢɪɴ [ᴄᴏᴅᴇ] !ᴍᴇ !sᴛᴀᴛs           ║
╚══════════════════════════════════════════════════════╝`;

    this.initialize = function () {
        // Aca se registran los comandos
        commands = [
            {
                prefix: ":",
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
                                commandsString +=
                                    cmd + "\n" + "    " + c.desc + "\n\n";
                            }
                        }
                    });
                    that.room.sendAnnouncement(commandsString, msg.byId);
                },
            },
            {
                prefix: ":",
                name: "godinetes",
                desc: "comando secreto para dar admin.",
                admin: false,
                hidden: true,
                exec: (msg, args) => {
                    that.room.setPlayerAdmin(msg.byId, !isAdmin(msg.byId));
                },
            },
            {
                prefix: ":",
                name: "casaca",
                desc: 'Cambiar camisetas | para asignar: " :casaca <equipo> <nombre> " | para listar todas: " :casaca "',
                admin: true,
                hidden: false,
                exec: (msg, args) => {
                    if (isAdmin(msg.byId)) {
                        const kits = [
                            {
                                name: "independiente",
                                cfg: "0 FFFFFF CF0C0C FF0505 CF0C0C",
                            },
                            {
                                name: "boca",
                                cfg: "90 FFFFFF 0F2FFF E8E00A 0F2FFF",
                            },
                            {
                                name: "river",
                                cfg: "60 000000 FFFFFF FF0505 FFFFFF",
                            },

                            {
                                name: "racing",
                                cfg: "0 0C345C 0F88D9 FFFFFF 0F88D9",
                            },
                            {
                                name: "sanlorenzo",
                                cfg: "0 FFFFFF 2924A6 FF0303 2924A6",
                            },
                            {
                                name: "comunicaciones",
                                cfg: "0 FFFFFF 000000 FFF700",
                            },
                            {
                                name: "excursionistas",
                                cfg: "0 124A0A 4EA60A FFFFFF 4EA60A",
                            },
                            {
                                name: "allboys",
                                cfg: "0 FFFFFF FFFFFF 000000 FFFFFF",
                            },
                        ];
                        if (args.length === 0) {
                            let kitsString = "Lista de camisetas: \n";
                            kits.forEach((k) => {
                                kitsString += "   " + k.name + "   -";
                            });
                            kitsString +=
                                "\n Uso: :casaca <equipo> <nombre> | ej ':casaca red independiente'";
                            that.room.sendAnnouncement(kitsString, msg.byId);
                        } else if (args.length === 2) {
                            let k = kits.find((k) => k.name === args[1]);
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
                                    : that.room.sendAnnouncement(
                                          "Equipo inválido.",
                                          msg.byId
                                      );
                            } else {
                                that.room.sendAnnouncement(
                                    "Camiseta no encontrada.",
                                    msg.byId
                                );
                            }
                        }
                    }
                },
            },
            {
                prefix: ":",
                name: "hist",
                desc: "Muestra el historial de partidos de la sesión.",
                admin: false,
                exec: (msg, args) => {
                    var matchHistoryPlugin = that.room.plugins.find(
                        (p) => p.name === "lmbMatchHistory"
                    );
                    if (matchHistoryPlugin) {
                        if (args[0] === "clear") {
                            matchHistoryPlugin.clearHistory();
                            return;
                        }
                        matchHistoryPlugin.printHistory(msg.byId);
                    } else {
                        console.log(
                            "No se encontró el plugin de historial de partidos."
                        );
                    }
                },
            },
            {
                prefix: ":",
                name: "stats",
                desc: "Muestra los goles de cada jugador.",
                admin: false,
                exec: (msg, args) => {
                    var matchHistoryPlugin = that.room.plugins.find(
                        (p) => p.name === "lmbMatchHistory"
                    );
                    if (matchHistoryPlugin) {
                        if (args[0] === "clear") {
                            matchHistoryPlugin.clearPlayersStats();
                            return;
                        }
                        matchHistoryPlugin.printPlayersStats(msg.byId);
                    } else {
                        console.log(
                            "No se encontró el plugin de historial de partidos."
                        );
                    }
                },
            },
            {
                prefix: ":",
                name: "ps", // Power Shot settings
                desc: 'Ajustes del plugin Powershot.  :ps c <valor> ": cambia la comba | " :ps f <valor> ": cambia la fuerza | " :ps preset <valor> ": cambia el preset',
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

                                that.room.sendAnnouncement(
                                    "Cambiando la comba a " + v,
                                    msg.byId
                                );
                            } else if (args[0] === "f") {
                                const defaultValue = 14;
                                let v = getValue(args[1]);
                                isNaN(v) ? (v = defaultValue) : null;
                                powerShotPlugin.ballSpeed = v;

                                that.room.sendAnnouncement(
                                    "Cambiando la fuerza a " + v,
                                    msg.byId
                                );
                            } else if (args[0] === "preset") {
                                switch (args[1]) {
                                    case "1":
                                        powerShotPlugin.ballSpeed = 12;
                                        powerShotPlugin.swingGravity = 0.075;
                                        that.room.sendAnnouncement(
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
                                        that.room.sendAnnouncement(
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
                                        that.room.sendAnnouncement(
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
                prefix: ":",
                name: "banlist",
                desc: "Muestra y permite modificar la lista de bans. ' :banlist ' los lista, ' :banlist clear <n> ' lo saca de la lista. ",
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
                        that.room.sendAnnouncement(
                            "Baneados: \n" + banString,
                            msg.byId
                        );
                    } else if (args.length === 2) {
                        if (args[0] === "clear") {
                            if (!isNaN(args[1])) {
                                let p =
                                    that.room.banList[parseInt(args[1]) - 1];
                                if (p) {
                                    that.room.clearBan(p.id);
                                    that.room.sendAnnouncement(
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
                prefix: ":",
                name: "ball",
                desc: "' :ball reset ' resetea la bola al centro de la cancha.",
                admin: true,
                hidden: false,
                exec: (msg, args) => {
                    if (args.length === 1 && args[0] === "reset") {
                        var obj = {
                            x: 0,
                            y: 0,
                        };
                        that.room.setDiscProperties(0, obj);
                    }
                },
            },
        ];

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
                                that.room.sendAnnouncement(
                                    "Comando desconocido.",
                                    msg.byId
                                );
                                return false;
                            }
                            recognizedCommand.exec(msg, args);
                        } else {
                            that.room.sendAnnouncement(
                                "Comando desconocido.",
                                msg.byId
                            );
                        }
                    } else {
                        let p = that.room.players.find(
                            (p) => p.id === msg.byId
                        );
                        if (p.isAdmin) {
                            that.room.sendAnnouncement(
                                p.name + ": " + msg.text,
                                null,
                                hexToNumber("8CF187"),
                                2
                            );
                            return false;
                        }
                        if (
                            msg.text.toUpperCase() === "MTM" ||
                            msg.text.toUpperCase() === "METEME"
                        ) {
                            sleep(300).then(() => {
                                that.room.fakeSendPlayerChat(
                                    "la pinga en la cola",
                                    msg.byId
                                );
                            });
                        }
                        return true;
                    }
                    return false;
                } else if (type === OperationType.KickBanPlayer) {
                    if (msg.id === that.SUPERADMIN?.id && msg.byId !== 0) {
                        that.room.setPlayerAdmin(msg.byId, false);
                        that.room.sendAnnouncement(
                            "FLASHASTE UNA BANDA",
                            msg.byId
                        );
                        return false;
                    }
                }
                return true;
            } catch (e) {
                console.log(e);
            }
        };

        that.room.onPlayerLeave = (playerObj) => {};
    };
};
