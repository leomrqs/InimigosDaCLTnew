// ./commands/listarpenas.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { carregarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listarpenas')
        .setDescription('Lista todos os jogadores e suas penas.'),
    async execute(interaction) {
        // Verifica se o usuário tem o cargo necessário
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        let jogadores = carregarJogadores();

        if (!jogadores || jogadores.length === 0) {
            await interaction.reply('Nenhum jogador cadastrado no momento.');
            return;
        }

        // Ordenar jogadores por nome para melhor organização
        jogadores.sort((a, b) => a.nome.localeCompare(b.nome));

        // Gerar a resposta com o total de penas de cada jogador
        let description = '';

        jogadores.forEach((jogador) => {
            const prioridadeEmoji = jogador.prioridade ? '✅' : '❌';
            const aptoEmoji = jogador.apto ? '✅' : '❌';
            description += `(${jogador.totalPenas}) **${jogador.nome}** | P: ${prioridadeEmoji} | A: ${aptoEmoji}\n`;
        });

        // Verificar se a descrição não excede 4096 caracteres
        if (description.length > 4096) {
            // Dividir em múltiplos embeds se necessário
            const chunks = description.match(/[\s\S]{1,4096}/g);
            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setTitle('Lista de Jogadores e suas Penas')
                    .setDescription(chunks[i])
                    .setColor(0x0099ff)
                    .setFooter({ text: `Página ${i + 1} de ${chunks.length}` });

                if (i === 0) {
                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.followUp({ embeds: [embed] });
                }
            }
        } else {
            const embed = new EmbedBuilder()
                .setTitle('Lista de Jogadores e suas Penas')
                .setDescription(description)
                .setColor(0x0099ff);

            await interaction.reply({ embeds: [embed] });
        }
    }
};
