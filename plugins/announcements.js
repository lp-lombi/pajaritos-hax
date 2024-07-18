const commands = require("./commands");

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
    Plugin.call(this, "lmbAnnouncements", true, {
        version: "0.1",
        author: "lombi",
        description: `Repite en bucle mensajes de anuncios en el chat.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var commands,
        that = this;

    this.active = false;

    //                       mins
    this.announcementsCycle = 6 * 60000;
    this.announcements = [{ id: -1, text: "" }];
    this.subsPlayersIds = [];

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    function setAnnouncementsCycleMinutes(minutes) {
        that.announcementsCycle = minutes * 60000;
    }

    this.fetchAnnouncements = function () {
        commands.getDb().all("SELECT * FROM announcements", (err, rows) => {
            if (err) {
                console.log(err);
                return;
            }
            that.announcements = [];
            rows.forEach((r) => {
                that.announcements.push(r);
            });
        });
    };

    this.announcementLoop = async function () {
        for (let a of that.announcements) {
            await sleep(that.announcementsCycle).then(() => {
                if (that.active) {
                    that.subsPlayersIds.forEach((id) => {
                        commands.printchat(`🕊️ ${a.text}`, id, "announcement");
                        commands.printchat(
                            `(!mute para silenciar estas alertas)`,
                            id,
                            "hint"
                        );
                    });
                }
            });
        }
        that.announcementLoop();
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log(
                "El plugin de anuncios requiere del plugin de comandos."
            );
        } else {
            that.fetchAnnouncements();
            commands.initQueue.push(that.announcementLoop);
            commands.onPlayerJoinQueue.push((msg) => {
                that.subsPlayersIds.push(msg.id);
            });
            commands.registerCommand(
                "!",
                "mute",
                (msg, args) => {
                    that.subsPlayersIds.splice(
                        that.subsPlayersIds.indexOf(msg.byId),
                        1
                    );
                    commands.printchat("Avisos desactivados", msg.byId);
                },
                "Desactiva los anuncios",
                false,
                true
            );
            commands.registerCommand(
                "!",
                "anuncios",
                (msg, args) => {
                    if (args.length === 0) {
                        commands.printchat(
                            " !anuncios on / off | !anuncios ciclo <minutos> | !anuncios nuevo <texto del nuevo anuncio> | !anuncios borrar",
                            msg.byId
                        );
                    } else {
                        if (args[0] === "on") {
                            that.active = true;
                            commands.printchat("Avisos activados", msg.byId);
                        } else if (args[0] === "off") {
                            that.active = false;
                            commands.printchat("Avisos desactivados", msg.byId);
                        } else if (args[0] === "ciclo" && args[1]) {
                            if (!isNaN(args[1])) {
                                setAnnouncementsCycleMinutes(parseInt(args[1]));
                                commands.printchat(
                                    `Ciclo de anuncios cambiado a ${parseInt(
                                        args[1]
                                    )} minutos`,
                                    msg.byId
                                );
                                return;
                            }
                            commands.printchat(
                                `Uso: !anuncios ciclo <minutos>`,
                                msg.byId
                            );
                        } else if (args[0] === "nuevo") {
                            if (args[1]) {
                                let newAnnouncement = args
                                    .slice(1)
                                    .join(" ")
                                    .replaceAll('"', '\\"');
                                console.log(newAnnouncement);
                                commands
                                    .getDb()
                                    .run(
                                        `INSERT INTO announcements (text) VALUES ("${newAnnouncement}")`,
                                        (err) => {
                                            if (err) {
                                                console.log(err);
                                                return;
                                            } else {
                                                that.fetchAnnouncements();
                                                commands.printchat(
                                                    `Nuevo anuncio creado: ${newAnnouncement}`,
                                                    msg.byId
                                                );
                                            }
                                        }
                                    );
                            } else {
                                commands.printchat(
                                    "Uso: !anuncios nuevo <texto del nuevo anuncio> ",
                                    msg.byId
                                );
                            }
                        } else if (args[0] === "borrar") {
                            if (!args[1]) {
                                let str = "";
                                that.announcements.forEach((a) => {
                                    let txt =
                                        a.text.length < 75
                                            ? a.text
                                            : a.text.slice(0, 75) + "...";
                                    str += `[${a.id}] ${txt}\n`;
                                });
                                str +=
                                    "\n' !anuncio borrar <numero> ' para borrarlo.";
                                commands.printchat(str, msg.byId);
                            } else if (!isNaN(args[1])) {
                                let id = parseInt(args[1]);
                                commands
                                    .getDb()
                                    .run(
                                        `DELETE FROM announcements WHERE id=${id}`,
                                        (err) => {
                                            if (err) {
                                                console.log(err);
                                                return;
                                            } else {
                                                that.fetchAnnouncements();
                                                commands.printchat(
                                                    `Anuncio ${id} borrado`,
                                                    msg.byId
                                                );
                                            }
                                        }
                                    );
                            }
                        }
                    }
                },
                "Ajustes de los anuncios. !anuncios on / off | !anuncios ciclo <minutos> | !anuncios nuevo <texto del nuevo anuncio> | !anuncios borrar",
                true,
                false
            );
        }
    };
};
