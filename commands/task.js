// ./commands/task.js

const { SlashCommandBuilder } = require('discord.js');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs').promises;

// Caminho para o arquivo JSON de armazenamento
const TASKS_FILE_PATH = path.resolve(__dirname, '../data/tasknotificacao.json');

// ID fixo do canal onde as mensagens serão enviadas
const CHANNEL_ID = '1287835107880865933';

// Funções auxiliares para carregar e salvar tarefas
async function loadTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existir ou estiver vazio, retorna um array vazio
        return [];
    }
}

async function saveTasks(tasks) {
    await fs.writeFile(TASKS_FILE_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
}

// Função para validar expressões cron
function isValidCron(cronExpression) {
    try {
        schedule.scheduleJob(cronExpression, () => {});
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('task')
        .setDescription('Gerencia tarefas agendadas.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('definir')
                .setDescription('Define uma nova tarefa agendada.')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome da tarefa')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('cron')
                        .setDescription('Expressão cron para o agendamento')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('mensagem')
                        .setDescription('Mensagem a ser enviada')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('cor')
                        .setDescription('Cor do embed (ex: azul, vermelho)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Azul', value: 'azul' },
                            { name: 'Vermelho', value: 'vermelho' },
                            { name: 'Verde', value: 'verde' },
                            { name: 'Amarelo', value: 'amarelo' },
                            { name: 'Laranja', value: 'laranja' },
                            { name: 'Roxo', value: 'roxo' }
                        ))
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo a ser mencionado')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('Lista todas as tarefas agendadas.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deletar')
                .setDescription('Deleta uma tarefa agendada.')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID da tarefa')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Verifica se o usuário tem a permissão necessária
        const ROLE_ID_ADMIN = '1274118954557636659'; // Substitua pelo ID do cargo que tem permissão
        if (!interaction.member.roles.cache.has(ROLE_ID_ADMIN)) {
            await interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
            return;
        }

        if (subcommand === 'definir') {
            await definirTarefa(interaction);
        } else if (subcommand === 'listar') {
            await listarTarefas(interaction);
        } else if (subcommand === 'deletar') {
            await deletarTarefa(interaction);
        } else {
            await interaction.reply({ content: 'Subcomando não reconhecido.', ephemeral: true });
        }
    }
};

// Função para definir uma nova tarefa
async function definirTarefa(interaction) {
    const name = interaction.options.getString('nome');
    const cronExpression = interaction.options.getString('cron');
    const message = interaction.options.getString('mensagem');
    const colorName = interaction.options.getString('cor');
    const role = interaction.options.getRole('cargo');
    const createdBy = interaction.user.id;

    // Validar a expressão cron
    if (!isValidCron(cronExpression)) {
        await interaction.reply({ content: 'Expressão cron inválida.', ephemeral: true });
        return;
    }

    // Mapeamento de cores para códigos hexadecimais
    const colorMap = {
        azul: 0x3498DB,
        vermelho: 0xE74C3C,
        verde: 0x2ECC71,
        amarelo: 0xF1C40F,
        laranja: 0xE67E22,
        roxo: 0x9B59B6
    };

    const color = colorMap[colorName.toLowerCase()];
    if (!color) {
        await interaction.reply({ content: 'Cor inválida. Escolha entre: azul, vermelho, verde, amarelo, laranja, roxo.', ephemeral: true });
        return;
    }

    // Carregar as tarefas existentes
    const tasks = await loadTasks();

    // Criar uma nova tarefa com um ID único
    const newTask = {
        id: tasks.length > 0 ? tasks[tasks.length - 1].id + 1 : 1,
        name,
        cronExpression,
        channelId: CHANNEL_ID,
        message,
        color,
        roleId: role.id,
        createdBy,
        createdAt: new Date().toISOString(),
        isActive: true,
    };

    tasks.push(newTask);

    // Salvar a nova lista de tarefas
    await saveTasks(tasks);

    // Agendar a nova tarefa
    interaction.client.scheduler.addTask(newTask);

    await interaction.reply({ content: `Tarefa '${name}' adicionada com sucesso!`, ephemeral: false });
}

// Função para listar as tarefas
async function listarTarefas(interaction) {
    const tasks = await loadTasks();

    if (tasks.length === 0) {
        await interaction.reply('Não há tarefas agendadas.');
        return;
    }

    let message = '**Tarefas Agendadas:**\n';
    tasks.forEach(task => {
        const colorHex = `#${task.color.toString(16).padStart(6, '0')}`;
        message += `ID: ${task.id}\nNome: ${task.name}\nCron: \`${task.cronExpression}\`\nCor: ${colorHex}\nCargo: <@&${task.roleId}>\nAtiva: ${task.isActive ? 'Sim' : 'Não'}\n\n`;
    });

    await interaction.reply(message);
}

// Função para deletar uma tarefa
async function deletarTarefa(interaction) {
    const taskId = interaction.options.getInteger('id');

    let tasks = await loadTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
        await interaction.reply({ content: 'Tarefa não encontrada.', ephemeral: true });
        return;
    }

    const [removedTask] = tasks.splice(taskIndex, 1);

    // Salvar a lista atualizada de tarefas
    await saveTasks(tasks);

    // Cancelar a tarefa agendada
    interaction.client.scheduler.cancelTask(taskId);

    await interaction.reply({ content: `Tarefa '${removedTask.name}' deletada com sucesso!`, ephemeral: false });
}
