export default function WinScreen({ elapsedTime, onRestart }) {
    const seconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return (
        <div className="win-screen">
            <div className="win-card">
                <div className="win-card-glow" />
                <div className="win-trophy">🏆</div>
                <h1 className="win-title">Has guanyat!</h1>
                <p className="win-subtitle">Has aconseguit escapar del laberint!</p>

                <div className="win-stats">
                    <div className="win-stat">
                        <span className="win-stat-icon">⏱️</span>
                        <span className="win-stat-value">{minutes}:{secs.toString().padStart(2, '0')}</span>
                        <span className="win-stat-label">Temps</span>
                    </div>
                </div>

                <button className="btn-play" onClick={onRestart}>
                    <span className="btn-play-text">🔄 Tornar a jugar</span>
                </button>
            </div>
        </div>
    );
}
