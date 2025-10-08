// Storage service - abstracts local vs remote storage
import { HistoryStore } from './history';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function saveToRemote(dataType: 'history' | 'app_state', data: any): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/data/${dataType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ data })
    });
    return res.ok;
  } catch (err) {
    console.error(`Failed to save ${dataType} to remote:`, err);
    return false;
  }
}

export async function loadFromRemote(dataType: 'history' | 'app_state'): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/api/data/${dataType}`, {
      credentials: 'include'
    });
    if (res.ok) {
      const result = await res.json();
      return result.data;
    }
    return null;
  } catch (err) {
    console.error(`Failed to load ${dataType} from remote:`, err);
    return null;
  }
}

export async function syncHistoryToRemote(localStore: HistoryStore): Promise<void> {
  await saveToRemote('history', localStore);
}

export async function syncAppStateToRemote(state: any): Promise<void> {
  await saveToRemote('app_state', state);
}
