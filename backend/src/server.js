import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'befunge-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    try {
      const now = Date.now();
      // Check if user exists
      let user = db.prepare('SELECT * FROM users WHERE github_id = ?').get(profile.id);
      
      if (user) {
        // Update existing user
        db.prepare(`
          UPDATE users 
          SET github_username = ?, avatar_url = ?, updated_at = ?
          WHERE id = ?
        `).run(profile.username, profile.photos?.[0]?.value, now, user.id);
        user.updated_at = now;
      } else {
        // Create new user
        const result = db.prepare(`
          INSERT INTO users (github_id, github_username, avatar_url, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(profile.id, profile.username, profile.photos?.[0]?.value, now, now);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Auth routes
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: process.env.FRONTEND_URL }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    res.redirect(process.env.FRONTEND_URL);
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      githubId: req.user.github_id,
      username: req.user.github_username,
      avatarUrl: req.user.avatar_url
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Data API routes
app.get('/api/data/:dataType', requireAuth, (req, res) => {
  try {
    const { dataType } = req.params;
    const userId = req.user.id;
    
    const data = db.prepare(
      'SELECT data_json, updated_at FROM user_data WHERE user_id = ? AND data_type = ?'
    ).get(userId, dataType);
    
    if (data) {
      res.json({
        data: JSON.parse(data.data_json),
        updatedAt: data.updated_at
      });
    } else {
      res.status(404).json({ error: 'Data not found' });
    }
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/data/:dataType', requireAuth, (req, res) => {
  try {
    const { dataType } = req.params;
    const userId = req.user.id;
    const { data } = req.body;
    const now = Date.now();
    
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }
    
    const dataJson = JSON.stringify(data);
    
    // Upsert data
    db.prepare(`
      INSERT INTO user_data (user_id, data_type, data_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, data_type) 
      DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `).run(userId, dataType, dataJson, now);
    
    res.json({ success: true, updatedAt: now });
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
