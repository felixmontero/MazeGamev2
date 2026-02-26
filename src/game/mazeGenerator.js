import { OPPOSITE } from './mazeData.js';

export function generateRandomMaze(width, height) {
    // ═══════════════════════════════════════════════════════════
    // 1. Initialize empty grid and rooms
    // ═══════════════════════════════════════════════════════════
    const grid = Array.from({ length: height }, () => Array(width).fill(null));
    const rooms = {};
    const doors = {};
    let nextDoorId = 1;

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

    // ═══════════════════════════════════════════════════════════
    // 2. Recursive Backtracking — carve a perfect maze
    // ═══════════════════════════════════════════════════════════
    const visited = new Set();
    const stack = [];
    // Build adjacency list for the maze tree
    const adj = {}; // roomId -> [{ neighbor, doorId }]
    const totalRooms = width * height;
    for (let i = 1; i <= totalRooms; i++) adj[i] = [];

    const startRoom = grid[0][0];
    visited.add(startRoom);
    stack.push({ x: 0, y: 0, room: startRoom });

    const directions = [
        { dir: 'NORTH', dx: 0, dy: -1 },
        { dir: 'SOUTH', dx: 0, dy: 1 },
        { dir: 'EAST', dx: 1, dy: 0 },
        { dir: 'WEST', dx: -1, dy: 0 }
    ];

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
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
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            const doorId = `d_${nextDoorId++}`;
            doors[doorId] = {
                id: doorId,
                room1: current.room,
                room2: next.room,
                open: true
            };
            rooms[current.room].sides[next.dir] = { type: 'door', doorId };
            rooms[next.room].sides[OPPOSITE[next.dir]] = { type: 'door', doorId };

            adj[current.room].push({ neighbor: next.room, doorId });
            adj[next.room].push({ neighbor: current.room, doorId });

            visited.add(next.room);
            stack.push({ x: next.nx, y: next.ny, room: next.room });
        } else {
            stack.pop();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Pick target as the FARTHEST LEAF NODE from room 1
    //    (leaf = dead end = exactly 1 connection in the maze tree)
    // ═══════════════════════════════════════════════════════════
    // BFS from room 1 to get distances
    const distFromStart = {};
    {
        const queue = [1];
        distFromStart[1] = 0;
        while (queue.length > 0) {
            const curr = queue.shift();
            for (const { neighbor } of adj[curr]) {
                if (distFromStart[neighbor] === undefined) {
                    distFromStart[neighbor] = distFromStart[curr] + 1;
                    queue.push(neighbor);
                }
            }
        }
    }

    // Find all leaf nodes (rooms with exactly 1 connection)
    const leafNodes = [];
    for (let i = 1; i <= totalRooms; i++) {
        if (adj[i].length === 1 && i !== 1) {
            leafNodes.push(i);
        }
    }

    // Pick the farthest leaf from room 1 as the target
    let targetRoomId = leafNodes[0] || totalRooms;
    let maxDist = 0;
    for (const leaf of leafNodes) {
        if (distFromStart[leaf] > maxDist) {
            maxDist = distFromStart[leaf];
            targetRoomId = leaf;
        }
    }
    rooms[targetRoomId].isTarget = true;

    // ═══════════════════════════════════════════════════════════
    // 4. Find the UNIQUE solution path from room 1 to target
    //    (in a perfect maze there's exactly one path)
    // ═══════════════════════════════════════════════════════════
    function findPath(from, to) {
        const parent = { [from]: null };
        const parentDoor = { [from]: null };
        const queue = [from];
        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr === to) break;
            for (const { neighbor, doorId } of adj[curr]) {
                if (parent[neighbor] === undefined) {
                    parent[neighbor] = curr;
                    parentDoor[neighbor] = doorId;
                    queue.push(neighbor);
                }
            }
        }
        // Reconstruct path as list of { room, doorId (to enter this room) }
        const path = [];
        let cur = to;
        while (cur !== null) {
            path.unshift({ room: cur, doorId: parentDoor[cur] });
            cur = parent[cur];
        }
        return path; // path[0] = { room: 1, doorId: null }, path[last] = { room: target, doorId: ... }
    }

    const solutionPath = findPath(1, targetRoomId);
    const solutionRoomSet = new Set(solutionPath.map(p => p.room));
    // Doors on the solution path (excluding the entry to room 1)
    const solutionDoorIds = solutionPath.filter(p => p.doorId).map(p => p.doorId);

    // ═══════════════════════════════════════════════════════════
    // 5. Strategic door locking ON the solution path
    //    - Lock doors that are on the path to the target
    //    - Place keys in side branches reachable before the locked door
    //    - This forces the player to explore side branches to progress
    // ═══════════════════════════════════════════════════════════

    // BFS helper: reachable rooms through open doors only
    function getReachableRooms(fromId) {
        const reachable = new Set();
        const queue = [fromId];
        reachable.add(fromId);
        while (queue.length > 0) {
            const curr = queue.shift();
            for (const dir of ['NORTH', 'SOUTH', 'EAST', 'WEST']) {
                const side = rooms[curr].sides[dir];
                if (side.type === 'door') {
                    const door = doors[side.doorId];
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

    // Count coins available in a set of rooms
    function countCoinsInRooms(roomIds) {
        let total = 0;
        for (const rid of roomIds) {
            total += rooms[rid].items.filter(i => i.type === 'coin').length;
        }
        return total;
    }

    // Sum of key costs in a set of rooms
    function countKeyCostsInRooms(roomIds) {
        let total = 0;
        for (const rid of roomIds) {
            for (const item of rooms[rid].items) {
                if (item.type === 'key') total += item.cost;
            }
        }
        return total;
    }

    // Decide how many doors to lock on the solution path
    // Lock ~1 door per 8 rooms on the path, minimum 1, max based on path length
    const maxLocks = Math.max(1, Math.floor(solutionDoorIds.length / 4));
    const numLocks = Math.min(maxLocks, Math.max(1, Math.floor(totalRooms / 15)));

    // Pick evenly-spaced doors along the solution path to lock
    // This spreads the difficulty across the entire journey
    const lockIndices = [];
    if (solutionDoorIds.length >= 3) {
        // Skip first door (too close to start) and last door (right at target)
        const usable = solutionDoorIds.slice(1, -1);
        // Shuffle usable doors and pick numLocks
        for (let i = usable.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [usable[i], usable[j]] = [usable[j], usable[i]];
        }
        for (let i = 0; i < Math.min(numLocks, usable.length); i++) {
            lockIndices.push(usable[i]);
        }
    } else if (solutionDoorIds.length >= 1) {
        // Very short path — lock the only available door if possible
        lockIndices.push(solutionDoorIds[0]);
    }

    // Lock each selected door and place key + coins
    let lockedCount = 0;
    for (const doorId of lockIndices) {
        // Lock this door
        doors[doorId].open = false;

        // Find rooms reachable from start WITH this door locked
        const reachable = getReachableRooms(1);
        const reachableArray = [...reachable].filter(r => r !== targetRoomId);

        if (reachableArray.length < 2) {
            // Safety: don't isolate the player too much
            doors[doorId].open = true;
            continue;
        }

        // Find side-branch rooms (reachable but NOT on the solution path)
        // These are ideal for placing keys — forces exploration
        const sideBranchRooms = reachableArray.filter(r => !solutionRoomSet.has(r));
        const keyPlacementPool = sideBranchRooms.length > 0 ? sideBranchRooms : reachableArray;

        // Assign key cost (1 or 2 coins)
        const keyCost = Math.random() < 0.5 ? 1 : 2;

        // Place the key in a side branch room
        const keyRoomId = keyPlacementPool[Math.floor(Math.random() * keyPlacementPool.length)];

        lockedCount++;
        rooms[keyRoomId].items.push({
            type: 'key',
            name: `Clau ${lockedCount}`,
            doorIds: [doorId],
            cost: keyCost
        });

        // Ensure enough coins in reachable area to afford all keys placed so far
        const coinsAvailable = countCoinsInRooms(reachable);
        const costTotal = countKeyCostsInRooms(reachable);
        const deficit = costTotal - coinsAvailable;

        if (deficit > 0) {
            // Place missing coins in reachable rooms (prefer side branches)
            const coinPool = sideBranchRooms.length > 0 ? sideBranchRooms : reachableArray;
            for (let c = 0; c < deficit; c++) {
                const coinRoomId = coinPool[Math.floor(Math.random() * coinPool.length)];
                rooms[coinRoomId].items.push({ type: 'coin' });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 6. Sprinkle bonus coins in random rooms for extra fun (~15%)
    // ═══════════════════════════════════════════════════════════
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
