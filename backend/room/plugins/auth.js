/**
 * Plugin de autenticación básica para haxball.
 * Si no se provee de una API, se devolverá una instancia y clase para usar con jsdoc
 * @param {import('./types').API} API
 */
module.exports = (API) => {
    if (!API) API = require("node-haxball")();
    class AuthPlugin extends API.Plugin {
        constructor() {
            super("lmbAuth", true, {
                description: "Autenticación básica para haxball.",
                author: "lombi",
                version: "0.3",
                allowFlags: API.AllowFlags.CreateRoom,
            });
            this.webApiData = null;
        }

        calcDaysBetween(date1, date2) {
            const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
            const differenceInMilliseconds = Math.abs(date2 - date1);
            return Math.floor(differenceInMilliseconds / oneDayInMilliseconds);
        }

        loginPlayer(player, data) {
            player.isLoggedIn = true;
            player.role = data.role;

            player.user = {
                id: data.id,
                role: data.role,
            };

            if (data.subscription) {
                if (data.subscription.tier >= 2 || this.calcDaysBetween(new Date(data.subscription.startDate), new Date()) < 30) {
                    player.user.subscription = data.subscription;
                } else {
                    commands.printchat(
                        "Tu suscripción expiró! ☹️ Si la querés renovar entrá a nuestro discord en la sección de Vips.",
                        player.id,
                        "error"
                    );
                }
            }

            if (data.role > 1) {
                this.room.setPlayerAdmin(player.id, true);
            }
        }
        getLoggedPlayers() {
            let loggedPlayers = [];
            this.commands.getPlayers().forEach((p) => {
                if (p && p.isLoggedIn) {
                    loggedPlayers.push(p);
                }
            });
            return loggedPlayers;
        }
        getPlayerSubscription(playerId) {
            let p = this.commands.getPlayers().find((p) => p.id === playerId);
            return p?.user?.subscription ? p.user.subscription : null;
        }
        updatePlayerSubscriptionData(playerId, subscriptionData) {
            let p = commands.getPlayers().find((p) => p.id === playerId);
            if (p) {
                fetch(commands.data.webApi.url + "/subscriptions/" + p.user.subscription.userId, {
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
        }

        isPlayerLogged(playerId) {
            let p = this.commands.getPlayers().find((p) => p.id === playerId);
            if (p && p.isLoggedIn) {
                return true;
            }
            return false;
        }
        isPlayerSubscribed(playerId) {
            let p = this.commands.getPlayers().find((p) => p.id === playerId);
            if (p && p.user?.subscription && p.user.subscription.tier >= 1) {
                return true;
            }
            return false;
        }

        async getAllUsersStats() {
            return new Promise((resolve, reject) => {
                if (!this.webApiData) {
                    reject("No se inicializó webApiData");
                    return [];
                }
                fetch(this.webApiData.url + "/users/stats/all", {
                    headers: {
                        "x-api-key": this.webApiData.key,
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
        }
        async getUserStats(username) {
            return new Promise((resolve, reject) => {
                if (!this.webApiData) {
                    reject("No se inicializó webApiData");
                    return [];
                }
                fetch(this.webApiData.url + "/users/getuser", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.webApiData.key,
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
        }
        async sumUserStats(username, score, assists, wins, matches) {
            if (!this.webApiData) {
                reject("No se inicializó webApiData");
                return [];
            }
            fetch(this.webApiData.url + "/users/stats/sum", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.webApiData.key,
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
        }

        onPlayerJoin = (player) => {
            player.isLoggedIn = false;
        };

        initialize() {
            /**
             * @type {import('./types').CommandsPlugin}
             */
            this.commands = this.room.plugins.find((p) => p.name === "lmbCommands");
            if (!this.commands) {
                console.log("El plugin de autenticación requiere del plugin de comandos.");
            } else {
                this.webApiData = this.commands.data.webApi;
                if (!this.webApiData || !this.webApiData.url || !this.webApiData.key) {
                    console.log("El plugin de autenticación requiere que se proporcionen URL y clave para la API web.");
                    return;
                }
                this.commands.registerCommand(
                    "!",
                    "register",
                    async (msg, args) => {
                        if (args.length !== 2) {
                            this.commands.printchat("Uso: ' !register <contraseña> <repetir contraseña> '", msg.byId, "error");
                        } else {
                            if (args[0] === args[1]) {
                                let player = this.commands.getPlayers().find((p) => p.id === msg.byId);
                                if (player) {
                                    try {
                                        const response = await fetch(this.webApiData.url + "/users/auth/register", {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                "x-api-key": this.webApiData.key,
                                            },
                                            body: JSON.stringify({
                                                username: player.name,
                                                password: args[0],
                                            }),
                                        });
                                        const data = await response.json();

                                        if (data.success) {
                                            loginPlayer(player, data);
                                            this.commands.printchat("¡Registrado exitosamente! :)", msg.byId);
                                        } else {
                                            if (data.reason === "registered") {
                                                this.commands.printchat("El usuario ya existe.", msg.byId, "error");
                                            } else if (data.reason === "error") {
                                                this.commands.printchat("Hubo un error, intentá más tarde.", msg.byId, "error");
                                            }
                                        }
                                    } catch (error) {
                                        console.error(error);
                                    }
                                }
                            } else {
                                this.commands.printchat("Las contraseñas no coinciden.", msg.byId, "error");
                            }
                        }
                    },
                    "Registrarse. ' !register <contraseña> <repetir contraseña> '",
                    true
                );
                this.commands.registerCommand(
                    "!",
                    "login",
                    async (msg, args) => {
                        if (args.length !== 1) {
                            this.commands.printchat(
                                "Uso: ' !login <contraseña> ' | Para registrarse: ' !register <contraseña> <repetir contraseña> '",
                                msg.byId,
                                "error"
                            );
                        } else {
                            let player = this.commands.getPlayers().find((p) => p.id === msg.byId);
                            if (player) {
                                if (this.getLoggedPlayers().includes(player)) {
                                    this.commands.printchat("Ya estás logueado.", msg.byId, "error");
                                    return;
                                }
                                try {
                                    const response = await fetch(this.webApiData.url + "/users/auth/login", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "x-api-key": this.webApiData.key,
                                        },
                                        body: JSON.stringify({
                                            username: player.name,
                                            password: args[0],
                                        }),
                                    });
                                    const data = await response.json();
                                    if (data.validated) {
                                        console.log("Inicio de sesión: " + player.name);
                                        if (player) {
                                            this.loginPlayer(player, data);
                                            this.commands.printchat("Sesión iniciada.", msg.byId);
                                        }
                                    } else {
                                        if (data.reason === "password") {
                                            this.commands.printchat("Contraseña incorrecta.", msg.byId, "error");
                                        } else if (data.reason === "user") {
                                            this.commands.printchat(
                                                "Usuario no registrado. Usa ' !register <contraseña> <repetir contraseña> ' para registrarte.",
                                                msg.byId,
                                                "error"
                                            );
                                        } else if (data.reason === "error") {
                                            console.log("Error al iniciar la sesión de ID " + msg.byId);
                                        }
                                    }
                                } catch (error) {
                                    console.error("Error al iniciar sesión de ID " + msg.byId, error);
                                }
                            }
                        }
                    },
                    "Iniciar la sesión. ' !login <contraseña> '",
                    true
                );
            }
        }
    }

    return { instance: new AuthPlugin(), AuthPlugin };
};
