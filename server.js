import {Server as WebSocketServer} from 'ws';
import UUID from 'uuid-js';
import c from './constants.js';

const NUM_PLAYERS = 2;
let currentGame;

function send(player, message) {
  player.ws.send(JSON.stringify(message));
}

function setupPlayer(ws) {
  let player = { id: UUID.create().toString(), ws };
  let game = currentGame;

  console.log('player connected');

  if (!game) {
    console.log('starting new game');

    game = currentGame = {
      id: UUID.create().toString(),
      players: [],
      state: [],
      walls: [],
      moves: {}
    };
  } else {
    console.log('joining existing game: %s', game.id);
  }

  game.players.push(player);

  if (game.players.length >= NUM_PLAYERS) {
    game.players.forEach(otherPlayer => {
      send(otherPlayer, { type: "START", firstPlayer: otherPlayer == player });
    });

    currentGame = null;
  }

  return [player, game];
}

let wss = new WebSocketServer({ port: 8080 });

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
            send(otherPlayer, { type: "STATE", state: game.state, walls: game.walls });
          }
        });
        break;

      case 'MOVE':
        game.moves[player.id] = message.move;

        var players = Object.keys(game.moves);
        if (players.length == NUM_PLAYERS) {
          let actions = [];

          // game.moves = {
          //   p1: {
          //     P11: [ [0, 0], [0, 1] ],
          //     P12: [ [2, 1], [2, 2], [2, 3] ],
          //     P13: [ [3, 0], [3, 1] ]
          //   },
          //   p2: [
          //     P21: [ [0, 0], [0, 1] ],
          //     P22: [ [2, 1] ],
          //     P23: [ ]
          //   ],
          // }

          // moves = [
          //    [ { idx: P11, pos: [0, 0] }, ... ],
          //    [ { idx: P11, pos: [0, 0] }, ... ],
          //    [ { idx: P12, pos: [2, 3] }, {idx: P13, pos: null }... ]
          // ]

          // Add null (shoot) to the end of the array
          Object.values(game.moves).forEach(move => move.push(null));

          let moves = players.map((playerId) => game.moves[playerId].map(move => ({ playerId, move })));
          // TODO

          game.players.forEach(otherPlayer => {
            send(otherPlayer, { type: "ACTIONS", actions });
          });
        }

        break;
    }
  });
});

