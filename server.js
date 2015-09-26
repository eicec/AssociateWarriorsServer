import {Server as WebSocketServer} from 'ws';
import UUID from 'uuid-js';
import c from './constants.js';

const NUM_PLAYERS = 2;

let wss = new WebSocketServer({ port: 8080 });
let currentGame;

function sendMessage(player, message) {
  player.ws.send(JSON.stringify(message));
}

function setupPlayer(ws) {
  let player = { id: UUID.create().toString(), ws };
  let game = currentGame;

  console.log('player connected');

  if (!game) {
    console.log('starting new game');

    game = currentGame = { id: UUID.create().toString(), players: [] };
  } else {
    console.log('joining existing game: %s', game.id);
  }

  game.players.push(player);

  if (game.players.length >= NUM_PLAYERS) {
    game.players.forEach(otherPlayer => {
      sendMessage(otherPlayer, { type: "START", firstPlayer: otherPlayer == player });
    });

    currentGame = null;
  }

  return [player, game];
}

wss.on('connection', ws => {
  let [player, game] = setupPlayer(ws);

  ws.on('message', message => {
    console.log('received: %s', message);

    message = JSON.parse(message);

    switch (message.type) {
      case 'STATE':
        game.state = message.state;
        game.walls = message.walls;

        game.players.forEach(otherPlayer => {
          if (otherPlayer != player) {
            sendMessage(otherPlayer, { type: "STATE", state: game.state, walls: game.walls });
          }
        });
        break;
    }
  });
});

