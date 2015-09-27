export const MONEY = 3;

export const WALL_SW = 13;
export const WALL_W = 14;
export const WALL_S = 15;

export const P11 = 5;
export const P12 = 6;
export const P13 = 7;

export const P21 = 9;
export const P22 = 10;
export const P23 = 11;

export let CHARACTERS = {};

CHARACTERS[P11] = { type: P11, player: 1, name: "p11", defense: 2, power: 1 };
CHARACTERS[P12] = { type: P12, player: 1, name: "p12", defense: 1, power: 1 };
CHARACTERS[P13] = { type: P13, player: 1, name: "p13", defense: 1, power: 2 };
CHARACTERS[P21] = { type: P21, player: 2, name: "p21", defense: 2, power: 1 };
CHARACTERS[P22] = { type: P22, player: 2, name: "p22", defense: 1, power: 1 };
CHARACTERS[P23] = { type: P23, player: 2, name: "p23", defense: 1, power: 2 };
