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
        version: "0.2",
        author: "lombi",
        description: `Plugin de comba y powershot, inspirado en el plugin powershot de ABC`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var that = this;

    var commands;

    this.combaActive = true;
    this.combaCasting = false;
    this.combaShooting = false;
    this.isAnyPlayerInHoldingBall = false;
    this.holdDistance = 10;
    this.minHoldTicks = 40;
    this.combaShotTicks = 100;
    this.combaStrengthMultiplier = 1.75;
    this.combaGravityMultiplier = 0.75;
    this.castStrengthMultiplier = 0;
    this.combaGravityDecelerationFactor = 0.9875;
    this.combaGravityCollisionDecelerationFactor = 0.35;
    this.combaColor = parseInt("ff0000", 16);

    const chroma = require("chroma-js");
    this.chromaCombaColor = chroma(that.combaColor.toString(16));
    this.chromaBallColor = chroma("FFFFFF");

    this.defaultStadiumKickStrength = 5;

    this.calcDistance = function (disc1, disc2) {
        let dx = disc1.pos.x - disc2.pos.x;
        let dy = disc1.pos.y - disc2.pos.y;
        return Math.sqrt(dx * dx + dy * dy) - disc1.radius - disc2.radius;
    };

    this.calcVelocity = (x, y) => {
        return Math.sqrt(x * x + y * y);
    };

    this.calcVelocityBasedGravity = (velocity, ball) => {
        return (
            Math.sign(ball.speed.y) * // dirección
            -0.075 * // valor base
            (velocity / 6) * // multiplicador por velocidad, un tiro normal suele ser 6
            that.combaGravityMultiplier // multiplicador constante
        );
    };

    this.getValue = (string) => {
        const regex = /((?:\d+\.\d*)|(?:\d*\.?\d+))/g;
        let n = string.match(regex);
        n = n.join("");
        return parseFloat(n);
    };

    this.castComba = () => {
        if (that.castStrengthMultiplier < 1) {
            if (that.room) {
                let player = null;
                commands.getPlayers().forEach((p) => {
                    if (p.holdTicks) {
                        if (!player || p.holdTicks > player.holdTicks)
                            player = p;
                    }
                });
                if (player) {
                    that.castStrengthMultiplier += 0.02;
                }
            }
        }
    };

    this.disableComba = () => {
        if (that.room) {
            that.castStrengthMultiplier = 0;
        }
    };

    this.combaShot = (player, ball) => {
        Utils.runAfterGameTick(() => {
            let obj = {};
            let targetXSpeed =
                ball.speed.x *
                that.combaStrengthMultiplier *
                that.castStrengthMultiplier;
            let targetYSpeed =
                ball.speed.y *
                that.combaStrengthMultiplier *
                that.castStrengthMultiplier;

            let targetVelocity = that.calcVelocity(targetXSpeed, targetYSpeed);
            let currentVelocity = that.calcVelocity(ball.speed.x, ball.speed.y);
            let finalVelocity = currentVelocity;

            if (targetVelocity > currentVelocity) {
                finalVelocity = targetVelocity;
                obj.xspeed = targetXSpeed;
                obj.yspeed = targetYSpeed;
            }
            obj.ygravity = that.calcVelocityBasedGravity(finalVelocity, ball);

            that.room.setDiscProperties(0, obj);

            that.combaShooting = true;
            player.holdTicks = 0;
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
                    that.castComba();
                } else if (!that.combaShooting) {
                    that.disableComba();
                }

                Utils.runAfterGameTick(() => {
                    let newGravity =
                        ball.gravity.y * that.combaGravityDecelerationFactor;
                    let velocityBasedGravity = that.calcVelocityBasedGravity(
                        that.calcVelocity(ball.speed.x, ball.speed.y),
                        ball
                    );

                    // siempre debe tender a descender la gravedad
                    if (Math.abs(newGravity) > Math.abs(velocityBasedGravity)) {
                        newGravity = velocityBasedGravity;
                    }

                    let obj = {
                        ygravity:
                            Math.abs(ball.gravity.y) > 0.01 ? newGravity : 0,
                    };

                    // el color depende de si se está casteando o si se está tirando
                    let newColor = parseInt(
                        chroma
                            .mix(
                                that.chromaBallColor,
                                that.chromaCombaColor,
                                Math.abs(
                                    that.isAnyPlayerInHoldingBall
                                        ? that.castStrengthMultiplier * 0.08
                                        : newGravity
                                ) / 0.08
                            )
                            .hex()
                            .substring(1),
                        16
                    );
                    obj.color = newColor;

                    that.room.setDiscProperties(0, obj);

                    if (newGravity === 0) {
                        that.combaShooting = false;
                    }
                });
            }
        }
    };

    this.onPlayerBallKick = (playerId) => {
        if (that.room && that.combaActive) {
            // primero se desacelera al igual que en una colisión, por si no había previamente sido activada la comba
            that.decelerateGravity(
                0,
                that.combaGravityCollisionDecelerationFactor
            );
            // luego, la comba
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
            that.defaultStadiumKickStrength =
                that.room.stadium.playerPhysics.kickStrength;
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
                                    that.combaGravityMultiplier = 0.6;
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
                                    that.combaGravityMultiplier = 0.6;
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
                                    that.combaGravityMultiplier = 0.6;
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
                                    that.combaGravityMultiplier = 0.6;
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
