import { OPPOSITE } from './mazeData.js';

export function generateRandomMaze(width, height) {
    // 1. Initialize empty grid and rooms
    const grid = Array.from({ length: height }, () => Array(width).fill(null));
    const rooms = {};
    const doors = {};
    let nextDoorId = 1;

    // Create all rooms initially sealed
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const roomNumber = y * width + x + 1;
            rooms[roomNumber] = {
                number: roomNumber,
                x, y,
                isTarget: false,
                items: [],
                sides: {
                    NORTH: { type: 'wall' },
                    SOUTH: { type: 'wall' },
                    EAST: { type: 'wall' },
                    WEST: { type: 'wall' },
                }
            };
            grid[y][x] = roomNumber;
        }
    }

    // 2. Recursive Backtracking to carve perfect maze paths
    const visited = new Set();
    const stack = [];

    // Start at room 1 (0,0)
    const startX = 0;
    const startY = 0;
    const startRoom = grid[startY][startX];
    visited.add(startRoom);
    stack.push({ x: startX, y: startY, room: startRoom });

    const directions = [
        { dir: 'NORTH', dx: 0, dy: -1 },
        { dir: 'SOUTH', dx: 0, dy: 1 },
        { dir: 'EAST', dx: 1, dy: 0 },
        { dir: 'WEST', dx: -1, dy: 0 }
    ];

    while (stack.length > 0) {
        const current = stack[stack.length - 1];

        // Find unvisited neighbors
        const neighbors = [];
        for (const { dir, dx, dy } of directions) {
            const nx = current.x + dx;
            const ny = current.y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nRoom = grid[ny][nx];
                if (!visited.has(nRoom)) {
                    neighbors.push({ dir, nx, ny, room: nRoom });
                }
            }
        }

        if (neighbors.length > 0) {
            // Pick a random unvisited neighbor
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Carve path (create an open door between current and next)
            const doorId = `d_${nextDoorId++}`;
            doors[doorId] = {
                id: doorId,
                room1: current.room,
                room2: next.room,
                open: true // completely open path
            };

            rooms[current.room].sides[next.dir] = { type: 'door', doorId };
            rooms[next.room].sides[OPPOSITE[next.dir]] = { type: 'door', doorId };

            visited.add(next.room);
            stack.push({ x: next.nx, y: next.ny, room: next.room });
        } else {
            // Backtrack
            stack.pop();
        }
    }

    // 3. Set Target Room (furthest bottom-right area)
    const targetRoomId = grid[height - 1][width - 1];
    rooms[targetRoomId].isTarget = true;

    // 4. Distribute Items using BFS reachability
    const totalRooms = width * height;

    // BFS helper: find all rooms reachable from `startId` using only open doors
    function getReachableRooms(fromId, doorsState) {
        const reachable = new Set();
        const queue = [fromId];
        reachable.add(fromId);
        while (queue.length > 0) {
            const curr = queue.shift();
            for (const dir of ['NORTH', 'SOUTH', 'EAST', 'WEST']) {
                const side = rooms[curr].sides[dir];
                if (side.type === 'door') {
                    const door = doorsState[side.doorId];
                    if (door.open) {
                        const neighbor = door.room1 === curr ? door.room2 : door.room1;
                        if (!reachable.has(neighbor)) {
                            reachable.add(neighbor);
                            queue.push(neighbor);
                        }
                    }
                }
            }
        }
        return reachable;
    }

    // Count coins in a set of rooms
    function countCoinsInRooms(roomIds) {
        let total = 0;
        for (const rid of roomIds) {
            total += rooms[rid].items.filter(i => i.type === 'coin').length;
        }
        return total;
    }

    // Sum of key costs in a set of rooms (coins that will be spent)
    function countKeyCostsInRooms(roomIds) {
        let total = 0;
        for (const rid of roomIds) {
            for (const item of rooms[rid].items) {
                if (item.type === 'key') total += item.cost;
            }
        }
        return total;
    }

    // Lock some random doors, assign key costs, and guarantee enough coins
    const numLockedDoors = Math.max(1, Math.floor(totalRooms / 15));
    const candidateDoorIds = Object.keys(doors).filter(did => {
        const d = doors[did];
        return d.room1 !== 1 && d.room2 !== 1;
    });

    // Shuffle candidates
    for (let i = candidateDoorIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidateDoorIds[i], candidateDoorIds[j]] = [candidateDoorIds[j], candidateDoorIds[i]];
    }

    let lockedCount = 0;
    for (const doorId of candidateDoorIds) {
        if (lockedCount >= numLockedDoors) break;

        // Tentatively lock this door
        doors[doorId].open = false;

        // Check what rooms are reachable from start with this door locked
        const reachable = getReachableRooms(1, doors);
        const reachableArray = [...reachable].filter(r => r !== targetRoomId);

        if (reachableArray.length < 2) {
            doors[doorId].open = true;
            continue;
        }

        // Verify the target is still eventually reachable if we unlock this door
        doors[doorId].open = true;
        const fullReachable = getReachableRooms(1, doors);
        doors[doorId].open = false;

        if (!fullReachable.has(targetRoomId)) {
            doors[doorId].open = true;
            continue;
        }

        // Assign a cost to this key (1 or 2 coins)
        const keyCost = Math.random() < 0.5 ? 1 : 2;

        // Place the key in a random reachable room
        const keyRoomId = reachableArray[Math.floor(Math.random() * reachableArray.length)];

        rooms[keyRoomId].items.push({
            type: 'key',
            name: `Clau ${lockedCount + 1}`,
            doorIds: [doorId],
            cost: keyCost
        });

        // Now ensure there are enough coins in reachable rooms to buy ALL keys so far
        // Available coins = coins in reachable area - cost of keys in reachable area
        const coinsInReachable = countCoinsInRooms(reachable);
        const keyCostsInReachable = countKeyCostsInRooms(reachable);
        const surplus = coinsInReachable - keyCostsInReachable;

        if (surplus < 0) {
            // Need to add |surplus| coins to reachable rooms
            const coinsNeeded = Math.abs(surplus);
            // Pick random reachable rooms (not target, not room 1 ideally) to place coins
            const coinCandidates = reachableArray.filter(r => r !== 1);
            if (coinCandidates.length === 0) coinCandidates.push(1); // fallback to start room

            for (let c = 0; c < coinsNeeded; c++) {
                const coinRoomId = coinCandidates[Math.floor(Math.random() * coinCandidates.length)];
                rooms[coinRoomId].items.push({ type: 'coin' });
            }
        }

        lockedCount++;
    }

    // Sprinkle some bonus coins in random rooms for extra fun (~15% of rooms)
    for (let i = 2; i <= totalRooms; i++) {
        if (i !== targetRoomId && Math.random() < 0.15) {
            rooms[i].items.push({ type: 'coin' });
        }
    }

    return {
        rooms,
        doors,
        startRoom: 1
    };
}
