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
    Plugin.call(this, "lmbAnnouncements", true, {
        version: "0.1",
        author: "lombi",
        description: `Repite en bucle mensajes de anuncios en el chat.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    /**
     * @type {import("./types").CommandsPlugin}
     */
    var commands;
    var that = this;

    this.active = true;

    //                       mins
    this.announcementsCycle = 3 * 60000;
    this.announcements = [];
    this.subsPlayersIds = [];

    this.isSaludoActive = true;
    this.saludo = "";

    this.publicSettings = [
        {
            name: "saludo",
            description: "Saludo al unirse a la sala",
            type: "bool",
            getValue: () => {
                return that.isSaludoActive;
            },
            setValue: (value) => {
                that.isSaludoActive = value;
            },
        },
    ];

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    function setAnnouncementsCycleMinutes(minutes) {
        if (minutes < 0.25) return;
        that.announcementsCycle = minutes * 60000;
    }

    this.fetchAnnouncements = function () {
        let defaultAnnouncements = ["Discord: " + commands.data.discord];
        that.announcements = [];

        defaultAnnouncements.forEach((c) => that.announcements.push({ text: c }));

        if (commands.getDb()) {
            commands.getDb().all("SELECT * FROM announcements", (err, rows) => {
                if (err) {
                    console.log(err);
                    return;
                }
                rows.forEach((r) => {
                    that.announcements.push(r);
                });
            });
        }
    };

    this.announcementLoop = async function (i = 0) {
        await sleep(that.announcementsCycle).then(() => {
            if (that.active) {
                if (!that.announcements[i] && that.announcements[0]) {
                    i = 0;
                } else if (!that.announcements[0]) {
                    that.announcementLoop();
                    return;
                }

                let an = that.announcements[i];
                that.subsPlayersIds.forEach((id) => {
                    try {
                        commands.printchat(`🕊️ ${an.text}`, id, "announcement");
                        commands.printchat(`(!mute para silenciar estas alertas)`, id, "hint");
                    } catch (e) {
                        // console.log(e);
                    }
                });
            }
            that.announcementLoop(i + 1);
        });
    };

    this.onPlayerJoin = (playerObj) => {
        that.subsPlayersIds.push(playerObj.id);
        Utils.runAfterGameTick(() => {
            if (that.isSaludoActive) {
                commands.printchat(that.saludo, playerObj.id, "announcement");
            }
        });
    };

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log("El plugin de anuncios requiere del plugin de comandos.");
        } else {
            that.saludo = `\n╔═══════════════════════════════════════════════════════╗
║   PAJARITOS HAX   ║ !discord !vip !stats !login !help !pm !bb ║
╚═══════════════════════════════════════════════════════╝\n\n𝗕𝗜𝗘𝗡𝗩𝗘𝗡𝗜𝗗𝗢 𝗔 𝗟𝗔 𝗖𝗢𝗠𝗨𝗡𝗜𝗗𝗔𝗗 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗠𝗕𝗔\n\n\n${commands.data.discord}`;
            that.fetchAnnouncements();

            commands.initQueue.push(that.announcementLoop);

            commands.registerCommand(
                "!",
                "mute",
                (msg, args) => {
                    that.subsPlayersIds.splice(that.subsPlayersIds.indexOf(msg.byId), 1);
                    commands.printchat("Avisos desactivados", msg.byId);
                },
                "Desactiva los anuncios",
                true,
                0
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
                                let fact = parseFloat(args[1]);
                                setAnnouncementsCycleMinutes(fact);
                                commands.printchat(`Ciclo de anuncios cambiado a ${fact} minutos`, msg.byId);
                                return;
                            }
                            commands.printchat(`Uso: !anuncios ciclo <minutos>`, msg.byId);
                        } else if (args[0] === "nuevo") {
                            if (args[1]) {
                                let newAnnouncement = args.slice(1).join(" ").replaceAll('"', '\\"');
                                commands
                                    .getDb()
                                    .run(`INSERT INTO announcements (text) VALUES ("${newAnnouncement}")`, (err) => {
                                        if (err) {
                                            console.log(err);
                                            return;
                                        } else {
                                            that.fetchAnnouncements();
                                            commands.printchat(`Nuevo anuncio creado: ${newAnnouncement}`, msg.byId);
                                        }
                                    });
                            } else {
                                commands.printchat("Uso: !anuncios nuevo <texto del nuevo anuncio> ", msg.byId);
                            }
                        } else if (args[0] === "borrar") {
                            if (!args[1]) {
                                let str = "";
                                that.announcements.forEach((a) => {
                                    if (a.id) {
                                        let txt = a.text.length < 75 ? a.text : a.text.slice(0, 75) + "...";
                                        str += `[${a.id}] ${txt}\n`;
                                    }
                                });
                                str += "\n' !anuncio borrar <numero> ' para borrarlo.";
                                commands.printchat(str, msg.byId);
                            } else if (!isNaN(args[1])) {
                                let id = parseInt(args[1]);
                                commands.getDb().run(`DELETE FROM announcements WHERE id=${id}`, (err) => {
                                    if (err) {
                                        console.log(err);
                                        return;
                                    } else {
                                        that.fetchAnnouncements();
                                        commands.printchat(`Anuncio ${id} borrado`, msg.byId);
                                    }
                                });
                            }
                        } else if (args[0] === "fetch") {
                            that.fetchAnnouncements();
                            commands.printchat(`Se actualizaron los anuncios de la sala.`, msg.byId);
                        }
                    }
                },
                "Ajustes de los anuncios. !anuncios on / off | !anuncios ciclo <minutos> | !anuncios nuevo <texto del nuevo anuncio> | !anuncios borrar | !anuncios fetch",
                false,
                2
            );
        }
    };
};
