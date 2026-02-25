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

    // Place some coins randomly (~25% of rooms, skip start and target)
    for (let i = 2; i <= totalRooms; i++) {
        if (i !== targetRoomId && Math.random() < 0.25) {
            rooms[i].items.push({ type: 'coin' });
        }
    }

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

    // Lock some random doors and place keys in reachable areas
    const numLockedDoors = Math.max(1, Math.floor(totalRooms / 15));
    const candidateDoorIds = Object.keys(doors).filter(did => {
        const d = doors[did];
        return d.room1 !== 1 && d.room2 !== 1; // don't lock doors touching start
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

        // We need to place the key in a reachable room (not target, not start ideally)
        const reachableArray = [...reachable].filter(r => r !== targetRoomId);

        if (reachableArray.length < 2) {
            // Locking this door isolates too much — revert and skip
            doors[doorId].open = true;
            continue;
        }

        // Also verify the target is still eventually reachable if we unlock this door
        doors[doorId].open = true;
        const fullReachable = getReachableRooms(1, doors);
        doors[doorId].open = false;

        if (!fullReachable.has(targetRoomId)) {
            // Target not reachable even without this lock — revert
            doors[doorId].open = true;
            continue;
        }

        // Place the key in a random reachable room
        const keyRoomId = reachableArray[Math.floor(Math.random() * reachableArray.length)];

        rooms[keyRoomId].items.push({
            type: 'key',
            name: `Clau ${lockedCount + 1}`,
            doorIds: [doorId],
            cost: 0
        });
        lockedCount++;
    }

    return {
        rooms,
        doors,
        startRoom: 1
    };
}
