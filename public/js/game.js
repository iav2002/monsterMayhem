const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('game-grid');
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        grid.appendChild(cell);
    }
});