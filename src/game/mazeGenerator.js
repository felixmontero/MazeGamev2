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
                    EAST:  { type: 'wall' },
                    WEST:  { type: 'wall' },
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
        { dir: 'EAST',  dx: 1, dy: 0 },
        { dir: 'WEST',  dx: -1, dy: 0 }
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

    // 4. Distribute Items (Coins and Locked Doors with Keys)
    let totalRooms = width * height;
    
    // Place some coins randomly (~20% of rooms)
    for (let i = 2; i <= totalRooms; i++) { // Skip starting room
        if (i !== targetRoomId && Math.random() < 0.2) {
            rooms[i].items.push({ type: 'coin' });
        }
    }

    // Place locked doors (close some random doors that are on the main paths)
    // We will place a key in a random room before the locked door.
    // For simplicity, we just randomly pick a few rooms to put a key, and lock one of their specific doors.
    const numLockedDoors = Math.max(1, Math.floor(totalRooms / 15));
    let lockedCount = 0;
    
    // All door IDs that are generated
    const allDoorIds = Object.keys(doors);
    
    while (lockedCount < numLockedDoors && allDoorIds.length > 0) {
        // Pick a random door to lock
        const doorIdx = Math.floor(Math.random() * allDoorIds.length);
        const doorToLockId = allDoorIds[doorIdx];
        const doorToLock = doors[doorToLockId];
        
        // Don't lock doors connected to the start room
        if (doorToLock.room1 !== 1 && doorToLock.room2 !== 1 && doorToLock.open) {
            doorToLock.open = false; // Lock it!
            
            // Place the key randomly in any room smaller than the smaller room connected to door 
            // (heuristic to ensure key is found before the door usually)
            let maxRoomForKey = Math.min(doorToLock.room1, doorToLock.room2);
            let keyRoomId = maxRoomForKey > 2 ? Math.floor(Math.random() * (maxRoomForKey - 1)) + 1 : 1;
            
            // Ensure key is not in target room
            if (keyRoomId === targetRoomId) keyRoomId = 1;

            rooms[keyRoomId].items.push({
                type: 'key',
                name: `Clau ${lockedCount + 1}`,
                doorIds: [doorToLockId],
                cost: 0 // In random maze, keys are found free
            });
            lockedCount++;
        }
        allDoorIds.splice(doorIdx, 1);
    }

    // Ensure the player starts with 0 coins
    return {
        rooms,
        doors,
        startRoom: 1
    };
}
