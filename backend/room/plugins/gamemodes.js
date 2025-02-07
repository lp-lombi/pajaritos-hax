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
    Plugin.call(this, "lmbGamemodes", true, {
        version: "0.1",
        author: "lombi",
        description: `Plugin para gestionar los modos de juego.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands;
    var that = this;

    this.gamemode = 1;

    this.Gamemodes = {
        X4: 1,
        X5: 2,
        Freeroam: 3,
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log("El plugin de modos de juego requiere del plugin de comandos.");
        } else {
            commands.registerCommand(
                "!",
                "gm",
                (msg, args) => {
                    if (args.length === 0) {
                        var str = "[1] Normal - Futsal x4\n[2] Normal - Futsal x5\n[3] Freeroam - Juegan Todos";
                        str += "\n !gm <id>.";
                        commands.printchat(str, msg.byId);
                    } else if (!isNaN(args[0])) {
                        var gamemodeId = parseInt(args[0]);
                        if (gamemodeId === that.Gamemodes.X4) {
                            commands.printchat("Cambiando el modo de juego a Futsal x4", msg.byId);
                            that.gamemode = that.Gamemodes.X4;
                            that.room.fakeSendPlayerChat("!autobot equipos 4", msg.byId);
                            that.room.fakeSendPlayerChat("!comba preset 2", msg.byId);
                            that.room.fakeSendPlayerChat("!autobot afk 15 move", msg.byId);
                        } else if (gamemodeId === that.Gamemodes.X5) {
                            commands.printchat("Cambiando el modo de juego a Futsal x5", msg.byId);
                            that.gamemode = that.Gamemodes.X5;
                            that.room.fakeSendPlayerChat("!autobot equipos 5", msg.byId);
                            that.room.fakeSendPlayerChat("!comba preset 3", msg.byId);
                            that.room.fakeSendPlayerChat("!autobot afk 15 move", msg.byId);
                        } else if (gamemodeId === that.Gamemodes.Freeroam) {
                            commands.printchat("Cambiando el modo de juego a Juegan Todos", msg.byId);
                            that.gamemode = that.Gamemodes.Freeroam;
                            that.room.fakeSendPlayerChat("!autobot equipos 15", msg.byId);
                            that.room.fakeSendPlayerChat("!comba preset 4", msg.byId);
                            that.room.fakeSendPlayerChat("!autobot afk 25 kick", msg.byId);
                        }
                    } else {
                        commands.printchat("El argumento debe ser un número.", msg.byId);
                    }
                },
                "Cambia el modo de juego. !gamemode id",
                2,
                false
            );
        }
    };
};
