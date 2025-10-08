import React from 'react';
import { UserProfile } from '../firebase/auth';

type Props = {
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  isFirebaseEnabled: boolean;
};

export default function LoginButton({ user, onLogin, onLogout, isFirebaseEnabled }: Props) {
  if (!isFirebaseEnabled) {
    return null; // Don't show login button if Firebase is not configured
  }

  if (user) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '4px 8px',
        background: '#1a1d23',
        borderRadius: '6px',
        fontSize: '12px'
      }}>
        {user.photoURL && (
          <img 
            src={user.photoURL} 
            alt={user.displayName || 'User'} 
            style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%' 
            }} 
          />
        )}
        <span style={{ color: '#9aa4af' }}>
          {user.displayName || user.email || 'ユーザー'}
        </span>
        <button 
          onClick={onLogout}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            background: '#2a2d35',
            border: '1px solid #3a3d45',
            borderRadius: '4px',
            color: '#9aa4af',
            cursor: 'pointer'
          }}
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={onLogin}
      style={{
        padding: '4px 12px',
        fontSize: '12px',
        background: '#24292e',
        border: '1px solid #3a3d45',
        borderRadius: '6px',
        color: '#ffffff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
      </svg>
      GitHubでログイン
    </button>
  );
}
