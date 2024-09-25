// ./commands/iniciarenquete.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

const TEMPO_ENQUETE = 15 * 60 * 1000; // 15 minutos em milissegundos

module.exports = {
    data: new SlashCommandBuilder()
        .setName('iniciarenquete')
        .setDescription('Inicia uma enquete para o leilão de penas Luz/Sombra.'),
    async execute(interaction) {
        // Verifica se o usuário tem o cargo necessário
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        // Inicializa a lista de participantes para esta enquete
        let participantes = [];

        // Calcula o horário de término da enquete
        const fimEnquete = Date.now() + TEMPO_ENQUETE;

        // Cria o embed
        const embed = new EmbedBuilder()
            .setColor(0xFFFFFF)  // Branco
            .setTitle('Leilão de Penas Luz/Sombra')
            .setDescription('Para participar do leilão, clique nos botões abaixo. A lista de participantes será atualizada automaticamente.')
            .addFields(
                { name: '📅 Data do Leilão', value: new Date().toLocaleDateString('pt-BR'), inline: true },
                { name: 'Participantes:', value: 'Ainda não há participantes.' }  // Inicialmente vazio
            )
            .setImage('https://i.imgur.com/ogFasfc.png')
            .setFooter({ text: 'A enquete será processada automaticamente em 15 minutos.' });

        // Cria os botões
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('queroButton')
                    .setLabel('Quero')
                    .setEmoji('✅')  // Emoji de check verde
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('removerButton')
                    .setLabel('Remover')
                    .setEmoji('❌')  // Emoji de X vermelho
                    .setStyle(ButtonStyle.Danger)
            );

        // Envia o embed e os botões
        const enqueteMessage = await interaction.reply({ embeds: [embed], components: [buttonRow], fetchReply: true });

        // Configura o coletor para os botões
        const filter = i => (i.customId === 'queroButton' || i.customId === 'removerButton') && i.message.id === enqueteMessage.id;
        const collector = enqueteMessage.createMessageComponentCollector({ filter, time: TEMPO_ENQUETE });

        collector.on('collect', async i => {
            const member = i.member;
            const nickname = member.nickname || i.user.username;

            if (i.customId === 'queroButton') {
                // Adiciona o usuário à lista de participantes
                if (!participantes.includes(nickname)) {
                    participantes.push(nickname);
                    await i.reply({ content: 'Você foi adicionado à lista de participantes!', ephemeral: true });
                } else {
                    await i.reply({ content: 'Você já está na lista de participantes.', ephemeral: true });
                }
            } else if (i.customId === 'removerButton') {
                // Remove o usuário da lista de participantes
                if (participantes.includes(nickname)) {
                    participantes = participantes.filter(n => n !== nickname);
                    await i.reply({ content: 'Você foi removido da lista de participantes.', ephemeral: true });
                } else {
                    await i.reply({ content: 'Você não está na lista de participantes.', ephemeral: true });
                }
            }

            // Atualiza o embed com a lista de participantes
            const minutosRestantesAtualizado = Math.floor((fimEnquete - Date.now()) / 60000);
            const segundosRestantesAtualizado = Math.floor(((fimEnquete - Date.now()) % 60000) / 1000);

            // Cria um novo embed com as informações atualizadas
            const updatedEmbed = new EmbedBuilder()
                .setColor(0xFFFFFF)  // Branco
                .setTitle('Leilão de Penas Luz/Sombra')
                .setDescription('Para participar do leilão, clique nos botões abaixo. A lista de participantes será atualizada automaticamente.')
                .addFields(
                    { name: '📅 Data do Leilão', value: new Date().toLocaleDateString('pt-BR'), inline: true },
                    { name: 'Participantes:', value: participantes.length > 0 ? participantes.join('\n') : 'Nenhum participante.' }
                )
                .setImage('https://i.imgur.com/ogFasfc.png')
                .setFooter({ text: `A enquete será processada automaticamente em ${minutosRestantesAtualizado}m ${segundosRestantesAtualizado}s.` });

            // Atualiza a mensagem da enquete no canal
            await enqueteMessage.edit({ embeds: [updatedEmbed], components: [buttonRow] });

            // Reconhece a interação sem enviar uma resposta adicional
            await i.deferUpdate();
        });

        collector.on('end', async () => {
            await processarEnquete(enqueteMessage, participantes);
        });
    }
};

// Função para processar a enquete automaticamente após 15 minutos
async function processarEnquete(enqueteMessage, participantes) {
    try {
        let jogadores = carregarJogadores();

        // Marca todos como não aptos antes de processar os novos aptos
        jogadores.forEach(jogador => jogador.apto = false);

        // Marca como apto os jogadores que estão na lista de participantes
        participantes.forEach(nickname => {
            const jogador = jogadores.find(j => j.nome.toLowerCase() === nickname.toLowerCase());
            if (jogador) {
                jogador.apto = true;
            } else {
                console.error(`Jogador ${nickname} não encontrado no JSON.`);
            }
        });

        salvarJogadores(jogadores);
        await enqueteMessage.channel.send('Enquete processada e jogadores aptos foram atualizados.');

        // Desabilita os botões após o término da enquete
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('queroButton')
                    .setLabel('Quero')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('removerButton')
                    .setLabel('Remover')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

        // Atualiza o embed final
        const finalEmbed = new EmbedBuilder()
            .setColor(0xFFFFFF)  // Branco
            .setTitle('Leilão de Penas Luz/Sombra')
            .setDescription('A enquete foi encerrada.')
            .addFields(
                { name: '📅 Data do Leilão', value: new Date().toLocaleDateString('pt-BR'), inline: true },
                { name: 'Participantes:', value: participantes.length > 0 ? participantes.join('\n') : 'Nenhum participante.' }
            )
            .setImage('https://i.imgur.com/ogFasfc.png')
            .setFooter({ text: 'A enquete foi encerrada.' });

        await enqueteMessage.edit({ embeds: [finalEmbed], components: [disabledRow] });
    } catch (error) {
        console.error(`Erro ao processar enquete: ${error.message}`);
        await enqueteMessage.channel.send(`Erro ao processar enquete: ${error.message}`);
    }
}
