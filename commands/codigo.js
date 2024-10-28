// codigo.js

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('codigo')
        .setDescription('Envia informações sobre códigos promocionais')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do código promocional')
                .setRequired(true)
                .addChoices(
                    { name: 'KMART', value: 'kmart' },
                    { name: 'OMP', value: 'omp' }
                )
        ),

    async execute(interaction) {
        const codigo = interaction.options.getString('nome');

        let mensagem;

        if (codigo === 'kmart') {
            mensagem = '**Está pensando em fazer uma recarga? Utilize o código promocional `kmart` para receber cashback e apoiar nossos streamers!**';
        } else if (codigo === 'omp') {
            mensagem = '**Está pensando em fazer uma recarga? Utilize o código promocional `OMP` para receber cashback e apoiar nossos streamers!**';
        } else {
            mensagem = 'Código promocional não reconhecido.';
        }

        await interaction.reply(mensagem);
    }
};
