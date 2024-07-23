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

    const ollama = require("ollama").default;

    const data = `
FKS: @Zizerooooooo que paso en 2011?
𝔫𝔫: casi
matn: a
matn: c
matn: c
matn: c
bellingham (no prime): no
𝓕𝓡𝓐𝓝: da
𝔫𝔫: erra
sarna: a
sarna: 3gk
𝔫𝔫: nt
𝔫𝔫: 1
bellingham (no prime): q
sarna: mala leche
𝓕𝓡𝓐𝓝: da
𝔫𝔫: claro
Zizerooooooo: q
𝑩𝒍𝒂𝒄𝒌🧙‍♂️🐐: Gal
matn: ay
Zizerooooooo: t QUIEN DEFA?
𝔫𝔫: mate
matn: nt
matn: vamos
𝔫𝔫: crei q me tirabas la diagonal sry
Negrofresa: me anda en cuotas el juego
    `;

    Object.setPrototypeOf(this, Plugin.prototype);
    Plugin.call(this, "lmbAiChat", true, {
        version: "0.1",
        author: "lombi",
        description: `Permite hablar al bot utilizando la API de Ollama.`,
        allowFlags: AllowFlags.CreateRoom,
    });

    var commands,
        that = this;

    this.initialize = function () {
        commands = that.room.plugins.find((p) => p.name === "lmbCommands");
        if (!commands) {
            console.log(
                "El plugin de chatbot IA requiere del plugin de comandos."
            );
        } else {
            that.room.onAfterAnnouncement = (msg) => {
                if (msg.toUpperCase().includes("CRISTO")) {
                    let txt = msg.split(/:(.*)/s);
                    //ollama
                    //    .chat({
                    //        model: "haxcristo:latest",
                    //        messages: [
                    //            {
                    //                role: "user",
                    //                content: txt[1],
                    //            },
                    //        ],
                    //    })
                    //    .then((response) => {
                    //        console.log(response);
                    //        commands.printchat(
                    //            response.message.content,
                    //            0,
                    //            "chat"
                    //        );
                    //    })
                    //    .catch((error) => {
                    //        console.log(error);
                    //    });
                }

                return true;
            };
        }
    };
};
