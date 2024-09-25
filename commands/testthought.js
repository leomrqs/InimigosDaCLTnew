// commands/testthought.js

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testthought')
        .setDescription('Envia um pensamento de teste imediatamente.'),
    async execute(interaction) {
        // Verificar permissões, se necessário
        const dailyThoughtsScheduler = interaction.client.dailyThoughtsScheduler;
        if (!dailyThoughtsScheduler) {
            await interaction.reply({ content: 'O agendador de pensamentos não está disponível.', ephemeral: true });
            return;
        }

        await dailyThoughtsScheduler.sendTestThought();
        await interaction.reply({ content: 'Pensamento de teste enviado.', ephemeral: true });
    }
};
