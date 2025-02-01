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

    var that = this;

    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands;

    const chroma = require("chroma-js");

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
        rainbow: (player) => {
            let team = player.team;
            let origTeamColors = team.colors;
            let interval = setInterval(() => {
                let newColor = chroma.random().saturate(3).hex().substring(1);
                that.room.setTeamColors(team.id, 0, 0, newColor);
            }, 75);
            setTimeout(() => {
                clearInterval(interval);
                that.room.setTeamColors(
                    team.id,
                    origTeamColors.angle,
                    origTeamColors.text.toString(16),
                    ...origTeamColors.inner.map((c) => c.toString(16))
                );
            }, 2000);
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

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        authPlugin = that.room.plugins.find((p) => p.name === "lmbAuth");
        matchHistory = that.room.plugins.find((p) => p.name === "lmbMatchHistory");
        if (!commands || !authPlugin || !matchHistory) {
            console.log("El plugin de subs requiere de los plugins: commands, auth, matchHistory.");
        } else {
            commands.registerCommand(
                "!",
                "festejo",
                (msg, args) => {
                    if (!authPlugin.isPlayerSubscribed(msg.byId)) {
                        commands.printchat(
                            "🙁 Comando exclusivo para VIPs. Entrá a nuestro discord para conocer más!",
                            msg.byId,
                            "error"
                        );
                    } else {
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
                    }
                },
                "⭐ [VIP] Cambia la animación del festejo ante goles."
            );
            commands.registerCommand(
                "!",
                "mensajegol",
                (msg, args) => {
                    if (!authPlugin.isPlayerSubscribed(msg.byId)) {
                        commands.printchat(
                            "🙁 Comando exclusivo para VIPs. Entrá a nuestro discord para conocer más!",
                            msg.byId,
                            "error"
                        );
                    } else {
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
                    }
                },
                "⭐ [VIP] Cambia el mensaje de festejo ante goles."
            );
        }
    };
};
