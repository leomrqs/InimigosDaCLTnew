const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ROLE_ID } = require('../utils/constants');
const { apagarMensagem } = require('../utils/utils');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo que armazenará o ID da mensagem e do canal
const MENSAGEM_ID_PATH = path.resolve(__dirname, '../data/mensagemidjustificar.json');

// Variável para armazenar a mensagem embed e um flag para monitoramento
let embedMessage = null;
let monitorandoAlteracoesJustificarFalta = false; // Flag para monitoramento específico do comando justificarfalta

// Inicializando corretamente a variável jogadoresAusentes como array
let jogadoresAusentes = [];

// Mapear as novas classes e IDs conforme as imagens
const roles = {
'Archbishop': { id: '1284233600606146663', emojiName: 'archbishop', emojiId: '1287973707419091035' },
    'Warlock': { id: '1284233535519199447', emojiName: 'warlock', emojiId: '1287974971137720371' },
    'Rune Knight': { id: '1284233909034549383', emojiName: 'runeknight', emojiId: '1287974964762247220' },
    'Royal Guard': { id: '1284233974406713354', emojiName: 'royalguard', emojiId: '1287974962241605653' },
    'Ranger': { id: '1284234004878327900', emojiName: 'ranger', emojiId: '1287974969443352686' },
    'Mechanic': { id: '1284234068820496384', emojiName: 'mechanic', emojiId: '1287974969443352686' },
    'Shura': { id: '1284234649823875183', emojiName: 'shura', emojiId: '1287974959939059763' },
    'Grand Summoner': { id: '1284234699480502375', emojiName: 'doram', emojiId: '1287974974539305075' },
    'Element User': { id: '1284234751821217855', emojiName: 'sorcerer', emojiId: '1287974979060633622' },
    'Wanderer': { id: '1284234825930375168', emojiName: 'wanderer', emojiId: '1287975688242200610' },
    'Guillotine Cross': { id: '1284234874533838979', emojiName: 'guillotinecross', emojiId: '1287974967350132757' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('justificarfalta')
        .setDescription('Justifica a ausência para os eventos do dia.'),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        try {
            // Envia uma nova mensagem embed e salva o ID no JSON
            await enviarEmbedJustificarFalta(interaction);

            // Inicia o monitoramento de alterações no JSON se ainda não estiver monitorando
            if (!monitorandoAlteracoesJustificarFalta) {
                monitorarAlteracoesJustificarFalta(interaction.client);
            }
        } catch (error) {
            console.error('Erro ao executar o comando justificarfalta:', error);
            await interaction.reply({ content: 'Ocorreu um erro ao tentar justificar falta.', ephemeral: true });
        }
    }
};

// Função para enviar uma nova mensagem embed e salvar o ID
async function enviarEmbedJustificarFalta(interaction) {
    let jogadoresPorClasse = {
        'Archbishop': [],
        'Warlock': [],
        'Rune Knight': [],
        'Royal Guard': [],
        'Ranger': [],
        'Mechanic': [],
        'Shura': [],
        'Grand Summoner': [],
        'Element User': [],
        'Wanderer': [],
        'Guillotine Cross': []
    };

    jogadoresAusentes = []; // Reinicializando corretamente a variável jogadoresAusentes como array

    // Atualiza o cache de membros
    await interaction.guild.members.fetch();

    // Preenche a lista de jogadores por classe
    interaction.guild.members.cache.forEach(member => {
        for (const [classe, data] of Object.entries(roles)) {
            if (member.roles.cache.has(data.id)) {
                jogadoresPorClasse[classe].push(member.displayName);
            }
        }
    });

    const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaAtual = diasDaSemana[new Date().getDay()];

    const calcularDataEvento = (diaAtual) => {
        let dataEvento = new Date();
        switch (diaAtual.toLowerCase()) {
            case 'segunda':
                dataEvento.setDate(dataEvento.getDate() + 1);
                break;
            case 'quarta':
                dataEvento.setDate(dataEvento.getDate() + 1);
                break;
            case 'sexta':
                dataEvento.setDate(dataEvento.getDate() + 1);
                break;
            default:
                break;
        }
        return dataEvento;
    };

    const dataEvento = calcularDataEvento(diaAtual);
    const dataEventoFormatada = dataEvento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const diaParaEvento = diaAtual === 'Segunda' ? 'Terça' : diaAtual === 'Quarta' ? 'Quinta' : diaAtual === 'Sexta' ? 'Sábado' : diaAtual;

    // Ordenar classes por quantidade de jogadores (maior número de jogadores primeiro)
    const jogadoresPorClasseOrdenado = Object.entries(jogadoresPorClasse).sort((a, b) => b[1].length - a[1].length);

    // Contagem total de jogadores
    const totalJogadores = jogadoresPorClasseOrdenado.reduce((acc, [_, jogadores]) => acc + jogadores.length, 0);

    const embed = new EmbedBuilder()
        .setColor(0x684dad)
        .setTitle(`Lista de Jogadores para os eventos do dia: ${diaParaEvento} (${dataEventoFormatada})`)
        .setDescription('Reaja com ❌ se você não puder comparecer aos eventos do dia acima:');

    // Adicionar jogadores no embed
    for (const [classe, jogadores] of jogadoresPorClasseOrdenado) {
        const { emojiName, emojiId } = roles[classe];
        const emoji = `<:${emojiName}:${emojiId}>`;
        embed.addFields({
            name: `${classe} ${emoji}`,
            value: jogadores.join('\n') || 'Nenhum jogador',
            inline: true
        });
    }


    // Adicionar a categoria "Ausência" no final do embed
    embed.addFields({
        name: 'Ausência ❌',
        value: jogadoresAusentes.length > 0 ? jogadoresAusentes.join('\n') : 'Nenhum jogador ausente',
        inline: true
    });

    // Adicionar o número total de jogadores em letras pequenas
    embed.setFooter({ text: `Número total de Players: ${totalJogadores}` });

    // Envia o embed e salva o ID da mensagem e do canal
    embedMessage = await interaction.channel.send({ embeds: [embed] });
    fs.writeFileSync(MENSAGEM_ID_PATH, JSON.stringify({ idDaMensagem: embedMessage.id, idDoCanal: interaction.channel.id }), 'utf-8');
    await embedMessage.react('❌');
    console.log('Embed enviado com sucesso');

    // Adiciona o coletor de reações após enviar a nova mensagem
    adicionarColetorDeReacoes(embedMessage, jogadoresPorClasse, jogadoresAusentes, roles);
}

// Função para adicionar o coletor de reações à mensagem
function adicionarColetorDeReacoes(embedMessage, jogadoresPorClasse, jogadoresAusentes, roles) {
    const filter = (reaction, user) => reaction.emoji.name === '❌' && !user.bot;
    const collector = embedMessage.createReactionCollector({ filter, dispose: true });

    collector.on('collect', async (reaction, user) => {
        console.log(`Reação coletada de ${user.username} (${user.id})`);

        const member = reaction.message.guild.members.cache.get(user.id);
        const displayName = member ? member.displayName : user.username;

        // Remover o jogador de sua respectiva classe
        for (const [classe, jogadores] of Object.entries(jogadoresPorClasse)) {
            if (jogadores.includes(displayName)) {
                jogadoresPorClasse[classe] = jogadores.filter(jogador => jogador !== displayName);
                console.log(`Removido ${displayName} da classe ${classe}`);
                jogadoresAusentes.push(displayName); // Adicionar à lista de ausentes
            }
        }

        atualizarEmbed(jogadoresPorClasse, jogadoresAusentes, roles, embedMessage);
    });

    collector.on('remove', async (reaction, user) => {
        console.log(`Reação removida de ${user.username} (${user.id})`);

        const member = reaction.message.guild.members.cache.get(user.id);
        const displayName = member ? member.displayName : user.username;

        // Adicionar o jogador de volta à sua respectiva classe
        for (const [classe, data] of Object.entries(roles)) {
            if (member.roles.cache.has(data.id) && !jogadoresPorClasse[classe].includes(displayName)) {
                jogadoresPorClasse[classe].push(displayName);
                console.log(`Adicionado ${displayName} de volta à classe ${classe}`);
                jogadoresAusentes = jogadoresAusentes.filter(jogador => jogador !== displayName); // Remover da lista de ausentes
            }
        }

        atualizarEmbed(jogadoresPorClasse, jogadoresAusentes, roles, embedMessage);
    });
}

// Função para monitorar alterações na mensagem
function monitorarAlteracoesJustificarFalta(client) {
    if (monitorandoAlteracoesJustificarFalta) return; // Evita configurar múltiplos watchers
    monitorandoAlteracoesJustificarFalta = true;

    console.log('Monitoramento de alterações para justificarfalta iniciado.');

    // Recarregar o ID da mensagem e do canal
    let canalId;
    let mensagemId;
    try {
        if (fs.existsSync(MENSAGEM_ID_PATH) && fs.statSync(MENSAGEM_ID_PATH).size > 0) {
            const data = JSON.parse(fs.readFileSync(MENSAGEM_ID_PATH, 'utf-8'));
            canalId = data.idDoCanal;
            mensagemId = data.idDaMensagem;
        }
    } catch (error) {
        console.error('Erro ao ler o arquivo de ID da mensagem:', error);
    }

    if (canalId && mensagemId) {
        client.channels.fetch(canalId).then(channel => {
            channel.messages.fetch(mensagemId).then(async (message) => {
                embedMessage = message;
                await atualizarCacheDeMembros(message.guild);  // Atualizar cache de membros

                let jogadoresPorClasse = {
                    'Archbishop': [],
                    'Warlock': [],
                    'Rune Knight': [],
                    'Royal Guard': [],
                    'Ranger': [],
                    'Mechanic': [],
                    'Shura': [],
                    'Grand Summoner': [],
                    'Element User': [],
                    'Wanderer': [],
                    'Guillotine Cross': []
                };

                message.guild.members.cache.forEach(member => {
                    for (const [classe, data] of Object.entries(roles)) {
                        if (member.roles.cache.has(data.id)) {
                            jogadoresPorClasse[classe].push(member.displayName);
                        }
                    }
                });

                // Adiciona o coletor de reações após recuperar a mensagem existente
                adicionarColetorDeReacoes(embedMessage, jogadoresPorClasse, jogadoresAusentes, roles);

            }).catch(err => {
                if (err.code === 10008) {
                    console.log('Mensagem não encontrada no Discord. Limpando o arquivo de ID.');
                    limparArquivoID();
                } else {
                    console.error('Erro ao buscar a mensagem:', err);
                }
            });
        }).catch(err => console.error('Erro ao buscar o canal:', err));
    }
}

// Função para limpar o arquivo de ID se a mensagem não for encontrada
function limparArquivoID() {
    fs.writeFileSync(MENSAGEM_ID_PATH, JSON.stringify({ idDaMensagem: "", idDoCanal: "" }), 'utf-8');
}

// Atualizar o cache de membros para garantir que todos os membros estejam presentes
async function atualizarCacheDeMembros(guild) {
    try {
        await guild.members.fetch(); // Atualiza o cache dos membros
        console.log('Cache de membros atualizado com sucesso.');
    } catch (error) {
        console.error('Erro ao atualizar o cache de membros:', error);
    }
}

// Função para atualizar o embed
function atualizarEmbed(jogadoresPorClasse, jogadoresAusentes, roles, message) {
    const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaAtual = diasDaSemana[new Date().getDay()];

    const calcularDataEvento = (diaAtual) => {
        let dataEvento = new Date();
        switch (diaAtual.toLowerCase()) {
            case 'segunda':
                dataEvento.setDate(dataEvento.getDate() + 1);
                break;
            case 'quarta':
                dataEvento.setDate(dataEvento.getDate() + 1);
                break;
            case 'sexta':
                dataEvento.setDate(dataEvento.getDate() + 1);
                break;
            default:
                break;
        }
        return dataEvento;
    };

    const dataEvento = calcularDataEvento(diaAtual);
    const dataEventoFormatada = dataEvento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const diaParaEvento = diaAtual === 'Segunda' ? 'Terça' : diaAtual === 'Quarta' ? 'Quinta' : diaAtual === 'Sexta' ? 'Sábado' : diaAtual;

    // Ordenar classes por quantidade de jogadores (maior número de jogadores primeiro)
    const jogadoresPorClasseOrdenado = Object.entries(jogadoresPorClasse).sort((a, b) => b[1].length - a[1].length);

    // Contagem total de jogadores
    const totalJogadores = jogadoresPorClasseOrdenado.reduce((acc, [_, jogadores]) => acc + jogadores.length, 0);

    const embed = new EmbedBuilder()
        .setColor(0x684dad)
        .setTitle(`Lista de Jogadores para os eventos do dia: ${diaParaEvento} (${dataEventoFormatada})`)
        .setDescription('Reaja com ❌ se você não puder comparecer aos eventos do dia acima:');

    // Adicionar jogadores no embed
    for (const [classe, jogadores] of jogadoresPorClasseOrdenado) {
        const { emojiName, emojiId } = roles[classe];
        const emoji = `<:${emojiName}:${emojiId}>`;
        embed.addFields({
            name: `${classe} ${emoji}`,
            value: jogadores.join('\n') || 'Nenhum jogador',
            inline: true
        });
    }


    // Adicionar a categoria "Ausência" no final do embed
    embed.addFields({
        name: 'Ausência ❌',
        value: jogadoresAusentes.length > 0 ? jogadoresAusentes.join('\n') : 'Nenhum jogador ausente',
        inline: true
    });

    // Atualizar o número total de jogadores no rodapé
    embed.setFooter({ text: `Número total de Players: ${totalJogadores}` });

    message.edit({ embeds: [embed] });
}

// Inicializar o monitoramento ao iniciar o bot
async function iniciarMonitoramentoJustificarFaltaAoInicializar(client) {
    monitorarAlteracoesJustificarFalta(client);
}

module.exports.iniciarMonitoramentoJustificarFaltaAoInicializar = iniciarMonitoramentoJustificarFaltaAoInicializar;
