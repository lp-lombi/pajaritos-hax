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
    Plugin.call(this, "lmbComba", true, {
        version: "0.1",
        author: "lombi",
        description: `Plugin de comba y powershot.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var that = this;

    this.active = true;

    this.combaActive = true;
    this.combaDistance = 10;
    this.minCombaTicks = 40;
    this.combaStrengthMultiplier = 2;
    this.combaGravityMultiplier = 1;
    this.combaColor = parseInt("ff0000", 16);

    this.calcDistance = function (disc1, disc2) {
        let dx = disc1.pos.x - disc2.pos.x;
        let dy = disc1.pos.y - disc2.pos.y;
        return Math.sqrt(dx * dx + dy * dy) - disc1.radius - disc2.radius;
    };

    this.allowComba = () => {
        if (that.room) {
            let ball = that.room.getBall();
            if (ball && !ball.comba) {
                that.room.setDiscProperties(0, {
                    color: that.combaColor,
                });
            }
        }
    };

    this.disableComba = () => {
        if (that.room) {
            let ball = that.room.getBall();
            if (ball && ball.comba) {
                that.room.setDiscProperties(0, {
                    color: that.room.stadium.discs[0].color,
                });
            }
        }
    };

    this.onGameTick = () => {
        if (that.combaActive) {
            let ball = that.room.getBall();
            if (that.room && that.room.players && ball) {
                let combaAllowed = false;
                that.room.players.forEach((p) => {
                    if (p && p.disc) {
                        if (
                            that.calcDistance(p.disc, ball) < that.combaDistance
                        ) {
                            if (p.combaTicks === undefined) {
                                p.combaTicks = 0;
                            } else {
                                p.combaTicks++;
                            }
                        } else {
                            setTimeout(() => {
                                if (p) p.combaTicks = 0;
                            }, 50);
                        }
                        if (
                            p.combaTicks &&
                            p.combaTicks >= that.minCombaTicks
                        ) {
                            combaAllowed = true;
                        }
                    }
                });
                combaAllowed ? that.allowComba() : that.disableComba();
            }
        }
    };

    this.onPlayerBallKick = (playerId) => {
        if (that.room) {
            let player = that.room.players.find((p) => p.id === playerId);
            let ball = that.room.getBall();
            console.log(player.combaTicks + " | " + that.minCombaTicks);
            if (player && ball && player.combaTicks >= that.minCombaTicks) {
                Utils.runAfterGameTick(() => {
                    that.room.setDiscProperties(0, {
                        xspeed: ball.speed.x * 2,
                        yspeed: ball.speed.y * 2,
                        ygravity:
                            Math.sign(ball.speed.y) *
                            -0.075 *
                            that.combaGravityMultiplier,
                    });
                    setTimeout(() => {
                        if (that.room && that.room.gameState) {
                            that.room.setDiscProperties(0, {
                                ygravity: 0,
                            });
                        }
                    }, 1000);
                    console.log("Comba!");
                    player.combaTicks = 0;
                });
            }
        }
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log("El plugin de discos requiere del plugin de comandos.");
        } else {
            commands.registerCommand(
                "!",
                "comba",
                (msg, args) => {},
                "Configuración de la comba.",
                true,
                false
            );
        }
    };
};
