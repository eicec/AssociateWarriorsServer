import WebSocket from 'ws';
import c from './constants.js';

function a(n) {
  return Array.apply(0, new Array(n));
}

let state = a(9).map(() => a(16).map(() => 0));
let walls = a(9).map(() => a(16).map(() => 0));

let ws = new WebSocket('ws://localhost:8080/');

ws.on('open', function() {
});

ws.on('message', function(message) {
  console.log('received: %s', message);

  message = JSON.parse(message);

  console.log('received: %s', message.type);
  switch (message.type) {
    case 'START':
      if (message.firstPlayer) {

        ws.send(JSON.stringify({ type: "STATE", state: state, walls: walls }));
        ws.send(JSON.stringify({ type: "MOVE", move: [] }));
      }
      break;

    case 'STATE':
      state = message.state;
      walls = message.walls;

      ws.send(JSON.stringify({ type: "MOVE", move: [] }));
      break;
  }
});

