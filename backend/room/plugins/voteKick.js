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
    Plugin.call(this, "lmbVoteKick", true, {
        version: "0.1",
        author: "lombi",
        description: `Plugin para votar kickear jugadores.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var that = this;
    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands = null;
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
            that.requiredVotes = Math.round(commands.getPlayers().length * 0.6);
            sleep(45 * 1000).then(() => {
                if (that.voters.length >= that.requiredVotes) {
                    commands.printchat(`La gente decidió fusilar a ${that.toKickName}.`, null, "alert");
                    sleep(2000).then(() => {
                        that.room.kickPlayer(id, "Tomate el palo.");
                    });
                } else {
                    commands.printchat(`No se kickea a ${that.toKickName}.`, null, "alert");
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
            console.log("El plugin de votekick requiere del plugin de comandos.");
        } else {
            commands.registerCommand(
                "!",
                "votekick",
                (msg, args) => {
                    if (args.length === 0) {
                        if (!that.voting) {
                            let str = "";
                            commands.getPlayers().forEach((p) => {
                                if (!p.isAdmin) {
                                    str += `[${p.id}] ${p.name}\n`;
                                }
                            });
                            str += "!votekick <id> : inicia la votación para kickear a dicho jugador. Ej: !votekick 2";
                            commands.printchat(str, msg.byId);
                        } else {
                            commands.printchat("Ya hay una votación en curso.", msg.byId);
                        }
                    } else if (!that.voting) {
                        if (!isNaN(args[0])) {
                            let id = parseInt(args[0]);
                            commands.getPlayers().forEach((p) => {
                                if (p.id === id) {
                                    that.voting = true;
                                    let kicker = commands.getPlayers().find((p) => p.id === msg.byId);
                                    if (kicker && id !== 0) {
                                        that.toKickName = p.name;
                                        commands.printchat(
                                            `" ${kicker.name} " inició una votación para kickear a un jugador (45 segundos para votar).\n\n>>> VOTACIÓN PARA KICKEAR A " ${that.toKickName} " <<<\n\n>>> !votekick si\n>>> !votekick no`,
                                            null,
                                            "alert"
                                        );
                                        awaitVote(id);
                                    }
                                }
                            });
                        }
                    } else if (that.voting) {
                        let voter = commands.getPlayers().find((p) => p.id === msg.byId);
                        if (voter) {
                            if (args[0] === "si" || args[0] === "no") {
                                if (that.voters.indexOf(voter.auth) === -1) {
                                    if (args[0] === "si") {
                                        that.voters.push(voter.auth);

                                        // si es sub, su voto vale doble
                                        let authPlugin = that.room.plugins.find((p) => p.name === "lmbAuth");
                                        let isSub = authPlugin && authPlugin.isPlayerSubscribed(msg.byId);
                                        if (isSub) {
                                            that.voters.push(voter.auth);
                                        }

                                        commands.printchat(
                                            `${voter.name} votó SÍ a expulsar a >>> ${that.toKickName} <<< ( ${that.voters.length} / ${that.requiredVotes} )\n>>> !votekick si\n>>> !votekick no`,
                                            null,
                                            "alert"
                                        );

                                        if (isSub) {
                                            commands.printchat(
                                                `⭐ El voto de ${voter.name} vale x2.`,
                                                null,
                                                "announcement-mute"
                                            );
                                        }
                                    } else if (args[0] === "no") {
                                        if (that.voters.indexOf(msg.byId) === -1) {
                                            commands.printchat(
                                                `${voter.name} votó NO a expulsar a >>> ${that.toKickName} <<< ( ${that.voters.length} / ${that.requiredVotes} )\n>>> !votekick si\n>>> !votekick no`,
                                                null,
                                                "alert"
                                            );
                                        } else {
                                            commands.printchat(`Ya votaste.`, msg.byId);
                                        }
                                    }
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
