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
    Plugin.call(this, "lmbVoteKick", true, {
        version: "0.1",
        author: "lombi",
        description: `Plugin para votar kickear jugadores.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var that = this;

    this.active = true;

    this.voting = false;
    this.voters = [];
    this.requiredVotes = 0;
    this.toKickName = "";

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    function awaitVote(id) {
        if (that.active) {
            that.requiredVotes = Math.round(that.room.players.length * 0.7);
            sleep(30000).then(() => {
                if (that.voters.length >= that.requiredVotes) {
                    commands.printchat(
                        `La gente decidió fusilar a ${that.toKickName}.`
                    );
                    sleep(2000).then(() => {
                        that.room.kickPlayer(id, "Tomate el palo.");
                    });
                } else {
                    commands.printchat(`No se kickea a ${that.toKickName}.`);
                }
                that.voters = [];
                that.requiredVotes = 100;
                that.toKickName = "";
                that.voting = false;
            });
        }
    }

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log(
                "El plugin de votekick requiere del plugin de comandos."
            );
        } else {
            commands.registerCommand(
                "!",
                "votekick",
                (msg, args) => {
                    if (args.length === 0) {
                        if (!that.voting) {
                            let str = "";
                            that.room.players.forEach((p) => {
                                if (!p.isAdmin) {
                                    str += `[${p.id}] ${p.name}\n`;
                                }
                            });
                            str +=
                                "!votekick <id> : inicia la votación para kickear a dicho jugador. Ej: !votekick 2";
                            commands.printchat(str, msg.byId);
                        } else {
                            commands.printchat(
                                "Ya hay una votación en curso.",
                                msg.byId
                            );
                        }
                    } else if (!that.voting) {
                        if (!isNaN(args[0])) {
                            let id = parseInt(args[0]);
                            that.room.players.forEach((p) => {
                                if (p.id === id) {
                                    that.voting = true;
                                    let kicker = that.room.players.find(
                                        (p) => p.id === msg.byId
                                    );
                                    if (kicker && id !== 0) {
                                        that.toKickName = p.name;
                                        commands.printchat(
                                            `${kicker.name} inició la votación para kickear al jugador ${that.toKickName} (30 SEGUNDOS).\n\n!votekick si | !votekick no`
                                        );
                                        awaitVote(id);
                                    }
                                }
                            });
                        }
                    } else if (that.voting) {
                        let voter = that.room.players.find(
                            (p) => p.id === msg.byId
                        );
                        if (voter) {
                            if (args[0] === "si") {
                                if (that.voters.indexOf(msg.byId) === -1) {
                                    that.voters.push(msg.byId);
                                    commands.printchat(
                                        `${voter.name} votó SÍ a expulsar a ${that.toKickName}( ${that.voters.length}/${that.requiredVotes}) | !votekick si | !votekick no.`
                                    );
                                } else {
                                    commands.printchat(`Ya votaste.`, msg.byId);
                                }
                            } else if (args[0] === "no") {
                                if (that.voters.indexOf(msg.byId) === -1) {
                                    commands.printchat(
                                        `${voter.name} votó NO a expulsar a ${that.toKickName}( ${that.voters.length}/${that.requiredVotes}) | !votekick si | !votekick no.`
                                    );
                                } else {
                                    commands.printchat(`Ya votaste.`, msg.byId);
                                }
                            }
                        }
                    }
                },
                "Inicia una votación para kickear a un jugador de la sala."
            );
        }
    };
};
