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
        playerBallInteractHistory = [],
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

    function handleSumDBAssists(player, sumAssists) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.getUserAssists(player.name).then((assists) => {
                    auth.setUserAssists(player.name, assists + sumAssists);
                });
            }
        }
    }

    function handleSumDBScore(player, sumScore) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.getUserScore(player.name).then((score) => {
                    auth.setUserScore(player.name, score + sumScore);
                });
            }
        }
    }

    function handleSumDBWin(player, sumWins) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.getUserWins(player.name).then((wins) => {
                    auth.setUserWins(player.name, wins + sumWins);
                });
            }
        }
    }

    function handleSumDBMatch(player, sumMatch) {
        if (auth) {
            if (auth.getLoggedPlayers().includes(player)) {
                auth.getUserMatches(player.name).then((matches) => {
                    auth.setUserMatches(player.name, matches + sumMatch);
                });
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

    function clearPlayersSessionStats() {
        playersSessionStats = [];
    }

    function printPlayersSessionStats(playerId) {
        var str = "";
        if (playersSessionStats.length === 0) {
            str = "No hay registros.";
        } else {
            playersSessionStats.sort((a, b) => (a.score > b.score ? -1 : 1));
            playersSessionStats.forEach((p) => {
                str +=
                    "[" +
                    (playersSessionStats.indexOf(p) + 1) +
                    "]" +
                    " | " +
                    p.score +
                    " goles | " +
                    p.assists +
                    " asistencias |          " +
                    p.player.name +
                    "\n";
            });
        }
        commands.printchat("Stats de los jugadores:\n" + str, playerId);
    }

    function printPlayersDbStats(targetId) {
        if (auth) {
            const maxPlayers = 15;
            auth.getAllUsersStats().then((data) => {
                var stats = data.filter((s) => s.matches > 0);
                stats.sort((a, b) =>
                    that.calcRating(a) > that.calcRating(b) ? -1 : 1
                );
                if (stats.length === 0) {
                    that.room.sendAnnouncement(
                        "No hay registros.",
                        targetId,
                        commands.getColors().orange,
                        "bold",
                        0
                    );
                }

                let rest = stats.splice(maxPlayers, stats.length);
                let reversedStats = stats.slice().reverse();

                reversedStats.forEach((s) => {
                    var title = "";
                    var body = "";

                    var rating = that.calcRating(s);

                    title = `${stats.indexOf(s) + 1}. ${
                        s.username
                    } - ${rating}\n`;
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
                        let promise = auth.getUserStats(p.name).then((s) => {
                            isLogged = true;

                            let str = `Tus stats: ${s.score} goles - ${s.assists} asistencias - Pj: ${s.matches} / Pg: ${s.wins}`;

                            that.room.sendAnnouncement(
                                str,
                                targetId,
                                commands.getColors().lightOrange,
                                "small-bold",
                                2
                            );
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

    this.calcRating = function (stats) {
        const baseScore = 1000;
        const scoreWeight = 4; // Peso de cada gol
        const assistWeight = 3; // Peso de cada asistencia
        const matchWeight = -3; // Peso de cada partido jugado (penalización para evitar inflar la puntuación solo por jugar muchos partidos)
        const winWeight = 6; // Peso de cada victoria

        const rating =
            baseScore +
            stats.score * scoreWeight +
            stats.assists * assistWeight +
            stats.matches * matchWeight +
            stats.wins * winWeight;

        return rating;
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
                        // Para la asistencia, la anterior interacción tuvo que haber sido un pateo de un jugador del mismo equipo
                        if (playerBallInteractHistory.length > 1) {
                            let penultimate =
                                playerBallInteractHistory[
                                    playerBallInteractHistory.length - 2
                                ];
                            let last =
                                playerBallInteractHistory[
                                    playerBallInteractHistory.length - 1
                                ];
                            if (
                                penultimate.player.team.id === teamId &&
                                penultimate.player.id !== last.player.id &&
                                penultimate.reason === "kick"
                            ) {
                                playerInStats = playersSessionStats.find(
                                    (p) => p.player.id === penultimate.player.id
                                );
                                if (!playerInStats) {
                                    playersSessionStats.push({
                                        player: penultimate.player,
                                        score: 0,
                                        assists: 0,
                                    });
                                    playerInStats =
                                        playersSessionStats[
                                            playersSessionStats.length - 1
                                        ];
                                }
                                playerInStats.assists += 1;
                                handleSumDBAssists(playerInStats.player, 1);
                            }
                        }
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
                    playerBallInteractHistory = [];
                } catch (e) {
                    console.log(e);
                }
            });

            commands.onPlayerLeaveQueue.push((id) => {
                let ps = playersSessionStats.find((p) => p.player.id === id);
                if (ps) {
                    playersSessionStats.splice(
                        playersSessionStats.indexOf(ps),
                        1
                    );
                }
            });
        }
    };
};
