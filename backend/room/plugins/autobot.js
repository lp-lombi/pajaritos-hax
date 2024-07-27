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
    Plugin.call(this, "lmbAutobot", true, {
        version: "0.1",
        author: "lombi",
        description: `Permite al bot administrar los partidos.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    function getTeams() {
        let spects = [];
        let rTeam = [];
        let bTeam = [];
        that.room.players.forEach((p) => {
            if (p.id !== 0) {
                switch (p.team.id) {
                    case 0:
                        spects.push(p);
                        break;
                    case 1:
                        rTeam.push(p);
                        break;
                    case 2:
                        bTeam.push(p);
                        break;
                }
            }
        });
        return { spects, rTeam, bTeam };
    }

    var commands,
        that = this;

    this.active = true;
    this.teamSize = 4;
    this.afkTimeMsecs = 25000;
    this.inactivePlayersIds = [];

    this.checkAfk = function () {
        this.inactivePlayersIds = [];
        that.room.players.forEach((p) => {
            if (p.team.id !== 0) {
                p.id > 0 ? this.inactivePlayersIds.push(p.id) : null;
            }
        });
        sleep(that.afkTimeMsecs).then(() => {
            if (that.room) {
                if (that.room.gameState && that.active) {
                    let teams = getTeams();
                    if (teams.spects.length > 0) {
                        for (let i = 0; i < teams.spects.length; i++) {
                            if (that.inactivePlayersIds[i]) {
                                that.room.setPlayerTeam(
                                    that.inactivePlayersIds[i],
                                    0
                                );
                            }
                        }
                    }
                }
                this.checkAfk();
            }
        });
    };

    this.checkTeams = function () {
        if (that.room !== null) {
            sleep(250).then(() => {
                if (that.room !== null) {
                    if (that.room.gameState && that.active) {
                        let teams = getTeams();
                        if (teams.spects.length > 0) {
                            if (
                                teams.rTeam.length < that.teamSize ||
                                teams.bTeam.length < that.teamSize
                            ) {
                                let t =
                                    teams.rTeam.length <= teams.bTeam.length
                                        ? 1
                                        : 2;
                                if (teams.spects[0]) {
                                    that.room.setPlayerTeam(
                                        teams.spects[0].id,
                                        t
                                    );
                                    commands.printchat(
                                        "Entrás al juego.",
                                        teams.spects[0].id,
                                        "alert"
                                    );
                                }
                            }
                        } else {
                            if (
                                Math.abs(
                                    teams.rTeam.length - teams.bTeam.length
                                ) > 1
                            ) {
                                if (teams.rTeam.length > teams.bTeam.length) {
                                    that.room.setPlayerTeam(
                                        teams.rTeam[0].id,
                                        2
                                    );
                                } else {
                                    that.room.setPlayerTeam(
                                        teams.bTeam[0].id,
                                        1
                                    );
                                }
                            }
                        }
                    }
                    this.checkTeams();
                }
            });
        }
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log(
                "El plugin de autobot requiere del plugin de comandos."
            );
        } else {
            that.checkTeams();
            that.checkAfk();
            commands.registerCommand(
                "!",
                "autobot",
                (msg, args) => {
                    if (args.length === 0) {
                        commands.printchat(
                            "Uso: ' !autobot on/off ' | !autobot equipos <tamaño> | !autobot afk <segundosAfk> ",
                            msg.byId,
                            "error"
                        );
                    } else {
                        switch (args[0]) {
                            case "on":
                                that.active = true;
                                commands.printchat(
                                    "Se activó el autobot",
                                    msg.byId
                                );
                                break;
                            case "off":
                                commands.printchat(
                                    "Se desactivó el autobot",
                                    msg.byId
                                );
                                that.active = false;
                                break;
                            case "equipos":
                                if (args[1]) {
                                    if (!isNaN(parseInt(args[1]))) {
                                        that.teamSize = parseInt(args[1]);
                                        commands.printchat(
                                            "El tamaño de los equipos cambió a " +
                                                args[1],
                                            msg.byId
                                        );
                                    }
                                }
                                break;
                            case "afk":
                                if (args[1]) {
                                    if (!isNaN(parseInt(args[1]))) {
                                        that.afkTimeMsecs =
                                            parseInt(args[1]) * 1000;
                                        commands.printchat(
                                            "El tiempo de inactividad considerado AFK cambió a " +
                                                args[1] +
                                                " segundos.",
                                            msg.byId
                                        );
                                    }
                                }
                                break;
                        }
                    }
                },
                "Ajustes del autobot de la sala. ' !autobot on/off ' | !autobot equipos <tamaño>",
                true
            );
            commands.onGameEndQueue.push((winningTeamId, customData = null) => {
                if (!that.active) return;
                let loserTeamId = winningTeamId === 1 ? 2 : 1;
                let loserPlayersIds = [];
                let spectPlayersIds = [];
                sleep(1500).then(() => {
                    // Primero se mueve a los perdedores a espectadores
                    that.room.players.forEach((p) => {
                        if (p.id !== 0) {
                            if (p.team.id === loserTeamId) {
                                loserPlayersIds.push(p.id);
                            }
                        }
                    });
                    loserPlayersIds.forEach((playerId) => {
                        that.room.setPlayerTeam(playerId, 0);
                    });

                    // Recién luego se mueve a los especatdores al juego
                    that.room.players.forEach((p) => {
                        if (p.id !== 0) {
                            if (p.team.id === 0) {
                                spectPlayersIds.push(p.id);
                            }
                        }
                    });
                    for (let i = 0; i < that.teamSize; i++)
                        if (spectPlayersIds[i]) {
                            that.room.setPlayerTeam(
                                spectPlayersIds[i],
                                loserTeamId
                            );
                        }
                    that.room.stopGame();
                    sleep(250).then(() => {
                        that.room.startGame();
                    });
                });
            });
            commands.sendInputQueue.push((msg) => {
                if (that.inactivePlayersIds.includes(msg.byId)) {
                    that.inactivePlayersIds.splice(
                        that.inactivePlayersIds.indexOf(msg.byId),
                        1
                    );
                }
            });
        }
    };
};
