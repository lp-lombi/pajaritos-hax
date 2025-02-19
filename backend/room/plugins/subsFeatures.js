const chroma = require("chroma-js");

const MatchHistoryPlugin = require("./matchHistory")().MatchHistoryPlugin.prototype;
const AuthPlugin = require("./auth")().AuthPlugin.prototype;
/**
 * @typedef {Object} PlayerModifier
 * @property {number} playerId
 * @property {Object} discProperties
 */

/**
 * @param {import("./types").API} API
 */
module.exports = (API) => {
    if (!API) API = require("node-haxball")();

    class SubsFeaturesPlugin extends API.Plugin {
        /**
         * @type {PlayerModifier[]}
         */
        playersModifiers = [];
        anims = {
            grow: (player) => {
                let discs = this.room.getDiscs() ? this.room.getDiscs() : [];
                let disc = discs.find((d) => d.playerId === player.id);
                if (disc) {
                    let discId = discs.indexOf(disc);
                    if (discId >= 1) {
                        let r = 15;
                        let interval = setInterval(() => {
                            r += 0.9;
                            this.room.setDiscProperties(discId, { radius: r });
                        }, 100);
                        setTimeout(() => {
                            clearInterval(interval);
                        }, 1500);
                    }
                }
            },
            shrink: (player) => {
                let discs = this.room.getDiscs() ? this.room.getDiscs() : [];
                let disc = discs.find((d) => d.playerId === player.id);
                if (disc) {
                    let discId = discs.indexOf(disc);
                    if (discId >= 1) {
                        let r = 15;
                        let interval = setInterval(() => {
                            r -= 0.75;
                            this.room.setDiscProperties(discId, { radius: r });
                        }, 100);
                        setTimeout(() => {
                            clearInterval(interval);
                        }, 1500);
                    }
                }
            },
            /**
             * Esta función al reestablecer los colores originales corrige un bug que por algún motivo
             * divide los ángulos por 0.71 periódico, por lo cual lo multiplicamos por 1.40625
             */
            rainbow: (player) => {
                let teamId = player?.team.id;
                if (!isNaN(teamId)) {
                    let origTeamColors = this.room.state.teamColors[teamId];
                    let interval = setInterval(() => {
                        let newColor = parseInt(chroma.random().saturate(3).hex().substring(1), 16);
                        this.room.setTeamColors(teamId, 0, 0, newColor);
                    }, 75);
                    setTimeout(() => {
                        clearInterval(interval);
                        this.room.setTeamColors(teamId, origTeamColors.angle * 1.40625, origTeamColors.text, ...origTeamColors.inner);
                    }, 2000);
                }
            },
        };
        regexEmoji =
            /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{FE0F}])/u;

        constructor() {
            super("lmbSubsFeatures", true, {
                version: "0.1",
                author: "lombi",
                description: `Algunas funciones especiales para los subs.`,
                allowFlags: API.AllowFlags.CreateRoom,
            });
        }

        getPlayerDiscId(playerId) {
            let discs = this.room.getDiscs() ? this.room.getDiscs() : [];
            let playerDisc = discs.find((d) => d.playerId === playerId);
            return playerDisc ? discs.indexOf(playerDisc) : null;
        }
        isEmoji(char) {
            return regexEmoji.test(char);
        }
        getFirstEmoji(str) {
            const match = str.match(regexEmoji);
            return match ? match[0] : null;
        }
        applyModifiers() {
            this.playersModifiers.forEach((m) => {
                API.Utils.runAfterGameTick(() => {
                    this.room.setDiscProperties(this.getPlayerDiscId(m.playerId), m.discProperties);
                });
            });
        }

        onTeamGoal(teamId) {
            setTimeout(() => {
                let scorerPlayer = this.room.players.find((p) => p.id === this.matchHistory.currentMatchHistory.getLastScorerId());
                if (scorerPlayer?.team?.id === teamId && scorerPlayer.user?.subscription) {
                    switch (scorerPlayer.user.subscription.scoreAnimId) {
                        case 1:
                            this.anims.grow(scorerPlayer);
                            break;
                        case 2:
                            this.anims.shrink(scorerPlayer);
                            break;
                        case 3:
                            this.anims.rainbow(scorerPlayer);
                            break;
                    }
                    if (scorerPlayer.user.subscription.scoreMessage) {
                        commands.printchat(scorerPlayer.user.subscription.scoreMessage, null, "vip-message");
                    }
                }
            }, 100);
        }
        onPositionsReset() {
            this.applyModifiers();
        }
        onGameStart() {
            this.applyModifiers();
        }
        onPlayerLeave = function (pObj) {
            this.playersModifiers = this.playersModifiers.filter((m) => m.playerId !== pObj.id);
        };

        initialize = function () {
            /**
             * @type {import("./types").CommandsPlugin}
             */
            this.commands = this.room.plugins.find((p) => p.name === "lmbCommands");
            /**
             * @type {AuthPlugin}
             */
            this.authPlugin = this.room.plugins.find((p) => p.name === "lmbAuth");
            /**
             * @type {MatchHistoryPlugin}
             */
            this.matchHistory = this.room.plugins.find((p) => p.name === "lmbMatchHistory");

            if (!this.commands || !this.authPlugin || !this.matchHistory) {
                console.log("El plugin de subs requiere de los plugins: commands, auth, matchHistory.");
            } else {
                this.commands.registerCommand(
                    "!",
                    "vip",
                    (msg, args) => {
                        this.room.fakeSendPlayerChat("!help vip", msg.byId);
                    },
                    "Alias para el comando !help vip",
                    true
                );
                this.commands.registerCommand(
                    "!",
                    "festejo",
                    (msg, args) => {
                        if (args.length === 0) {
                            this.commands.printchat(
                                "[0] - Ninguno\n[1] - Agrandarse\n[2] - Encogerse\n[3] - Arcoíris\n\nUso: !festejo <id>",
                                msg.byId
                            );
                        } else {
                            let player = this.room.getPlayer(msg.byId);
                            if (player) {
                                if (args[0] === "0") {
                                    player.user.subscription.scoreAnimId = 0;
                                } else if (args[0] === "1") {
                                    player.user.subscription.scoreAnimId = 1;
                                    this.commands.printchat("Tu nuevo festejo de gol es Agrandarse!", msg.byId);
                                } else if (args[0] === "2") {
                                    player.user.subscription.scoreAnimId = 2;
                                    this.commands.printchat("Tu nuevo festejo de gol es Encogerse!", msg.byId);
                                } else if (args[0] === "3") {
                                    player.user.subscription.scoreAnimId = 3;
                                    this.commands.printchat("Tu nuevo festejo de gol es Arcoíris!", msg.byId);
                                } else {
                                    this.commands.printchat("El festejo elegido no existe 😕", msg.byId);
                                    return;
                                }

                                this.authPlugin.updatePlayerSubscriptionData(player.id, {
                                    scoreAnimId: player.user.subscription.scoreAnimId,
                                });
                            }
                        }
                    },
                    "Cambia la animación del festejo ante goles.",
                    false,
                    0,
                    1
                );
                this.commands.registerCommand(
                    "!",
                    "mensajegol",
                    (msg, args) => {
                        if (args.length === 0) {
                            this.commands.printchat("Uso: '!mensajegol Este es mi mensaje!', o '!mensajegol 0' para desactivarlo.", msg.byId);
                        } else {
                            let player = this.room.getPlayer(msg.byId);
                            if (player) {
                                if (args[0] === "0") {
                                    this.authPlugin.updatePlayerSubscriptionData(player.id, {
                                        scoreMessage: null,
                                    });
                                    player.scoreMessage = null;
                                } else {
                                    const message = args.join(" ");
                                    this.authPlugin.updatePlayerSubscriptionData(player.id, {
                                        scoreMessage: message,
                                    });
                                    player.user.subscription.scoreMessage = message;
                                }
                            }
                        }
                    },
                    "Cambia el mensaje de festejo ante goles.",
                    false,
                    0,
                    1
                );
                this.commands.registerCommand(
                    "!",
                    "emoji",
                    (msg, args) => {
                        if (args.length === 0) {
                            this.commands.printchat("Uso: '!emoji 💫'", msg.byId);
                        } else if (this.isEmoji(args[0])) {
                            let player = this.room.getPlayer(msg.byId);
                            if (player?.user?.subscription) {
                                var emoji = this.getFirstEmoji(args[0]);
                                player.user.subscription.emoji = emoji;
                                this.authPlugin.updatePlayerSubscriptionData(player.id, { emoji });
                            }
                        }
                    },
                    "Cambia el emoji de verificación de login por el que gustes.",
                    false,
                    0,
                    1
                );
                this.commands.registerCommand(
                    "!",
                    "radio",
                    (msg, args) => {
                        var gamemodesPlugin = this.room.plugins.find((plugin) => plugin.name === "lmbGamemodes");
                        if (gamemodesPlugin?.gamemode === gamemodesPlugin.Gamemodes.Freeroam) {
                            if (args.length === 0) {
                                this.commands.printchat("Uso: '!radio <número entre 5 y 30>'", msg.byId);
                            } else if (!isNaN(args[0]) && args[0] >= 5 && args[0] <= 30) {
                                let player = this.room.getPlayer(msg.byId);
                                if (player) {
                                    var discId = this.room.getDiscs()?.indexOf(player.disc);
                                    if (discId !== -1) {
                                        this.playersModifiers.push({
                                            playerId: player.id,
                                            discProperties: { radius: parseInt(args[0]) },
                                        });
                                        this.room.setDiscProperties(discId, { radius: parseInt(args[0]) });
                                    }
                                }
                            } else {
                                this.commands.printchat("El número debe ser un entero entre 5 y 30! ej: ' !radio 5 '", msg.byId, "error");
                            }
                        } else {
                            this.commands.printchat("🙁 Este comando solo funciona en Juegan Todos!", msg.byId);
                        }
                    },
                    "En las salas Juegan Todos, permite cambiar el tamaño del disco.",
                    false,
                    0,
                    1
                );
            }
        };
    }

    return { instance: new SubsFeaturesPlugin(), SubsFeaturesPlugin };
};
