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
    Plugin.call(this, "lmbAuth", true, {
        version: "0.1",
        author: "lombi",
        description: `Autenticación básica para haxball.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var commands,
        loggedPlayers = [],
        that = this;

    const bcrypt = require("bcryptjs");
    const saltRounds = 10;

    function loginPlayer(player, role) {
        if (!loggedPlayers.includes(player)) {
            loggedPlayers.push(player);
        }
        if (role === 1 || role === 2) {
            that.room.setPlayerAdmin(player.id, true);
        }
    }

    async function validateLogin(password, hash) {
        let res = await bcrypt
            .compare(password, hash)
            .then((res) => {
                return res;
            })
            .catch((err) => {
                console.log(err);
                return false;
            });

        return res;
    }

    this.getAllUsersStats = async () => {
        return new Promise((resolve, reject) => {
            commands
                .getDb()
                .all(
                    `SELECT id, username, score, assists FROM users`,
                    (err, rows) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(rows);
                    }
                );
        });
    };

    this.getUserScore = async (username) => {
        return new Promise((resolve, reject) => {
            commands
                .getDb()
                .all(
                    `SELECT score FROM users WHERE username="${username}"`,
                    (err, rows) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(rows[0].score);
                    }
                );
        });
    };

    this.setUserScore = async (username, score) => {
        commands
            .getDb()
            .run(
                `UPDATE users SET score = ${score} WHERE username="${username}"`,
                (err) => {
                    console.log(err);
                }
            );
        return score;
    };

    this.getLoggedPlayers = function () {
        return loggedPlayers;
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log(
                "El plugin de autenticación requiere del plugin de comandos."
            );
        } else {
            try {
                commands.registerCommand(
                    ":",
                    "register",
                    (msg, args) => {
                        if (args.length !== 2) {
                            that.room.sendAnnouncement(
                                "Uso: ' :register <contraseña> <repetir contraseña> '",
                                msg.byId
                            );
                        } else {
                            if (args[0] === args[1]) {
                                bcrypt
                                    .hash(args[0], saltRounds)
                                    .then((hash) => {
                                        let username = that.room.players.find(
                                            (p) => p.id === msg.byId
                                        ).name;
                                        let userInDb;

                                        commands
                                            .getDb()
                                            .all(
                                                `SELECT * FROM users WHERE username = "${username}"`,
                                                (err, rows) => {
                                                    if (err) throw err;
                                                    let user =
                                                        rows.length > 0
                                                            ? rows[0]
                                                            : null;
                                                    if (!user) {
                                                        let error = false;
                                                        commands
                                                            .getDb()
                                                            .run(
                                                                `INSERT INTO users (username, password) VALUES ("${username}", "${hash}")`,
                                                                (err) => {
                                                                    error = true;
                                                                    console.log(
                                                                        err
                                                                    );
                                                                }
                                                            );
                                                        if (!error) {
                                                            let player =
                                                                that.room.players.find(
                                                                    (p) =>
                                                                        p.id ===
                                                                        msg.byId
                                                                );
                                                            that.room.sendAnnouncement(
                                                                "Registrado con éxito. Iniciá la sesión con ' :login '",
                                                                msg.byId
                                                            );
                                                        }
                                                    } else {
                                                        that.room.sendAnnouncement(
                                                            "El usuario ya está registrado.",
                                                            msg.byId
                                                        );
                                                    }
                                                }
                                            );
                                    })
                                    .catch((err) => {
                                        console.log(err);
                                    });
                            } else {
                                that.room.sendAnnouncement(
                                    "Las contraseñas no coinciden.",
                                    msg.byId
                                );
                            }
                        }
                    },
                    "Registrarse. ' :register <contraseña> <repetir contraseña> '"
                );
                commands.registerCommand(
                    ":",
                    "login",
                    (msg, args) => {
                        if (args.length !== 1) {
                            that.room.sendAnnouncement(
                                "Uso: ' :login <contraseña> ' | Para registrarse: ' :register <contraseña> <repetir contraseña> '",
                                msg.byId
                            );
                        } else {
                            let username = that.room.players.find(
                                (p) => p.id === msg.byId
                            ).name;
                            commands
                                .getDb()
                                .all(
                                    `SELECT * FROM users WHERE username = "${username}"`,
                                    (err, rows) => {
                                        if (err) throw err;
                                        let user =
                                            rows.length > 0 ? rows[0] : null;
                                        if (user) {
                                            validateLogin(
                                                args[0],
                                                user.password
                                            ).then((validated) => {
                                                if (validated) {
                                                    let player =
                                                        that.room.players.find(
                                                            (p) =>
                                                                p.id ===
                                                                msg.byId
                                                        );
                                                    loginPlayer(
                                                        player,
                                                        user.role
                                                    );
                                                    that.room.sendAnnouncement(
                                                        `Sesión iniciada. | ${user.score} goles registrados.`,
                                                        msg.byId
                                                    );
                                                } else {
                                                    that.room.sendAnnouncement(
                                                        "Contraseña incorrecta.",
                                                        msg.byId
                                                    );
                                                }
                                            });
                                        } else {
                                            that.room.sendAnnouncement(
                                                "No estás registrado. Usa ' :register <contraseña> <repetir contraseña> '.",
                                                msg.byId
                                            );
                                        }
                                    }
                                );
                        }
                    },
                    "Inicia sesión. ' :login <contraseña> '"
                );
            } catch (err) {
                console.log(err);
            }
            that.room.onPlayerLeave = (playerObj) => {
                let loggedPlayer = loggedPlayers.find(
                    (p) => p.id === playerObj.id
                );
                loggedPlayer
                    ? loggedPlayers.splice(
                          loggedPlayers.indexOf(loggedPlayer),
                          1
                      )
                    : null;
            };
        }
    };
};
