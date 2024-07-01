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
    Plugin.call(this, "lmbMatchHistory", true, {
        version: "0.1",
        author: "lombi",
        description: `Historial de partidos de la sesión.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var commands,
        auth,
        matchHistory = [],
        playersSessionStats = [],
        lastPlayerInteractedBall = null,
        lastPlayerTouchedBall = null,
        lastPlayerKickedBall = null,
        that = this;

    printHistory = (playerId) => {
        var str = "";
        matchHistory.forEach((m) => {
            if (matchHistory.length === 0) {
                str = "No hay registros.";
            } else {
                str +=
                    "[" +
                    (matchHistory.indexOf(m) + 1) +
                    "] " +
                    "Ganador: " +
                    (m.winner === 1 ? "Rojo | " : "Azul | ") +
                    "(" +
                    m.redScore +
                    " a " +
                    m.blueScore +
                    ")\n";
            }
        });
        var redVict = 0;
        var blueVict = 0;
        matchHistory.forEach((m) => (m.winner === 1 ? redVict++ : blueVict++));

        str +=
            "Red ganó " +
            redVict +
            " veces | Blue ganó " +
            blueVict +
            " veces | (diff " +
            (redVict > blueVict ? redVict - blueVict : blueVict - redVict) +
            ")";

        commands.printchat("Historial:\n" + str, playerId);
    };

    handleSumDBScore = (player, sumScore) => {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.getUserScore(player.name).then((score) => {
                    auth.setUserScore(player.name, score + sumScore);
                });
            }
        }
    };

    clearHistory = () => {
        matchHistory = [];
    };

    clearPlayersSessionStats = () => {
        playersSessionStats = [];
    };

    printPlayersSessionStats = (playerId) => {
        var str = "";
        if (playersSessionStats.length === 0) {
            str = "No hay registros.";
        } else {
            playersSessionStats.sort((a, b) => (a.score > b.score ? -1 : 1));
            playersSessionStats.forEach((p) => {
                str +=
                    "[" +
                    (playersSessionStats.indexOf(p) + 1) +
                    "] " +
                    p.player.name +
                    " | " +
                    p.score +
                    " goles\n";
            });
        }
        commands.printchat("Stats de los jugadores:\n" + str, playerId);
    };

    printPlayersDbStats = (playerId) => {
        if (auth) {
            var str = "";
            auth.getAllUsersStats().then((stats) => {
                stats.sort((a, b) => (a.score > b.score ? -1 : 1));
                if (stats.length === 0) {
                    str = "No hay registros.";
                }
                stats.forEach((s) => {
                    str +=
                        "[" +
                        (stats.indexOf(s) + 1) +
                        "] " +
                        s.username +
                        " | " +
                        s.score +
                        " goles\n";
                });
                commands.printchat("Stats de los jugadores:\n" + str, playerId);
            });
        }
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        auth = that.room.plugins.find((p) => p.name === "lmbAuth");
        if (!commands) {
            console.log(
                "El plugin de historial requiere del plugin de comandos."
            );
        } else {
            commands.registerCommand(
                "!",
                "hist",
                (msg, args) => {
                    if (args.length === 0) {
                        printHistory(msg.byId);
                    } else if (args.length === 1) {
                        if (args[0] === "clear") {
                            clearHistory();
                        }
                    }
                },
                "Muestra el historial de partidos.",
                false,
                false
            );
            commands.registerCommand(
                "!",
                "stats",
                (msg, args) => {
                    if (args.length === 0) {
                        commands.printchat(
                            "' !stats s ' - Stats de sesión de hoy\n' !stats db ' - Stats históricos (se guardan los de aquellos usuarios logueados) ",
                            msg.byId
                        );
                    } else if (args[0] === "db") {
                        printPlayersDbStats(msg.byId);
                    } else if (args[0] === "s") {
                        printPlayersSessionStats(msg.byId);
                    } else if (args[0] === "clear") {
                        clearPlayersSessionStats();
                    }
                },
                "Muestra los goles de cada jugador.",
                false,
                false
            );

            that.room.onGameEnd = (winningTeamId) => {
                matchHistory.push({
                    winner: winningTeamId,
                    redScore: that.room.redScore,
                    blueScore: that.room.blueScore,
                    time: new Date().getTime(),
                });
            };
            that.room.onPlayerBallKick = (playerId) => {
                lastPlayerKickedBall = lastPlayerInteractedBall =
                    that.room.players.find((p) => p.id === playerId);
            };
            that.room.onCollisionDiscVsDisc = (
                discId1,
                discPlayerId1,
                discId2,
                discPlayerId2
            ) => {
                let ball = that.room.gameState.physicsState.discs[0];
                let ballCollided = false;
                let player = null;
                let playerCollided = false;

                if (that.room.getBall(discId1) === ball) {
                    ballCollided = true;
                } else if (that.room.getBall(discId2) === ball) {
                    ballCollided = true;
                }

                if (ballCollided) {
                    if (discPlayerId1 || discPlayerId2) {
                        playerCollided = true;
                        player = that.room.players.find(
                            (p) =>
                                p.id === discPlayerId1 || p.id === discPlayerId2
                        );
                        lastPlayerTouchedBall = lastPlayerInteractedBall =
                            player;
                    }
                }
            };
            that.room.onTeamGoal = (teamId) => {
                try {
                    if (
                        lastPlayerKickedBall.team.id === teamId ||
                        lastPlayerTouchedBall.team.id === teamId
                    ) {
                        // Para que el gol sea computado positivo, tiene que haber sido el último jugador en interactuar
                        // con la pelota, ya sea pateando o tocandola.
                        let playerInStats = playersSessionStats.find(
                            (p) => p.player.id === lastPlayerInteractedBall.id
                        );
                        if (!playerInStats) {
                            playersSessionStats.push({
                                player: lastPlayerInteractedBall,
                                score: 0,
                                assists: 0,
                            });
                            playerInStats = playersSessionStats.find(
                                (p) =>
                                    p.player.id === lastPlayerInteractedBall.id
                            );
                        }
                        playerInStats.score += 1;
                        handleSumDBScore(playerInStats.player, 1);
                    } else if (lastPlayerKickedBall) {
                        if (lastPlayerKickedBall.teamId !== teamId) {
                            // Para que el gol sea computado negativo, sólo cuenta si fue el último en patearla.
                            let playerInStats = playersSessionStats.find(
                                (p) => p.player.id === lastPlayerKickedBall.id
                            );
                            if (!playerInStats) {
                                playersSessionStats.push({
                                    player: lastPlayerKickedBall,
                                    score: 0,
                                    assists: 0,
                                });
                                playerInStats = playersSessionStats.find(
                                    (p) =>
                                        p.player.id === lastPlayerKickedBall.id
                                );
                            }
                            handleSumDBScore(playerInStats.player, -1);
                            playerInStats.score -= 1;
                        }
                    }

                    lastPlayerInteractedBall =
                        lastPlayerTouchedBall =
                        lastPlayerKickedBall =
                            null;
                } catch (e) {
                    console.log(e);
                }
            };
            that.room.onPlayerLeave = (playerObj, customData) => {
                let ps = playersSessionStats.find(
                    (p) => p.player.id === playerObj.id
                );
                if (ps) {
                    playersSessionStats.splice(
                        playersSessionStats.indexOf(ps),
                        1
                    );
                }
            };
        }
    };
};
