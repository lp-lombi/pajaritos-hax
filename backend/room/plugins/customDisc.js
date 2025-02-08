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
    Plugin.call(this, "lmbCustomDisc", true, {
        version: "0.1",
        author: "lombi",
        description: `Plugin manipular discos.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var that = this;

    this.active = true;

    this.getAllDiscs = () => {
        let discs = that.room.getDiscs() ? that.room.getDiscs() : [];
        return discs;
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        authPlugin = that.room.plugins.find((p) => p.name === "lmbAuth");

        if (!commands) {
            console.log("El plugin de discos requiere del plugin de comandos.");
        } else {
            commands.registerCommand(
                "!",
                "cd",
                (msg, args) => {
                    if (args.length !== 3) {
                        if (args[0]) {
                            if (args[0] === "lock") {
                                that.active = !that.active;
                            }
                        } else {
                            let discs = that.getAllDiscs();
                            let str = "[0] Pelota\n";
                            discs.forEach((d) => {
                                if (d.playerId !== null) {
                                    str += `[${d.playerId}] - ${that.room.getPlayer(d.playerId).name}\n`;
                                }
                            });
                            str += "\nUso: !cd <id> <opcion> <valor>\n\nOpciones:\nr -> radio | v -> velocidad";
                            commands.printchat(str, msg.byId);
                        }
                    } else {
                        if (that.active) {
                            if (args[0] === "0") {
                                if (args[1] === "r" && !isNaN(args[2])) {
                                    that.room.setDiscProperties(args[0], {
                                        radius: parseInt(args[2]),
                                    });
                                }
                            } else if (!isNaN(args[0])) {
                                let player = that.room.getPlayer(parseInt(args[0]));
                                if (player && player.disc) {
                                    if (args[1] === "r" && !isNaN(args[2])) {
                                        let discId = null;
                                        that.getAllDiscs().forEach((d) => {
                                            if (d.playerId === parseInt(args[0])) {
                                                discId = that.getAllDiscs().indexOf(d);
                                            }
                                        });
                                        if (discId !== null) {
                                            that.room.setDiscProperties(discId, {
                                                radius: parseInt(args[2]),
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "Modifica los discos.",
                false,
                2
            );
        }
    };
};
