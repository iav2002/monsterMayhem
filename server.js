const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game state
const players = {};
const gameState = {
    grid: Array(10).fill().map(() => Array(10).fill(null)),
    playerOrder: [],
    monsterCounts: {},
    readyCount: 0,  // Count of players who are ready
    totalPlayers: 3 // Number of players to star the game
};

let isUpdating = false; // Concurrency lock for atomic operations, helped used from videos and web pages like https://spin.atomicobject.com/javascript-concurrency/, https://extendscript.docsforadobe.dev/external-communication/socket-object.html

// Initialize or update player data
function initPlayer(socketId) {
    players[socketId] = {
        id: socketId,
        edge: Object.keys(players).length % 4, // Checking edges
        ready: false
    };
    gameState.monsterCounts[socketId] = 0; // Initialize monster count
    updatePlayerOrder();
}

// Update the turn order based on the number of monsters
function updatePlayerOrder() {
    gameState.playerOrder = Object.keys(players).sort((a, b) => {
        const countA = gameState.monsterCounts[a] || 0;
        const countB = gameState.monsterCounts[b] || 0;
        return countA - countB || Math.random() - 0.5; // Random tie-breaking
    });
}

// Handle placement of monsters
function handlePlacement(playerId, type, position) {
    if (isUpdating) return; // Prevent simultaneous updates  https://www.youtube.com/watch?v=phs5V6qk2xk reference

    isUpdating = true; // Set the lock

    // Perform the placement operation
    gameState.grid[position.y][position.x] = { type, owner: playerId };
    gameState.monsterCounts[playerId]++;

    // Broadcast the update to all clients
    io.emit('update grid', gameState.grid);

    // Check for end game conditions
    checkGameEndConditions();

    isUpdating = false; // Release the lock
}

// Handle movement of monsters (simplified)
function handleMovement(playerId, from, to) {
    if (isUpdating) return; // Prevent simultaneous updates

    isUpdating = true; // Set the lock

    const movingMonster = gameState.grid[from.y][from.x];
    if (!movingMonster || movingMonster.owner !== playerId) {
        isUpdating = false;
        return; // No monster or not owned by player
    }

    // Check if the move is valid (straight line or two squares diagonally)
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);
    const distanceValid = (dx === 0 || dy === 0 || (dx <= 2 && dy <= 2 && dx === dy));

    if (!distanceValid) {
        isUpdating = false;
        return; // Invalid move
    }

    // Check for blocking monsters (simplified check assuming no blocking)
    if (gameState.grid[to.y][to.x] && gameState.grid[to.y][to.x].owner !== playerId) {
        resolveConflict(to, movingMonster);
    } else {
        gameState.grid[to.y][to.x] = movingMonster; // Move monster
        gameState.grid[from.y][from.x] = null; // Clear old position
    }

    io.emit('update grid', gameState.grid); // Update all clients
    checkGameEndConditions(); // Check end game conditions after movement

    isUpdating = false; // Release the lock
}

function resolveConflict(position, incomingMonster) {
    const residentMonster = gameState.grid[position.y][position.x];
    // Determine outcome based on types
    if (incomingMonster.type === residentMonster.type) {
        gameState.grid[position.y][position.x] = null; // Both removed
        gameState.monsterCounts[incomingMonster.owner]++;
        gameState.monsterCounts[residentMonster.owner]++;
    } else {
        // Implement rules for conflicts between different types
        const conflictRules = {
            'vampire': 'ghost',
            'werewolf': 'vampire',
            'ghost': 'werewolf'
        };

        if (conflictRules[incomingMonster.type] === residentMonster.type) {
            gameState.grid[position.y][position.x] = incomingMonster; // Incoming wins
            gameState.monsterCounts[residentMonster.owner]++;
        } else {
            gameState.grid[position.y][position.x] = null; // Resident wins, or both removed
            gameState.monsterCounts[incomingMonster.owner]++;
        }
    }
    console.log(`Monster counts: ${JSON.stringify(gameState.monsterCounts)}`); // Log monster counts for debugging
    checkGameEndConditions(); // Check game end conditions after resolving conflict
}

// Handle end turn
function handleEndTurn(playerId) {
    if (isUpdating) return; // Prevent simultaneous updates

    isUpdating = true; // Set the lock

    console.log(`${players[playerId].name} ended their turn.`);
    updatePlayerOrder(); // Rotate to the next player
    checkGameEndConditions();

    isUpdating = false; // Release the lock
}

function checkGameEndConditions() {
    // Conditinoal  10 or more monsters removed
    for (let playerId in gameState.monsterCounts) {
        if (gameState.monsterCounts[playerId] >= 10) {
            io.emit('game over', `Player ${players[playerId].name} loses`);
            return; // End the game if any player is eliminated
        }
    }

    // Check if only one player is left
    const activePlayers = Object.keys(players).filter(playerId => gameState.monsterCounts[playerId] < 10);
    if (activePlayers.length === 1) {
        io.emit('game over', `Player ${players[activePlayers[0]].name} wins`);
    }
}

io.on('connection', (socket) => {
    console.log('A user connected');
    initPlayer(socket.id);

    socket.on('register', (data) => {
        console.log(`${data.name} has joined the game`);
        players[socket.id].name = data.name;
        // Update any relevant game state or UI
    });

    socket.on('player ready', () => {
        if (isUpdating) return; // Prevent simultaneous updates

        isUpdating = true; // Set the lock

        players[socket.id].ready = true;
        gameState.readyCount++;
        if (gameState.readyCount === gameState.totalPlayers) {
            io.emit('game started');
        }

        isUpdating = false; // Release the lock
    });

    socket.on('place monster', (type, position) => {
        handlePlacement(socket.id, type, position);
    });

    socket.on('move monster', (from, to) => {
        handleMovement(socket.id, from, to);
    });

    socket.on('end turn', () => {
        handleEndTurn(socket.id);
    });

    socket.on('disconnect', () => {
        if (isUpdating) return; // Prevent simultaneous updates

        isUpdating = true; // Set the lock

        console.log(`${players[socket.id].name} disconnected`);
        delete players[socket.id];
        delete gameState.monsterCounts[socket.id];
        updatePlayerOrder();

        isUpdating = false; // Release the lock
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
