import { useState } from 'react';
import StartScreen from './components/StartScreen.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import WinScreen from './components/WinScreen.jsx';
import { createMaze } from './game/mazeData.js';
import { createGameState } from './game/gameEngine.js';
import { generateRandomMaze } from './game/mazeGenerator.js';
import { getMapKey } from './game/rankingService.js';

export default function App() {
    // screen: 'start' | 'playing' | 'won'
    const [screen, setScreen] = useState('start');
    const [gameState, setGameState] = useState(null);
    const [mapKey, setMapKey] = useState('');
    const [mapLabel, setMapLabel] = useState('');

    function handleStart(config) {
        let maze;
        if (config.mode === 'random') {
            maze = generateRandomMaze(config.size, config.size);
            setMapLabel(`Aleatori ${config.size}x${config.size}`);
        } else {
            maze = createMaze(config.id);
            setMapLabel(`Mapa ${config.id}`);
        }

        setMapKey(getMapKey(config));
        const state = createGameState(maze);
        setGameState(state);
        setScreen('playing');
    }

    function handleStateChange(newState) {
        setGameState(newState);
    }

    function handleWin(finalState) {
        setGameState(finalState);
        setTimeout(() => setScreen('won'), 600);
    }

    function handleRestart() {
        setGameState(null);
        setScreen('start');
    }

    return (
        <div className="app">
            <div className="bg-particles" />
            {screen === 'start' && <StartScreen onStart={handleStart} />}
            {screen === 'playing' && gameState && (
                <GameCanvas
                    gameState={gameState}
                    onStateChange={handleStateChange}
                    onWin={handleWin}
                />
            )}
            {screen === 'won' && gameState && (
                <WinScreen
                    elapsedTime={gameState.endTime - gameState.startTime}
                    mapKey={mapKey}
                    mapLabel={mapLabel}
                    onRestart={handleRestart}
                />
            )}
        </div>
    );
}
