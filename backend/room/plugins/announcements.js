/**
 * @param {import("./types").API} API
 */
module.exports = function (API) {
  if (!API) API = require("node-haxball")();
  const { AllowFlags, Plugin } = API;

  class AnnouncementsPlugin extends Plugin {
    constructor() {
      super("lmbAnnouncements", true, {
        version: "0.1",
        author: "lombi",
        description: `Plugin de anuncios en el chat.`,
        allowFlags: AllowFlags.CreateRoom,
      });

      /**@type {import("./types").CommandsPlugin} */
      this.commands = undefined;
      this.isSaludoActive = true;
      this.announcementsCycle = 3 * 60000;
      this.announcements = [];
      this.saludo = "";
    }

    announcementLoop(i = 0) {
      setTimeout(() => {
        if (this.active) {
          if (!this.announcements[i] && this.announcements[0]) {
            i = 0;
          } else if (!this.announcements[0]) {
            this.announcementLoop();
            return;
          }

          let an = this.announcements[i];
          this.room.players.forEach((player) => {
            if (player?.showAnnouncements) {
              this.commands.printchat(`🕊️ ${an.text}`, player.id, "announcement");
              this.commands.printchat(`(!mute para silenciar estas alertas)`, player.id, "hint");
            }
          });
        }
        this.announcementLoop(i + 1);
      }, this.announcementsCycle);
    }

    setAnnouncementsCycleMinutes(minutes) {
      if (minutes < 0.25) return;
      this.announcementsCycle = minutes * 60000;
    }

    fetchAnnouncements() {
      let defaultAnnouncements = [{ text: "Discord: " + this.commands.data.discord }];
      this.announcements = defaultAnnouncements;

      if (this.commands.getDb()) {
        this.commands.getDb().all("SELECT * FROM announcements", (err, rows) => {
          if (err) {
            console.log(err);
            return;
          }
          rows.forEach((r) => {
            this.announcements.push(r);
          });
        });
      }
    }

    onPlayerJoin(playerObj) {
      playerObj.showAnnouncements = true;

      setTimeout(() => {
        if (this.isSaludoActive) {
          this.commands.printchat(this.saludo, playerObj.id, "announcement");
        }
      }, 500);
    }

    initialize() {
      this.commands = this.room.plugins.find((p) => p.name === "lmbCommands");
      if (!this.commands) {
        console.log("El plugin de anuncios requiere del plugin de comandos.");
      } else {
        this.saludo = `\n╔═══════════════════════════════════════════════════════╗
║   PAJARITOS HAX   ║ !discord !vip !stats !login !help !pm !bb  ║
╚═══════════════════════════════════════════════════════╝\n\n𝗕𝗜𝗘𝗡𝗩𝗘𝗡𝗜𝗗𝗢 𝗔 𝗟𝗔 𝗖𝗢𝗠𝗨𝗡𝗜𝗗𝗔𝗗 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗠𝗕𝗔\n\n\n${this.commands.data.discord}`;
        this.fetchAnnouncements();
        this.announcementLoop();
        this.commands.registerCommand(
          "!",
          "mute",
          (msg, args) => {
            const player = this.room.getPlayer(msg.byId);
            if (player) {
              if (player.showAnnouncements) {
                player.showAnnouncements = false;
                this.commands.printchat("Avisos desactivados", player.id);
              } else {
                player.showAnnouncements = true;
                this.commands.printchat("Avisos activados", player.id);
              }
            }
          },
          "Desactiva los anuncios",
          true,
          0
        );
        this.commands.registerCommand(
          "!",
          "anuncios",
          (msg, args) => {
            if (args.length === 0) {
              this.commands.printchat(
                " !anuncios on / off | !anuncios ciclo <minutos> | !anuncios nuevo <texto del nuevo anuncio> | !anuncios borrar",
                msg.byId
              );
            } else {
              if (args[0] === "on") {
                this.active = true;
                this.commands.printchat("Avisos activados", msg.byId);
              } else if (args[0] === "off") {
                this.active = false;
                this.commands.printchat("Avisos desactivados", msg.byId);
              } else if (args[0] === "ciclo" && args[1]) {
                if (!isNaN(args[1])) {
                  let fact = parseFloat(args[1]);
                  setAnnouncementsCycleMinutes(fact);
                  this.commands.printchat(`Ciclo de anuncios cambiado a ${fact} minutos`, msg.byId);
                  return;
                }
                this.commands.printchat(`Uso: !anuncios ciclo <minutos>`, msg.byId);
              } else if (args[0] === "nuevo") {
                if (args[1]) {
                  let newAnnouncement = args.slice(1).join(" ").replaceAll('"', '\\"');
                  this.commands
                    .getDb()
                    .run(
                      `INSERT INTO announcements (text) VALUES ("${newAnnouncement}")`,
                      (err) => {
                        if (err) {
                          console.log(err);
                          return;
                        } else {
                          this.fetchAnnouncements();
                          this.commands.printchat(
                            `Nuevo anuncio creado: ${newAnnouncement}`,
                            msg.byId
                          );
                        }
                      }
                    );
                } else {
                  this.commands.printchat(
                    "Uso: !anuncios nuevo <texto del nuevo anuncio> ",
                    msg.byId
                  );
                }
              } else if (args[0] === "borrar") {
                if (!args[1]) {
                  let str = "";
                  this.announcements.forEach((a) => {
                    if (a.id) {
                      let txt = a.text.length < 75 ? a.text : a.text.slice(0, 75) + "...";
                      str += `[${a.id}] ${txt}\n`;
                    }
                  });
                  str += "\n' !anuncio borrar <numero> ' para borrarlo.";
                  this.commands.printchat(str, msg.byId);
                } else if (!isNaN(args[1])) {
                  let id = parseInt(args[1]);
                  this.commands.getDb().run(`DELETE FROM announcements WHERE id=${id}`, (err) => {
                    if (err) {
                      console.log(err);
                      return;
                    } else {
                      this.fetchAnnouncements();
                      this.commands.printchat(`Anuncio ${id} borrado`, msg.byId);
                    }
                  });
                }
              } else if (args[0] === "fetch") {
                this.fetchAnnouncements();
                this.commands.printchat(`Se actualizaron los anuncios de la sala.`, msg.byId);
              }
            }
          },
          "Ajustes de los anuncios. !anuncios on / off | !anuncios ciclo <minutos> | !anuncios nuevo <texto del nuevo anuncio> | !anuncios borrar | !anuncios fetch",
          false,
          2
        );
      }
    }
  }

  return { instance: new AnnouncementsPlugin(), AnnouncementsPlugin };
};
