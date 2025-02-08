/**
 * @param {import("./types").API} API
 */
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
    Plugin.call(this, "lmbSubsFeatures", true, {
        version: "0.1",
        author: "lombi",
        description: `Algunas funciones especiales para los subs.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands;
    var that = this;
    const chroma = require("chroma-js");

    /**
     * @typedef {Object} PlayerModifier
     * @property {number} playerId
     * @property {Object} discProperties
     */
    /**
     * @type {PlayerModifier[]}
     */
    this.playersModifiers = [];

    this.getPlayerDiscId = function (playerId) {
        let discs = that.room.getDiscs() ? that.room.getDiscs() : [];
        let playerDisc = discs.find((d) => d.playerId === playerId);
        return playerDisc ? discs.indexOf(playerDisc) : null;
    };

    this.anims = {
        grow: (player) => {
            let discs = that.room.getDiscs() ? that.room.getDiscs() : [];
            let disc = discs.find((d) => d.playerId === player.id);
            if (disc) {
                let discId = discs.indexOf(disc);
                if (discId >= 1) {
                    let r = 15;
                    let interval = setInterval(() => {
                        r += 0.9;
                        that.room.setDiscProperties(discId, { radius: r });
                    }, 100);
                    setTimeout(() => {
                        clearInterval(interval);
                    }, 1500);
                }
            }
        },
        shrink: (player) => {
            let discs = that.room.getDiscs() ? that.room.getDiscs() : [];
            let disc = discs.find((d) => d.playerId === player.id);
            if (disc) {
                let discId = discs.indexOf(disc);
                if (discId >= 1) {
                    let r = 15;
                    let interval = setInterval(() => {
                        r -= 0.75;
                        that.room.setDiscProperties(discId, { radius: r });
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
                let origTeamColors = that.room.state.teamColors[teamId];
                let interval = setInterval(() => {
                    let newColor = parseInt(chroma.random().saturate(3).hex().substring(1), 16);
                    that.room.setTeamColors(teamId, 0, 0, newColor);
                }, 75);
                setTimeout(() => {
                    clearInterval(interval);
                    that.room.setTeamColors(
                        teamId,
                        origTeamColors.angle * 1.40625,
                        origTeamColors.text,
                        ...origTeamColors.inner
                    );
                }, 2000);
            }
        },
    };

    this.onTeamGoal = function (teamId) {
        setTimeout(() => {
            let player = matchHistory.scorer;
            if (player && player.user?.subscription) {
                switch (player.user.subscription.scoreAnimId) {
                    case 1:
                        that.anims.grow(player);
                        break;
                    case 2:
                        that.anims.shrink(player);
                        break;
                    case 3:
                        that.anims.rainbow(player);
                        break;
                }
                if (player.user.subscription.scoreMessage) {
                    commands.printchat(player.user.subscription.scoreMessage, null, "vip-message");
                }
            }
        }, 100);
    };

    this.onPositionsReset = this.onGameStart = function () {
        that.playersModifiers.forEach((m) => {
            Utils.runAfterGameTick(() => {
                that.room.setDiscProperties(that.getPlayerDiscId(m.playerId), m.discProperties);
            });
        });
    };

    this.onPlayerLeave = function (pObj) {
        that.playersModifiers = that.playersModifiers.filter((m) => m.playerId !== pObj.id);
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        authPlugin = that.room.plugins.find((p) => p.name === "lmbAuth");
        matchHistory = that.room.plugins.find((p) => p.name === "lmbMatchHistory");
        if (!commands || !authPlugin || !matchHistory) {
            console.log("El plugin de subs requiere de los plugins: commands, auth, matchHistory.");
        } else {
            commands.registerCommand(
                "!",
                "vip",
                (msg, args) => {
                    that.room.fakeSendPlayerChat("!help vip", msg.byId);
                },
                "Alias para el comando !help vip",
                true
            );
            commands.registerCommand(
                "!",
                "festejo",
                (msg, args) => {
                    if (args.length === 0) {
                        commands.printchat(
                            "[0] - Ninguno\n[1] - Agrandarse\n[2] - Encogerse\n[3] - Arcoíris\n\nUso: !festejo <id>",
                            msg.byId
                        );
                    } else {
                        let player = that.room.getPlayer(msg.byId);
                        if (player) {
                            if (args[0] === "0") {
                                player.user.subscription.scoreAnimId = 0;
                            } else if (args[0] === "1") {
                                player.user.subscription.scoreAnimId = 1;
                                commands.printchat("Tu nuevo festejo de gol es Agrandarse!", msg.byId);
                            } else if (args[0] === "2") {
                                player.user.subscription.scoreAnimId = 2;
                                commands.printchat("Tu nuevo festejo de gol es Encogerse!", msg.byId);
                            } else if (args[0] === "3") {
                                player.user.subscription.scoreAnimId = 3;
                                commands.printchat("Tu nuevo festejo de gol es Arcoíris!", msg.byId);
                            } else {
                                commands.printchat("El festejo elegido no existe 😕", msg.byId);
                                return;
                            }

                            authPlugin.updatePlayerSubscriptionData(player.id, {
                                scoreAnimId: player.user.subscription.scoreAnimId,
                            });
                        }
                    }
                },
                "⭐ [VIP] Cambia la animación del festejo ante goles.",
                false,
                0,
                1
            );
            commands.registerCommand(
                "!",
                "mensajegol",
                (msg, args) => {
                    if (args.length === 0) {
                        commands.printchat(
                            "Uso: '!mensajegol Este es mi mensaje!', o '!mensajegol 0' para desactivarlo.",
                            msg.byId
                        );
                    } else {
                        let player = that.room.getPlayer(msg.byId);
                        if (player) {
                            if (args[0] === "0") {
                                authPlugin.updatePlayerSubscriptionData(player.id, {
                                    scoreMessage: null,
                                });
                                player.scoreMessage = null;
                            } else {
                                const message = args.join(" ");
                                authPlugin.updatePlayerSubscriptionData(player.id, {
                                    scoreMessage: message,
                                });
                                player.user.subscription.scoreMessage = message;
                            }
                        }
                    }
                },
                "⭐ [VIP] Cambia el mensaje de festejo ante goles.",
                false,
                0,
                1
            );
            commands.registerCommand(
                "!",
                "radio",
                (msg, args) => {
                    var gamemodesPlugin = that.room.plugins.find((plugin) => plugin.name === "lmbGamemodes");
                    if (gamemodesPlugin?.gamemode === gamemodesPlugin.Gamemodes.Freeroam) {
                        if (args.length === 0) {
                            commands.printchat("Uso: '!radio <número entre 5 y 30>'", msg.byId);
                        } else if (!isNaN(args[0]) && args[0] >= 5 && args[0] <= 30) {
                            let player = that.room.getPlayer(msg.byId);
                            if (player) {
                                var discId = that.room.getDiscs()?.indexOf(player.disc);
                                if (discId !== -1) {
                                    that.playersModifiers.push({
                                        playerId: player.id,
                                        discProperties: { radius: parseInt(args[0]) },
                                    });
                                    that.room.setDiscProperties(discId, { radius: parseInt(args[0]) });
                                }
                            }
                        } else {
                            commands.printchat(
                                "El número debe ser un entero entre 5 y 30! ej: ' !radio 5 '",
                                msg.byId,
                                "error"
                            );
                        }
                    } else {
                        commands.printchat("🙁 Este comando solo funciona en Juegan Todos!", msg.byId);
                    }
                },
                "⭐ [VIP] En las salas Juegan Todos, permite cambiar el tamaño del disco.",
                false,
                0,
                1
            );
        }
    };
};
