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

        var playerIds = Object.keys(game.moves);
        if (playerIds.length == NUM_PLAYERS) {
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
          //    [ { type: P11, pos: [0, 0] }, { type: P12, pos: [2, 1] }, ... ],
          //    [ { type: P11, pos: [0, 0] }, { type: P12, pos: [2, 2] }, ... ],
          //    [ { type: P12, pos: [2, 3] }, { type: P13, pos: null }... ]
          // ]

          // actions = [
          //    [ { type: P11, pos: [0, 0] }, { type: P12, pos: [2, 1], shoot: "west" }, ... ],
          //    [ { type: P11, pos: [0, 0] }, { type: P12, pos: [2, 2], dead: true }, ... ],
          //    [ { type: P12, pos: [2, 3] }, { type: P13, shoot: "north" }... ]
          // ]

          // Add null (shoot) to the end of the array
          Object.values(game.moves).forEach(move => Object.values(move).forEach(i => i.push(null)));

          let moves = []; //playerIds.map(playerId => game.moves[playerId].map(move => ({ playerId, move })));
          let actions = [];
          moves.forEach(move => {
            move.forEach(i => {
              if (i.pos == null) {
                // TODO Shoot
              } else {
                move.forEach(j => {
                  if (j != i && j.pos == i.pos) {
                    // "Pedra, papel, tesoura" tartaruga ganha a gato, gato ganha a jabali, jabali ganha a tartaruga
                  }
                });
              }
            });
            actions.add(move);
          });
          // TODO

          game.players.forEach(otherPlayer => {
            send(otherPlayer, { type: "ACTIONS", actions });
          });
        }

        break;
    }
  });
});

