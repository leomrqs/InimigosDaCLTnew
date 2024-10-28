// dailyThoughtsScheduler.js

const schedule = require('node-schedule');
const { loadThoughts, getRandomThought } = require('./utils/thoughtManager');

class DailyThoughtsScheduler {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        this.jobs = [];
    }

    async scheduleDailyThoughts() {
        // Cancelar quaisquer agendamentos anteriores
        this.cancelScheduledThoughts();

        // Gerar número aleatório de mensagens (1 a 4)
        const numMessages = Math.floor(Math.random() * 10) + 1;

        // Gerar horários aleatórios entre 8h00 e 22h00
        const times = this.generateRandomTimes(numMessages);

        // Carregar pensamentos
        const thoughts = await loadThoughts();

        // Copiar a lista de pensamentos para evitar repetição
        let thoughtsPool = [...thoughts];

        // Agendar mensagens
        times.forEach(time => {
            const { hour, minute } = time;
            const rule = new schedule.RecurrenceRule();
            rule.tz = 'America/Sao_Paulo';
            rule.hour = hour;
            rule.minute = minute;

            const job = schedule.scheduleJob(rule, async () => {
                const channel = this.client.channels.cache.get(this.channelId);
                if (!channel) {
                    console.error(`Canal com ID ${this.channelId} não encontrado.`);
                    return;
                }

                if (thoughtsPool.length === 0) {
                    // Recarregar a pool se todos os pensamentos já foram usados
                    thoughtsPool = [...thoughts];
                }

                const thought = getRandomThought(thoughtsPool);

                // Remover o pensamento da pool para evitar repetição
                thoughtsPool = thoughtsPool.filter(t => t !== thought);

                if (thought) {
                    try {
                        await channel.send(thought);
                        console.log(`Pensamento enviado às ${hour}:${minute.toString().padStart(2, '0')}`);
                    } catch (error) {
                        console.error('Erro ao enviar pensamento:', error);
                    }
                }
            });

            this.jobs.push(job);
        });

        console.log(`Pensamentos diários agendados para hoje em ${numMessages} horários.`);
    }

    generateRandomTimes(numTimes) {
        const times = new Set();
        while (times.size < numTimes) {
            const hour = Math.floor(Math.random() * (22 - 8 + 1)) + 8; // Horas de 8 a 22
            const minute = Math.floor(Math.random() * 60);
            const time = { hour, minute };
            times.add(JSON.stringify(time));
        }
        return Array.from(times).map(time => JSON.parse(time));
    }

    cancelScheduledThoughts() {
        this.jobs.forEach(job => job.cancel());
        this.jobs = [];
    }

    startDailyScheduler() {
        // Agendar pensamentos para hoje
        this.scheduleDailyThoughts();

        // Agendar para gerar novos horários a cada dia à meia-noite
        schedule.scheduleJob('0 0 0 * * *', () => {
            this.scheduleDailyThoughts();
        });
    }

    async sendTestThought() {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) {
            console.error(`Canal com ID ${this.channelId} não encontrado.`);
            return;
        }

        const thoughts = await loadThoughts();
        const thought = getRandomThought(thoughts);

        if (thought) {
            try {
                await channel.send(thought);
                console.log(`Pensamento de teste enviado.`);
            } catch (error) {
                console.error('Erro ao enviar pensamento de teste:', error);
            }
        }
    }
}

module.exports = DailyThoughtsScheduler;
