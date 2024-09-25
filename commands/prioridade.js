// ./commands/prioridade.js

const { SlashCommandBuilder } = require('discord.js');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prioridade')
        .setDescription('Gerencia a prioridade dos jogadores.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adiciona prioridade a um jogador.')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome do jogador')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a prioridade de um jogador.')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome do jogador')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        // Verifica se o usuário tem o cargo necessário
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const nomeJogador = interaction.options.getString('nome');

        let jogadores = carregarJogadores();

        let jogador = jogadores.find(j => j.nome.toLowerCase() === nomeJogador.toLowerCase());

        if (!jogador) {
            await interaction.reply({ content: `Jogador ${nomeJogador} não encontrado.`, ephemeral: true });
            return;
        }

        if (subcommand === 'add') {
            jogador.prioridade = true;
            salvarJogadores(jogadores);
            await interaction.reply(`Prioridade **adicionada** ao jogador ${nomeJogador}.`);
        } else if (subcommand === 'remove') {
            jogador.prioridade = false;
            salvarJogadores(jogadores);
            await interaction.reply(`Prioridade **removida** do jogador ${nomeJogador}.`);
        } else {
            await interaction.reply({ content: 'Subcomando inválido.', ephemeral: true });
        }
    }
};
