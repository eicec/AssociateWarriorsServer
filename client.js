import WebSocket from 'ws';
import c from './constants.js';

function a(n) {
  return Array.apply(0, new Array(n));
}

let state = a(9).map(() => a(16).map(() => 0));
let walls = a(9).map(() => a(16).map(() => 0));

let ws = new WebSocket('ws://localhost:8080/');

function send(message) {
  ws.send(JSON.stringify(message));
}

ws.on('open', function() {
});

ws.on('message', function(message) {
  console.log('received: %s', message);

  message = JSON.parse(message);

  switch (message.type) {
    case 'START':
      if (message.firstPlayer) {
        send({ type: "STATE", state: state, walls: walls });
        send({ type: "MOVE", move: { 4: [[1, 1], [2, 2]] } });
      }
      break;

    case 'STATE':
      state = message.state;
      walls = message.walls;

      send({ type: "MOVE", move: { 8: [[3, 3], [4, 4]], 9: [[5, 5]] } });
      break;
  }
});

