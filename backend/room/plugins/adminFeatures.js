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
    Plugin.call(this, "lmbAdminFeatures", true, {
        version: "0.1",
        author: "lombi",
        description: `Comandos para administradores.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var that = this;

    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands;

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log("El plugin de administradores requiere del plugin de comandos.");
        } else {
            commands.registerCommand(
                "!",
                "warn",
                (msg, args) => {
                    if (args.length < 2) {
                        commands.printchat("Uso: !warn @user esta es tu primera advertencia", msg.byId);
                    } else {
                        if (args[0].startsWith("@")) {
                            let name = args[0].substring(1).replaceAll("_", " ");
                            let p = commands.getPlayers().find((p) => p.name === name);
                            if (p) {
                                let text = args.slice(1).join(" ");
                                commands.printchat(text, p.id, "warn", msg.byId);
                            }
                        }
                    }
                },
                "Envía una advertencia a un jugador con un mensaje. '!warn @user esta es tu primera advertencia'",
                false,
                1
            );
            commands.registerCommand(
                "!",
                "an",
                (msg, args) => {
                    if (args.length < 1) {
                        commands.printchat("Uso: !an Este es un anuncio", msg.byId);
                    } else {
                        let text = "[📢] " + args.join(" ");
                        commands.printchat(text, null, "announcement-big");
                    }
                },
                "Envía un anuncio a todos los jugadores con un mensaje. '!an Este es un anuncio'",
                false,
                1
            );
            commands.registerCommand(
                "!",
                "kick",
                (msg, args) => {
                    if (args.length < 1) {
                        let str = commands.getPlayersIdsString();
                        str += "\nREFERENCIA: un número ID más bajo indica que el usuario se unió antes. ";
                        str += "Tenerlo en cuenta cuando hay nombres duplicados";
                        str += "\n\nUso: ' !kick <id> mensaje de motivo '";
                        commands.printchat(str, msg.byId);
                    } else {
                        if (!isNaN(args[0])) {
                            let id = parseInt(args[0]);
                            let reason = args.slice(1).join(" ");
                            that.room.kickPlayer(id, reason, false);
                        } else {
                            commands.printchat("Uso incorrecto. ' !kick <id> mensaje de motivo '", msg.byId, "error");
                        }
                    }
                },
                "Kickea a un jugador. ' !kick <id> mensaje de motivo '",
                false,
                1
            );
            commands.registerCommand(
                "!",
                "msgspam",
                (msg, args) => {
                    if (args.length < 1) {
                        commands.printchat("Uso: !an Este es un anuncio", msg.byId);
                    } else {
                        let text = args.join(" ");
                        let i = setInterval(() => {
                            r.sendAnnouncement(text, null, parseInt("FF9999", 16), null, 2);
                        }, 5);
                        setTimeout(() => {
                            clearInterval(i);
                        }, 500);
                    }
                },
                "USAR CON PRECAUCIÓN Y EN INTERVALOS DE TIEMPO ESPACIADOS. ' !spam mensaje '",
                true,
                2
            );
        }
    };
};
