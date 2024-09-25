// ./commands/listarjogadores.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { carregarJogadores } = require('../utils/jogadores');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listarjogadores')
        .setDescription('Lista todos os jogadores cadastrados com paginação.'),
    async execute(interaction) {
        const jogadores = carregarJogadores();

        if (!jogadores || jogadores.length === 0) {
            await interaction.reply('Nenhum jogador cadastrado no momento.');
            return;
        }

        // Ordenar jogadores por nome
        jogadores.sort((a, b) => a.nome.localeCompare(b.nome));

        // Configuração de paginação
        const jogadoresPorPagina = 10; // Número de jogadores por página
        const totalPaginas = Math.ceil(jogadores.length / jogadoresPorPagina);
        let paginaAtual = 1;

        // Função para gerar o embed de acordo com a página atual
        const gerarEmbed = (numeroPagina) => {
            const inicio = (numeroPagina - 1) * jogadoresPorPagina;
            const fim = inicio + jogadoresPorPagina;
            const jogadoresPagina = jogadores.slice(inicio, fim);

            const embed = new EmbedBuilder()
                .setTitle('Lista de Jogadores')
                .setColor(0x0099ff)
                .setFooter({ text: `Página ${numeroPagina} de ${totalPaginas}` });

            jogadoresPagina.forEach(jogador => {
                embed.addFields({
                    name: jogador.nome,
                    value: `ID: ${jogador.id || 'N/A'}\nApto: ${jogador.apto ? 'Sim' : 'Não'}\nPenas Grandes: ${jogador.penasGrandes}\nPenas Pequenas: ${jogador.penasPequenas}\nTotal Penas: ${jogador.totalPenas}`,
                    inline: true
                });
            });

            return embed;
        };

        // Função para gerar os botões de navegação
        const gerarBotoes = (numeroPagina) => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('anterior')
                        .setLabel('⬅️ Anterior')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(numeroPagina === 1),
                    new ButtonBuilder()
                        .setCustomId('proximo')
                        .setLabel('Próximo ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(numeroPagina === totalPaginas)
                );
        };

        // Envia a primeira página
        const embedMensagem = await interaction.reply({
            embeds: [gerarEmbed(paginaAtual)],
            components: [gerarBotoes(paginaAtual)],
            fetchReply: true
        });

        // Cria um coletor para os botões
        const collector = embedMensagem.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // Tempo em milissegundos (60 segundos)
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'Você não pode interagir com este botão.', ephemeral: true });
                return;
            }

            // Atualiza a página atual com base no botão clicado
            if (i.customId === 'anterior') {
                paginaAtual--;
                if (paginaAtual < 1) paginaAtual = 1;
            } else if (i.customId === 'proximo') {
                paginaAtual++;
                if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
            }

            // Atualiza o embed e os botões
            await i.update({
                embeds: [gerarEmbed(paginaAtual)],
                components: [gerarBotoes(paginaAtual)]
            });
        });

        collector.on('end', async () => {
            // Desabilita os botões após o término do coletor
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('anterior')
                        .setLabel('⬅️ Anterior')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('proximo')
                        .setLabel('Próximo ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );

            await interaction.editReply({
                components: [disabledRow]
            });
        });
    }
};
