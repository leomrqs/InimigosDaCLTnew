// index.js

const { Client, GatewayIntentBits, Collection, ActivityType, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Inicialização do cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Coleções para comandos e eventos
client.commands = new Collection();
client.events = new Collection();

// Logger personalizado
const logger = require('./logger');
// Importar o arquivo de monitoramento
const roleMonitor = require('./commands/roleMonitor');

// Importar o agendador
const Scheduler = require('./scheduler');

const DailyThoughtsScheduler = require('./dailyThoughtsScheduler'); // Adicione esta linha

// Carregamento de comandos
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.info(`Comando carregado: ${command.data.name}`);
    } else {
        logger.warn(`O comando em '${filePath}' está faltando a propriedade 'data' ou 'execute'.`);
    }
}

// Carregamento de eventos
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        logger.info(`Evento carregado: ${event.name}`);
    }
}

// Inicialização do agendador
const scheduler = new Scheduler(client);
client.scheduler = scheduler;

// Login do bot
client.login(process.env.DISCORD_TOKEN);

// Registro de comandos após o cliente estar pronto
client.once('ready', async () => {
    logger.info(`Bot está online como ${client.user.tag}`);

    client.user.setActivity({
        name: "VOLTA XUREIA 😪",
        type: ActivityType.Playing,
    });

    client.user.setStatus('dnd');  // Ocupado (vermelho)

    const THOUGHTS_CHANNEL_ID = '1273864488021524571';

    // Inicializar o agendador de pensamentos diários
    const dailyThoughtsScheduler = new DailyThoughtsScheduler(client, THOUGHTS_CHANNEL_ID);
    dailyThoughtsScheduler.startDailyScheduler();

    // Tornar o agendador acessível em outras partes, se necessário
    client.dailyThoughtsScheduler = dailyThoughtsScheduler;

    // Iniciar o monitoramento de cargos de Membro
    roleMonitor.iniciarMonitoramentoRoles(client);  // Iniciar o monitoramento aqui

    // Registro de comandos
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        logger.info('Atualizando comandos de barra (/) ...');

        const GUILD_ID = process.env.GUILD_ID;

        if (GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, GUILD_ID),
                { body: commands }
            );
            logger.info(`Comandos registrados no servidor de desenvolvimento (Guild ID: ${GUILD_ID}).`);
        } else {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            logger.info('Comandos registrados globalmente.');
        }

        // Carregar e agendar tarefas
        logger.info('Carregando e agendando tarefas...');
        await scheduler.loadTasks();

        // Adicionar a função para retomar o monitoramento do comando de MVP/MINI
        const mvpMiniCommand = client.commands.get('mvpmini');
        if (mvpMiniCommand && typeof mvpMiniCommand.retomarMonitoramento === 'function') {
            logger.info('Retomando o monitoramento dos bosses MVP/MINI...');
            await mvpMiniCommand.retomarMonitoramento(client);
        }

        // Adicionar a função para retomar o monitoramento do comando justificarfalta
        const justificarFaltaCommand = client.commands.get('justificarfalta');
        if (justificarFaltaCommand && typeof justificarFaltaCommand.iniciarMonitoramentoJustificarFaltaAoInicializar === 'function') {
            logger.info('Retomando o monitoramento do comando justificarfalta...');
            await justificarFaltaCommand.iniciarMonitoramentoJustificarFaltaAoInicializar(client);
        }

        // Iniciar monitoramento do comando 'jogadores'
        const jogadoresCommand = client.commands.get('jogadores');
        if (jogadoresCommand && typeof jogadoresCommand.iniciarMonitoramentoAoInicializar === 'function') {
            logger.info('Retomando o monitoramento da lista de jogadores...');
            await jogadoresCommand.iniciarMonitoramentoAoInicializar(client);
        }
    } catch (error) {
        logger.error('Erro ao registrar comandos:', error);
    }
});

// Manejo de interações
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`Comando não encontrado: ${interaction.commandName}`);
        return;
    }

    // Log detalhado
    const currentDateTime = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const userName = interaction.user.username;
    const userId = interaction.user.id;
    logger.info(`[${currentDateTime}] Comando executado: /${interaction.commandName}, Usuário: ${userName} (ID: ${userId})`);

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Erro ao executar o comando ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Houve um erro ao tentar executar esse comando.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Houve um erro ao tentar executar esse comando.', ephemeral: true });
        }
    }
});

// Captura de exceções não tratadas
process.on('unhandledRejection', error => {
    logger.error('Erro não tratado:', error);
});

process.on('uncaughtException', error => {
    logger.error('Exceção não capturada:', error);
});
