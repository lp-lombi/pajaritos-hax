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
        lastPlayerInteractedBall = null,
        lastPlayerTouchedBall = null,
        lastPlayerKickedBall = null,
        playerBallInteractHistory = [],
        that = this;

    this.scorer = null;
    this.assister = null;

    function printHistory(playerId) {
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
    }

    function handleSumDBScore(player, sumScore) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.sumUserStats(player.name, sumScore, 0, 0, 0);
            }
        }
    }

    function handleSumDBAssists(player, sumAssists) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.sumUserStats(player.name, 0, sumAssists, 0, 0);
            }
        }
    }

    function handleSumDBWin(player, sumWins) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.sumUserStats(player.name, 0, 0, sumWins, 0);
            }
        }
    }

    function handleSumDBMatch(player, sumMatch) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.sumUserStats(player.name, 0, 0, 0, sumMatch);
            }
        }
    }

    function addPlayerBallInteraction(player, reason) {
        let obj = {
            reason: reason,
            player: player,
        };
        if (playerBallInteractHistory.length === 0) {
            playerBallInteractHistory.push(obj);
        } else if (playerBallInteractHistory.length > 0) {
            let last =
                playerBallInteractHistory[playerBallInteractHistory.length - 1];
            if (reason === "touch") {
                if (last.player.id === player.id && last.reason === "touch") {
                    return;
                } else {
                    playerBallInteractHistory.push(obj);
                }
            } else {
                playerBallInteractHistory.push(obj);
            }
        }
        if (playerBallInteractHistory.length > 5) {
            playerBallInteractHistory.splice(0, 1);
        }
    }

    function clearHistory() {
        matchHistory = [];
    }

    function printPlayersSessionStats(targetId) {
        var str = "";
        if (that.getPlayersSessionStats().length === 0) {
            that.room.sendAnnouncement(
                "No hay registros.",
                targetId,
                commands.getColors().orange,
                "bold",
                2
            );
        } else {
            let playersStats = that
                .getPlayersSessionStats()
                .slice()
                .sort((a, b) => {
                    return b.score - a.score;
                });
            let reversedPlayersStats = playersStats.slice().reverse();
            reversedPlayersStats.forEach((p) => {
                title = `${playersStats.indexOf(p) + 1}. ${p.player.name}\n`;
                body = `${p.score} goles - ${p.assists} asistencias\n `;

                that.room.sendAnnouncement(
                    title,
                    targetId,
                    commands.getColors().lightOrange,
                    "bold",
                    0
                );
                that.room.sendAnnouncement(
                    body,
                    targetId,
                    commands.getColors().lightOrange,
                    "small-bold",
                    0
                );
            });
            that.room.sendAnnouncement(
                "",
                targetId,
                commands.getColors().lightOrange,
                "small-bold",
                2
            );
        }
    }

    function printPlayersDbStats(targetId, page = 0) {
        if (auth) {
            const maxPlayers = 15;
            auth.getAllUsersStats().then((data) => {
                var stats = data.filter((s) => s.matches > 0);
                stats.sort((a, b) => (a.rating > b.rating ? -1 : 1));
                if (stats.length === 0) {
                    that.room.sendAnnouncement(
                        "No hay registros.",
                        targetId,
                        commands.getColors().orange,
                        "bold",
                        2
                    );
                }

                let rest = stats.splice(maxPlayers, stats.length);
                let reversedStats = stats.slice().reverse();

                reversedStats.forEach((s) => {
                    var title = "";
                    var body = "";

                    title = `${stats.indexOf(s) + 1}. ${s.username} - ${
                        s.rating
                    }\n`;
                    body = `${s.score} goles - ${s.assists} asistencias - Pj: ${s.matches} / Pg: ${s.wins}\n `;

                    that.room.sendAnnouncement(
                        title,
                        targetId,
                        commands.getColors().orange,
                        "bold",
                        0
                    );
                    that.room.sendAnnouncement(
                        body,
                        targetId,
                        commands.getColors().orange,
                        "small-bold",
                        0
                    );
                });

                let isLogged = false;
                let promises = [];

                auth.getLoggedPlayers().forEach((p) => {
                    if (p.id === targetId) {
                        let promise = auth
                            .getUserStats(p.name)
                            .then((s) => {
                                isLogged = true;

                                let str = `Tus stats: ${s.score} goles - ${s.assists} asistencias - Pj: ${s.matches} / Pg: ${s.wins} - (${s.rating})`;

                                that.room.sendAnnouncement(
                                    str,
                                    targetId,
                                    commands.getColors().lightOrange,
                                    "small-bold",
                                    2
                                );
                            })
                            .catch((err) => {
                                console.log(err);
                            });
                        promises.push(promise);
                    }
                });

                Promise.all(promises).then(() => {
                    if (!isLogged) {
                        that.room.sendAnnouncement(
                            "Para guardar tus stats, registrate o inicia sesión.",
                            targetId,
                            commands.getColors().lightOrange,
                            "small-bold",
                            2
                        );
                    }
                });
            });
        }
    }

    this.getPlayersSessionStats = function () {
        let stats = [];
        that.room.players.forEach((p) => {
            if (
                p.sessionStats &&
                (p.sessionStats.score > 0 || p.sessionStats.assists > 0)
            )
                stats.push({
                    player: p,
                    score: p.sessionStats.score,
                    assists: p.sessionStats.assists,
                });
        });
        return stats;
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

            that.room.onPlayerBallKick = (playerId) => {
                lastPlayerKickedBall = lastPlayerInteractedBall =
                    that.room.players.find((p) => p.id === playerId);
                addPlayerBallInteraction(
                    that.room.players.find((p) => p.id === playerId),
                    "kick"
                );
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
                        addPlayerBallInteraction(player, "touch");
                    }
                }
            };

            commands.onGameEndQueue.push((winningTeamId) => {
                matchHistory.push({
                    winner: winningTeamId,
                    redScore: that.room.redScore,
                    blueScore: that.room.blueScore,
                    time: new Date().getTime(),
                });
                if (matchHistory.length > 30) {
                    matchHistory.splice(0, 1);
                }

                //
                if (auth) {
                    auth.getLoggedPlayers().forEach((p) => {
                        if (p.team.id === winningTeamId) {
                            handleSumDBWin(p, 1);
                        }
                        if (p.team.id !== 0) {
                            handleSumDBMatch(p, 1);
                        }
                    });
                }
            });

            commands.onTeamGoalQueue.push((teamId, customData) => {
                try {
                    // Para que el gol sea computado positivo, tiene que haber sido el último jugador en interactuar
                    // con la pelota, ya sea pateando o tocandola.
                    if (
                        lastPlayerInteractedBall &&
                        lastPlayerInteractedBall.team.id === teamId
                    ) {
                        lastPlayerInteractedBall.sessionStats.score += 1;
                        handleSumDBScore(lastPlayerInteractedBall, 1);
                        that.scorer = lastPlayerInteractedBall;
                        setTimeout(() => {
                            that.scorer = null;
                        }, 3000);

                        // Para la asistencia, la anterior interacción tuvo que haber sido un pateo de un jugador del mismo equipo
                        if (playerBallInteractHistory.length > 1) {
                            let penultimate = playerBallInteractHistory.at(-2);
                            let last = playerBallInteractHistory.at(-1);
                            if (
                                penultimate.player &&
                                penultimate.player.team.id === teamId &&
                                penultimate.player.id !== last.player.id &&
                                penultimate.reason === "kick"
                            ) {
                                penultimate.player.sessionStats.assists += 1;
                                handleSumDBAssists(penultimate.player, 1);
                                that.assister = penultimate.player;
                                setTimeout(() => {
                                    that.assister = null;
                                }, 3000);
                            }
                        }
                    } else if (lastPlayerKickedBall) {
                        if (lastPlayerKickedBall.team.id !== teamId) {
                            // Para que el gol sea computado negativo, sólo cuenta si fue el último en patearla.
                            let player = that.room.players.find(
                                (p) => p.id === lastPlayerKickedBall.id
                            );
                            if (!player) return;
                            player.sessionStats.score -= 1;
                            handleSumDBScore(player, -1);
                        }
                    }

                    lastPlayerInteractedBall =
                        lastPlayerTouchedBall =
                        lastPlayerKickedBall =
                            null;
                    playerBallInteractHistory = [];
                } catch (e) {
                    console.log(e);
                }
            });

            commands.onPlayerJoinQueue.push((pObj) => {
                setTimeout(() => {
                    let player = that.room.players.find((p) => pObj.V == p.id);
                    if (player) {
                        player.sessionStats = {
                            score: 0,
                            assists: 0,
                        };
                    }
                }, 500);
            });
        }
    };
};
