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

    this.combaActive = true;
    this.combaShooting = false;
    this.isAnyPlayerInHoldingBall = false;
    this.holdDistance = 10;
    this.minHoldTicks = 40;
    this.combaShotTicks = 100;
    this.combaStrengthMultiplier = 1.75;
    this.combaGravityMultiplier = 1.75;
    this.combaGravityDecelerationFactor = 0.9875;
    this.combaGravityCollisionDecelerationFactor = 0.35;
    this.combaColor = parseInt("ff0000", 16);

    const chroma = require("chroma-js");
    this.chromaCombaColor = chroma(that.combaColor.toString(16));
    this.chromaBallColor = chroma("FFFFFF");

    this.calcDistance = function (disc1, disc2) {
        let dx = disc1.pos.x - disc2.pos.x;
        let dy = disc1.pos.y - disc2.pos.y;
        return Math.sqrt(dx * dx + dy * dy) - disc1.radius - disc2.radius;
    };

    this.getValue = (string) => {
        const regex = /((?:\d+\.\d*)|(?:\d*\.?\d+))/g;
        let n = string.match(regex);
        n = n.join("");
        return parseFloat(n);
    };

    this.allowComba = () => {
        if (that.room) {
            let ball = that.room.getBall();
            if (ball) {
                that.room.setDiscProperties(0, {
                    color: that.combaColor,
                });
            }
        }
    };

    this.disableComba = () => {
        if (that.room) {
            let ball = that.room.getBall();
            if (ball) {
                that.room.setDiscProperties(0, {
                    color: that.room.stadium.discs[0].color,
                });
            }
        }
    };

    this.combaShot = (player, ball) => {
        Utils.runAfterGameTick(() => {
            that.room.setDiscProperties(0, {
                xspeed: ball.speed.x * that.combaStrengthMultiplier,
                yspeed: ball.speed.y * that.combaStrengthMultiplier,
                ygravity:
                    Math.sign(ball.speed.y) *
                    -0.075 *
                    that.combaGravityMultiplier,
                color: that.combaColor,
            });
            that.combaShooting = true;
            player.holdTicks = 0;

            console.log("Comba!");
        });
    };

    this.decelerateGravity = (discId, factor) => {
        let ball = that.room.gameState.physicsState.discs[0];
        if (ball) {
            Utils.runAfterGameTick(() => {
                that.room.setDiscProperties(discId, {
                    ygravity: ball.gravity.y * factor,
                });
            });
        }
    };

    this.onGameTick = () => {
        if (that.combaActive) {
            if (that.room && that.room.players) {
                let ball = that.room.gameState.physicsState.discs[0];
                that.isAnyPlayerInHoldingBall = false;
                that.room.players.forEach((p) => {
                    if (p && p.disc) {
                        let allow =
                            that.calcDistance(p.disc, ball) < that.holdDistance;
                        if (allow) {
                            if (p.holdTicks === undefined) {
                                p.holdTicks = 0;
                            } else {
                                p.holdTicks++;
                            }
                        } else {
                            Utils.runAfterGameTick(() => {
                                if (p) p.holdTicks = 0;
                            });
                        }
                        if (p.holdTicks && p.holdTicks >= that.minHoldTicks) {
                            that.isAnyPlayerInHoldingBall = true;
                        }
                    }
                });

                if (that.isAnyPlayerInHoldingBall) {
                    that.allowComba();
                } else if (!that.combaShooting) {
                    that.disableComba();
                }

                Utils.runAfterGameTick(() => {
                    let newGravity =
                        ball.gravity.y * that.combaGravityDecelerationFactor;
                    if (newGravity !== 0) {
                        let obj = {
                            ygravity:
                                Math.abs(ball.gravity.y) > 0.01
                                    ? newGravity
                                    : 0,
                        };
                        if (!that.isAnyPlayerInHoldingBall) {
                            var newColor = parseInt(
                                chroma
                                    .mix(
                                        that.chromaBallColor,
                                        that.chromaCombaColor,
                                        Math.abs(ball.gravity.y) / 0.08
                                    )
                                    .hex()
                                    .substring(1),
                                16
                            );
                            obj.color = newColor;
                        }

                        that.room.setDiscProperties(0, obj);
                    } else {
                        that.combaShooting = false;
                    }
                });
            }
        }
    };

    this.onPlayerBallKick = (playerId) => {
        if (that.room && that.combaActive) {
            let player = that.room.players.find((p) => p.id === playerId);
            let ball = that.room.getBall();
            if (player && ball && player.holdTicks >= that.minHoldTicks) {
                that.combaShot(player, ball);
            }
        }
    };

    this.onCollisionDiscVsPlane = this.onCollisionDiscVsSegment = (discId) => {
        if (that.room && that.combaActive && discId === 0) {
            that.decelerateGravity(
                discId,
                that.combaGravityCollisionDecelerationFactor
            );
        }
    };

    this.onCollisionDiscVsDisc = (
        discId1,
        discPlayerId1,
        discId2,
        discPlayerId2
    ) => {
        if (that.room && that.combaActive && (discId1 === 0 || discId2 === 0)) {
            that.decelerateGravity(
                discId1 === 0 ? discId1 : discId2,
                that.combaGravityCollisionDecelerationFactor
            );
        }
    };

    this.onGameStart = (byId) => {
        if (that.room) {
            let ball = that.room.gameState.physicsState.discs[0];
            if (ball) {
                that.chromaBallColor = chroma(ball.color.toString(16));
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
                (msg, args) => {
                    if (args[0] && args[0] === "lock") {
                        that.combaActive = !that.combaActive;
                        return;
                    }
                    if (that.combaActive) {
                        if (args[0] === "c") {
                            let v = that.getValue(args[1]);
                            if (!isNaN(v)) {
                                that.combaGravityMultiplier = v;
                                commands.printchat(
                                    "Cambiando la comba a " + v,
                                    msg.byId
                                );
                            }
                        } else if (args[0] === "f") {
                            let v = that.getValue(args[1]);
                            if (!isNaN(v)) {
                                that.combaStrengthMultiplier = v;
                                commands.printchat(
                                    "Cambiando la fuerza a " + v,
                                    msg.byId
                                );
                            }
                        } else if (args[0] === "preset") {
                            //let customColor = "#5FEE26";
                            switch (args[1]) {
                                case "1":
                                    that.combaStrengthMultiplier = 1.25;
                                    that.combaGravityMultiplier = 1.25;
                                    commands.printchat(
                                        "Fuerza: " +
                                            that.combaStrengthMultiplier +
                                            " | Comba: " +
                                            that.combaGravityMultiplier,
                                        msg.byId
                                    );
                                    break;
                                case "2":
                                    that.combaStrengthMultiplier = 1.75;
                                    that.combaGravityMultiplier = 1.75;
                                    commands.printchat(
                                        "Fuerza: " +
                                            that.combaStrengthMultiplier +
                                            " | Comba: " +
                                            that.combaGravityMultiplier,
                                        msg.byId
                                    );
                                    break;
                                case "3":
                                    that.combaStrengthMultiplier = 2;
                                    that.combaGravityMultiplier = 2;
                                    commands.printchat(
                                        "Fuerza: " +
                                            that.combaStrengthMultiplier +
                                            " | Comba: " +
                                            that.combaGravityMultiplier,
                                        msg.byId
                                    );
                                    break;
                                case "4":
                                    that.combaStrengthMultiplier = 2.5;
                                    that.combaGravityMultiplier = 2.5;
                                    commands.printchat(
                                        "Fuerza: " +
                                            that.combaStrengthMultiplier +
                                            " | Comba: " +
                                            that.combaGravityMultiplier,
                                        msg.byId
                                    );
                                    break;
                            }
                        }
                    }
                },
                "Configuración de la comba. ' !comba f <valor> ' cambia la fuerza | ' !comba c <valor> cambia la comba ' | ' !comba preset <valor> ' cambia el preset.",
                true,
                false
            );
        }
    };
};
