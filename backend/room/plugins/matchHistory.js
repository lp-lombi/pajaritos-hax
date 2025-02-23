/**
 * @typedef {{discId1: number, discPlayerId1: number, discId2: number, discPlayerId2: number}} DiscCollisions - Datos de la colisión de dos discos.
 */

const CommandsPlugin = require("./commands")().CommandsPlugin.prototype;

/**
 * @param {import('./types').API} API
 */
module.exports = function (API) {
    if (!API) API = require("node-haxball")();
    /**
     * @enum {string} MatchHistoryEventType - Tipos de eventos en la historia del partido.
     */
    const MatchHistoryEventType = {
        KickBall: "KickBall",
        TouchBall: "TouchBall",
        Goal: "Goal",
        Assist: "Assist",
        GameEnd: "GameEnd",
    };

    class PlayerStats {
        /**
         *
         * @param {number} playerId
         * @param {string} name
         * @param {number} goals
         * @param {number} assists
         * @param {number} rating
         * @param {number} wunRate
         */
        constructor(playerId, name, goals, assists, rating = null, winRate = null) {
            this.playerId = playerId;
            this.name = name;
            this.goals = goals;
            this.assists = assists;
            this.rating = rating;
            this.winRate = winRate;
        }
    }

    class MatchHistoryEvent {
        static idCounter = 0;
        static nextId() {
            return MatchHistoryEvent.idCounter++;
        }
        /**
         * @param {number} playerId - ID del jugador.
         * @param {number} playerTeamId - ID del equipo del jugador.
         * @param {number} forTeamId - ID del equipo al cual se le atribuye el evento.
         * @param {MatchHistoryEventType} type - Tipo de evento.
         * @param {Date} time - Fecha y hora del evento.
         */

        constructor(playerId, playerTeamId, forTeamId, type, time) {
            this.id = MatchHistoryEvent.nextId();
            this.playerId = playerId;
            this.playerTeamId = playerTeamId;
            this.forTeamId = forTeamId;
            this.type = type;
            this.time = time;
        }
    }

    /**
     * Representa un conjunto de eventos que pueden ser de diversos tipos, así como métodos para recuperarlos, almacenarlos y crear nuevas historias a través de filtros.
     */
    class MatchHistory {
        static idCounter = 0;
        static nextId() {
            return MatchHistoryEvent.idCounter++;
        }

        /**
         * @param {Array<MatchHistoryEvent>} events
         */
        constructor(events = []) {
            this.id = MatchHistory.nextId();
            this.events = events;
            this.winnerTeam = null;
        }

        /**
         * @param {number} playerId
         * @param {number} playerTeamId
         * @param {number} forTeamId
         * @param {MatchHistoryEventType} type
         */
        registerEvent(playerId, playerTeamId, forTeamId, type) {
            this.events.push(new MatchHistoryEvent(playerId, playerTeamId, forTeamId, type, new Date()));
        }

        /**
         * @param {MatchHistoryEventType} type
         * @param {number} playerId
         * @param {number} forTeamId
         * @returns {Array<MatchHistoryEvent>}
         */
        getEvents(type = null, playerId = null, forTeamId = null) {
            return this.events
                .filter((e) => (type ? e.type === type : true))
                .filter((e) => (typeof playerId === "number" ? e.playerId === playerId : true))
                .filter((e) => (forTeamId ? e.forTeamId === forTeamId : true));
        }

        // segmenta todos los eventos por ser consecutivamente el mismo playerId (los jugadores pueden repetirse)
        segmentHistoryByPlayers() {
            if (this.events.length === 0) return [];

            const segments = [];
            let currentSegment = [this.events[0]];

            for (let i = 1; i < this.events.length; i++) {
                if (this.events[i]?.playerId !== currentSegment[0]?.playerId) {
                    segments.push(currentSegment);
                    currentSegment = [this.events[i]];
                } else {
                    currentSegment.push(this.events[i]);
                }
            }
            segments.push(currentSegment);

            return segments.map((segment) => new MatchHistory(segment));
        }

        /**
         * @param {number} reverseIndex
         * @param {{MatchHistoryEventType} type
         */
        getLastEvent(reverseIndex = 0, type = null) {
            const events = this.getEvents(type);
            return events[events.length - reverseIndex - 1];
        }

        getLastScorerId() {
            const lastScorerEvent = this.getLastEvent(0, MatchHistoryEventType.Goal);
            if (!lastScorerEvent) return null;
            return lastScorerEvent.playerId;
        }
        getTeamPossession(teamId) {
            const teamEvents = this.getEvents(null, null, teamId);
            return teamEvents.length / this.events.length;
        }

        getHistoryBeforeLastGoal() {
            const lastGoalEvent = this.getLastEvent(0, MatchHistoryEventType.Goal);
            if (!lastGoalEvent) return this;
            const eventsBeforeLastKickoff = this.events.slice(0, this.events.indexOf(lastGoalEvent));
            return new MatchHistory(eventsBeforeLastKickoff);
        }
        getHistorySinceLastGoal() {
            const lastGoalEvent = this.getLastEvent(0, MatchHistoryEventType.Goal);
            if (!lastGoalEvent) return this;
            const eventsSinceLastGoal = this.events.slice(this.events.indexOf(lastGoalEvent));
            return new MatchHistory(eventsSinceLastGoal);
        }
    }

    class MatchHistoryPlugin extends API.Plugin {
        constructor() {
            super("lmbMatchHistory", true, {
                description: "Historial de eventos de los partidos de la sesión.",
                author: "lombi",
                version: "0.2",
                allowFlags: API.AllowFlags.CreateRoom,
            });

            this.redWins = 0;
            this.blueWins = 0;

            this.previousMatchesHistory = new MatchHistory();
            this.currentMatchHistory = new MatchHistory();
        }

        get goalHistory() {
            const goals = this.previousMatchesHistory.getEvents(MatchHistoryEventType.Goal);
            goals.push(...this.currentMatchHistory.getEvents(MatchHistoryEventType.Goal));
            return new MatchHistory(goals);
        }
        get assistHistory() {
            const assists = this.previousMatchesHistory.getEvents(MatchHistoryEventType.Assist);
            assists.push(...this.currentMatchHistory.getEvents(MatchHistoryEventType.Assist));
            return new MatchHistory(assists);
        }

        /**
         *
         * @param {DiscCollisions} discCollissions
         * @returns
         */
        verifyCollissionDiscVsPlayer({ discId1, discPlayerId1, discId2, discPlayerId2 }) {
            if ((discId1 === 0 || discId2 === 0) && (discPlayerId1 !== null || discPlayerId2 !== null)) {
                const playerId = discPlayerId1 === null ? discPlayerId2 : discPlayerId1;
                const player = this.room.getPlayer(playerId);
                const teamId = player?.team?.id;
                if (teamId) {
                    const lastEvent = this.currentMatchHistory.getLastEvent();
                    if (lastEvent?.playerId === playerId && lastEvent?.type === MatchHistoryEventType.TouchBall) return true;
                    this.currentMatchHistory.registerEvent(playerId, teamId, teamId, MatchHistoryEventType.TouchBall);
                    return true;
                }
            }
            return false;
        }
        getGoalScorerId(teamId) {
            const lastEvent = this.currentMatchHistory.getHistorySinceLastGoal().getLastEvent();
            let candidateScorer = lastEvent?.playerId;

            if (lastEvent?.type === MatchHistoryEventType.KickBall) {
                return candidateScorer;
            } else if (lastEvent?.type === MatchHistoryEventType.TouchBall && lastEvent?.forTeamId === teamId) {
                return candidateScorer;
            } else {
                const lastKickEvent = this.currentMatchHistory.getHistorySinceLastGoal().getLastEvent(0, MatchHistoryEventType.KickBall);
                if (lastKickEvent?.playerId) {
                    candidateScorer = lastKickEvent?.playerId;
                } else {
                    const lastTouchEvent = this.currentMatchHistory.getHistorySinceLastGoal().getLastEvent(0, MatchHistoryEventType.TouchBall);
                    if (lastTouchEvent?.playerId) {
                        candidateScorer = lastTouchEvent?.playerId;
                    } else {
                        candidateScorer = null; // No se encontró un jugador válido
                    }
                }
            }

            return candidateScorer;
        }
        getGoalAssisterId(teamId, scorerPlayerId) {
            const penultimateEvent = this.currentMatchHistory.getHistoryBeforeLastGoal().getLastEvent(1);
            let candidateAssister = null;

            if (
                penultimateEvent?.type === MatchHistoryEventType.KickBall &&
                penultimateEvent?.playerTeamId === teamId &&
                scorerPlayerId !== penultimateEvent?.playerTeamId
            ) {
                candidateAssister = penultimateEvent?.playerId;
            } else {
                const [lastPlayerHistoryBeforeGoal, penultimatePlayerHistoryBeforeGoal] = this.currentMatchHistory
                    .getHistoryBeforeLastGoal()
                    .segmentHistoryByPlayers()
                    .slice()
                    .reverse();

                if (lastPlayerHistoryBeforeGoal?.events?.length > 0 && penultimatePlayerHistoryBeforeGoal?.events?.length > 0) {
                    const lastPlayerTeamId = lastPlayerHistoryBeforeGoal.events[0].playerTeamId;
                    const penultimatePlayerTeamId = penultimatePlayerHistoryBeforeGoal.events[0].playerTeamId;
                    if (lastPlayerTeamId === penultimatePlayerTeamId && lastPlayerHistoryBeforeGoal.events.length <= 2) {
                        candidateAssister = penultimatePlayerHistoryBeforeGoal.events[0].playerId;
                        if (candidateAssister === scorerPlayerId) candidateAssister = null;
                    }
                }
            }

            return candidateAssister;
        }
        /**
         * @param {number} teamId
         * @returns {number} scorerPlayerId
         */
        registerGoal(teamId) {
            const scorerPlayerId = this.getGoalScorerId(teamId);
            const scorerTeamId = this.room.getPlayer(scorerPlayerId)?.team?.id;
            this.currentMatchHistory.registerEvent(scorerPlayerId, scorerTeamId, teamId, MatchHistoryEventType.Goal);
            return scorerPlayerId;
        }
        /**
         * @param {number} teamId
         * @param {number} scorerPlayerId
         * @returns {number} scorerPlayerId
         */
        registerAssist(teamId, scorerPlayerId) {
            const assisterPlayerId = this.getGoalAssisterId(teamId, scorerPlayerId);
            if (assisterPlayerId && typeof scorerPlayerId === "number") {
                this.currentMatchHistory.registerEvent(assisterPlayerId, teamId, teamId, MatchHistoryEventType.Assist);
            }
        }
        /**
         * @param {MatchHistory} history
         */
        savePlayersStats(history) {
            this.room.players?.forEach((player) => {
                if (player.team.id === 0 || !player.user) return;
                const goals = history.getEvents(MatchHistoryEventType.Goal, player.id).filter((e) => e.forTeamId === e.playerTeamId).length;
                const ownGoals = history.getEvents(MatchHistoryEventType.Goal, player.id).filter((e) => e.forTeamId !== e.playerTeamId).length;
                const assists = history.getEvents(MatchHistoryEventType.Assist, player.id).length;
                const wins = history.winnerTeam === player.team.id ? 1 : 0;
                this.auth.sumUserStats(player.name, goals - ownGoals, assists, wins, 1);
            });
        }
        /**
         * @param {PlayerStats} playerStats
         * @param {number} targetId
         */
        printPlayerStats({ playerId, name, goals, assists, rating, winRate }, targetId) {
            this.commands.printchat("█ " + (rating ? `${rating} - ` : "") + `${name}`, targetId, "announcement-big-mute");
            this.commands.printchat(
                `█ Goles: ${goals}    |    Asistencias: ${assists}\n` + (winRate ? `█ Win Rate: ${(winRate * 100).toFixed(2)}%\n\n` : "\n"),
                targetId,
                "info-mute"
            );
        }
        printEndMatchStats() {
            const redPossessionPercent = (this.currentMatchHistory.getTeamPossession(1) * 100).toFixed(2);
            const bluePossessionPercent = (this.currentMatchHistory.getTeamPossession(2) * 100).toFixed(2);
            const redAccumGoals = this.goalHistory.events.filter((event) => event.forTeamId === 1).length;
            const blueAccumGoals = this.goalHistory.events.filter((event) => event.forTeamId === 2).length;

            this.commands.printchat(`█⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀Final del partido `, null, "announcement-big");

            this.commands.printchat("▌".repeat(redPossessionPercent / 3) + ` - ${redPossessionPercent}% posesión Red`, null, "red-stats");
            this.commands.printchat("▌".repeat(bluePossessionPercent / 3) + ` - ${bluePossessionPercent}% posesión Blue`, null, "blue-stats");
            this.commands.printchat(
                `\n█ El Red lleva ganados ${this.redWins} partidos y acumulados ${redAccumGoals} goles\n█ El Blue lleva ganados ${this.blueWins} partidos y acumulados ${blueAccumGoals} goles`,
                null,
                "info-mute"
            );
        }

        onTeamGoal(teamId) {
            const scorerPlayerId = this.registerGoal(teamId);
            this.registerAssist(teamId, scorerPlayerId);
        }
        onGameEnd(winningTeamId) {
            this.redWins += winningTeamId === 1 ? 1 : 0;
            this.blueWins += winningTeamId === 2 ? 1 : 0;

            this.currentMatchHistory.winnerTeam = winningTeamId;
            this.savePlayersStats(this.currentMatchHistory);

            this.printEndMatchStats();

            this.currentMatchHistory.registerEvent(null, null, null, MatchHistoryEventType.GameEnd);
            // Se descartan los eventos de touch ball debido a que pueden ser demasiados y ya no son de utilidad
            this.previousMatchesHistory.events.push(
                ...this.currentMatchHistory.events.filter((event) => {
                    return event?.type !== MatchHistoryEventType.TouchBall;
                })
            );
            this.currentMatchHistory = new MatchHistory();
        }
        onPlayerBallKick(playerId) {
            const player = this.room.getPlayer(playerId);
            const teamId = player?.team?.id;
            if (teamId) this.currentMatchHistory.registerEvent(playerId, teamId, teamId, MatchHistoryEventType.KickBall);
        }
        onCollisionDiscVsDisc(discId1, discPlayerId1, discId2, discPlayerId2) {
            const collissions = { discId1, discPlayerId1, discId2, discPlayerId2 };
            if (this.verifyCollissionDiscVsPlayer(collissions)) return;
        }
        initialize() {
            /**
             * @type {CommandsPlugin}
             */
            this.commands = this.room.plugins.find((p) => p.name === "lmbCommands");
            this.auth = this.room.plugins.find((p) => p.name === "lmbAuth");
            if (!this.commands) {
                console.log("El plugin de historial requiere del plugin de comandos.");
            } else {
                this.commands.registerCommand(
                    "!",
                    "stats",
                    (msg, args) => {
                        const that = this;
                        async function printDbStats(page = 1) {
                            try {
                                if (that.auth) {
                                    /**
                                     * @type {Array<PlayerStats>}
                                     */
                                    let allStats = [];
                                    const pageSize = 15;

                                    const data = await that.auth.getAllUsersStats();
                                    data.sort((a, b) => b.rating - a.rating);
                                    data.forEach((sd) => {
                                        const stats = new PlayerStats(sd.id, sd.username, sd.score, sd.assists, sd.rating, sd.wins / sd.matches);
                                        allStats.push(stats);
                                    });

                                    const totalPages = Math.ceil(allStats.length / pageSize);
                                    const currentPage = allStats.slice((page - 1) * pageSize, page * pageSize).reverse();
                                    if (currentPage.length > 0) {
                                        currentPage.forEach((ps) => that.printPlayerStats(ps, msg.byId));
                                        that.commands.printchat(
                                            `Stats históricos de los jugadores (página ${page} de ${totalPages})`,
                                            msg.byId,
                                            "announcement-big"
                                        );
                                        that.commands.printchat(
                                            `Para cambiar de página  !stats <núm>  |  Para ver tus stats:  !stats yo  |  Para ver los stats de hoy:  !stats hoy`,
                                            msg.byId,
                                            "info-mute"
                                        );
                                    } else {
                                        that.commands.printchat("No hay stats para mostrar o la página es inválida", msg.byId, "error");
                                    }
                                }
                            } catch (error) {
                                console.log(error);
                                that.commands.printchat("No se pudo obtener los stats :(", msg.byId, "error");
                            }
                        }
                        async function printPlayerDbStats(username) {
                            const data = await that.auth.getUserStats(username);
                            const stats = new PlayerStats(data.id, username, data.score, data.assists, data.rating, data.wins / data.matches);
                            that.printPlayerStats(stats, msg.byId);
                            that.commands.printchat("Tus estadísticas", msg.byId, "announcement-big");
                        }
                        function printTodayStats() {
                            that.room.players.forEach((player) => {
                                if (player?.id) {
                                    that.printPlayerStats(getPlayerStats(player.id), msg.byId);
                                }
                            });
                            that.commands.printchat("Stats de los jugadores", msg.byId, "announcement-big");
                        }
                        function getPlayerStats(playerId) {
                            const player = that.room.getPlayer(playerId);
                            if (!player) return null;
                            const goals = that.goalHistory
                                .getEvents(MatchHistoryEventType.Goal, playerId)
                                .filter((e) => e.forTeamId === e.playerTeamId);
                            const ownGoals = that.goalHistory
                                .getEvents(MatchHistoryEventType.Goal, playerId)
                                .filter((e) => e.forTeamId !== e.playerTeamId);
                            const assists = that.assistHistory.getEvents(MatchHistoryEventType.Assist, playerId);
                            return new PlayerStats(playerId, player.name, goals.length - ownGoals.length, assists.length);
                        }

                        if (args?.length > 0) {
                            if (args[0] === "hoy") {
                                printTodayStats();
                            } else if (args[0] === "yo") {
                                if (this.auth.isPlayerLogged(msg.byId)) {
                                    const player = this.room.getPlayer(msg.byId);
                                    printPlayerDbStats(player.name);
                                } else {
                                    this.commands.printchat("Para empezar a ver tus stats iniciá sesión o registrate", msg.byId, "error");
                                }
                            } else if (!isNaN(parseInt(args[0]))) {
                                const page = parseInt(args[0]);
                                if (page > 0) {
                                    printDbStats(page);
                                }
                            }
                        } else {
                            printDbStats();
                        }
                    },
                    "Muestra las estadísticas de los jugadores."
                );
            }
        }
    }

    return { instance: new MatchHistoryPlugin(), MatchHistoryPlugin };
};
