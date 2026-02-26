import { useState } from 'react';
import { addScore, getRanking } from '../game/rankingService.js';

function formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function WinScreen({ elapsedTime, mapKey, mapLabel, onRestart }) {
    const [playerName, setPlayerName] = useState('');
    const [ranking, setRanking] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!playerName.trim() || submitted) return;

        setLoading(true);
        await addScore(mapKey, playerName.trim(), elapsedTime);
        const scores = await getRanking(mapKey);
        setRanking(scores);
        setSubmitted(true);
        setLoading(false);
    }

    return (
        <div className="win-screen">
            <div className="win-card win-card--ranking">
                <div className="win-card-glow" />
                <div className="win-trophy">🏆</div>
                <h1 className="win-title">Has guanyat!</h1>
                <p className="win-subtitle">Has aconseguit escapar del laberint!</p>

                <div className="win-stats">
                    <div className="win-stat">
                        <span className="win-stat-icon">⏱️</span>
                        <span className="win-stat-value">{formatTime(elapsedTime)}</span>
                        <span className="win-stat-label">Temps</span>
                    </div>
                    <div className="win-stat">
                        <span className="win-stat-icon">🗺️</span>
                        <span className="win-stat-value" style={{ fontSize: '1.2rem' }}>{mapLabel}</span>
                        <span className="win-stat-label">Mapa</span>
                    </div>
                </div>

                {!submitted ? (
                    <form className="ranking-form" onSubmit={handleSubmit}>
                        <label htmlFor="player-name">El teu nom per al rànking:</label>
                        <div className="ranking-form-row">
                            <input
                                id="player-name"
                                type="text"
                                maxLength={20}
                                placeholder="Escriu el teu nom..."
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" disabled={!playerName.trim() || loading}>
                                {loading ? '...' : '📤 Enviar'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="ranking-table-wrapper">
                        <h3 className="ranking-table-title">🏆 Rànking — {mapLabel}</h3>
                        {ranking && ranking.length > 0 ? (
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
                                        <tr key={entry.id || i} className={
                                            entry.name === playerName.trim() && entry.time === elapsedTime
                                                ? 'ranking-highlight'
                                                : ''
                                        }>
                                            <td>{MEDALS[i] || i + 1}</td>
                                            <td>{entry.name}</td>
                                            <td>{formatTime(entry.time)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>Encara no hi ha puntuacions.</p>
                        )}
                    </div>
                )}

                <button className="btn-play" onClick={onRestart} style={{ marginTop: '1.5rem' }}>
                    <span className="btn-play-text">🔄 Tornar a jugar</span>
                </button>
            </div>
        </div>
    );
}
