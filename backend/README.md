# Befunge Backend Server

Backend API for GitHub OAuth authentication and user data synchronization.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a GitHub OAuth App:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Application name: `Befunge Interpreter` (or your choice)
   - Homepage URL: `http://localhost:5173` (for development)
   - Authorization callback URL: `http://localhost:3001/auth/github/callback`

3. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

4. Edit `.env` with your GitHub OAuth credentials

## Development

```bash
npm run dev
```

Server will run on http://localhost:3001

## API Endpoints

### Authentication
- `GET /auth/github` - Initiate GitHub OAuth login
- `GET /auth/github/callback` - OAuth callback
- `GET /auth/logout` - Logout user
- `GET /auth/user` - Get current user info

### Data Sync
- `GET /api/data/:dataType` - Get user data (history, app_state)
- `POST /api/data/:dataType` - Save user data

### Health
- `GET /health` - Health check
