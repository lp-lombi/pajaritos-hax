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
    Plugin.call(this, "lmbOrbs", true, {
        version: "0.1",
        author: "lombi",
        description: `Orbes que orbitan!`,
        allowFlags: AllowFlags.CreateRoom,
    });

    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands;
    var that = this;
    const chroma = require("chroma-js");

    this.isPluginActive = true;
    this.G = 0.25;
    this.attractMultiplier = 1;
    this.repelMultiplier = 0.5;
    this.targetPlayerId = null;

    this.getOrbs = function () {
        let discs = that.room.getDiscs()?.filter((disc) => disc.radius == 4.0001);
        return discs ? discs : [];
    };

    /**
     * Se crean los orbes. De momento la única forma de identificarlos es por el radio
     */
    this.onStadiumChange = function (stadium) {
        if (that.isPluginActive) {
            let orb1 = r.createDisc({ pos: [-1000, -1000], radius: 4.0001, cGroup: 0, color: parseInt("AA33AA", 16) });
            let orb2 = r.createDisc({ pos: [0, -1000], radius: 4.0001, cGroup: 0, color: parseInt("56EE04", 16) });
            let orb3 = r.createDisc({ pos: [1000, -1000], radius: 4.0001, cGroup: 0, color: parseInt("04EEEA", 16) });
            stadium.discs.push(orb1);
            stadium.discs.push(orb2);
            stadium.discs.push(orb3);
        }
    };

    this.discOrbitDisc = function (disc, orb) {
        if (that.isPluginActive) {
            const orbId = that.room.getDiscs().indexOf(orb);

            // Calcular la distancia entre discos y normalizar el vector
            const distanceX = disc.pos.x - orb.pos.x;
            const distanceY = disc.pos.y - orb.pos.y;
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

            const normalizedDirectionX = distanceX / distance;
            const normalizedDirectionY = distanceY / distance;

            // Gravedad inversamente proporcional a la distancia
            const force = that.G * distance;

            // Calcular las aceleraciones hacia el centro de la órbita
            let ax2 = ((force * normalizedDirectionX) / distance) * that.attractMultiplier;
            let ay2 = ((force * normalizedDirectionY) / distance) * that.attractMultiplier;

            /*             // Alejarlo para mantenerlo en órbita
            ax2 -= (normalizedDirectionX / distance) * that.repelMultiplier;
            ay2 -= (normalizedDirectionY / distance) * that.repelMultiplier; */

            Utils.runAfterGameTick(() => {
                that.room.setDiscProperties(orbId, {
                    xgravity: ax2,
                    ygravity: ay2,
                });
            });
        }
    };

    this.onGameTick = function () {
        if (that.isPluginActive) {
            const playerDisc = that.room.getPlayer(that.targetPlayerId)?.disc;
            const orbs = that.getOrbs();

            if (playerDisc && orbs[0]) {
                orbs.forEach((orb) => {
                    that.discOrbitDisc(playerDisc, orb);
                });
            }
        }
    };

    this.onGameStart = function () {
        let playerDisc = that.room.getPlayerDisc(that.targetPlayerId);
        if (playerDisc) {
            Utils.runAfterGameTick(() => {
                that.getOrbs().forEach((orb) => {
                    that.room.setDiscProperties(that.room.getDiscs().indexOf(orb), {
                        x: playerDisc.pos.x + Math.random() * 50,
                        y: playerDisc.pos.y + Math.random() * 50,
                    });
                });
            });
        }
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log("El plugin de orbes requiere del plugin de comandos.");
        } else {
            commands.registerCommand(
                "!",
                "orb",
                (msg, args) => {
                    if (args.length === 0) {
                        var str = commands.getPlayersIdsString();
                        str += "\n !orb <id> para enviar orbes a ese jugador.";
                        commands.printchat(str, msg.byId);
                    } else if (!isNaN(args[0])) {
                        that.targetPlayerId = parseInt(args[0]);
                    } else if (args[0] === "off") {
                        that.isPluginActive = false;
                        commands.printchat("Orbes desactivados.", msg.byId);
                        Utils.runAfterGameTick(() => {
                            that.getOrbs().forEach((orb) => {
                                let randomXPos = Math.random() * 1000;
                                let sign = Math.random() < 0.5 ? -1 : 1;
                                console.log(randomXPos);
                                that.room.setDiscProperties(that.room.getDiscs().indexOf(orb), {
                                    x: randomXPos * sign,
                                    y: -1000,
                                    xspeed: 0,
                                    yspeed: 0,
                                    xgravity: 0,
                                    ygravity: 0,
                                });
                            });
                            that.targetPlayerId = null;
                        });
                    } else if (args[0] === "on") {
                        that.isPluginActive = true;
                        commands.printchat("Orbes activados.", msg.byId);
                    }
                },
                "Envía orbes a un jugador. !orb id",
                2,
                true
            );
        }
    };
};
