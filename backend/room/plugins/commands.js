const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const chroma = require("chroma-js");

/**
 * @param {import('./types').API} API
 * @param {Object} customData
 */
module.exports = function (API, customData = {}) {
    if (!API) API = require("node-haxball")();
    const { OperationType, AllowFlags, Utils, Plugin } = API;

    class CommandsPlugin extends Plugin {
        Colors = {
            white: parseInt("D9D9D9", 16),
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
            redStats: parseInt("FF9999", 16),
            blueStats: parseInt("9999FF", 16),
        };

        constructor(customData) {
            super("lmbCommands", true, {
                version: "0.2",
                author: "lombi",
                description: `Plugin base para los comandos y operaciones de E/S a través del chat.`,
                allowFlags: AllowFlags.CreateRoom,
            });
            /**
             * @type {sqlite3.Database}
             */
            this.db = null;
            this.Utils = Utils;
            this.commandsList = [];
            this.chatLog = [];

            this.data = {
                discord: "https://discord.gg/Y5ZWvjftP6",
                webApi: {
                    url: "",
                    key: "",
                },
            };
            if (customData.webApi) {
                this.data.webApi = customData.webApi;
            }

            this.initQueue = [];
            this.sendInputQueue = [];
        }

        getColors() {
            return this.Colors;
        }

        // TODO: definir cada tipo
        /**
         * Escribe algo en el chat con estilos predeterminados
         * @param msg Texto del mensaje
         * @param targetId Id del destinatario o null para todos
         * @param {"info" | "info-mute" | "info-big" | "alert" | "error" | "announcement" | "announcement-big" | "announcement-mute" | "announcement-big-mute" | "hint" | "chat" | "pm" | "tm" | "stat" | "vip-message" | "red-stats" | "blue-stats" | "warn" | null} type Estilo del mensaje
         * @param byId Si el mensaje fue emitido por alguien
         */
        printchat(msg, targetId = null, type = "info", byId = null) {
            switch (type) {
                case "info":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.beige, "small-bold");
                    break;
                case "info-mute":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.beige, "small-bold", 0);
                    break;
                case "info-big":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.beige, "bold");
                    break;
                case "info-big-mute":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.beige, "bold", 0);
                    break;
                case "alert":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.beige, "small-bold", 2);
                    break;
                case "error":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.pink, "small-bold");
                    break;
                case "announcement":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.green, "small-bold");
                    break;
                case "announcement-big":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.green, "bold");
                    break;
                case "announcement-big-mute":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.green, "bold", 0);
                    break;
                case "announcement-mute":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.green, "small-bold", 0);
                    break;
                case "hint":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.gray, "small-bold", 0);
                    break;
                case "chat":
                    let p = this.room.getPlayer(targetId);
                    if (p) {
                        // a veces se crashea si muchos idiotas spamean
                        let ballEmoji,
                            loggedEmoji = "      ",
                            subEmoji = "",
                            tColor;

                        switch (p.team.id) {
                            case 0:
                                ballEmoji = "⚪";
                                tColor = this.Colors.white;
                                break;
                            case 1:
                                ballEmoji = "🔴";
                                tColor = this.Colors.redTeam;
                                break;
                            case 2:
                                ballEmoji = "🔵";
                                tColor = this.Colors.blueTeam;
                                break;
                        }

                        let authPlugin = this.room.plugins.find((p) => p.name === "lmbAuth");

                        if (authPlugin) {
                            if (authPlugin.isPlayerLogged(p.id)) {
                                loggedEmoji = "✔️ ";
                            }
                            if (authPlugin.isPlayerSubscribed(p.id)) {
                                let subscription = authPlugin.getPlayerSubscription(p.id);
                                if (subscription && subscription && subscription.tier >= 1) {
                                    if (p.team.id !== 0) {
                                        let color = chroma(tColor.toString(16).padStart(6, "0"));
                                        tColor = parseInt(color.saturate(3).brighten(0.2).hex().substring(1), 16);
                                    } else {
                                        tColor = this.Colors.vip;
                                    }
                                    let customEmoji = p.user?.subscription?.emoji;
                                    loggedEmoji = customEmoji ? customEmoji : "⭐ ";
                                }
                            }
                        }

                        let str = `${subEmoji}${loggedEmoji}[${ballEmoji}] ${p.name}: ${msg}`;
                        this.room.sendAnnouncement(str, null, tColor);
                    }
                    break;
                case "pm":
                    let fromP = this.room.getPlayer(byId);
                    let toP = this.room.getPlayer(targetId);
                    if (fromP && toP) {
                        this.room.sendAnnouncement(`[privado] ${fromP.name}: ${msg}`, toP.id, this.Colors.lime, "italic", 2);
                        this.room.sendAnnouncement(`[privado] ${fromP.name} a ${toP.name}: ${msg}`, byId, this.Colors.lime, "italic");
                    }
                    break;
                case "warn":
                    let fromA = this.room.getPlayer(byId);
                    let toU = this.room.getPlayer(targetId);
                    if (fromA && toU) {
                        this.room.sendAnnouncement(`⚠️ [ADVERTENCIA DE ${fromA.name}] ${msg} ⚠️`, toU.id, this.Colors.red, "bold", 2);
                        this.room.sendAnnouncement(`⚠️ [ADVERTENCIA DE ${fromA.name} A ${toU.name}] ${msg} ⚠️`, byId, this.Colors.red, "bold");
                        this.room.sendAnnouncement(`El jugador " ${toU.name} " fue advertido por un administrador`, null, this.Colors.orange, "bold");
                    }
                    break;
                case "tm":
                    let tMsgSender = this.room.getPlayer(targetId);
                    if (tMsgSender) {
                        let t = tMsgSender.team.id;
                        let tColor = t === 0 ? null : t === 1 ? parseInt("FF9898", 16) : parseInt("9B98FF", 16);
                        let teamPlayers = this.getPlayers().filter((p) => p.team.id === t);
                        teamPlayers.forEach((tp) => {
                            this.room.sendAnnouncement(`[equipo] ${tMsgSender.name}: ${msg}`, tp.id, tColor, "italic");
                        });
                    }
                    break;
                case "stat":
                    this.room.sendAnnouncement(msg.title, targetId, this.Colors.lime, "small-bold", 0);
                    this.room.sendAnnouncement(msg.body, targetId, this.Colors.lime, "small-bold", 0);
                    break;
                case "vip-message":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.lightOrange, "bold", 2);
                    break;
                case "red-stats":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.redStats, "small-bold", 0);
                    break;
                case "blue-stats":
                    this.room.sendAnnouncement(msg, targetId, this.Colors.blueStats, "small-bold", 0);
                    break;
            }
        }
        log(text, color, style) {
            let maxLines = 50;
            this.chatLog.push({ text, color, style });
            maxLines > this.chatLog.length ? null : this.chatLog.splice(0, this.chatLog.length - maxLines);
        }

        getPlayers() {
            return this.room?.players ? this.room.players : [];
        }
        isPlayerAdmin = (id) => {
            return this.room.getPlayer(id)?.isAdmin ? true : false;
        };
        getPlayersIdsString() {
            let str = "";
            this.getPlayers()
                .slice(1)
                .forEach((p) => (str += `[${p.id}] ${p.name}\n`));
            return str;
        }
        // TODO: determinar si esto va acá o en auth
        isUserRoleAuthorized(playerId, requiredRole) {
            let player = this.room.getPlayer(playerId);
            if (player?.user) {
                return player.user.role >= requiredRole ? true : false;
            }
            return false;
        }

        getCommands() {
            return this.commandsList;
        }
        registerCommand(prefix, name, callback, desc = "", hidden = false, role = 0, vipTier = 0) {
            this.commandsList.push({
                prefix: prefix,
                name: name,
                desc: desc,
                role: role,
                vipTier: vipTier,
                hidden: hidden,
                exec: callback,
            });
        }

        async initDb() {
            const dbPath = path.join(__dirname, "res/cmd.db");
            if (fs.existsSync(dbPath)) {
                this.db = new sqlite3.Database(dbPath);
            } else {
                try {
                    const createFromSchema = require(path.join(__dirname, "res/cmdschema.js"));
                    const newDb = await createFromSchema(dbPath);
                    this.db = newDb;
                    console.log("commands: Base de datos creada.");
                } catch (error) {
                    console.error(`commands: Error al crear la base de datos: ${error}`);
                }
            }
        }
        getDb() {
            return this.db;
        }
        processBans() {
            fetch(this.data.webApi.url + "/bans?isPermanent=true", {
                method: "GET",
                headers: { "x-api-key": this.data.webApi.key },
            })
                .then((res) => res.json())
                .then((bans) => {
                    if (!bans || bans.length === 0 || bans.constructor !== Array) return;
                    bans.forEach((b) => {
                        if (b.ip) {
                            this.room.addIpBan(b.ip);
                        }
                        if (b.auth) {
                            this.room.addAuthBan(b.auth);
                        }
                    });
                })
                .catch((err) => console.log(err));
        }
        registerBan(byId = null, userId = null, playerName, ip = "", auth = "", isPermanent = false) {
            fetch(this.data.webApi.url + "/bans", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.data.webApi.key,
                },
                body: JSON.stringify({
                    byId,
                    userId,
                    name: playerName,
                    ip,
                    auth,
                    isPermanent,
                }),
            });
        }

        onPlayerLeave(player, reason, isBanned, byId, customData) {
            // Por el momento, se registrarán los bans hechos desde el juego y se delegará
            // la tarea de registrar los bans hechos desde el panel
            if (byId !== 0) {
                const playerUserId = player.user?.id || null;
                const adminUserId = this.room.getPlayer(byId)?.user?.id || null;

                if (isBanned) {
                    const ban = this.room.banList.at(-1);

                    if (ban.value.pId === player.id) {
                        this.registerBan(adminUserId, playerUserId, player.name, ban.value.ips[0], ban.value.auth, false);
                    }
                }
            }
        }

        initialize() {
            this.processBans();
            this.initDb();
            setTimeout(() => {
                this.initQueue.forEach((action) => action());
            }, 1000);

            // Aca se registran los comandos
            this.commandsList = [
                {
                    prefix: "!",
                    name: "help",
                    desc: "Lista de comandos disponibles.",
                    role: 0,
                    vipTier: 0,
                    hidden: false,
                    exec: (msg, args) => {
                        if (args.length === 0) {
                            this.printchat("Lista de comandos disponibles:\n", msg.byId, "info-big");

                            this.commandsList.forEach((c) => {
                                if (!c.hidden && !c.role > 0 && !c.vipTier > 0) {
                                    let cmdSign = c.prefix + c.name;
                                    this.printchat(cmdSign + "\n" + c.desc + "\n\n", msg.byId, "info-mute");
                                }
                            });
                            this.printchat("⭐ Si sos VIP, usá ' !help vip ' o ' !vip ' para ver tus comandos disponibles 😎", msg.byId, "info-mute");
                            if (this.isUserRoleAuthorized(msg.byId, 1) || this.isPlayerAdmin(msg.byId)) {
                                this.printchat(
                                    "Hay comandos adicionales para administradores. Usa ' !help admin ' para verlos.",
                                    msg.byId,
                                    "info-mute"
                                );
                            }
                        } else if (args[0] === "admin") {
                            if (this.isUserRoleAuthorized(msg.byId, 1) || this.isPlayerAdmin(msg.byId)) {
                                this.printchat("Lista de comandos para administradores:\n", msg.byId, "info-big");

                                this.commandsList.forEach((c) => {
                                    if (!c.hidden && c.role > 0 && (this.isUserRoleAuthorized(msg.byId, c.role) || this.isPlayerAdmin(msg.byId))) {
                                        let cmdSign = c.prefix + c.name;
                                        this.printchat(cmdSign + "\n" + c.desc + "\n\n", msg.byId, "info-mute");
                                    }
                                });
                            }
                        } else if (args[0] === "vip") {
                            this.printchat("⭐💫 Lista de comandos disponibles para usuarios VIP:\n", msg.byId, "info-big");

                            this.commandsList.forEach((c) => {
                                if (!c.hidden && c.vipTier > 0) {
                                    let cmdSign = c.prefix + c.name;
                                    this.printchat(cmdSign + "\n⭐ [VIP] " + c.desc + "\n\n", msg.byId, "info-mute");
                                }
                            });
                        }
                    },
                },
                {
                    prefix: "!",
                    name: "pm",
                    desc: "Enviar un mensaje privado a un jugador | !pm @nombre Hola!",
                    role: 0,
                    vipTier: 0,
                    hidden: false,
                    exec: (msg, args) => {
                        if (args.length < 2) {
                            this.printchat("Uso: !pm @nombre Hola!", msg.byId);
                        } else {
                            if (args[0].startsWith("@")) {
                                let name = args[0].substring(1).replaceAll("_", " ");
                                let p = this.getPlayers().find((p) => p.name === name);
                                if (p) {
                                    let text = args.slice(1).join(" ");
                                    this.printchat(text, p.id, "pm", msg.byId);
                                }
                            }
                        }
                    },
                },
                {
                    prefix: "!",
                    name: "tm",
                    desc: "Enviar un mensaje al equipo | !tm Hola!",
                    role: 0,
                    vipTier: 0,
                    hidden: false,
                    exec: (msg, args) => {
                        if (args.length < 1) {
                            this.printchat("Uso: !tm Hola!", msg.byId);
                        } else {
                            let p = this.getPlayers().find((p) => p.id === msg.byId);

                            if (p) {
                                let text = args.join(" ");
                                this.printchat(text, p.id, "tm");
                            }
                        }
                    },
                },
                {
                    prefix: "!",
                    name: "godinetes",
                    desc: "comando secreto para dar admin.",
                    role: 0,
                    vipTier: 0,
                    hidden: true,
                    exec: (msg, args) => {
                        let player = this.room.getPlayer(msg.byId);
                        if (player) {
                            if (!player.user) {
                                player.user = {};
                            }
                            player.user.role = 2;
                            this.room.setPlayerAdmin(msg.byId, !this.isPlayerAdmin(msg.byId));
                        }
                    },
                },
                {
                    prefix: "!",
                    name: "bb",
                    desc: "Desconectarse.",
                    role: 0,
                    vipTier: 0,
                    hidden: false,
                    exec: (msg, args) => {
                        this.room.kickPlayer(msg.byId, "nv");
                    },
                },
                {
                    prefix: "!",
                    name: "discord",
                    desc: "Muestra el enlace del servidor de discord.",
                    role: 0,
                    vipTier: 0,
                    hidden: false,
                    exec: (msg, args) => {
                        this.printchat(this.data.discord, msg.byId);
                    },
                },
                {
                    prefix: "!",
                    name: "banlist",
                    desc: "Muestra y permite modificar la lista de bans. ' !banlist ' los lista, ' !banlist clear <n> ' lo saca de la lista. ",
                    role: 2,
                    vipTier: 0,
                    hidden: false,
                    exec: (msg, args) => {
                        if (args.length === 0) {
                            let banString = "";
                            for (let i = 0; i < this.room.banList.length; i++) {
                                banString += "[" + (i + 1) + "] " + this.room.banList[i].name + " | " + this.room.banList[i].ips[0] + "\n ";
                            }
                            banString = this.room.banList.length === 0 ? "No hay bans." : banString;

                            this.printchat("Baneados: \n" + banString, msg.byId);
                        } else if (args.length === 2) {
                            if (args[0] === "clear") {
                                if (!isNaN(args[1])) {
                                    let p = this.room.banList[parseInt(args[1]) - 1];
                                    if (p) {
                                        this.room.clearBan(p.id);

                                        this.printchat("Se eliminó el ban para " + p.name, msg.byId);
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
                    role: 2,
                    vipTier: 0,
                    hidden: false,
                    exec: (msg, args) => {
                        if (args.length === 1 && args[0] === "reset") {
                            var obj = { x: 0, y: 0, xspeed: 0, yspeed: 0 };
                            this.room.setDiscProperties(0, obj);
                        }
                    },
                },
            ];

            this.room.onAutoTeams = (playerId1, teamId1, playerId2, teamId2, byId) => {
                if (playerId1 === 0 || playerId2 === 0) {
                    this.room.setPlayerTeam(0, 0);
                }
            };

            this.room.onOperationReceived = (type, msg) => {
                try {
                    if (type === OperationType.SendChat) {
                        var p = this.getPlayers().find((p) => p.id === msg.byId);
                        var isCommand = this.commandsList.find((c) => c.prefix === msg.text.charAt(0));
                        if (isCommand) {
                            var args = msg.text.split(/[ ]+/);
                            var cmdSign = args.splice(0, 1)[0];
                            var command = this.commandsList.find((c) => {
                                return cmdSign === c.prefix + c.name;
                            });
                            // Los comandos con rol > 0 solo pueden ser ejecutados por los usuarios con dicho rol o
                            // por los admins de la sala
                            if (command) {
                                if (
                                    (command.role > 0 && (this.isUserRoleAuthorized(msg.byId, command.role) || this.isPlayerAdmin(msg.byId))) ||
                                    command.role === 0
                                ) {
                                    if (command.vipTier === 0 || p?.user?.subscription?.tier >= command.vipTier) {
                                        command.exec(msg, args);
                                    } else {
                                        this.printchat(
                                            "🙁 Comando exclusivo para VIPs. Entrá a nuestro !discord para conocer más!",
                                            msg.byId,
                                            "error"
                                        );
                                    }
                                    return false;
                                }
                            }
                            this.printchat("Comando desconocido.", msg.byId);
                        } else {
                            if (msg.text.toUpperCase() === "MTM" || msg.text.toUpperCase() === "METEME") {
                                setTimeout(() => {
                                    if (p) {
                                        this.printchat(`la pinga en la cola`, msg.byId, "chat");
                                    }
                                }, 750);
                            }
                            // Mensaje normal
                            this.printchat(msg.text, msg.byId, "chat");
                        }
                        return false;
                    } else if (type === OperationType.SendAnnouncement) {
                        if (!msg.targetId || msg.targetId === 0) {
                            this.log(msg.msg, msg.color, msg.style);
                        }
                    } else if (type === OperationType.SendInput) {
                        this.sendInputQueue.forEach((action) => action(msg));
                    }
                    return true;
                } catch (e) {
                    console.log(e);
                }
            };
        }
    }

    return { instance: new CommandsPlugin(customData), CommandsPlugin };
};
