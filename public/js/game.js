const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('game-grid');
    const monsterSelect = document.getElementById('monster-select');
    const readyButton = document.getElementById('ready-button');
    const endTurnButton = document.getElementById('end-turn');
    const gameStatus = document.getElementById('game-status');
    const userName = localStorage.getItem("userName");
    let selectedMonster = null;
    let gameStarted = false;

    socket.emit('register', { name: userName });// Send the username to the server

    // Initialize the grid
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        grid.appendChild(cell);
    }

   
    readyButton.addEventListener('click', () => { // Ready button handler
        socket.emit('player ready');
        readyButton.disabled = true; // Disable the button once clicked
    });

    grid.addEventListener('click', function(event) {
        // Grid cell click handler
        if (!gameStarted) return; // Ignore clicks if the game hasn't started

        if (event.target.className === 'cell') {
            const index = parseInt(event.target.dataset.index, 10);
            const x = index % 10;
            const y = Math.floor(index / 10);
            const monsterType = monsterSelect.value;

            if (monsterType) {
                socket.emit('place monster', monsterType, { x, y });
                monsterSelect.value = ''; // Clear the selection after placing a monster
            } else if (selectedMonster) {
                socket.emit('move monster', selectedMonster, { x, y });
                selectedMonster = null; // Reset after moving
            } else {
                selectedMonster = { x, y };
            }
        }
    });

    // End turn button
    endTurnButton.addEventListener('click', () => {
        socket.emit('end turn');
        selectedMonster = null; // Reset selection on end turn
    });

    // Update grid display upon receiving new grid data
    socket.on('update grid', newGrid => {
        updateGridDisplay(newGrid);
    });

    // Receive and display game status updates
    socket.on('game over', message => {
        alert(message); // Alert the game over message
        window.location.reload(); // Reload the page to restart the game
    });

    socket.on('update status', status => {
        gameStatus.textContent = status;
    });

    socket.on('game started', () => {
        gameStarted = true;
        endTurnButton.disabled = false;
        gameStatus.textContent = 'Game has started!';
    });
});

function updateGridDisplay(grid) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const x = index % 10;
        const y = Math.floor(index / 10);
        const content = grid[y][x];
        cell.textContent = content ? content.type[0].toUpperCase() : ''; // Show the first letter of type
    });
}
