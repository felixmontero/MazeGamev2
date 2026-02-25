import { useState } from 'react';
import { MAZES } from '../game/mazeData.js';

export default function StartScreen({ onStart }) {
    const [selectedMap, setSelectedMap] = useState(1);

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
                    <label htmlFor="map-select">Elegeix un Mapa</label>
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
                </div>

                <button className="btn-play" onClick={() => onStart(selectedMap)}>
                    <span className="btn-play-text">⚔️ Jugar</span>
                </button>
            </div>
        </div>
    );
}
