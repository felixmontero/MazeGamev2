import { useState, useEffect } from 'react';
import { MAZES } from '../game/mazeData.js';
import { getRanking, getMapKey } from '../game/rankingService.js';

function formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function StartScreen({ onStart }) {
    const [mode, setMode] = useState('predefined'); // 'predefined' | 'random'
    const [selectedMap, setSelectedMap] = useState(1);
    const [randomSize, setRandomSize] = useState(10);
    const [showRanking, setShowRanking] = useState(false);
    const [ranking, setRanking] = useState(null);
    const [rankingLoading, setRankingLoading] = useState(false);

    const currentMapKey = mode === 'random'
        ? getMapKey({ mode: 'random', size: randomSize })
        : getMapKey({ mode: 'predefined', id: selectedMap });

    const currentMapLabel = mode === 'random'
        ? `Aleatori ${randomSize}x${randomSize}`
        : MAZES.find(m => m.id === selectedMap)?.name || `Mapa ${selectedMap}`;

    const handlePlay = () => {
        onStart({ mode, id: selectedMap, size: randomSize });
    };

    async function handleShowRanking() {
        setShowRanking(true);
        setRankingLoading(true);
        const scores = await getRanking(currentMapKey);
        setRanking(scores);
        setRankingLoading(false);
    }

    // Reset ranking modal when map selection changes
    useEffect(() => {
        setShowRanking(false);
        setRanking(null);
    }, [mode, selectedMap, randomSize]);

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

                <div className="start-buttons">
                    <button className="btn-play" onClick={handlePlay}>
                        <span className="btn-play-text">⚔️ Jugar</span>
                    </button>
                    <button className="btn-ranking" onClick={handleShowRanking}>
                        🏆 Rànking
                    </button>
                </div>

                {showRanking && (
                    <div className="ranking-table-wrapper" style={{ marginTop: '1.5rem' }}>
                        <h3 className="ranking-table-title">🏆 Rànking — {currentMapLabel}</h3>
                        {rankingLoading ? (
                            <p style={{ color: 'var(--text-muted)' }}>Carregant...</p>
                        ) : ranking && ranking.length > 0 ? (
                            <table className="ranking-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Jugador</th>
                                        <th>Temps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranking.map((entry, i) => (
                                        <tr key={entry.id || i}>
                                            <td>{MEDALS[i] || i + 1}</td>
                                            <td>{entry.name}</td>
                                            <td>{formatTime(entry.time)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>Encara no hi ha puntuacions per {currentMapLabel}.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
