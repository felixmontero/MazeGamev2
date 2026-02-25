import { useRef, useEffect, useState, useCallback } from 'react';
import { getRoomInfo, move, pickupCoin, pickupKey, openDoor } from '../game/gameEngine.js';

// Image cache
const imageCache = {};
function loadImage(src) {
    if (imageCache[src]) return Promise.resolve(imageCache[src]);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            imageCache[src] = img;
            resolve(img);
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

const CANVAS_W = 800;
const CANVAS_H = 600;

// ─── Sprite sheet config ──────────────────────────────
// Pokemon trainer sprite sheet (414x187):
// The sheet has walking frames arranged in rows with specific pixel offsets.
// Row 0 (y~0):   walk DOWN   — frames at roughly x: 0, 30, 60, 90
// Row 1 (y~33):  walk UP     — frames at roughly x: 0, 30, 60, 90
// Row 2 (y~66):  walk LEFT   — frames at roughly x: 0, 30, 60, 90
// Row 3 (y~99):  walk RIGHT  (mirrored or separate)
const SPRITE = {
    frameW: 30,
    frameH: 40,
    strideX: 32,
    scale: 3.5,
    framesPerRow: 4,
    rows: {
        SOUTH: { y: 1, x0: 73 },
        WEST: { y: 49, x0: 73 },
        EAST: { y: 97, x0: 73 },
        NORTH: { y: 145, x0: 73 },
    },
    idleFrame: 0,
};

// Character center position on canvas
const CHAR_CX = 445;
const CHAR_CY = 293;

// Walk animation targets (edge of screen for transition effect)
const WALK_TARGETS = {
    NORTH: { x: CHAR_CX, y: 0 },
    SOUTH: { x: CHAR_CX, y: CANVAS_H },
    WEST: { x: 150, y: CHAR_CY },
    EAST: { x: CANVAS_W - 50, y: CHAR_CY },
};

const WALK_ENTRY = {
    NORTH: { x: CHAR_CX, y: CANVAS_H - 50 },
    SOUTH: { x: CHAR_CX, y: 0 },
    WEST: { x: CANVAS_W - 50, y: CHAR_CY },
    EAST: { x: 150, y: CHAR_CY },
};

export default function GameCanvas({ gameState, onStateChange, onWin }) {
    const canvasRef = useRef(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const animRef = useRef(null);           // animation frame ID
    const isAnimatingRef = useRef(false);    // lock to prevent input during animation
    const facingRef = useRef('SOUTH');       // current facing direction
    const pendingStateRef = useRef(null);    // state to apply after animation

    const showMessage = useCallback((msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 2500);
    }, []);

    const roomInfo = getRoomInfo(gameState);

    // ─── Draw the static room scene ────────────────────
    async function drawRoom(ctx, rInfo, charX, charY, facing, spriteFrame) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Floor
        ctx.fillStyle = '#16213e';
        ctx.fillRect(220, 70, 480, 500);

        // ─── Draw walls ────────────────────────
        ctx.fillStyle = '#e94560';
        ctx.fillRect(200, 50, 200, 20);
        ctx.fillRect(500, 50, 200, 20);
        ctx.fillRect(200, 550, 200, 20);
        ctx.fillRect(500, 550, 200, 20);
        ctx.fillRect(200, 50, 20, 200);
        ctx.fillRect(200, 350, 20, 200);
        ctx.fillRect(680, 50, 20, 200);
        ctx.fillRect(680, 350, 20, 200);

        // ─── Draw sides ────
        drawSide(ctx, 'NORTH', rInfo.walls.NORTH);
        drawSide(ctx, 'SOUTH', rInfo.walls.SOUTH);
        drawSide(ctx, 'EAST', rInfo.walls.EAST);
        drawSide(ctx, 'WEST', rInfo.walls.WEST);

        // ─── Draw player stats ────────────────
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Outfit, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`🚪 Sala: ${rInfo.roomNumber}`, 15, 35);
        ctx.fillText(`🔑 Claus: ${rInfo.playerKeys}`, 15, 60);
        ctx.fillText(`🪙 Monedes: ${rInfo.playerCoins}`, 15, 85);

        // ─── Draw character (Pokemon sprite) ────────────
        const spriteImg = await loadImage('/img/spritePokemon.png');
        if (spriteImg) {
            const rowData = SPRITE.rows[facing] ?? SPRITE.rows.SOUTH;
            const frame = spriteFrame % SPRITE.framesPerRow;
            const sx = rowData.x0 + frame * (SPRITE.strideX || SPRITE.frameW);
            const sy = rowData.y;
            const drawW = SPRITE.frameW * SPRITE.scale;
            const drawH = SPRITE.frameH * SPRITE.scale;

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                spriteImg,
                sx, sy, SPRITE.frameW, SPRITE.frameH,
                charX - drawW / 2, charY - drawH / 2, drawW, drawH
            );
            ctx.imageSmoothingEnabled = true;
        }

        // ─── Draw items ────────────────────────
        if (rInfo.hasKey) {
            const keyImg = await loadImage('/img/key.webp');
            if (keyImg) {
                ctx.drawImage(keyImg, 240, 390, 140, 130);
                const keyItem = rInfo.keyItem;
                if (keyItem) {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 16px Outfit, Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`💰 ${keyItem.cost} monedes`, 310, 535);
                }
            }
        }

        if (rInfo.hasCoin) {
            const coinImg = await loadImage('/img/coin.png');
            if (coinImg) {
                ctx.drawImage(coinImg, 530, 410, 130, 120);
            }
        }

        // ─── Draw navigation arrows ────────────
        drawArrows(ctx, rInfo);
    }

    // ─── Initial draw on state change ──────────────────
    useEffect(() => {
        if (isAnimatingRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawRoom(ctx, roomInfo, CHAR_CX, CHAR_CY, facingRef.current, SPRITE.idleFrame);
    }, [gameState, roomInfo]);

    // ─── Walk animation ────────────────────────────────
    function playWalkAnimation(direction, newState, newRoomInfo, callback) {
        isAnimatingRef.current = true;
        facingRef.current = direction;

        const canvas = canvasRef.current;
        if (!canvas) { isAnimatingRef.current = false; return; }
        const ctx = canvas.getContext('2d');

        const target = WALK_TARGETS[direction];
        const entry = WALK_ENTRY[direction];

        // Phase 1: Walk out of current room
        const PHASE1_DURATION = 400; // ms
        const PHASE2_DURATION = 400; // ms
        const FRAME_SPEED = 100; // ms per frame

        let startTime = null;
        let frame = 0;
        let lastFrameTime = 0;

        function animateOut(timestamp) {
            if (!startTime) { startTime = timestamp; lastFrameTime = timestamp; }
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / PHASE1_DURATION, 1);

            // Update animation frame
            if (timestamp - lastFrameTime > FRAME_SPEED) {
                frame = (frame + 1) % SPRITE.framesPerRow;
                lastFrameTime = timestamp;
            }

            // Ease-in movement
            const ease = t * t;
            const cx = CHAR_CX + (target.x - CHAR_CX) * ease;
            const cy = CHAR_CY + (target.y - CHAR_CY) * ease;

            drawRoom(ctx, roomInfo, cx, cy, direction, frame);

            if (t < 1) {
                animRef.current = requestAnimationFrame(animateOut);
            } else {
                // Phase 2: Walk into new room
                startTime = null;
                animRef.current = requestAnimationFrame(animateIn);
            }
        }

        function animateIn(timestamp) {
            if (!startTime) { startTime = timestamp; lastFrameTime = timestamp; }
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / PHASE2_DURATION, 1);

            if (timestamp - lastFrameTime > FRAME_SPEED) {
                frame = (frame + 1) % SPRITE.framesPerRow;
                lastFrameTime = timestamp;
            }

            // Ease-out movement
            const ease = 1 - (1 - t) * (1 - t);
            const cx = entry.x + (CHAR_CX - entry.x) * ease;
            const cy = entry.y + (CHAR_CY - entry.y) * ease;

            drawRoom(ctx, newRoomInfo, cx, cy, direction, frame);

            if (t < 1) {
                animRef.current = requestAnimationFrame(animateIn);
            } else {
                // Animation done
                isAnimatingRef.current = false;
                callback();
            }
        }

        animRef.current = requestAnimationFrame(animateOut);
    }

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, []);

    function drawSide(ctx, side, wallInfo) {
        if (wallInfo.type === 'wall') {
            ctx.fillStyle = '#e94560';
            drawWallSegment(ctx, side);
        } else if (!wallInfo.open) {
            ctx.fillStyle = '#ffd700';
            drawWallSegment(ctx, side);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 18px Outfit';
            ctx.textAlign = 'center';
            if (side === 'NORTH') ctx.fillText('🔒', 450, 68);
            if (side === 'SOUTH') ctx.fillText('🔒', 450, 568);
            if (side === 'WEST') ctx.fillText('🔒', 213, 305);
            if (side === 'EAST') ctx.fillText('🔒', 693, 305);
        }
    }

    function drawWallSegment(ctx, side) {
        switch (side) {
            case 'NORTH': ctx.fillRect(400, 50, 100, 20); break;
            case 'SOUTH': ctx.fillRect(400, 550, 100, 20); break;
            case 'WEST': ctx.fillRect(200, 250, 20, 100); break;
            case 'EAST': ctx.fillRect(680, 250, 20, 100); break;
        }
    }

    function drawArrows(ctx, rInfo) {
        const cx = 100;
        const cy = 480;
        const r = 22;
        const dirs = [
            { label: '▲', x: cx, y: cy - 40, dir: 'NORTH' },
            { label: '▼', x: cx, y: cy + 40, dir: 'SOUTH' },
            { label: '◄', x: cx - 40, y: cy, dir: 'WEST' },
            { label: '►', x: cx + 40, y: cy, dir: 'EAST' },
        ];

        dirs.forEach(({ label, x, y, dir }) => {
            const w = rInfo.walls[dir];
            const canMove = w.type === 'door' && w.open;

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = canMove ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
            ctx.strokeStyle = canMove ? '#4CAF50' : 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = canMove ? '#fff' : 'rgba(255,255,255,0.4)';
            ctx.font = 'bold 20px Outfit';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
        });
        ctx.textBaseline = 'alphabetic';
    }

    // ─── Click handler ────────────────────────
    function handleCanvasClick(e) {
        if (isAnimatingRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const cx = 100, cy = 480, r = 25;

        if (dist(x, y, cx, cy - 40) < r) return tryMove('NORTH');
        if (dist(x, y, cx, cy + 40) < r) return tryMove('SOUTH');
        if (dist(x, y, cx - 40, cy) < r) return tryMove('WEST');
        if (dist(x, y, cx + 40, cy) < r) return tryMove('EAST');

        if (x >= 398 && x <= 505 && y >= 48 && y <= 75) return tryOpen('NORTH');
        if (x >= 398 && x <= 505 && y >= 548 && y <= 575) return tryOpen('SOUTH');
        if (x >= 198 && x <= 222 && y >= 248 && y <= 352) return tryOpen('WEST');
        if (x >= 678 && x <= 702 && y >= 248 && y <= 352) return tryOpen('EAST');

        if (x >= 230 && x <= 390 && y >= 380 && y <= 540 && roomInfo.hasKey) return tryPickupKey();
        if (x >= 520 && x <= 670 && y >= 400 && y <= 540 && roomInfo.hasCoin) return tryPickupCoin();
    }

    function dist(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }

    function tryMove(dir) {
        if (isAnimatingRef.current) return;
        facingRef.current = dir;

        const result = move(gameState, dir);
        if (result.success) {
            const newRoomInfo = getRoomInfo(result.state);
            playWalkAnimation(dir, result.state, newRoomInfo, () => {
                onStateChange(result.state);
                showMessage(result.message, 'success');
                if (result.state.won) onWin(result.state);
            });
        } else {
            showMessage(result.message, 'error');
            // Quick "bump" animation against the wall
            bumpAnimation(dir);
        }
    }

    function bumpAnimation(dir) {
        isAnimatingRef.current = true;
        const canvas = canvasRef.current;
        if (!canvas) { isAnimatingRef.current = false; return; }
        const ctx = canvas.getContext('2d');

        const BUMP_DIST = 15;
        const BUMP_DURATION = 200;
        const offsets = {
            NORTH: { dx: 0, dy: -BUMP_DIST },
            SOUTH: { dx: 0, dy: BUMP_DIST },
            WEST: { dx: -BUMP_DIST, dy: 0 },
            EAST: { dx: BUMP_DIST, dy: 0 },
        };
        const { dx, dy } = offsets[dir];
        let startTime = null;

        function anim(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / BUMP_DURATION, 1);

            // Go out and back: sine curve
            const ease = Math.sin(t * Math.PI);
            const cx = CHAR_CX + dx * ease;
            const cy = CHAR_CY + dy * ease;

            drawRoom(ctx, roomInfo, cx, cy, dir, 1);

            if (t < 1) {
                animRef.current = requestAnimationFrame(anim);
            } else {
                isAnimatingRef.current = false;
                drawRoom(ctx, roomInfo, CHAR_CX, CHAR_CY, dir, SPRITE.idleFrame);
            }
        }
        animRef.current = requestAnimationFrame(anim);
    }

    function tryOpen(dir) {
        if (isAnimatingRef.current) return;
        const w = roomInfo.walls[dir];
        if (w.type !== 'door' || w.open) return;
        const result = openDoor(gameState, dir);
        if (result.success) {
            onStateChange(result.state);
            showMessage(result.message, 'success');
        } else {
            showMessage(result.message, 'error');
        }
    }

    function tryPickupCoin() {
        if (isAnimatingRef.current) return;
        const result = pickupCoin(gameState);
        if (result.success) {
            onStateChange(result.state);
            showMessage(result.message, 'success');
        } else {
            showMessage(result.message, 'error');
        }
    }

    function tryPickupKey() {
        if (isAnimatingRef.current) return;
        const result = pickupKey(gameState);
        if (result.success) {
            onStateChange(result.state);
            showMessage(result.message, 'success');
        } else {
            showMessage(result.message, 'error');
        }
    }

    // ─── Keyboard handler ────────────────────
    useEffect(() => {
        function handleKey(e) {
            if (isAnimatingRef.current) return;
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    tryMove('NORTH');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    tryMove('SOUTH');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    tryMove('WEST');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    tryMove('EAST');
                    break;
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    return (
        <div className="game-screen">
            <h1 className="game-header">MAZE GAME</h1>
            <div className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    onClick={handleCanvasClick}
                    style={{ cursor: 'pointer' }}
                />
                {message && (
                    <div className={`game-message game-message--${messageType}`}>
                        {message}
                    </div>
                )}
            </div>
            <div className="game-controls-hint">
                <span>🖱️ Clica les fletxes o items</span>
                <span>⌨️ WASD / fletxes del teclat</span>
                <span>🔒 Clica una porta tancada per obrir-la</span>
            </div>
        </div>
    );
}
