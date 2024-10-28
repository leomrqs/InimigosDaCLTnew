// pensamento.js

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo thoughts.json
const THOUGHTS_PATH = path.resolve(__dirname, '../data/thoughts.json');

// Função para carregar os pensamentos
function carregarPensamentos() {
    if (fs.existsSync(THOUGHTS_PATH)) {
        const data = fs.readFileSync(THOUGHTS_PATH, 'utf8');
        return JSON.parse(data);
    } else {
        return [];
    }
}

// Função para salvar os pensamentos
function salvarPensamentos(thoughtsArray) {
    fs.writeFileSync(THOUGHTS_PATH, JSON.stringify(thoughtsArray, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pensamento')
        .setDescription('Gerencia pensamentos')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adiciona um novo pensamento')
                .addStringOption(option =>
                    option.setName('texto')
                        .setDescription('O texto do pensamento')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('Lista todos os pensamentos')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('del')
                .setDescription('Deleta um pensamento existente')
                .addIntegerOption(option =>
                    option.setName('numero')
                        .setDescription('Número do pensamento a ser deletado')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const texto = interaction.options.getString('texto');

            // Carrega os pensamentos existentes
            const thoughtsArray = carregarPensamentos();

            // Adiciona o novo pensamento
            thoughtsArray.push(texto);

            // Salva os pensamentos atualizados
            salvarPensamentos(thoughtsArray);

            await interaction.reply('Pensamento adicionado com sucesso!');

        } else if (subcommand === 'del') {
            const numero = interaction.options.getInteger('numero');

            // Carrega os pensamentos existentes
            const thoughtsArray = carregarPensamentos();

            if (numero < 1 || numero > thoughtsArray.length) {
                await interaction.reply('Número inválido. Use o comando `/pensamento listar` para ver os números válidos.');
                return;
            }

            // Remove o pensamento
            const pensamentoRemovido = thoughtsArray.splice(numero - 1, 1);

            // Salva os pensamentos atualizados
            salvarPensamentos(thoughtsArray);

            await interaction.reply(`Pensamento número ${numero} removido com sucesso:\n"${pensamentoRemovido[0]}"`);

        } else if (subcommand === 'listar') {
            // Carrega os pensamentos existentes
            const thoughtsArray = carregarPensamentos();

            if (thoughtsArray.length === 0) {
                await interaction.reply('Não há pensamentos cadastrados.');
                return;
            }

            // Chama a função para iniciar a paginação
            await listarPensamentosComPaginacao(interaction, thoughtsArray);
        }
    }
};

// Função para listar pensamentos com paginação
async function listarPensamentosComPaginacao(interaction, thoughtsArray) {
    const pensamentosPorPagina = 25;
    const totalPaginas = Math.ceil(thoughtsArray.length / pensamentosPorPagina);

    let paginaAtual = 1;

    // Função para criar o embed
    const criarEmbed = (pagina) => {
        const inicio = (pagina - 1) * pensamentosPorPagina;
        const fim = inicio + pensamentosPorPagina;
        const pensamentosPagina = thoughtsArray.slice(inicio, fim);

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`Lista de Pensamentos (Página ${pagina}/${totalPaginas})`)
            .setFooter({ text: `Página ${pagina} de ${totalPaginas}` });

        let descricao = '';
        pensamentosPagina.forEach((thought, index) => {
            descricao += `**${inicio + index + 1}.** ${thought}\n`;
        });

        embed.setDescription(descricao);

        return embed;
    };

    // Cria os botões de navegação
    const criarBotoes = () => {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('anterior')
                    .setLabel('Página Anterior')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(paginaAtual === 1),
                new ButtonBuilder()
                    .setCustomId('proxima')
                    .setLabel('Próxima Página')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(paginaAtual === totalPaginas)
            );
    };

    // Envia a mensagem inicial
    const embedMessage = await interaction.reply({ embeds: [criarEmbed(paginaAtual)], components: [criarBotoes()], fetchReply: true });

    // Cria o coletor de interações para os botões
    const collector = embedMessage.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({ content: 'Você não pode interagir com este botão.', ephemeral: true });
            return;
        }

        if (i.customId === 'anterior') {
            if (paginaAtual > 1) {
                paginaAtual--;
                await i.update({ embeds: [criarEmbed(paginaAtual)], components: [criarBotoes()] });
            }
        } else if (i.customId === 'proxima') {
            if (paginaAtual < totalPaginas) {
                paginaAtual++;
                await i.update({ embeds: [criarEmbed(paginaAtual)], components: [criarBotoes()] });
            }
        }
    });

    collector.on('end', async () => {
        // Desabilita os botões após o tempo expirar
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('anterior')
                    .setLabel('Página Anterior')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('proxima')
                    .setLabel('Próxima Página')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );

        await embedMessage.edit({ components: [disabledRow] });
    });
}
