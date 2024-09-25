// ./commands/del.js

const { SlashCommandBuilder } = require('discord.js');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('del')
        .setDescription('Remove um jogador do registro.')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do jogador a ser removido')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Verifica se o usuário tem o cargo necessário
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        const nomeJogador = interaction.options.getString('nome');

        let jogadores = carregarJogadores();

        // Tenta encontrar o jogador pelo Nome
        const indiceJogador = jogadores.findIndex(j => j.nome === nomeJogador);

        if (indiceJogador === -1) {
            await interaction.reply({ content: `Nenhum jogador encontrado com o nome ${nomeJogador}.`, ephemeral: true });
            return;
        }

        const jogadorEncontrado = jogadores[indiceJogador];

        // Remover o jogador do array
        jogadores.splice(indiceJogador, 1);
        salvarJogadores(jogadores);

        await interaction.reply(`Jogador ${jogadorEncontrado.nome} foi removido com sucesso.`);
    }
};
