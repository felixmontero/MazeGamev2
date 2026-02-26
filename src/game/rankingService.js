import { db } from './firebaseConfig.js';
import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Get the top 5 scores for a given map.
 * @param {string} mapKey - e.g. "map_1", "random_7x7"
 * @returns {Promise<Array<{name: string, time: number}>>}
 */
export async function getRanking(mapKey) {
    try {
        const scoresRef = collection(db, 'rankings', mapKey, 'scores');
        const q = query(scoresRef, orderBy('time', 'asc'), limit(5));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (err) {
        console.error('Error fetching ranking:', err);
        return [];
    }
}

/**
 * Add a score to the ranking for a given map.
 * @param {string} mapKey
 * @param {string} name - player name
 * @param {number} timeMs - elapsed time in milliseconds
 */
export async function addScore(mapKey, name, timeMs) {
    try {
        const scoresRef = collection(db, 'rankings', mapKey, 'scores');
        await addDoc(scoresRef, {
            name: name.trim(),
            time: timeMs,
            createdAt: serverTimestamp()
        });
    } catch (err) {
        console.error('Error adding score:', err);
    }
}

/**
 * Generate a map key string from a config object.
 * @param {{ mode: string, id?: number, size?: number }} config
 * @returns {string}
 */
export function getMapKey(config) {
    if (config.mode === 'random') {
        return `random_${config.size}x${config.size}`;
    }
    return `map_${config.id}`;
}
