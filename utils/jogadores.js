// utils/jogadores.js

const fs = require('fs');
const path = require('path');

// Caminho para o arquivo JSON
const FILE_PATH = path.join(__dirname, '../data/jogadores.json'); // Corrigido para usar path.join

// Função para carregar jogadores do arquivo JSON e ordenar por prioridade
const carregarJogadores = () => {
    try {
        const data = fs.readFileSync(FILE_PATH, 'utf-8');
        let jogadores = JSON.parse(data);

        // Ordena os jogadores com base na quantidade total de penas (menos penas = maior prioridade)
        // Jogadores com prioridade true vão para o topo
        jogadores.sort((a, b) => {
            if (a.prioridade === b.prioridade) {
                return a.totalPenas - b.totalPenas;
            }
            return a.prioridade ? -1 : 1;
        });

        return jogadores;
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        return []; // Retorna uma lista vazia em caso de erro
    }
};

// Função para salvar o estado dos jogadores no arquivo JSON após a distribuição
const salvarJogadores = (jogadores) => {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(jogadores, null, 2), 'utf-8');
    } catch (error) {
        console.error('Erro ao salvar jogadores:', error);
    }
};

// Exporta as funções para uso em outros módulos
module.exports = {
    carregarJogadores,
    salvarJogadores
};
