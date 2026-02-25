// Maze data replicating MazeService.createMaze() and createMaze2()
// Each map defines rooms, doors (with locks), items (coins/keys), and a target room

export const DIRECTIONS = {
    NORTH: 'NORTH',
    SOUTH: 'SOUTH',
    EAST: 'EAST',
    WEST: 'WEST',
};

export const OPPOSITE = {
    NORTH: 'SOUTH',
    SOUTH: 'NORTH',
    EAST: 'WEST',
    WEST: 'EAST',
};

/**
 * Build a maze definition from a declarative spec.
 * Returns { rooms, doors, target, id, name }
 */
function buildMaze(spec) {
    const rooms = {};

    // Create rooms with all walls
    for (let i = 1; i <= spec.roomCount; i++) {
        rooms[i] = {
            number: i,
            sides: {
                NORTH: { type: 'wall' },
                SOUTH: { type: 'wall' },
                EAST: { type: 'wall' },
                WEST: { type: 'wall' },
            },
            items: [],
            isTarget: i === spec.target,
        };
    }

    // Build doors
    const doorRefs = []; // track door objects for key association
    spec.doors.forEach((doorSpec) => {
        const doorObj = {
            id: `door_${doorSpec.from}_${doorSpec.to}`,
            room1: doorSpec.from,
            room2: doorSpec.to,
            open: !doorSpec.lockedByKey, // open if no key required
            keyName: doorSpec.lockedByKey || null,
        };
        doorRefs.push(doorObj);

        rooms[doorSpec.from].sides[doorSpec.dir] = {
            type: 'door',
            doorId: doorObj.id,
        };
        rooms[doorSpec.to].sides[OPPOSITE[doorSpec.dir]] = {
            type: 'door',
            doorId: doorObj.id,
        };
    });

    // Place items in rooms
    spec.items.forEach((itemSpec) => {
        if (itemSpec.type === 'coin') {
            rooms[itemSpec.room].items.push({ type: 'coin' });
        } else if (itemSpec.type === 'key') {
            // Find the doors this key can open
            const associatedDoorIds = doorRefs
                .filter((d) => d.keyName === itemSpec.name)
                .map((d) => d.id);
            rooms[itemSpec.room].items.push({
                type: 'key',
                name: itemSpec.name,
                cost: itemSpec.cost,
                doorIds: associatedDoorIds,
            });
        }
    });

    // Build doors map
    const doors = {};
    doorRefs.forEach((d) => {
        doors[d.id] = d;
    });

    return {
        id: spec.id,
        name: spec.name,
        rooms,
        doors,
        target: spec.target,
    };
}

// ─── Map 1 ──────────────────────────────────────────────
const MAP_1_SPEC = {
    id: 1,
    name: 'Mapa 1',
    roomCount: 6,
    target: 3,
    doors: [
        { from: 1, to: 2, dir: 'NORTH' },
        { from: 1, to: 4, dir: 'SOUTH' },
        { from: 1, to: 5, dir: 'EAST' },
        { from: 1, to: 3, dir: 'WEST', lockedByKey: 'Level2 Key' },
        { from: 5, to: 6, dir: 'EAST', lockedByKey: 'Level1 Key' },
    ],
    items: [
        { type: 'key', room: 6, name: 'Level2 Key', cost: 2 },
        { type: 'key', room: 2, name: 'Level1 Key', cost: 1 },
        { type: 'coin', room: 2 },
        { type: 'coin', room: 5 },
        { type: 'coin', room: 6 },
    ],
};

// ─── Map 2 ──────────────────────────────────────────────
const MAP_2_SPEC = {
    id: 2,
    name: 'Mapa 2',
    roomCount: 6,
    target: 3,
    doors: [
        { from: 1, to: 2, dir: 'NORTH' },
        { from: 1, to: 4, dir: 'SOUTH' },
        { from: 1, to: 5, dir: 'EAST' },
        { from: 1, to: 3, dir: 'WEST', lockedByKey: 'Level2 Key' },
        { from: 5, to: 6, dir: 'EAST', lockedByKey: 'Level1 Key' },
    ],
    items: [
        { type: 'key', room: 6, name: 'Level2 Key', cost: 1 },
        { type: 'key', room: 2, name: 'Level1 Key', cost: 1 },
        { type: 'coin', room: 5 },
        { type: 'coin', room: 6 },
    ],
};

export const MAZES = [MAP_1_SPEC, MAP_2_SPEC];

export function createMaze(mapId) {
    const spec = MAZES.find((m) => m.id === mapId);
    if (!spec) throw new Error(`Map ${mapId} not found`);
    return buildMaze(spec);
}
