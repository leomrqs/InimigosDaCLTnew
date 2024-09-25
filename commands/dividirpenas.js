const { SlashCommandBuilder } = require('@discordjs/builders');
const { carregarJogadores, salvarJogadores } = require('../utils/jogadores');
const { ROLE_ID } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dividirpenas')
        .setDescription('Divide penas entre os jogadores aptos.')
        .addIntegerOption(option => 
            option.setName('caixagrande')
                .setDescription('Número de caixas grandes (4 penas cada)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('caixapequena')
                .setDescription('Número de caixas pequenas (1 pena cada)')
                .setRequired(true)),

    async execute(interaction) {
        // Verifica se o usuário tem a role correta
        if (!interaction.member.roles.cache.has(ROLE_ID)) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
        }

        // Pega os valores fornecidos nas opções do slash command
        const numCaixasGrandes = interaction.options.getInteger('caixagrande');
        const numCaixasPequenas = interaction.options.getInteger('caixapequena');

        // Carrega e filtra apenas os jogadores aptos
        let jogadores = carregarJogadores();
        let distribuicaoDia = jogadores.filter(j => j.apto === true).map(jogador => ({
            ...jogador,
            slots: [],
            totalPenasDia: 0
        }));

        const numJogadores = distribuicaoDia.length;
        if (numJogadores === 0) {
            return interaction.reply({ content: 'Nenhum jogador apto para a divisão.', ephemeral: true });
        }

        let paginaAtual = 1;
        let slotsPagina = ['A', 'B', 'C', 'D'];
        let slotIndex = 0;

        // Função para adicionar penas ao jogador
        const adicionarPenasAoJogador = (jogador, tipoCaixa, pagina, slot) => {
            const penasNaCaixa = tipoCaixa === 'Grande' ? 4 : 1;
            jogador.slots.push(`${pagina}${slot}`);
            if (tipoCaixa === 'Grande') {
                jogador.penasGrandes += 1;
            } else {
                jogador.penasPequenas += 1;
            }
            jogador.totalPenas += penasNaCaixa;
            jogador.totalPenasDia += penasNaCaixa;
        };

        // 1. Distribuir uma caixa grande para cada jogador
        let jogadorIndex = 0;
        let caixasGrandesRestantes = numCaixasGrandes;
        while (caixasGrandesRestantes > 0 && jogadorIndex < numJogadores) {
            let jogador = distribuicaoDia[jogadorIndex % numJogadores];
            adicionarPenasAoJogador(jogador, 'Grande', paginaAtual, slotsPagina[slotIndex]);

            caixasGrandesRestantes--;
            slotIndex++;
            if (slotIndex >= 4) {
                slotIndex = 0;
                paginaAtual++;
            }

            jogadorIndex++;
        }

        // 2. Distribuir caixas grandes restantes para equilibrar a quantidade de penas
        jogadorIndex = 0;
        while (caixasGrandesRestantes > 0) {
            let jogador = distribuicaoDia[jogadorIndex % numJogadores];
            adicionarPenasAoJogador(jogador, 'Grande', paginaAtual, slotsPagina[slotIndex]);

            caixasGrandesRestantes--;
            slotIndex++;
            if (slotIndex >= 4) {
                slotIndex = 0;
                paginaAtual++;
            }

            jogadorIndex++;
        }

        // 3. Distribuir caixas pequenas para equilibrar ainda mais a quantidade de penas
        let caixasPequenasRestantes = numCaixasPequenas;
        while (caixasPequenasRestantes > 0) {
            let jogadorComMenosPenas = distribuicaoDia.reduce((min, jogador) => jogador.totalPenasDia < min.totalPenasDia ? jogador : min, distribuicaoDia[0]);
            adicionarPenasAoJogador(jogadorComMenosPenas, 'Pequena', paginaAtual, slotsPagina[slotIndex]);

            caixasPequenasRestantes--;
            slotIndex++;
            if (slotIndex >= 4) {
                slotIndex = 0;
                paginaAtual++;
            }
        }

        // Atualiza o JSON com o total de penas, sem remover os jogadores não aptos
        distribuicaoDia.forEach(jogadorDia => {
            let jogadorJson = jogadores.find(j => j.nome === jogadorDia.nome);
            jogadorJson.penasGrandes = jogadorDia.penasGrandes;
            jogadorJson.penasPequenas = jogadorDia.penasPequenas;
            jogadorJson.totalPenas = jogadorDia.totalPenas;
            jogadorJson.prioridade = false;
            jogadorJson.apto = false; // Resetando apto para false após o leilão
        });

        salvarJogadores(jogadores);

        let resposta = `Caixas Grandes (4 penas): ${numCaixasGrandes}\nCaixas Pequenas (1 pena): ${numCaixasPequenas}\n`;

        distribuicaoDia.forEach((jogador) => {
            resposta += `-----------------------\n${jogador.nome} | ${jogador.slots.join(', ')} | = (${jogador.totalPenasDia})\n`;
        });

        await interaction.reply(resposta);
    }
};
