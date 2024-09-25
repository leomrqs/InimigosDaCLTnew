const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { ROLE_ID } = require('../utils/constants');

// Caminho para o arquivo jogadores.json
const JOGADORES_PATH = path.resolve(__dirname, '../data/jogadores.json');
const MESSAGE_ID_PATH = path.resolve(__dirname, '../data/jogadoresidmessage.json');

// Variável para armazenar a mensagem embed
let embedMessage = null;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jogadores')
        .setDescription('Mostra a lista de jogadores cadastrados com paginação.'),

    async execute(interaction) {
        // Verifica se o usuário tem permissão
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        try {
            // Carrega ou envia o embed da lista de jogadores
            await carregarOuEnviarEmbed(interaction);
        } catch (error) {
            console.error('Erro ao executar o comando jogadores:', error);
        }
    },

    async iniciarMonitoramentoAoInicializar(client) {
        let mensagemId;
        let canalId;

        try {
            if (fs.existsSync(MESSAGE_ID_PATH) && fs.statSync(MESSAGE_ID_PATH).size > 0) {
                const data = JSON.parse(fs.readFileSync(MESSAGE_ID_PATH, 'utf-8'));
                mensagemId = data.idDaMensagem;
                canalId = data.idDoCanal;
            }

            if (mensagemId && canalId) {
                const canal = await client.channels.fetch(canalId);
                embedMessage = await canal.messages.fetch(mensagemId);
                if (embedMessage) {
                    console.log("Monitoramento de jogadores iniciado.");
                    monitorarInteracoes(embedMessage, carregarJogadores(), Math.ceil(carregarJogadores().length / 50));
                }
            }
        } catch (error) {
            console.error('Erro ao inicializar o monitoramento dos jogadores:', error);
        }
    }
};

// Função para carregar a mensagem embed existente ou enviar uma nova
async function carregarOuEnviarEmbed(interaction) {
    let mensagemId;
    let canalId;

    try {
        if (fs.existsSync(MESSAGE_ID_PATH) && fs.statSync(MESSAGE_ID_PATH).size > 0) {
            const data = JSON.parse(fs.readFileSync(MESSAGE_ID_PATH, 'utf-8'));
            mensagemId = data.idDaMensagem;
            canalId = data.idDoCanal;
        }
    } catch (error) {
        console.error('Erro ao ler o arquivo de ID da mensagem:', error);
    }

    if (mensagemId && canalId) {
        try {
            const canal = await interaction.guild.channels.fetch(canalId);
            embedMessage = await canal.messages.fetch(mensagemId);

            if (!embedMessage) {
                console.log('A mensagem não existe mais. Enviando uma nova.');
                await enviarNovaMensagemEmbed(interaction.channel);
            }
        } catch (error) {
            console.log('Não foi possível encontrar a mensagem anterior. Enviando uma nova.');
            await enviarNovaMensagemEmbed(interaction.channel);
        }
    } else {
        await enviarNovaMensagemEmbed(interaction.channel);
    }
}

// Função para enviar uma nova mensagem embed
async function enviarNovaMensagemEmbed(channel) {
    let jogadores;
    try {
        jogadores = carregarJogadores();
    } catch (error) {
        console.error('Erro ao ler o arquivo jogadores.json:', error);
        jogadores = [];
    }

    if (jogadores.length === 0) {
        await channel.send('Nenhum jogador cadastrado no momento.');
        return;
    }

    jogadores.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordenar jogadores por nome

    const totalPaginas = Math.ceil(jogadores.length / 50); // Paginação de 50 jogadores por página
    let paginaAtual = 1;

    const embed = gerarEmbedJogadores(jogadores, paginaAtual, totalPaginas, jogadores.length); // Passa a quantidade total de jogadores
    const botoes = gerarBotoes(paginaAtual, totalPaginas);

    embedMessage = await channel.send({ embeds: [embed], components: [botoes] });

    // Salvar o ID da mensagem e do canal no arquivo JSON
    fs.writeFileSync(MESSAGE_ID_PATH, JSON.stringify({ idDaMensagem: embedMessage.id, idDoCanal: channel.id }), 'utf-8');

    monitorarInteracoes(embedMessage, jogadores, totalPaginas);
}

// Função para gerar embed de jogadores para a página atual
function gerarEmbedJogadores(jogadores, paginaAtual, totalPaginas, totalJogadores) {
    const inicio = (paginaAtual - 1) * 50;
    const fim = inicio + 50;
    const jogadoresPagina = jogadores.slice(inicio, fim);

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Lista de Jogadores')
        .setDescription(jogadoresPagina.map(jogador => jogador.nome).join('\n')) // Nomes um abaixo do outro
        .setFooter({ text: `Página ${paginaAtual} de ${totalPaginas} | Total de jogadores: ${totalJogadores}` }); // Adiciona o total de jogadores no rodapé

    return embed;
}

// Função para gerar botões de navegação e o botão "Refresh"
function gerarBotoes(paginaAtual, totalPaginas) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('anterior')
                .setLabel('⬅️ Anterior')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(paginaAtual === 1),
            new ButtonBuilder()
                .setCustomId('proximo')
                .setLabel('Próximo ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(paginaAtual === totalPaginas),
            new ButtonBuilder()
                .setCustomId('refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary)
        );
}

// Função para monitorar interações com os botões
function monitorarInteracoes(embedMessage, jogadores, totalPaginas) {
    const collector = embedMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 0 // Definir o tempo como zero para manter o coletor indefinidamente
    });

    let paginaAtual = 1;

    collector.on('collect', async i => {
        if (i.customId === 'anterior') {
            paginaAtual--;
        } else if (i.customId === 'proximo') {
            paginaAtual++;
        } else if (i.customId === 'refresh') {
            await refreshEmbed(i); // Chama a função de refresh
            return;
        }

        const embed = gerarEmbedJogadores(jogadores, paginaAtual, totalPaginas, jogadores.length); // Passa a quantidade total de jogadores
        const botoes = gerarBotoes(paginaAtual, totalPaginas);

        await i.update({ embeds: [embed], components: [botoes] });
    });

    collector.on('end', async () => {
        // Quando o coletor terminar (por qualquer motivo), reativamos o monitoramento
        console.log('Coletor de interações terminou. Reativando...');
        monitorarInteracoes(embedMessage, jogadores, totalPaginas);
    });
}

// Função para atualizar (refresh) o embed
async function refreshEmbed(interaction) {
    let mensagemId;
    let canalId;

    try {
        if (fs.existsSync(MESSAGE_ID_PATH) && fs.statSync(MESSAGE_ID_PATH).size > 0) {
            const data = JSON.parse(fs.readFileSync(MESSAGE_ID_PATH, 'utf-8'));
            mensagemId = data.idDaMensagem;
            canalId = data.idDoCanal;
        }
    } catch (error) {
        console.error('Erro ao ler o arquivo de ID da mensagem:', error);
        return;
    }

    if (mensagemId && canalId) {
        try {
            const canal = await interaction.guild.channels.fetch(canalId);
            const mensagemAntiga = await canal.messages.fetch(mensagemId);

            if (mensagemAntiga) {
                await mensagemAntiga.delete(); // Deleta o embed antigo
            }
        } catch (error) {
            console.error('Erro ao deletar a mensagem antiga:', error);
        }

        // Envia um novo embed atualizado
        await enviarNovaMensagemEmbed(interaction.channel);
    }
}

// Função para carregar jogadores do arquivo JSON
function carregarJogadores() {
    try {
        const dados = fs.readFileSync(JOGADORES_PATH, 'utf-8');
        return JSON.parse(dados);
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        return [];
    }
}
