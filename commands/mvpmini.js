const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Caminhos para os arquivos JSON
const DATA_PATH = path.resolve(__dirname, '../data/mvpminidataembed.json');
const RANKING_PATH = path.resolve(__dirname, '../data/mvpminiranking.json');

const TIME_DELAY = 1 * 60 * 60 * 1000; // Exemplo: 1 hora em milissegundos

// Função para carregar dados do arquivo JSON
async function carregarDados() {
    try {
        await fs.access(DATA_PATH);
        const jsonData = await fs.readFile(DATA_PATH, 'utf-8');
        return jsonData.trim() ? JSON.parse(jsonData) : criarEstruturaPadrao();
    } catch (error) {
        console.error('Erro ao carregar dados do JSON. Criando estrutura padrão:', error);
        return criarEstruturaPadrao();
    }
}

// Função para criar estrutura padrão inicial
function criarEstruturaPadrao() {
    return {
        messageId: null,
        channelId: null,
        bossStatus: 'Vivo',
        reportTime: null,
        respawnTime: null,
        reportedBy: null
    };
}

// Função para salvar dados no arquivo JSON
async function salvarDados(data) {
    try {
        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Erro ao salvar dados no JSON:', error);
    }
}

// Função para carregar o ranking
async function carregarRanking() {
    try {
        await fs.access(RANKING_PATH);
        const jsonData = await fs.readFile(RANKING_PATH, 'utf-8');
        return jsonData.trim() ? JSON.parse(jsonData) : {};
    } catch (error) {
        console.error('Erro ao carregar dados do ranking. Criando estrutura vazia:', error);
        return {};
    }
}

// Função para salvar o ranking
async function salvarRanking(ranking) {
    try {
        await fs.writeFile(RANKING_PATH, JSON.stringify(ranking, null, 2), 'utf-8');
    } catch (error) {
        console.error('Erro ao salvar dados do ranking:', error);
    }
}

// Função para atualizar o ranking
async function atualizarRanking(playerName) {
    const ranking = await carregarRanking();

    if (ranking[playerName]) {
        ranking[playerName] += 1;
    } else {
        ranking[playerName] = 1;
    }

    await salvarRanking(ranking);

    return ranking;
}

// Função para obter o TOP 5 do ranking
async function obterTop5(ranking) {
    const rankingArray = Object.entries(ranking);
    rankingArray.sort((a, b) => b[1] - a[1]);
    const top5 = rankingArray.slice(0, 5);
    return top5;
}

// Função para criar o embed com base nos dados
function criarEmbed(data, top5Ranking) {
    const status = data.bossStatus || 'Vivo';
    const respawnTime = data.respawnTime ? new Date(data.respawnTime).toLocaleTimeString('pt-BR') : 'N/A';
    const reportedBy = data.reportedBy || 'N/A';
    const reportTime = data.reportTime ? new Date(data.reportTime).toLocaleTimeString('pt-BR') : 'N/A';
    const color = status === 'Vivo' ? 0x00FF00 : 0xFF0000; // Verde para Vivo, Vermelho para Morto

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('Gerenciador de Bosses da Instância da Guilda')
        .setDescription('Clique no botão abaixo para reportar o status dos bosses.')
        .addFields(
            { name: '**Status**', value: `**${status}**`, inline: true },
            { name: '**Respawn**', value: respawnTime, inline: true },
            { name: '**Reportado por**', value: reportedBy, inline: true },
            { name: '**Horário de Report**', value: reportTime, inline: true }
        )
        .setImage('https://api.duniagames.co.id/api/content/upload/file/6038825251681285417.jpg') // Adiciona a imagem no final
        .setFooter({ text: 'Use o botão abaixo para reportar o status.' });

    // Adicionar o TOP 5 Ranking
    if (top5Ranking && top5Ranking.length > 0) {
        let rankingTexto = '';
        top5Ranking.forEach(([playerName, points], index) => {
            rankingTexto += `**${index + 1}. ${playerName}** - ${points} pontos\n`;
        });

        embed.addFields(
            { name: '🏆 **Ranking de Reportes**', value: rankingTexto }
        );
    } else {
        embed.addFields(
            { name: '🏆 **Ranking de Reportes**', value: 'Nenhum jogador no ranking.' }
        );
    }

    return embed;
}

// Função para configurar o coletor de interações
function configurarColetorDeInteracoes(embedMessage, data) {
    const filter = i => i.customId === 'mvpButton' && i.message.id === embedMessage.id;
    const collector = embedMessage.createMessageComponentCollector({ filter });

    collector.on('collect', async interaction => {
        try {
            await interaction.deferReply({ ephemeral: true });
            const agora = Date.now();

            data.bossStatus = 'Morto';
            data.reportTime = agora;
            data.respawnTime = agora + TIME_DELAY;
            data.reportedBy = interaction.member.displayName;

            // Atualizar o ranking
            const ranking = await atualizarRanking(interaction.member.displayName);

            // Obter o TOP 5 atualizado
            const top5Ranking = await obterTop5(ranking);

            await salvarDados(data);

            const embed = criarEmbed(data, top5Ranking);
            await embedMessage.edit({ embeds: [embed] });

            await interaction.followUp({ content: `O **MVP/MINI** foi reportado como morto. Ele irá renascer às ${new Date(data.respawnTime).toLocaleTimeString('pt-BR')}.`, ephemeral: true });

            await scheduleRespawn(embedMessage, data);
        } catch (error) {
            console.error('Erro ao processar interação:', error);
            await interaction.followUp({ content: 'Ocorreu um erro ao processar sua solicitação.', ephemeral: true });
        }
    });

    collector.on('end', () => {
        configurarColetorDeInteracoes(embedMessage, data);
    });
}

// Função para agendar o respawn e atualizar o Embed
async function scheduleRespawn(embedMessage, data) {
    const remainingTime = data.respawnTime - Date.now();

    // Carregar o ranking
    const ranking = await carregarRanking();
    const top5Ranking = await obterTop5(ranking);

    if (remainingTime > 0) {
        setTimeout(async () => {
            data.bossStatus = 'Vivo';
            data.reportTime = null;
            data.respawnTime = null;
            data.reportedBy = null;

            await salvarDados(data);

            const embed = criarEmbed(data, top5Ranking);
            await embedMessage.edit({ embeds: [embed] });
        }, remainingTime);
    } else {
        // Se o respawn já passou durante o downtime do bot
        data.bossStatus = 'Vivo';
        data.reportTime = null;
        data.respawnTime = null;
        data.reportedBy = null;

        await salvarDados(data);

        const embed = criarEmbed(data, top5Ranking);
        await embedMessage.edit({ embeds: [embed] });
    }
}

// Função para retomar monitoramento após o bot reiniciar
async function retomarMonitoramento(client) {
    const data = await carregarDados();
    if (!data.messageId || !data.channelId) return;

    const channel = client.channels.cache.get(data.channelId);
    if (!channel) {
        console.error('Erro: Canal não encontrado.');
        return;
    }

    try {
        const embedMessage = await channel.messages.fetch(data.messageId);

        // Carregar o ranking
        const ranking = await carregarRanking();
        const top5Ranking = await obterTop5(ranking);

        if (data.bossStatus === 'Morto' && data.respawnTime) {
            const now = Date.now();

            if (data.respawnTime <= now) {
                data.bossStatus = 'Vivo';
                data.reportTime = null;
                data.respawnTime = null;
                data.reportedBy = null;

                await salvarDados(data);

                const embed = criarEmbed(data, top5Ranking);
                await embedMessage.edit({ embeds: [embed] });
            } else {
                await scheduleRespawn(embedMessage, data);
            }
        } else {
            const embed = criarEmbed(data, top5Ranking);
            await embedMessage.edit({ embeds: [embed] });
        }

        configurarColetorDeInteracoes(embedMessage, data);
    } catch (error) {
        console.error('Erro ao retomar monitoramento:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mvpmini')
        .setDescription('Gerencia os bosses MVP/MINI da guilda.'),

    execute: async (interaction) => {
        const data = criarEstruturaPadrao();
        data.channelId = interaction.channel.id;

        // Carregar o ranking
        const ranking = await carregarRanking();
        const top5Ranking = await obterTop5(ranking);

        const embed = criarEmbed(data, top5Ranking);

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mvpButton')
                    .setLabel('MVP/MINI Morto')
                    .setStyle(ButtonStyle.Primary)
            );

        const embedMessage = await interaction.reply({ embeds: [embed], components: [buttonRow], fetchReply: true });

        data.messageId = embedMessage.id;

        await salvarDados(data);

        configurarColetorDeInteracoes(embedMessage, data);
    },

    retomarMonitoramento
};
