// ./commands/apto.js

const { SlashCommandBuilder } = require('discord.js');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apto')
        .setDescription('Gerencia o status de apto dos jogadores.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Define um jogador como apto.')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome do jogador')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove o status de apto de um jogador.')
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
            jogador.apto = true;
            salvarJogadores(jogadores);
            await interaction.reply(`Jogador ${nomeJogador} foi definido como **apto** para o leilão.`);
        } else if (subcommand === 'remove') {
            jogador.apto = false;
            salvarJogadores(jogadores);
            await interaction.reply(`Jogador ${nomeJogador} teve o status de **apto** removido.`);
        } else {
            await interaction.reply({ content: 'Subcomando inválido.', ephemeral: true });
        }
    }
};
