// utils/utils.js

const apagarMensagem = (msg, tempo = 10000) => {
    if (msg && msg.deletable) {
        setTimeout(async () => {
            try {
                await msg.delete();
            } catch (error) {
                if (error.code !== 10008) { // Ignorar o erro "Unknown Message"
                    console.error(`Erro ao tentar deletar a mensagem: ${error.message}`);
                }
            }
        }, tempo);
    }
};

module.exports = { apagarMensagem };
