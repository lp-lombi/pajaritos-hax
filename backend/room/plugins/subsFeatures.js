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
            let origColors = team.colors;
            let interval = setInterval(() => {
                let newColor = chroma.random().saturate(3).hex().substring(1);
                that.room.setTeamColors(team.id, 0, 0, newColor);
            }, 75);
            setTimeout(() => {
                clearInterval(interval);
                console.log(origColors);
                that.room.setTeamColors(
                    team.id,
                    origColors.angle,
                    origColors.text.toString(16),
                    ...origColors.inner.map((c) => c.toString(16))
                );
            }, 2000);
        },
    };

    this.onTeamGoal = function (teamId) {
        setTimeout(() => {
            let player = matchHistory.scorer;
            if (player && player.subscription) {
                switch (player.subscription.scoreAnimId) {
                    case 1:
                        that.anims.grow(player);
                    case 2:
                        that.anims.shrink(player);
                    case 3:
                        that.anims.rainbow(player);
                }
                if (player.subscription.scoreMessage) {
                    commands.printchat(player.subscription.scoreMessage, null, "vip-message");
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
                                    player.subscription.scoreAnimId = 0;
                                } else if (args[0] === "1") {
                                    player.subscription.scoreAnimId = 1;
                                    commands.printchat("Tu nuevo festejo de gol es Agrandarse!", msg.byId);
                                } else if (args[0] === "2") {
                                    player.subscription.scoreAnimId = 2;
                                    commands.printchat("Tu nuevo festejo de gol es Encogerse!", msg.byId);
                                } else if (args[0] === "3") {
                                    player.subscription.scoreAnimId = 3;
                                    commands.printchat("Tu nuevo festejo de gol es Arcoíris!", msg.byId);
                                } else {
                                    commands.printchat("El festejo elegido no existe 😕", msg.byId);
                                    return;
                                }

                                authPlugin.updatePlayerSubscriptionData(player.id, {
                                    scoreAnimId: player.subscription.scoreAnimId,
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
                                    player.subscription.scoreMessage = message;
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
