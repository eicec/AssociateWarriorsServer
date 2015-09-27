import {Server as WebSocketServer} from 'ws';
import UUID from 'uuid-js';
import * as c from './constants.js';

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

          let moves = [];

          playerIds.forEach(playerId => {
            var playerMoves = game.moves[playerId];
            Object.keys(playerMoves).forEach(k => {
              playerMoves[k].push(false);
            });
          });

          let n = 0;
          while (n < 99) {
            let move = {};
            playerIds.forEach(playerId => {
              var playerMoves = game.moves[playerId];
              Object.keys(playerMoves).forEach(k => {
                let length = playerMoves[k].length;
                if (length > n) {
                  move[k] = { pos: playerMoves[k][n], shoot: length == n + 1 };
                }
              })
            });
            if (Object.keys(move).length == 0) {
              break;
            }
            moves.push(move);
            n++;
          }

          // moves = [
          //    { P11: { pos: [0, 0] }, P12: { pos: [2, 1] }, P13: { pos: [3, 0] }, ... },
          //    { P11: { pos: [0, 0] }, P12: { pos: [2, 2] }, P13: { pos: [3, 1] } ... },
          //    { P12: { pos: [2, 3] } ],
          //    ...
          // ]

          let actions = [];
          let dead = [];
          for (let m = 0; m < moves.length; m++) {
            let move = moves[m];
            // Revisar se tem que atirar
            Object.keys(move).forEach(k => {
              let i = move[k];
              if (i && !i.pos) {
                delete i["pos"];
                let pos = findPos(game, k);
                let [shoot, die] = findTarget(game, pos, player);
                i.shoot = shoot;
                if (die) {
                  if (!move[die]) {
                    move[die] = {};
                  }
                  move[die]["die"] = true;
                  dead.push(die);
                  for (let n = m + 1; n < moves.length; n++) {
                    delete moves[m][die];
                  }
                }
              }
            });

            // Mover os personagens
            Object.keys(move).forEach(k => {
              let i = move[k];
              Object.keys(move).forEach(l => {
                let j = move[l];
                if (i && j && i != j && i.pos == j.pos) {
                  // "Pedra, papel, tesoura" tartaruga ganha a gato, gato ganha a jabali, jabali ganha a tartaruga
                }
              });
            });

            // Atualizar o estado do tabueiro
            updateState(game, move);

            actions.push(move);
          }

          // actions = [
          //    { P11: { pos: [0, 0] }, P12: { pos: [2, 1] }, P13: { pos: [3, 0] }, ... ],
          //    { P11: { pos: [0, 0] }, P12: { pos: [2, 2], shoot: [2, 5] }, P13: { pos: [3, 1], shoot: [3, 5] } ... ],
          //    { P12: { pos: [2, 3], shoot: [3, 4] } ],
          //    ...
          // ]

          game.players.forEach(otherPlayer => {
            send(otherPlayer, { type: "ACTIONS", actions });
          });
        }

        break;
    }
  });
});

function updateState(game, move) {
  let chars = Object.keys(move);
  let charsInt = Object.keys(move).map(x => parseInt(x));

  game.state = game.state.map(row => row.map(cell => {
    return charsInt.indexOf(cell) != -1 ? 0 : cell
  }));

  chars.forEach(char => {
    let pos = move[char].pos;
    if (pos) {
      game.state[pos[1]][pos[0]] = parseInt(char);
    }
  });
}

function findPos(game, type) {
  let typeInt = parseInt(type);
  for (let row of game.state) {
    for (let cell of row) {
      if (cell == typeInt) {
        return [game.state.indexOf(row), row.indexOf(cell)];
      }
    }
  }
}

function findTarget(game, pos, player) {
  if (!pos) {
    return [false, false];
  }

  let x, y;
  let type = game.state[pos[1]][pos[0]];
  let char = c.CHARACTERS[type];

  if (type == 0) {
    return [false, false];
  }

  let h = game.state.length;
  let w = game.state[0].length;

  // NORTH
  x = pos[0];
  for (y = pos[1]; y > -1; y--) {
    let wall = y + 1 < h && game.walls[y + 1][x];
    if (wall == c.WALL_S || wall == c.WALL_SW) {
      break;
    }
    let otherType = game.state[y][x];
    let otherChar = c.CHARACTERS[otherType];
    if (otherChar && otherChar.player != player) {
      return tryShoot(char, x, y, otherChar, otherType);
    }
  }
  // EAST
  y = pos[1];
  for (x = pos[0]; x < w; x++) {
    let wall = x + 1 < w && game.walls[y][x + 1];
    if (wall == c.WALL_W || wall == c.WALL_SW) {
      break;
    }
    let otherType = game.state[y][x];
    let otherChar = c.CHARACTERS[otherType];
    if (otherChar && otherChar.player != player) {
      return tryShoot(char, x, y, otherChar, otherType);
    }
  }
  // SOUTH
  x = pos[0];
  for (y = pos[1]; y < h; y++) {
    let wall = game.walls[y][x];
    if (wall == c.WALL_S || wall == c.WALL_SW) {
      break;
    }
    let otherType = game.state[y][x];
    let otherChar = c.CHARACTERS[otherType];
    if (otherChar && otherChar.player != player) {
      return tryShoot(char, x, y, otherChar, otherType);
    }
  }
  // WEST
  y = pos[1];
  for (x = pos[0]; x > -1; x--) {
    let wall = game.walls[y][x];
    if (wall == c.WALL_W || wall == c.WALL_SW) {
      break;
    }
    let otherType = game.state[y][x];
    let otherChar = c.CHARACTERS[otherType];
    if (otherChar && otherChar.player != player) {
      return tryShoot(char, x, y, otherChar, otherType);
    }
  }

  return [false, false];
}

function tryShoot(char, x, y, otherChar, otherType) {
  let d = otherChar.defense;
  let p = char.power;
  return [[x, y], Math.random() > (d == p ? 0.6 : d > p ? 0.4 : 0.8) ? otherType : null];
}
