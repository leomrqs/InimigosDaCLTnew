// ./commands/add.js

const { SlashCommandBuilder } = require('discord.js');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Adiciona um novo jogador ao registro.')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do jogador a ser adicionado')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Verifica se o usuário tem o cargo necessário
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        const nomeJogador = interaction.options.getString('nome').trim();

        let jogadores = carregarJogadores();

        // Verificar se o jogador já existe pelo nome
        if (jogadores.find(j => j.nome === nomeJogador)) {
            await interaction.reply({ content: `O jogador com o nome ${nomeJogador} já existe.`, ephemeral: true });
            return;
        }

        // Adicionar novo jogador com todos os atributos completos
        const novoJogador = {
            nome: nomeJogador,
            penasGrandes: 0,
            penasPequenas: 0,
            totalPenas: 0,
            prioridade: false,
            apto: false,
            aptoCartas: false,
            terça: "",
            quinta: "",
            sábado: "",
            domingo: ""
        };

        jogadores.push(novoJogador);
        salvarJogadores(jogadores);

        await interaction.reply(`Jogador ${nomeJogador} foi adicionado com sucesso.`);
    }
};
