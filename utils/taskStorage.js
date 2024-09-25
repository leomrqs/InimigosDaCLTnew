// utils/taskStorage.js

const fs = require('fs').promises;
const path = require('path');

const TASKS_FILE_PATH = path.resolve(__dirname, '../data/tasknotificacao.json');

// Função para carregar as tarefas do arquivo JSON
async function loadTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existir ou estiver vazio, retorna um array vazio
        return [];
    }
}

// Função para salvar as tarefas no arquivo JSON
async function saveTasks(tasks) {
    await fs.writeFile(TASKS_FILE_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
}

module.exports = {
    loadTasks,
    saveTasks,
};
