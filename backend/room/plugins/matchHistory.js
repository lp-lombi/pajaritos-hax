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

    /**
     * @type {import("./types").CommandsPlugin}
     */
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

    this.matchStatsData = {
        players: [],
        goals: [],
        assists: [],
        disconnectedPlayers: [],
    }; // TODO recién al finalizar el partido se guardan los stats

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

    function addPlayerBallInteraction(player, reason) {
        let obj = {
            reason: reason,
            player: player,
        };
        if (playerBallInteractHistory.length === 0) {
            playerBallInteractHistory.push(obj);
        } else if (playerBallInteractHistory.length > 0) {
            let last = playerBallInteractHistory[playerBallInteractHistory.length - 1];
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
        if (that.getPlayersSessionStats().length === 0) {
            that.room.sendAnnouncement("No hay registros.", targetId, commands.getColors().orange, "bold", 2);
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

                that.room.sendAnnouncement(title, targetId, commands.getColors().lightOrange, "bold", 0);
                that.room.sendAnnouncement(body, targetId, commands.getColors().lightOrange, "small-bold", 0);
            });
            that.room.sendAnnouncement("", targetId, commands.getColors().lightOrange, "small-bold", 2);
        }
    }

    function printPlayersDbStats(targetId, page = 1) {
        if (auth) {
            const pageSize = 15;
            let statsPages = [];

            auth.getAllUsersStats().then((data) => {
                var stats = data.filter((s) => s.matches > 0);
                stats.sort((a, b) => (a.rating > b.rating ? -1 : 1));
                if (stats.length === 0) {
                    that.room.sendAnnouncement("No hay registros.", targetId, commands.getColors().orange, "bold", 2);
                    return;
                } else {
                    for (let i = 0; i < stats.length; i += pageSize) {
                        if (i + pageSize < stats.length) {
                            statsPages.push(stats.slice(i, i + pageSize));
                        } else {
                            statsPages.push(stats.slice(i));
                        }
                    }
                }

                let reversedStats = [];
                if (statsPages[page - 1]) {
                    reversedStats = statsPages[page - 1].slice().reverse();
                } else {
                    that.room.sendAnnouncement("Página no válida.", targetId, commands.getColors().orange, "bold", 2);
                }

                reversedStats.forEach((s) => {
                    var title = "";
                    var body = "";

                    title = `${stats.indexOf(s) + 1}. ${s.username} - ${s.rating}\n`;
                    body = `${s.score} goles - ${s.assists} asistencias - Pj: ${s.matches} / Pg: ${s.wins}\n `;

                    that.room.sendAnnouncement(title, targetId, commands.getColors().orange, "bold", 0);
                    that.room.sendAnnouncement(body, targetId, commands.getColors().orange, "small-bold", 0);
                });

                let isLogged = false;
                let promises = [];

                auth.getLoggedPlayers().forEach((p) => {
                    if (p.id === targetId) {
                        let promise = auth
                            .getUserStats(p.name)
                            .then((s) => {
                                isLogged = true;

                                let str = "";

                                if (statsPages.length > 1 && statsPages[page - 1]) {
                                    str += `Página ${page} de ${statsPages.length} - !stats <pagina>\n`;
                                }

                                str += `Tus stats: ${s.score} goles - ${s.assists} asistencias - Pj: ${s.matches} / Pg: ${s.wins} - (${s.rating})`;

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
                        let str = "";
                        if (statsPages.length > 1 && statsPages[page - 1]) {
                            str += `Página ${page} de ${statsPages.length} - !stats <pagina>\n`;
                        }
                        str += "Para guardar tus stats, registrate o inicia sesión.";

                        that.room.sendAnnouncement(str, targetId, commands.getColors().lightOrange, "small-bold", 2);
                    }
                });
            });
        }
    }

    this.getPlayersSessionStats = function () {
        let stats = [];
        commands.getPlayers().forEach((p) => {
            if (p.sessionStats && (p.sessionStats.score > 0 || p.sessionStats.assists > 0))
                stats.push({
                    player: p,
                    score: p.sessionStats.score,
                    assists: p.sessionStats.assists,
                });
        });
        return stats;
    };

    this.onGameStart = () => {
        that.matchStatsData.players = commands.getPlayers().filter((p) => p.team.id > 0);
        that.matchStatsData.goals = [];
        that.matchStatsData.assists = [];
        that.matchStatsData.disconnectedPlayers = [];
    };

    this.onGameEnd = (winningTeamId) => {
        matchHistory.push({
            winner: winningTeamId,
            redScore: that.room.redScore,
            blueScore: that.room.blueScore,
            time: new Date().getTime(),
        });
        if (matchHistory.length > 30) {
            matchHistory.splice(0, 1);
        }

        let stats = [];

        that.matchStatsData.players.forEach((p) => {
            let plStat = {
                id: p.id,
                username: p.name,
                score: 0,
                assists: 0,
                wins: p.team.id === winningTeamId ? 1 : 0,
                matches: 1,
            };
            stats.push(plStat);
        });
        that.matchStatsData.goals.forEach((g) => {
            stats.forEach((ps) => {
                if (g.player?.id === ps.id) {
                    ps.score += g.value;
                }
            });
        });
        that.matchStatsData.assists.forEach((a) => {
            stats.forEach((ps) => {
                if (a.player?.id === ps.id) {
                    ps.score += a.value;
                }
            });
        });

        that.matchStatsData.disconnectedPlayers.forEach((p) => {
            stats.push({
                id: p.id,
                username: p.name,
                score: 0,
                assists: 0,
                wins: 0,
                matches: 1,
            });
        });

        stats.forEach((s) => {
            auth.sumUserStats(s.username, s.score, s.assists, s.wins, s.matches);
        });
    };

    this.onPlayerTeamChange = (playerId, teamId, byId) => {
        let player = commands.getPlayers().find((p) => p.id === playerId);
        if (player) {
            if (teamId > 0) {
                // primero se lo elimina si es que ya existe para evitar ser duplicado
                that.matchStatsData.players = that.matchStatsData.players.filter((p) => p.id !== playerId);
                that.matchStatsData.players.push(player);
            } else {
                that.matchStatsData.players = that.matchStatsData.players.filter((p) => p.id !== playerId);
            }
        }
    };

    this.onPlayerLeave = (playerObj) => {
        let disconnectedPlayer = that.matchStatsData.players.find((p) => p.id === playerObj.id);
        if (disconnectedPlayer) {
            that.matchStatsData.disconnectedPlayers.push(disconnectedPlayer);
        }

        that.matchStatsData.players = that.matchStatsData.players.filter((p) => p.id !== playerObj.id);
    };

    this.onPlayerBallKick = (playerId) => {
        lastPlayerKickedBall = lastPlayerInteractedBall = commands.getPlayers().find((p) => p.id === playerId);
        addPlayerBallInteraction(
            commands.getPlayers().find((p) => p.id === playerId),
            "kick"
        );
    };

    this.onCollisionDiscVsDisc = (discId1, discPlayerId1, discId2, discPlayerId2) => {
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
                player = commands.getPlayers().find((p) => p.id === discPlayerId1 || p.id === discPlayerId2);
                lastPlayerTouchedBall = lastPlayerInteractedBall = player;
                addPlayerBallInteraction(player, "touch");
            }
        }
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        auth = that.room.plugins.find((p) => p.name === "lmbAuth");
        if (!commands) {
            console.log("El plugin de historial requiere del plugin de comandos.");
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
                "Muestra el historial de partidos."
            );
            commands.registerCommand(
                "!",
                "stats",
                (msg, args) => {
                    if (args.length === 0) {
                        printPlayersDbStats(msg.byId);
                    } else if (args[0] === "db") {
                        printPlayersDbStats(msg.byId);
                    } else if (args[0] === "s") {
                        printPlayersSessionStats(msg.byId);
                    } else if (args[0] === "clear") {
                        clearPlayersSessionStats();
                    } else if (!isNaN(args[0])) {
                        printPlayersDbStats(msg.byId, parseInt(args[0]));
                    }
                },
                "Muestra los goles y asistencias de cada jugador."
            );

            commands.onTeamGoalQueue.push((teamId, customData) => {
                try {
                    // Para que el gol sea computado positivo, tiene que haber sido el último jugador en interactuar
                    // con la pelota, ya sea pateando o tocandola.
                    if (lastPlayerInteractedBall && lastPlayerInteractedBall.team.id === teamId) {
                        lastPlayerInteractedBall.sessionStats.score += 1;
                        that.matchStatsData.goals.push({
                            player: lastPlayerInteractedBall,
                            value: 1,
                        });
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
                                that.matchStatsData.assists.push({
                                    player: lastPlayerInteractedBall,
                                    value: 1,
                                });
                                that.assister = penultimate.player;
                                setTimeout(() => {
                                    that.assister = null;
                                }, 3000);
                            }
                        }
                    } else if (lastPlayerKickedBall) {
                        if (lastPlayerKickedBall.team.id !== teamId) {
                            // Para que el gol sea computado negativo, sólo cuenta si fue el último en patearla.
                            let player = commands.getPlayers().find((p) => p.id === lastPlayerKickedBall.id);
                            if (!player) return;
                            player.sessionStats.score -= 1;
                            that.matchStatsData.goals.push({
                                player: lastPlayerInteractedBall,
                                value: -1,
                            });
                        }
                    }

                    lastPlayerInteractedBall = lastPlayerTouchedBall = lastPlayerKickedBall = null;
                    playerBallInteractHistory = [];
                } catch (e) {
                    console.log(e);
                }
            });

            commands.onPlayerJoinQueue.push((pObj) => {
                setTimeout(() => {
                    let player = commands.getPlayers().find((p) => pObj.id == p.id);
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
