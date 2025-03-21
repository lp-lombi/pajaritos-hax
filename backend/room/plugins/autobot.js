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
        commands.getPlayers().forEach((p) => {
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
    this.goal = false;
    this.teamSize = 4;

    this.currentAfkTicks = 0;
    this.requiredAfkTicks = 900;
    this.afkAction = "move";

    this.inactivePlayersIds = [];
    this.replaceablePlayers = [];

    this.checkAfk = function () {
        if (that.currentAfkTicks === 0) {
            this.inactivePlayersIds = [];
            commands.getPlayers().forEach((p) => {
                if (p.team.id !== 0) {
                    p.id > 0 ? this.inactivePlayersIds.push(p.id) : null;
                }
            });
        } else if (that.currentAfkTicks >= that.requiredAfkTicks) {
            if (that.room?.gameState && that.active) {
                if (that.afkAction === "move") {
                    let teams = getTeams();
                    if (teams.spects.length > 0) {
                        for (let i = 0; i < teams.spects.length; i++) {
                            if (that.inactivePlayersIds[i]) {
                                that.room.setPlayerTeam(that.inactivePlayersIds[i], 0);
                            }
                        }
                    }
                } else if (that.afkAction === "kick") {
                    that.inactivePlayersIds?.forEach((id) => {
                        that.room.kickPlayer(id, `AFK ${that.requiredAfkTicks / 60} segundos`);
                    });
                }
            }
            that.currentAfkTicks = 0;
            return;
        }
        that.currentAfkTicks++;
    };

    this.getGoalLines = function (s) {
        let g1 = {
            top: s.goals[0].p0,
            bottom: s.goals[0].p1,
        };
        let g2 = {
            top: s.goals[1].p0,
            bottom: s.goals[1].p1,
        };

        if (g1.top.x > g2.top.x) {
            return { left: g2, right: g1 };
        } else if (g1.top.x < g2.top.x) {
            return { left: g1, right: g2 };
        } else {
            return null;
        }
    };

    this.checkBall = function () {
        let threshold = 20;
        let goals = that.getGoalLines(that.room.stadium);
        let updating = false;

        this.onStadiumChange = (s) => {
            goals = that.getGoalLines(s);
        };

        this.decelerateFactor = 0.8;
        this.onGameTick = () => {
            try {
                that.checkAfk();

                if (that.active && that.room?.gameState && goals) {
                    let modifyObj = null;
                    let ball = that.room.getDisc(0);
                    if (ball?.pos.x + threshold < goals.left.top.x) {
                        modifyObj = {
                            x: goals.left.top.x + 10,
                            y: ball.pos.y,
                        };
                        if (ball.speed.x < -1) {
                            modifyObj.xspeed = -ball.speed.x * that.decelerateFactor;
                        }
                    } else if (ball && ball.pos.x - threshold > goals.right.top.x) {
                        modifyObj = {
                            x: goals.right.top.x - 10,
                            y: ball.pos.y,
                        };
                        if (ball.speed.x > 1) {
                            modifyObj.xspeed = -ball.speed.x * that.decelerateFactor;
                        }
                    }

                    if (modifyObj && !that.goal) {
                        console.log("Reposicionando disco");
                        that.room.setDiscProperties(0, modifyObj);
                    }
                }

                /*if (that.room && goals) {
                    if (that.room.gameState && that.active) {
                        let modifyObj = null;

                        let ball = that.room.getDisc(0);

                        if (ball && ball.pos.x + threshold < goals.left.top.x) {
                            modifyObj = {
                                x: goals.left.top.x + 10,
                                y: ball.pos.y,
                            };
                            if (ball.speed.x < -1) {
                                modifyObj.xspeed = -ball.speed.x * 0.9;
                            }
                        } else if (ball && ball.pos.x - threshold > goals.right.top.x) {
                            modifyObj = {
                                x: goals.right.top.x - 10,
                                y: ball.pos.y,
                            };
                            if (ball.speed.x > 1) {
                                modifyObj.xspeed = -ball.speed.x * 0.9;
                            }
                        }

                        if (modifyObj && !updating) {
                            updating = true;
                            setTimeout(() => {
                                if (!that.goal) {
                                    that.room.setDiscProperties(0, modifyObj);
                                }
                                setTimeout(() => {
                                    updating = false;
                                }, 300);
                            }, 100);
                        }
                    }
                } */
            } catch (e) {
                console.log(e);
            }
        };
    };

    this.checkTeams = function () {
        if (that.room !== null) {
            sleep(250).then(() => {
                if (that.room !== null) {
                    if (that.room.gameState && that.active) {
                        let teams = getTeams();
                        if (teams.spects.length > 0) {
                            if (teams.rTeam.length < that.teamSize || teams.bTeam.length < that.teamSize) {
                                let t = teams.rTeam.length <= teams.bTeam.length ? 1 : 2;
                                if (teams.spects[0]) {
                                    that.room.setPlayerTeam(teams.spects[0].id, t);
                                    commands.printchat("Entrás al juego.", teams.spects[0].id, "alert");
                                }
                            }
                        } else {
                            if (Math.abs(teams.rTeam.length - teams.bTeam.length) > 1) {
                                if (teams.rTeam.length > teams.bTeam.length) {
                                    that.room.setPlayerTeam(teams.rTeam[0].id, 2);
                                } else {
                                    that.room.setPlayerTeam(teams.bTeam[0].id, 1);
                                }
                            }
                        }
                    }
                    this.checkTeams();
                }
            });
        }
    };

    this.restartGame = () => {
        that.room.stopGame();
        sleep(300).then(() => {
            that.room.startGame();
        });
    };

    this.onGameStart = (byId, customData = null) => {
        that.replaceablePlayers = commands.getPlayers();
        // A la mitad del partido se determina los jugadores elegibles para salir
        sleep(that.room.timeLimit * 60000 * 0.6).then(() => {
            that.replaceablePlayers = [];
            commands.getPlayers().forEach((p) => {
                if (p.id !== 0 && (p.team.id === 1 || p.team.id === 2)) {
                    that.replaceablePlayers.push(p);
                }
            });
        });
    };

    this.onGameEnd = (winningTeamId) => {
        if (!that.active) return;
        let loserTeamId = winningTeamId === 1 ? 2 : 1;
        let loserPlayersIds = [];
        let spectPlayersIds = [];
        sleep(3000).then(() => {
            // Primero se mueve a los perdedores a espectadores
            that.replaceablePlayers.forEach((p) => {
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
            commands.getPlayers().forEach((p) => {
                if (p.id !== 0) {
                    if (p.team.id === 0) {
                        spectPlayersIds.push(p.id);
                    }
                }
            });
            for (let i = 0; i < that.teamSize; i++)
                if (spectPlayersIds[i]) {
                    let currentTeamSize = 0;
                    commands.getPlayers().forEach((p) => {
                        if (p.team.id === loserTeamId) currentTeamSize++;
                    });

                    if (currentTeamSize < that.teamSize) {
                        that.room.setPlayerTeam(spectPlayersIds[i], loserTeamId);
                    }
                }
            that.restartGame();
        });
    };

    this.onTeamGoal = (teamId) => {
        that.goal = true;
        sleep(4000).then(() => {
            that.goal = false;
        });
    };

    this.onPlayerLeave = () => {
        if (that.room.players.length === 1) {
            that.room.stopGame();
            sleep(250).then(() => {
                that.room.startGame();
            });
        }
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log("El plugin de autobot requiere del plugin de comandos.");
        } else {
            that.checkTeams();
            that.checkAfk();
            that.checkBall();
            commands.registerCommand(
                "!",
                "autobot",
                (msg, args) => {
                    if (args.length === 0) {
                        commands.printchat("Uso: ' !autobot on/off ' | !autobot equipos <tamaño> | !autobot afk <segundosAfk> ", msg.byId, "error");
                    } else {
                        switch (args[0]) {
                            case "on":
                                that.active = true;
                                commands.printchat("Se activó el autobot", msg.byId);
                                break;
                            case "off":
                                commands.printchat("Se desactivó el autobot", msg.byId);
                                that.active = false;
                                break;
                            case "equipos":
                                if (args[1]) {
                                    if (!isNaN(parseInt(args[1]))) {
                                        that.teamSize = parseInt(args[1]);
                                        commands.printchat("El tamaño de los equipos cambió a " + args[1], msg.byId);
                                    }
                                }
                                break;
                            case "afk":
                                if (args[1]) {
                                    if (!isNaN(parseInt(args[1]))) {
                                        that.requiredAfkTicks = parseInt(args[1]) * 60;
                                        if (args[2]?.toLowerCase() === "move" || args[2]?.toLowerCase() === "kick") {
                                            that.afkAction = args[2].toLowerCase();
                                        }
                                        commands.printchat(
                                            "El tiempo para AFK cambió a " + args[1] + " segundos | la acción de afk es: " + that.afkAction,
                                            msg.byId
                                        );
                                    }
                                } else {
                                    commands.printchat(
                                        `Tiempo AFK: ${that.requiredAfkTicks / 60}\nAcción AFK: ${
                                            that.afkAction
                                        }\n\n !afk <tiempo> <acción: kick o move>`,
                                        msg.byId
                                    );
                                }
                                break;
                        }
                    }
                },
                "Ajustes del autobot de la sala. ' !autobot on/off ' | !autobot equipos <tamaño>",
                false,
                2
            );

            commands.sendInputQueue.push((msg) => {
                if (that.inactivePlayersIds.includes(msg.byId)) {
                    that.inactivePlayersIds.splice(that.inactivePlayersIds.indexOf(msg.byId), 1);
                }
            });
        }
    };
};
