// scheduler.js

const schedule = require('node-schedule');
const { loadTasks } = require('./utils/taskStorage');
const { EmbedBuilder } = require('discord.js');

class Scheduler {
    constructor(client) {
        this.client = client;
        this.jobs = new Map();
    }

    async loadTasks() {
        const tasks = await loadTasks();
        tasks.forEach(task => {
            if (task.isActive) {
                this.scheduleTask(task);
            }
        });
    }

    scheduleTask(task) {
        const job = schedule.scheduleJob(task.cronExpression, () => {
            this.executeTask(task);
        });
        this.jobs.set(task.id, job);
    }

    async executeTask(task) {
        const channel = this.client.channels.cache.get(task.channelId);
        if (!channel) {
            console.error(`Canal com ID ${task.channelId} não encontrado.`);
            return;
        }

        try {
            const currentTime = new Date();
            const formattedTime = currentTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            const embed = new EmbedBuilder()
                .setColor(task.color)
                .setTitle(task.name)
                .setDescription(task.message)
                .addFields(
                    { name: 'Horário', value: formattedTime, inline: false }
                );

            const roleMention = `<@&${task.roleId}>`;

            await channel.send({
                content: roleMention,
                embeds: [embed],
                allowedMentions: { roles: [task.roleId] }
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    }

    addTask(task) {
        if (task.isActive) {
            this.scheduleTask(task);
        }
    }

    cancelTask(taskId) {
        const job = this.jobs.get(taskId);
        if (job) {
            job.cancel();
            this.jobs.delete(taskId);
        }
    }

    reloadTask(task) {
        this.cancelTask(task.id);
        if (task.isActive) {
            this.scheduleTask(task);
        }
    }
}

module.exports = Scheduler;
