const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

const PRESENCAS_PATH = path.resolve(__dirname, '../data/presenca.json');

function carregarPresencas() {
    if (fs.existsSync(PRESENCAS_PATH)) {
        const data = fs.readFileSync(PRESENCAS_PATH, 'utf8');
        return JSON.parse(data);
    } else {
        return { jogadores: [] };
    }
}

function salvarPresencas(presencas) {
    fs.writeFileSync(PRESENCAS_PATH, JSON.stringify(presencas, null, 2), 'utf8');
}

function obterNumeroSemana(data) {
    const oneJan = new Date(data.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((data - oneJan) / (24 * 60 * 60 * 1000));
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
}


// Função para atualizar o cache de membros do Discord
async function atualizarCacheDeMembros(guild) {
    try {
        await guild.members.fetch();
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
                .setDescription('Lista as presenças registradas')),
        // Você pode adicionar outros subcomandos conforme necessário

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Verifica se o usuário tem a permissão necessária
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        if (subcommand === 'executar') {
            await interaction.deferReply();

            // Atualiza o cache dos membros antes de executar a presença
            await atualizarCacheDeMembros(interaction.guild);

            // IDs dos dois canais de voz
            const canalDeVoz1Id = '1274169337422549053';
            const canalDeVoz2Id = '1275260924868952134';

            // Busca ambos os canais de voz
            const canalDeVoz1 = await interaction.guild.channels.fetch(canalDeVoz1Id);
            const canalDeVoz2 = await interaction.guild.channels.fetch(canalDeVoz2Id);

            if (!canalDeVoz1 || canalDeVoz1.type !== 2 || !canalDeVoz2 || canalDeVoz2.type !== 2) {
                await interaction.followUp('Um ou ambos os canais de voz não foram encontrados ou não são canais de voz.');
                return;
            }

            const jogadoresCadastrados = carregarJogadores();
            const presencasData = carregarPresencas();

            // Sincroniza os jogadores entre jogadores.json e presenca.json
            const nomesJogadoresCadastrados = jogadoresCadastrados.map(j => j.nome.toLowerCase());
            const nomesJogadoresPresenca = presencasData.jogadores.map(j => j.nome.toLowerCase());

            // Adicionar jogadores que estão em jogadoresCadastrados mas não estão em presencasData
            jogadoresCadastrados.forEach(jogador => {
                if (!nomesJogadoresPresenca.includes(jogador.nome.toLowerCase())) {
                    presencasData.jogadores.push({
                        nome: jogador.nome,
                        presencas: {}
                    });
                }
            });

            // Remover jogadores que não estão mais em jogadoresCadastrados
            presencasData.jogadores = presencasData.jogadores.filter(jogador =>
                nomesJogadoresCadastrados.includes(jogador.nome.toLowerCase())
            );

            // Lista de nomes de usuários presentes nos dois canais de voz (usando displayName)
            const presentes1 = canalDeVoz1.members.map(member => member.displayName.toLowerCase());
            const presentes2 = canalDeVoz2.members.map(member => member.displayName.toLowerCase());

            // Combina a lista de presentes dos dois canais
            const presentes = [...new Set([...presentes1, ...presentes2])];

            // Captura o dia da semana atual
            const diasDaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            const dataAtual = new Date();
            const diaAtualSemana = dataAtual.getDay();
            const diaAtual = diasDaSemana[diaAtualSemana];

            // Verifica se o dia atual é um dos dias de evento
            const diasEvento = ['terça', 'quinta', 'sábado', 'domingo'];
            if (!diasEvento.includes(diaAtual)) {
                await interaction.followUp(`Hoje não é um dia de evento. Os dias de evento são: ${diasEvento.join(', ')}.`);
                return;
            }

            // Obtém o número da semana e o ano atual
            const numeroSemana = obterNumeroSemana(dataAtual);
            const anoAtual = dataAtual.getFullYear();
            const chaveSemana = `${anoAtual}-W${numeroSemana}`;

            // Atualizar presenças no presenca.json
            presencasData.jogadores.forEach(jogador => {
                const nomeLowerCase = jogador.nome.toLowerCase();

                // Inicializa a semana se não existir
                if (!jogador.presencas[chaveSemana]) {
                    jogador.presencas[chaveSemana] = {};
                }

                // Atualiza a presença do dia atual
                jogador.presencas[chaveSemana][diaAtual] = presentes.includes(nomeLowerCase) ? 'PRESENÇA' : 'FALTA';
            });

            // Salva a atualização no arquivo presenca.json
            salvarPresencas(presencasData);

            // Responde informando que a presença foi registrada com sucesso
            await interaction.followUp('Presença registrada com sucesso.');
        }

        // Subcomando para listar as presenças
        if (subcommand === 'listar') {
            const presencasData = carregarPresencas();

            // Obtém a data atual e o número da semana
            const dataAtual = new Date();
            const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
            const diasDaSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            const diaDaSemanaAtual = diasDaSemana[dataAtual.getDay()];
            const numeroSemana = obterNumeroSemana(dataAtual);
            const anoAtual = dataAtual.getFullYear();
            const chaveSemana = `${anoAtual}-W${numeroSemana}`;

            const diasEvento = ['terça', 'quinta', 'sábado', 'domingo'];

            presencasData.jogadores.sort((a, b) => a.nome.localeCompare(b.nome));

            // Cabeçalho
            let resposta = `Presenças no Discord - ${dataFormatada} (${diaDaSemanaAtual}) | Semana ${numeroSemana} de ${anoAtual}\n`;
            resposta += `| ${diasEvento.map(d => d.substring(0, 3).padEnd(3)).join(' | ')} | Jogador\n`;
            resposta += `${'='.repeat(60)}\n`;

            presencasData.jogadores.forEach(jogador => {
                const presencasSemana = jogador.presencas[chaveSemana] || {};
                const presencasDias = diasEvento.map(dia => {
                    const status = presencasSemana[dia];
                    if (status === 'PRESENÇA') return '🟢';
                    else if (status === 'FALTA') return '🔴';
                    else return '⚫';
                });

                // Formatar as presenças para garantir o alinhamento
                const presencasFormatadas = presencasDias.map(p => p.padEnd(2));

                resposta += `${presencasFormatadas.join(' ')} | ${jogador.nome}\n`;
            });

            await interaction.reply(`\`\`\`${resposta}\`\`\``);
        }

    }
};

