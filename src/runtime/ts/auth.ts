// Auth service for GitHub OAuth
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type User = {
  id: number;
  githubId: string;
  username: string;
  avatarUrl?: string;
};

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/user`, {
      credentials: 'include'
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.error('Failed to get current user:', err);
    return null;
  }
}

export function initiateLogin() {
  window.location.href = `${API_BASE}/auth/github`;
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      credentials: 'include'
    });
    return true;
  } catch (err) {
    console.error('Logout failed:', err);
    return false;
  }
}
