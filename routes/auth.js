const express = require('express');
const router = express.Router();
const { toggleDemoMode, getDemoMode } = require('../middleware/auth');

// GET /auth/login - Show login information
router.get('/login', (req, res) => {
  res.json({
    message: 'OAuth authentication available',
    googleLogin: '/auth/google',
    demo: 'Demo mode available - use /auth/toggle-demo to control',
    demoMode: getDemoMode(),
    user: req.user || null
  });
});

// POST /auth/toggle-demo - Toggle demo mode on/off
router.post('/toggle-demo', (req, res) => {
  const { enable } = req.body || {};
  const newState = toggleDemoMode(enable);
  
  res.json({
    demoMode: newState,
    message: `Demo mode ${newState ? 'ENABLED' : 'DISABLED'}`,
    instruction: newState 
      ? 'Protected routes are now accessible without authentication' 
      : 'Protected routes now require real authentication (will show 401 errors)'
  });
});

// GET /auth/demo-mode - Get current demo mode status
router.get('/demo-mode', (req, res) => {
  const demoMode = getDemoMode();
  res.json({
    demoMode: demoMode,
    message: `Demo mode is currently ${demoMode ? 'ENABLED' : 'DISABLED'}`
  });
});

// GET /auth/google - Start Google OAuth flow
router.get('/google', (req, res) => {
  res.json({
    message: 'Google OAuth would redirect here',
    note: 'In demo mode - authentication is automatically applied'
  });
});

// GET /auth/google/callback - Google OAuth callback
router.get('/google/callback', (req, res) => {
  res.json({
    message: 'OAuth callback received',
    user: req.user || 'Demo User'
  });
});

// GET /auth/profile - Get user profile
router.get('/profile', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Please log in first'
    });
  }

  res.json({
    user: req.user,
    authenticated: true
  });
});

// GET /auth/logout - Logout user
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Logout failed',
        message: err.message
      });
    }
    res.json({
      message: 'Logged out successfully'
    });
  });
});

module.exports = router;