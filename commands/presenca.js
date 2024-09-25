const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

// Função para atualizar o cache de membros do Discord
async function atualizarCacheDeMembros(guild) {
    try {
        await guild.members.fetch(); // Atualiza o cache dos membros
        console.log('Cache de membros atualizado com sucesso.');
    } catch (error) {
        console.error('Erro ao atualizar o cache de membros:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('presenca')
        .setDescription('Gerencia a presença no Discord')
        .addSubcommand(subcommand =>
            subcommand
                .setName('executar')
                .setDescription('Executa a presença do dia'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('Lista as presenças registradas'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resetar')
                .setDescription('Reseta as presenças de todos os jogadores')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Verifica se o usuário tem a permissão necessária
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        // Subcomando para executar a presença
        if (subcommand === 'executar') {
            await interaction.deferReply();

            // Atualiza o cache dos membros antes de executar a presença
            await atualizarCacheDeMembros(interaction.guild);

            // IDs dos dois canais de voz
            const canalDeVoz1Id = '1274169337422549053'; //
            const canalDeVoz2Id = '1275260924868952134'; // 

            // Busca ambos os canais de voz
            const canalDeVoz1 = await interaction.guild.channels.fetch(canalDeVoz1Id);
            const canalDeVoz2 = await interaction.guild.channels.fetch(canalDeVoz2Id);

            if (!canalDeVoz1 || canalDeVoz1.type !== 2 || !canalDeVoz2 || canalDeVoz2.type !== 2) {
                await interaction.followUp('Um ou ambos os canais de voz não foram encontrados ou não são canais de voz.');
                return;
            }

            const jogadores = carregarJogadores();

            // Captura o dia da semana atual
            const diasDaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            const diaAtual = diasDaSemana[new Date().getDay()];

            // Lista de nomes de usuários presentes nos dois canais de voz (usando displayName)
            const presentes1 = canalDeVoz1.members.map(member => member.displayName.toLowerCase());
            const presentes2 = canalDeVoz2.members.map(member => member.displayName.toLowerCase());

            // Combina a lista de presentes dos dois canais
            const presentes = [...new Set([...presentes1, ...presentes2])]; // Remove duplicatas

            // Inicializa uma lista para jogadores não cadastrados ou nome incorreto
            let jogadoresNaoCadastrados = [];

            // Atualizar presenças no JSON de jogadores
            jogadores.forEach(jogador => {
                const nome = jogador.nome;
                const nomeLowerCase = nome.toLowerCase();

                // Adiciona os novos atributos de presença se não existirem
                if (!jogador.terça) {
                    jogador.terça = '';
                    jogador.quinta = '';
                    jogador.sábado = '';
                    jogador.domingo = '';
                }

                // Atualiza o dia atual (inclui sábado também)
                if (jogador[diaAtual] === '') {
                    jogador[diaAtual] = presentes.includes(nomeLowerCase) ? 'PRESENÇA' : 'FALTA';
                }
            });

            // Verifica quais jogadores presentes não foram encontrados no jogadores.json
            presentes.forEach(presente => {
                const jogadorEncontrado = jogadores.some(jogador => jogador.nome.toLowerCase() === presente);
                if (!jogadorEncontrado) {
                    jogadoresNaoCadastrados.push(presente);
                }
            });

            // Salva a atualização no arquivo jogadores.json
            salvarJogadores(jogadores);

            // Responde informando que a presença foi registrada com sucesso
            await interaction.followUp('Presença registrada com sucesso.');

            // Se houver jogadores não cadastrados, envia uma mensagem separada listando esses jogadores
            if (jogadoresNaoCadastrados.length > 0) {
                const mensagemNaoCadastrados = `Os seguintes jogadores estão na chamada de voz, mas não estão cadastrados ou têm o nome incorreto:\n${jogadoresNaoCadastrados.join('\n')}`;
                await interaction.followUp(mensagemNaoCadastrados);
            }
        }

        // Subcomando para listar as presenças
        if (subcommand === 'listar') {
            const jogadores = carregarJogadores();

            // Definindo os emojis para presença e falta
            const EMOJI_CHECK = '🟢';
            const EMOJI_X = '🔴';
            const EMOJI_VAZIO = '⚫';

            // Obter a data atual e o dia da semana
            const dataAtual = new Date();
            const diasDaSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            const diaDaSemanaAtual = diasDaSemana[dataAtual.getDay()];
            const dataFormatada = dataAtual.toLocaleDateString('pt-BR');

            // Inicializa a resposta com a data e o dia da semana
            let resposta = `Presenças no Discord - ${dataFormatada} (${diaDaSemanaAtual})\n-------------------------\n| Ter | | Qui | | Sáb | | Dom |\n`;

            // Itera sobre cada jogador e formata a linha de presença
            jogadores.forEach(jogador => {
                const tercaEmoji = jogador.terça === 'PRESENÇA' ? EMOJI_CHECK : (jogador.terça === 'FALTA' ? EMOJI_X : EMOJI_VAZIO);
                const quintaEmoji = jogador.quinta === 'PRESENÇA' ? EMOJI_CHECK : (jogador.quinta === 'FALTA' ? EMOJI_X : EMOJI_VAZIO);
                const sabadoEmoji = jogador.sábado === 'PRESENÇA' ? EMOJI_CHECK : (jogador.sábado === 'FALTA' ? EMOJI_X : EMOJI_VAZIO);
                const domingoEmoji = jogador.domingo === 'PRESENÇA' ? EMOJI_CHECK : (jogador.domingo === 'FALTA' ? EMOJI_X : EMOJI_VAZIO);

                // Adiciona a linha formatada à resposta
                resposta += `| ${tercaEmoji} | ${quintaEmoji} | ${sabadoEmoji} | ${domingoEmoji} | ${jogador.nome} \n`;
            });

            // Envia a mensagem com a lista de presenças
            await interaction.reply(resposta);
        }

        // Subcomando para resetar as presenças
        if (subcommand === 'resetar') {
            const jogadores = carregarJogadores();

            // Itera sobre cada jogador e reseta os campos de presença
            jogadores.forEach(jogador => {
                jogador.terça = '';
                jogador.quinta = '';
                jogador.sábado = '';
                jogador.domingo = '';
            });

            // Salva a atualização no arquivo jogadores.json
            salvarJogadores(jogadores);

            await interaction.reply('As presenças foram resetadas com sucesso.');
        }
    }
};
