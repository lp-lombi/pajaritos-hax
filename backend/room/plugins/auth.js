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
        version: "0.2",
        author: "lombi",
        description: `Autenticación básica para haxball.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var commands,
        loggedPlayers = [],
        that = this;

    function loginPlayer(player, role) {
        if (!loggedPlayers.includes(player)) {
            loggedPlayers.push(player);
        }
        if (role === 1 || role === 2) {
            that.room.setPlayerAdmin(player.id, true);
        }
    }

    this.getAllUsersStats = async () => {
        return new Promise((resolve, reject) => {
            fetch(commands.data.APIUrl + "/users/stats/all")
                .then((res) => {
                    if (res.ok) {
                        res.json().then((data) => {
                            resolve(data.stats);
                        });
                    } else {
                        resolve([]);
                    }
                })
                .catch((err) => {
                    console.log(err);
                    resolve([]);
                });
        });
    };

    this.getUserStats = async (username) => {
        return new Promise((resolve, reject) => {
            fetch(commands.data.APIUrl + "/users/getuser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                }),
            })
                .then((res) => {
                    if (res.ok) {
                        res.json().then((data) => {
                            resolve(data.user);
                        });
                    } else {
                        reject("No se pudo recuperar el usuario: " + err);
                    }
                })
                .catch((err) => {
                    reject("Error al conectarse con la API: " + err);
                });
        });
    };

    this.sumUserStats = async (username, score, assists, wins, matches) => {
        fetch(commands.data.APIUrl + "/users/stats/sum", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username,
                score,
                assists,
                wins,
                matches,
            }),
        }).catch((err) => {
            console.log(`Error al actualizar los stats de ${username}: ` + err);
        });
    };

    this.getLoggedPlayers = function () {
        return loggedPlayers;
    };

    this.isPlayerLogged = function (playerId) {
        let logged = false;
        loggedPlayers.forEach((p) => {
            p.id === playerId ? (logged = true) : null;
        });
        return logged;
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
                    "!",
                    "register",
                    (msg, args) => {
                        if (args.length !== 2) {
                            commands.printchat(
                                "Uso: ' !register <contraseña> <repetir contraseña> '",
                                msg.byId,
                                "error"
                            );
                        } else {
                            if (args[0] === args[1]) {
                                let player = that.room.players.find(
                                    (p) => p.id === msg.byId
                                );
                                if (player) {
                                    fetch(
                                        commands.data.APIUrl +
                                            "/users/auth/register",
                                        {
                                            method: "POST",
                                            headers: {
                                                "Content-Type":
                                                    "application/json",
                                            },
                                            body: JSON.stringify({
                                                username: player.name,
                                                password: args[0],
                                            }),
                                        }
                                    )
                                        .then((res) => res.json())
                                        .then((data) => {
                                            if (data.success) {
                                                loginPlayer(player, data.role);
                                                commands.printchat(
                                                    "¡Registrado exitosamente! :)",
                                                    msg.byId
                                                );
                                            } else {
                                                if (
                                                    data.reason === "registered"
                                                ) {
                                                    commands.printchat(
                                                        "El usuario ya existe.",
                                                        msg.byId,
                                                        "error"
                                                    );
                                                } else if (
                                                    data.reason === "error"
                                                ) {
                                                    commands.printchat(
                                                        "Hubo un error, intentá más tarde.",
                                                        msg.byId,
                                                        "error"
                                                    );
                                                }
                                            }
                                        });
                                }
                            } else {
                                commands.printchat(
                                    "Las contraseñas no coinciden.",
                                    msg.byId,
                                    "error"
                                );
                            }
                        }
                    },
                    "Registrarse. ' !register <contraseña> <repetir contraseña> '"
                );
                commands.registerCommand("!", "login", (msg, args) => {
                    if (args.length !== 1) {
                        commands.printchat(
                            "Uso: ' !login <contraseña> ' | Para registrarse: ' !register <contraseña> <repetir contraseña> '",
                            msg.byId,
                            "error"
                        );
                    } else {
                        let player = that.room.players.find(
                            (p) => p.id === msg.byId
                        );
                        if (player) {
                            if (loggedPlayers.includes(player)) {
                                commands.printchat(
                                    "Ya estás logueado.",
                                    msg.byId,
                                    "error"
                                );
                                return;
                            }

                            fetch(commands.data.APIUrl + "/users/auth/login", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    username: player.name,
                                    password: args[0],
                                }),
                            })
                                .then((res) => res.json())
                                .then((data) => {
                                    if (data.validated) {
                                        console.log("Deberia loguear");
                                        loginPlayer(player, data.role);
                                        commands.printchat(
                                            "Sesión iniciada.",
                                            msg.byId
                                        );
                                    } else {
                                        if (data.reason === "password") {
                                            commands.printchat(
                                                "Contraseña incorrecta.",
                                                msg.byId,
                                                "error"
                                            );
                                        } else if (data.reason === "user") {
                                            commands.printchat(
                                                "Usuario no registrado. Usa ' !register <contraseña> <repetir contraseña> ' para registrarte.",
                                                msg.byId,
                                                "error"
                                            );
                                        } else if (data.reason === "error") {
                                            console.log(
                                                "Error al iniciar la sesión de ID " +
                                                    msg.byId
                                            );
                                        }
                                    }
                                })
                                .catch((e) => console.log(e));
                        }
                    }
                });
            } catch (err) {
                console.log(err);
            }
            commands.onPlayerLeaveQueue.push((id) => {
                let loggedPlayer = loggedPlayers.find((p) => p.id === id);
                loggedPlayer
                    ? loggedPlayers.splice(
                          loggedPlayers.indexOf(loggedPlayer),
                          1
                      )
                    : null;
            });
        }
    };
};
