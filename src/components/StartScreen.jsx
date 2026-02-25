import { useState } from 'react';
import { MAZES } from '../game/mazeData.js';

export default function StartScreen({ onStart }) {
    const [mode, setMode] = useState('predefined'); // 'predefined' | 'random'
    const [selectedMap, setSelectedMap] = useState(1);
    const [randomSize, setRandomSize] = useState(10); // user specifies N for NxN

    const handlePlay = () => {
        onStart({
            mode,
            id: selectedMap,
            size: randomSize,
        });
    };

    return (
        <div className="start-screen">
            <div className="start-card">
                <div className="start-card-glow" />
                <h1 className="game-title">
                    <span className="title-icon">🏰</span>
                    MAZE GAME
                </h1>
                <p className="start-subtitle">Explora el laberint, recull monedes, compra claus i troba la sortida!</p>

                <div className="map-selector">
                    <label>Tipus de Mapa</label>
                    <div className="mode-tabs">
                        <button
                            className={mode === 'predefined' ? 'active' : ''}
                            onClick={() => setMode('predefined')}
                        >
                            Mapes Creados
                        </button>
                        <button
                            className={mode === 'random' ? 'active' : ''}
                            onClick={() => setMode('random')}
                        >
                            Mapa Aleatori
                        </button>
                    </div>

                    {mode === 'predefined' ? (
                        <>
                            <label htmlFor="map-select" style={{ marginTop: '1rem' }}>Elegeix un Mapa</label>
                            <select
                                id="map-select"
                                value={selectedMap}
                                onChange={(e) => setSelectedMap(Number(e.target.value))}
                            >
                                {MAZES.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </>
                    ) : (
                        <>
                            <label htmlFor="size-slider" style={{ marginTop: '1rem' }}>
                                Mida del Laberint: {randomSize}x{randomSize}
                            </label>
                            <input
                                id="size-slider"
                                type="range"
                                min="5"
                                max="20"
                                value={randomSize}
                                onChange={(e) => setRandomSize(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </>
                    )}
                </div>

                <button className="btn-play" onClick={handlePlay} style={{ marginTop: '1.5rem' }}>
                    <span className="btn-play-text">⚔️ Jugar</span>
                </button>
            </div>
        </div>
    );
}
