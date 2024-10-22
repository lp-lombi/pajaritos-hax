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
    Plugin.call(this, "lmbKits", true, {
        version: "0.1",
        author: "lombi",
        description: `Plugin de guardado y uso de casacas.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var that = this;

    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands;

    /**
     * @type {import("./types").Room}
     */
    var room;

    /**
     * @type {import("./types").Kit[]}
     */
    var kits = [];

    function fetchKits() {
        if (commands.getDb()) {
            try {
                commands.getDb().all("SELECT * FROM kits", (err, rows) => {
                    if (err) throw err;
                    kits = rows;
                });
            } catch (e) {
                console.log("Error en la base de datos: " + e);
            }
        }
    }

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log(
                "El plugin de casacas requiere del plugin de comandos."
            );
        } else {
            fetchKits();

            commands.registerCommand(
                "!",
                "casaca",
                (msg, args) => {
                    if (commands.isAdmin(msg.byId)) {
                        if (args.length === 0) {
                            let kitsString = "Lista de camisetas: \n";
                            kits.forEach((k) => {
                                kitsString += "   " + k.name + "   -";
                            });
                            kitsString +=
                                "\n Uso: !casaca <equipo> <nombre> | ej ' !casaca red independiente '";
                            commands.printchat(kitsString, msg.byId);
                        } else if (args.length > 0) {
                            if (args[0] === "red" || args[0] === "blue") {
                                if (args.length === 2) {
                                    let k = kits.find(
                                        (k) => k.name === args[1]
                                    );
                                    if (k) {
                                        let colorsList = k.cfg.split(/[ ]+/);
                                        let angle = parseInt(
                                            colorsList.splice(0, 1)[0]
                                        );

                                        let t =
                                            args[0] === "red"
                                                ? 1
                                                : args[0] === "blue"
                                                ? 2
                                                : null;

                                        t
                                            ? room.setTeamColors(
                                                  t,
                                                  angle,
                                                  ...colorsList.map((c) => c)
                                              )
                                            : commands.printchat(
                                                  "Equipo inválido.",
                                                  msg.byId
                                              );
                                    } else {
                                        commands.printchat(
                                            "Camiseta no encontrada.",
                                            msg.byId
                                        );
                                    }
                                }
                            } else if (args[0] === "add") {
                                if (args.length >= 4) {
                                    let kitName = args[1];
                                    let angle = isNaN(args[2])
                                        ? null
                                        : parseInt(args[2]);
                                    let fontColor =
                                        args[3].length === 6 ? args[3] : null;
                                    let color1 =
                                        args[4]?.length === 6 ? args[4] : null;
                                    let color2 =
                                        args[5]?.length === 6 ? args[5] : null;
                                    let color3 =
                                        args[6]?.length === 6 ? args[6] : null;

                                    if (
                                        kitName !== null &&
                                        angle !== null &&
                                        fontColor !== null &&
                                        color1 !== null
                                    ) {
                                        let cfg = `${angle} ${fontColor} ${color1}`;
                                        if (color2) cfg += ` ${color2}`;
                                        if (color3) cfg += ` ${color3}`;

                                        let error = false;

                                        commands
                                            .getDb()
                                            .run(
                                                `INSERT INTO kits (name, cfg) VALUES ("${kitName}", "${cfg}")`,
                                                (err) => {
                                                    error = true;
                                                    console.log(err);
                                                }
                                            );
                                        if (error) {
                                            commands.printchat(
                                                "No se pudo guardar la camiseta.",
                                                msg.byId,
                                                "error"
                                            );
                                        } else {
                                            fetchKits();
                                            commands.printchat(
                                                "Se guardó la camiseta correctamente.",
                                                msg.byId
                                            );
                                        }
                                        return;
                                    }
                                }
                                commands.printchat(
                                    "Uso incorrecto del comando. ej: ' !casaca add independiente 0 CF0C0C FF0505 CF0C05 '",
                                    msg.byId,
                                    "error"
                                );
                            }
                        }
                    }
                },
                `"Cambiar camisetas | para asignar: " !casaca <equipo> <nombre> " | para listar todas: " !casaca " | para agregar: " !casaca add <nombre> <cfg> "`,
                true
            );
        }
    };
};
