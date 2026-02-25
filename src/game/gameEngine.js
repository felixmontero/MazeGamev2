import { OPPOSITE } from './mazeData.js';

/**
 * Create a new game state from a maze definition.
 */
export function createGameState(maze) {
    return {
        maze,
        player: {
            currentRoom: 1,
            coins: 0,
            keys: [], // { name, doorIds }
        },
        startTime: Date.now(),
        won: false,
    };
}

/**
 * Get info about the current room for rendering.
 */
export function getRoomInfo(state) {
    const room = state.maze.rooms[state.player.currentRoom];
    const walls = {};

    for (const dir of ['NORTH', 'SOUTH', 'EAST', 'WEST']) {
        const side = room.sides[dir];
        if (side.type === 'wall') {
            walls[dir] = { type: 'wall', open: false };
        } else {
            const door = state.maze.doors[side.doorId];
            walls[dir] = { type: 'door', open: door.open, doorId: side.doorId };
        }
    }

    const hasCoin = room.items.some((i) => i.type === 'coin');
    const hasKey = room.items.some((i) => i.type === 'key');
    const keyItem = room.items.find((i) => i.type === 'key');

    return {
        roomNumber: room.number,
        isTarget: room.isTarget,
        walls,
        hasCoin,
        hasKey,
        keyItem,
        playerCoins: state.player.coins,
        playerKeys: state.player.keys.length,
    };
}

/**
 * Attempt to move the player in a direction.
 * Returns { success, state, message }
 */
export function move(state, direction) {
    const room = state.maze.rooms[state.player.currentRoom];
    const side = room.sides[direction];

    if (side.type === 'wall') {
        return { success: false, state, message: 'No pots passar, hi ha una paret!' };
    }

    const door = state.maze.doors[side.doorId];
    let newState = state;

    if (!door.open) {
        // Check if player has a key for this door
        const keyIndex = state.player.keys.findIndex((k) =>
            k.doorIds.includes(side.doorId)
        );

        if (keyIndex === -1) {
            return { success: false, state, message: 'La porta està tancada! Necessites una clau.' };
        }

        // Open the door
        const newDoors = { ...state.maze.doors };
        newDoors[side.doorId] = { ...door, open: true };
        newState = {
            ...state,
            maze: { ...state.maze, doors: newDoors },
        };
    }

    // Move to the other room through the door
    const nextRoom = door.room1 === state.player.currentRoom ? door.room2 : door.room1;
    const finalState = {
        ...newState,
        player: { ...newState.player, currentRoom: nextRoom },
    };

    // Check if target reached
    if (finalState.maze.rooms[nextRoom].isTarget) {
        finalState.won = true;
        finalState.endTime = Date.now();
    }

    const message = state === newState
        ? `Has entrat a la sala ${nextRoom}`
        : `Has obert la porta amb la clau i has entrat a la sala ${nextRoom}`;

    return { success: true, state: finalState, message };
}

/**
 * Try to open a locked door in a given direction using a key.
 * Returns { success, state, message }
 */
export function openDoor(state, direction) {
    const room = state.maze.rooms[state.player.currentRoom];
    const side = room.sides[direction];

    if (side.type === 'wall') {
        return { success: false, state, message: 'No hi ha porta aquí.' };
    }

    const door = state.maze.doors[side.doorId];
    if (door.open) {
        return { success: false, state, message: 'La porta ja està oberta.' };
    }

    // Check if player has a key for this door
    const keyIndex = state.player.keys.findIndex((k) =>
        k.doorIds.includes(side.doorId)
    );

    if (keyIndex === -1) {
        return { success: false, state, message: 'No tens la clau per obrir aquesta porta!' };
    }

    // Open the door
    const newDoors = { ...state.maze.doors };
    newDoors[side.doorId] = { ...door, open: true };

    const newState = {
        ...state,
        maze: { ...state.maze, doors: newDoors },
    };

    return { success: true, state: newState, message: 'Has obert la porta!' };
}

/**
 * Pick up a coin from the current room.
 */
export function pickupCoin(state) {
    const room = state.maze.rooms[state.player.currentRoom];
    const coinIndex = room.items.findIndex((i) => i.type === 'coin');

    if (coinIndex === -1) {
        return { success: false, state, message: 'No hi ha monedes aquí.' };
    }

    // Remove the coin from the room
    const newRooms = { ...state.maze.rooms };
    const newRoom = { ...room, items: [...room.items] };
    newRoom.items.splice(coinIndex, 1);
    newRooms[state.player.currentRoom] = newRoom;

    const newState = {
        ...state,
        maze: { ...state.maze, rooms: newRooms },
        player: { ...state.player, coins: state.player.coins + 1 },
    };

    return { success: true, state: newState, message: 'Has obtingut una moneda! 🪙' };
}

/**
 * Pick up a key from the current room (costs coins).
 */
export function pickupKey(state) {
    const room = state.maze.rooms[state.player.currentRoom];
    const keyIndex = room.items.findIndex((i) => i.type === 'key');

    if (keyIndex === -1) {
        return { success: false, state, message: 'No hi ha claus aquí.' };
    }

    const keyItem = room.items[keyIndex];

    if (state.player.coins < keyItem.cost) {
        return {
            success: false,
            state,
            message: `Necessites ${keyItem.cost} monedes per comprar aquesta clau. Tens ${state.player.coins}.`,
        };
    }

    // Remove key from room, deduct coins, add key to player
    const newRooms = { ...state.maze.rooms };
    const newRoom = { ...room, items: [...room.items] };
    newRoom.items.splice(keyIndex, 1);
    newRooms[state.player.currentRoom] = newRoom;

    const newState = {
        ...state,
        maze: { ...state.maze, rooms: newRooms },
        player: {
            ...state.player,
            coins: state.player.coins - keyItem.cost,
            keys: [...state.player.keys, { name: keyItem.name, doorIds: keyItem.doorIds }],
        },
    };

    return { success: true, state: newState, message: `Has obtingut la clau: ${keyItem.name}! 🔑` };
}
