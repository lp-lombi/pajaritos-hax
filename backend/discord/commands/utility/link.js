const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("link")
        .setDescription(
            "Muestra el link de la sala de Haxball si está abierto el host."
        ),
    async execute(interaction) {
        if (!global.room) {
            await interaction.reply("No está abierto el server.");
        } else {
            await interaction.reply(`El link es: ${global.room.link}`);
        }
    },
};
