// utils/randomScheduler.js

function generateRandomTimes(numTimes) {
    const times = new Set();
    while (times.size < numTimes) {
        const hour = Math.floor(Math.random() * 24); // Horas de 0 a 23
        const minute = Math.floor(Math.random() * 60); // Minutos de 0 a 59
        const time = { hour, minute };
        times.add(JSON.stringify(time)); // Usamos JSON para garantir unicidade
    }
    // Convertendo de volta para objetos
    return Array.from(times).map(time => JSON.parse(time));
}

module.exports = {
    generateRandomTimes
};
