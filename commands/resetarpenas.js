// ./commands/resetarpenas.js

const { SlashCommandBuilder } = require('discord.js');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetarpenas')
        .setDescription('Reseta as penas dos jogadores.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('jogador')
                .setDescription('Reseta as penas de um jogador específico.')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome do jogador')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('todos')
                .setDescription('Reseta as penas de todos os jogadores.')
        ),
    async execute(interaction) {
        // Verifica se o usuário tem o cargo necessário
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        let jogadores = carregarJogadores();

        if (subcommand === 'jogador') {
            const nomeJogador = interaction.options.getString('nome');

            let jogador = jogadores.find(j => j.nome.toLowerCase() === nomeJogador.toLowerCase());

            if (!jogador) {
                await interaction.reply({ content: `Jogador ${nomeJogador} não encontrado.`, ephemeral: true });
                return;
            }

            // Resetar as penas do jogador específico
            jogador.penasGrandes = 0;
            jogador.penasPequenas = 0;
            jogador.totalPenas = 0;
            //jogador.prioridade = false;

            salvarJogadores(jogadores);

            await interaction.reply(`As penas do jogador ${nomeJogador} foram resetadas com sucesso.`);
        } else if (subcommand === 'todos') {
            // Resetar as penas de todos os jogadores
            jogadores.forEach(jogador => {
                jogador.penasGrandes = 0;
                jogador.penasPequenas = 0;
                jogador.totalPenas = 0;
                //jogador.prioridade = false;
            });

            salvarJogadores(jogadores);

            await interaction.reply('As penas de todos os jogadores foram resetadas com sucesso.');
        } else {
            await interaction.reply({ content: 'Subcomando inválido.', ephemeral: true });
        }
    }
};
