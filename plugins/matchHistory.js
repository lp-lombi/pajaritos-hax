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

    var matchHistory = [],
        playersStats = [],
        lastPlayerInteractedBall = null,
        lastPlayerTouchedBall = null,
        lastPlayerKickedBall = null,
        that = this;

    this.initialize = function () {
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
                        (p) => p.id === discPlayerId1 || p.id === discPlayerId2
                    );
                    lastPlayerTouchedBall = lastPlayerInteractedBall = player;
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
                    let playerInStats = playersStats.find(
                        (p) => p.player.id === lastPlayerInteractedBall.id
                    );
                    if (!playerInStats) {
                        playersStats.push({
                            player: lastPlayerInteractedBall,
                            score: 0,
                            assists: 0,
                        });
                        playerInStats = playersStats.find(
                            (p) => p.player.id === lastPlayerInteractedBall.id
                        );
                    }
                    playerInStats.score += 1;
                } else if (lastPlayerKickedBall) {
                    if (lastPlayerKickedBall.teamId !== teamId) {
                        // Para que el gol sea computado negativo, sólo cuenta si fue el último en patearla.
                        let playerInStats = playersStats.find(
                            (p) => p.player.id === lastPlayerKickedBall.id
                        );
                        if (!playerInStats) {
                            playersStats.push({
                                player: lastPlayerKickedBall,
                                score: 0,
                                assists: 0,
                            });
                            playerInStats = playersStats.find(
                                (p) => p.player.id === lastPlayerKickedBall.id
                            );
                        }
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
            let ps = playersStats.find((p) => p.player.id === playerObj.id);
            if (ps) {
                playersStats.splice(playersStats.indexOf(ps), 1);
            }
        };
    };

    this.printHistory = function (playerId) {
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

        that.room.sendAnnouncement("Historial:\n" + str, playerId);
    };

    this.clearHistory = function () {
        matchHistory = [];
    };

    this.clearPlayersStats = function () {
        playersStats = [];
    };

    this.printPlayersStats = function (playerId) {
        var str = "";
        if (playersStats.length === 0) {
            str = "No hay registros.";
        } else {
            playersStats.sort((a, b) => (a.score > b.score ? -1 : 1));
            playersStats.forEach((p) => {
                str +=
                    "[" +
                    (playersStats.indexOf(p) + 1) +
                    "] " +
                    p.player.name +
                    " | " +
                    p.score +
                    " goles\n";
            });
        }
        that.room.sendAnnouncement("Stats de los jugadores:\n" + str, playerId);
    };
};
