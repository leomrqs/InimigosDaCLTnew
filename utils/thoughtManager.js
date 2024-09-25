// utils/thoughtManager.js

const fs = require('fs').promises;
const path = require('path');

const THOUGHTS_FILE_PATH = path.resolve(__dirname, '../data/thoughts.json');

async function loadThoughts() {
    try {
        const data = await fs.readFile(THOUGHTS_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao carregar os pensamentos:', error);
        return [];
    }
}

function getRandomThought(thoughts) {
    if (thoughts.length === 0) return null;
    const index = Math.floor(Math.random() * thoughts.length);
    return thoughts[index];
}

module.exports = {
    loadThoughts,
    getRandomThought
};
