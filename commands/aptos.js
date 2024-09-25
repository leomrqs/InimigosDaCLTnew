// ./commands/aptos.js

const { SlashCommandBuilder } = require('discord.js');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aptos')
        .setDescription('Gerencia o status de apto de todos os jogadores.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('todosaptos')
                .setDescription('Define todos os jogadores como aptos.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('todosnaoaptos')
                .setDescription('Define todos os jogadores como não aptos.')
        ),
    async execute(interaction) {
        // Verifica se o usuário tem o cargo necessário
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        let jogadores = carregarJogadores();

        if (subcommand === 'todosaptos') {
            // Definindo todos os jogadores como aptos
            jogadores.forEach(jogador => jogador.apto = true);

            salvarJogadores(jogadores);

            await interaction.reply('Todos os jogadores foram definidos como **aptos** para o leilão.');
        } else if (subcommand === 'todosnaoaptos') {
            // Definindo todos os jogadores como não aptos
            jogadores.forEach(jogador => jogador.apto = false);

            salvarJogadores(jogadores);

            await interaction.reply('Todos os jogadores foram definidos como **não aptos** para o leilão.');
        } else {
            await interaction.reply({ content: 'Subcomando inválido.', ephemeral: true });
        }
    }
};
