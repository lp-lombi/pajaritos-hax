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
        that = this;

    function calcDaysBetween(date1, date2) {
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
        const differenceInMilliseconds = Math.abs(date2 - date1);
        return Math.floor(differenceInMilliseconds / oneDayInMilliseconds);
    }

    function loginPlayer(player, data) {
        player.isLoggedIn = true;
        player.role = data.role;

        if (data.subscription) {
            if (
                data.subscription.tier >= 2 ||
                calcDaysBetween(new Date(data.subscription.startDate), new Date()) < 30
            ) {
                player.subscription = data.subscription;
            } else {
                commands.printchat(
                    "Tu suscripción expiró! ☹️ Si la querés renovar entrá a nuestro discord en la sección de Vips.",
                    player.id,
                    "error"
                );
            }
        }

        if (data.role > 1) {
            that.room.setPlayerAdmin(player.id, true);
        }
    }

    this.getAllUsersStats = async () => {
        return new Promise((resolve, reject) => {
            fetch(commands.data.webApi.url + "/users/stats/all", {
                headers: {
                    "x-api-key": commands.data.webApi.key,
                },
            })
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
            fetch(commands.data.webApi.url + "/users/getuser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": commands.data.webApi.key,
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
        fetch(commands.data.webApi.url + "/users/stats/sum", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": commands.data.webApi.key,
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
        let loggedPlayers = [];
        commands.getPlayers().forEach((p) => {
            if (p && p.isLoggedIn) {
                loggedPlayers.push(p);
            }
        });
        return loggedPlayers;
    };

    this.getPlayerSubscription = function (playerId) {
        let p = commands.getPlayers().find((p) => p.id === playerId);
        return p?.subscription ? p.subscription : null;
    };

    this.updatePlayerSubscriptionData = function (playerId, subscriptionData) {
        let p = commands.getPlayers().find((p) => p.id === playerId);
        if (p) {
            fetch(commands.data.webApi.url + "/subscriptions/" + p.subscription.userId, {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": commands.data.webApi.key,
                },
                body: JSON.stringify(subscriptionData),
            })
                .then((res) => {
                    if (res.ok) {
                        commands.printchat("Se actualizó tu información", playerId);
                    }
                })
                .catch((err) => {
                    console.log(`Error al actualizar los datos de suscripción de ${p.name}: ` + err);
                });
        }
    };

    this.isPlayerLogged = function (playerId) {
        let p = commands.getPlayers().find((p) => p.id === playerId);
        if (p && p.isLoggedIn) {
            return true;
        }
        return false;
    };

    this.isPlayerSubscribed = function (playerId) {
        let p = commands.getPlayers().find((p) => p.id === playerId);
        if (p && p.subscription && p.subscription.tier >= 1) {
            return true;
        }
        return false;
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log("El plugin de autenticación requiere del plugin de comandos.");
        } else {
            try {
                if (commands.data.webApi.url === "" || commands.data.webApi.key === "") {
                    setTimeout(() => {
                        console.error(
                            "***\nauth: No se recibió URL de la API o el token, el plugin no se iniciará.\n***"
                        );
                    }, 500);

                    return;
                }

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
                                let player = commands.getPlayers().find((p) => p.id === msg.byId);
                                if (player) {
                                    fetch(commands.data.webApi.url + "/users/auth/register", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "x-api-key": commands.data.webApi.key,
                                        },
                                        body: JSON.stringify({
                                            username: player.name,
                                            password: args[0],
                                        }),
                                    })
                                        .then((res) => res.json())
                                        .then((data) => {
                                            if (data.success) {
                                                loginPlayer(player, data.role);
                                                commands.printchat("¡Registrado exitosamente! :)", msg.byId);
                                            } else {
                                                if (data.reason === "registered") {
                                                    commands.printchat("El usuario ya existe.", msg.byId, "error");
                                                } else if (data.reason === "error") {
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
                                commands.printchat("Las contraseñas no coinciden.", msg.byId, "error");
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
                        let player = commands.getPlayers().find((p) => p.id === msg.byId);
                        if (player) {
                            if (that.getLoggedPlayers().includes(player)) {
                                commands.printchat("Ya estás logueado.", msg.byId, "error");
                                return;
                            }

                            fetch(commands.data.webApi.url + "/users/auth/login", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "x-api-key": commands.data.webApi.key,
                                },
                                body: JSON.stringify({
                                    username: player.name,
                                    password: args[0],
                                }),
                            })
                                .then((res) => res.json())
                                .then((data) => {
                                    if (data.validated) {
                                        console.log("Inicio de sesión: " + player.name);
                                        if (player) {
                                            loginPlayer(player, data);
                                            commands.printchat("Sesión iniciada.", msg.byId);
                                        }
                                    } else {
                                        if (data.reason === "password") {
                                            commands.printchat("Contraseña incorrecta.", msg.byId, "error");
                                        } else if (data.reason === "user") {
                                            commands.printchat(
                                                "Usuario no registrado. Usa ' !register <contraseña> <repetir contraseña> ' para registrarte.",
                                                msg.byId,
                                                "error"
                                            );
                                        } else if (data.reason === "error") {
                                            console.log("Error al iniciar la sesión de ID " + msg.byId);
                                        }
                                    }
                                })
                                .catch((e) => console.log(e));
                        }
                    }
                });
                commands.onPlayerJoinQueue.push((msg) => {
                    setTimeout(() => {
                        try {
                            let player = commands.getPlayers().find((p) => p.id === msg.V);
                            if (player) {
                                player.isLoggedIn = false;
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    }, 1000);
                });
            } catch (err) {
                console.log(err);
            }
        }
    };
};
