# Monster Mayhem

Monster Mayhem is a web-based multiplayer board game where players place and move monsters on a 10x10 grid. The game is built using JavaScript, Node.js, Express, and Socket.io to facilitate real-time communication and gameplay.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (includes npm)

## Getting Started

Follow these steps to get the game up and running locally:

1. **Clone the repository:**

```bash
   git clone <[repository-url](https://github.com/iav2002/monsterMayhem.git)>
   cd monster-mayhem
```

2. **Install dependencies:**

```bash
Copy code
npm install
npm install express socket.io
```
3. **Start the server:**

```bash
Copy code
node server.js
```

4 . **Open your browser and navigate to:**

```bash
Copy code
http://localhost:3000
```

5. **Play the game:**

- Enter your username when prompted.
- Click "Ready" to join the game.
- Place and move your monsters according to the game rules.

6. **Game Rules**

- Players take turns placing one of three types of monsters (Vampire, Werewolf, Ghost) on their designated edge of the grid.
  
- Monsters interact based on specific rules:
    - Vampire vs. Werewolf: Werewolf is removed.
    - Werewolf vs. Ghost: Ghost is removed.
    - Ghost vs. Vampire: Vampire is removed.
    - Same type: Both monsters are removed.
      
- A player wins by being the last remaining player with monsters on the board.

