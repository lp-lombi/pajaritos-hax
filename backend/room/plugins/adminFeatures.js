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
                true,
                false
            );

        }
    };
};
