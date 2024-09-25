const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');

// Caminho para o arquivo jogadores.json
const JOGADORES_PATH = path.resolve(__dirname, '../data/jogadores.json');
const MEMBRO_ROLE_ID = process.env.MEMBRO_ROLE_ID;  // Certifique-se de que o ID do cargo Membro está no .env
const LOG_CHANNEL_ID = '1276520446547984405';  // ID do canal de log

// Função para monitorar adição e remoção de cargo
module.exports = {
    iniciarMonitoramentoRoles(client) {
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            // Utilizando `displayName` para obter o apelido ou o nome do usuário
            const jogadorAtualizado = newMember.displayName;

            // Quando o cargo de Membro é adicionado
            if (!oldMember.roles.cache.has(MEMBRO_ROLE_ID) && newMember.roles.cache.has(MEMBRO_ROLE_ID)) {
                const adicionado = await adicionarJogador(jogadorAtualizado, newMember, client);
                if (adicionado) {
                    // Notificar o jogador que ele foi adicionado
                    await newMember.send(`Você foi adicionado ao nosso bot como membro do clan!`);
                }
            }

            // Quando o cargo de Membro é removido
            if (oldMember.roles.cache.has(MEMBRO_ROLE_ID) && !newMember.roles.cache.has(MEMBRO_ROLE_ID)) {
                const removido = await removerJogador(jogadorAtualizado, newMember, client);
                if (removido) {
                    // Notificar o jogador que ele foi removido
                    await newMember.send(`Você foi removido do nosso bot como membro do clan.`);
                }
            }
        });
    }
};

// Função para adicionar jogador ao JSON e logar no canal
async function adicionarJogador(nomeJogador, member, client) {
    const jogadores = carregarJogadores();
    const jogadorExiste = jogadores.some(j => j.nome === nomeJogador);

    if (!jogadorExiste) {
        // Adicionar o jogador com todos os atributos
        const novoJogador = {
            nome: nomeJogador,
            penasGrandes: 0,
            penasPequenas: 0,
            totalPenas: 0,
            prioridade: false,
            apto: false,
            aptoCartas: false,
            terça: "",
            quinta: "",
            sábado: "",
            domingo: ""
        };

        jogadores.push(novoJogador);
        salvarJogadores(jogadores);
        console.log(`${nomeJogador} foi adicionado ao JSON como membro.`);
        await enviarLog(client, `${nomeJogador} foi adicionado ao JSON como membro.`);
        return true;
    } else {
        console.log(`${nomeJogador} já está registrado no JSON.`);
        return false;
    }
}

// Função para remover jogador do JSON e logar no canal
async function removerJogador(nomeJogador, member, client) {
    let jogadores = carregarJogadores();
    const jogadorExiste = jogadores.some(j => j.nome === nomeJogador);

    if (jogadorExiste) {
        jogadores = jogadores.filter(j => j.nome !== nomeJogador);
        salvarJogadores(jogadores);
        console.log(`${nomeJogador} foi removido do JSON como membro.`);
        await enviarLog(client, `${nomeJogador} foi removido do JSON como membro.`);
        return true;
    } else {
        console.log(`${nomeJogador} não existe no JSON para ser removido.`);
        return false;
    }
}

// Função para carregar jogadores do JSON
function carregarJogadores() {
    try {
        const dados = fs.readFileSync(JOGADORES_PATH, 'utf-8');
        return JSON.parse(dados);
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        return [];
    }
}

// Função para salvar jogadores no JSON
function salvarJogadores(jogadores) {
    fs.writeFileSync(JOGADORES_PATH, JSON.stringify(jogadores, null, 2), 'utf-8');
}

// Função para enviar logs para o canal específico
async function enviarLog(client, mensagem) {
    try {
        const canalLog = await client.channels.fetch(LOG_CHANNEL_ID);
        if (canalLog) {
            await canalLog.send(mensagem);
        }
    } catch (error) {
        console.error('Erro ao enviar log para o canal:', error);
    }
}
