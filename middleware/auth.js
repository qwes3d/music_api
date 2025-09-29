const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'demo-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'demo-client-secret',
  callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  // In a real app, you'd save the user to your database
  return done(null, profile);
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Global demo mode state (can be toggled at runtime)
let isDemoMode = false; // Start with demo mode OFF to show real OAuth

// Function to toggle demo mode
const toggleDemoMode = (enable = null) => {
  if (enable !== null) {
    isDemoMode = enable;
  } else {
    isDemoMode = !isDemoMode;
  }
  console.log(`🔄 Demo mode ${isDemoMode ? 'ENABLED' : 'DISABLED'}`);
  return isDemoMode;
};

// Get current demo mode status
const getDemoMode = () => {
  return isDemoMode;
};

// Mock authentication middleware for demo purposes
const mockAuth = (req, res, next) => {
  // Only apply mock auth if demo mode is enabled
  if (isDemoMode && !req.user) {
    req.user = {
      id: 'demo-user-123',
      name: 'Demo User',
      email: 'demo@example.com'
    };
  }
  next();
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  // If demo mode is enabled, bypass real authentication
  if (isDemoMode) {
    if (!req.user) {
      req.user = {
        id: 'demo-user-123',
        name: 'Demo User',
        email: 'demo@example.com'
      };
    }
    return next();
  }
  
  // Real authentication check - will show 401 errors
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  next();
};

module.exports = {
  passport,
  mockAuth,
  requireAuth,
  toggleDemoMode,
  getDemoMode
};