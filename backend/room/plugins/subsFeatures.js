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
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        authPlugin = that.room.plugins.find((p) => p.name === "lmbAuth");
        matchHistory = that.room.plugins.find(
            (p) => p.name === "lmbMatchHistory"
        );
        if (!commands || !authPlugin || !matchHistory) {
            console.log(
                "El plugin de subs requiere de los plugins: commands, auth, matchHistory."
            );
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
                                "[0] - Ninguno\n[1] - Agrandarse\n[2] - Encogerse\n\nUso: !festejo <id>",
                                msg.byId
                            );
                        } else {
                            let player = that.room.getPlayer(msg.byId);
                            if (player) {
                                if (args[0] === "0") {
                                    player.celebration = 0;
                                } else if (args[0] === "1") {
                                    player.celebration = 1;
                                    commands.printchat(
                                        "Tu nuevo festejo de gol es Agrandarse!",
                                        msg.byId
                                    );
                                } else if (args[0] === "2") {
                                    player.celebration = 2;
                                    commands.printchat(
                                        "Tu nuevo festejo de gol es Encogerse!!",
                                        msg.byId
                                    );
                                }
                            }
                        }
                    }
                },
                "⭐ [VIP] Cambia la animación del festejo ante goles."
            );
            commands.onTeamGoalQueue.push((teamId) => {
                setTimeout(() => {
                    let player = matchHistory.scorer;
                    if (
                        player &&
                        authPlugin.isPlayerSubscribed(player.id) &&
                        player.celebration
                    ) {
                        if (player.celebration === 1) {
                            that.anims.grow(player);
                        } else if (player.celebration === 2) {
                            that.anims.shrink(player);
                        }
                    }
                }, 100);
            });
        }
    };
};
