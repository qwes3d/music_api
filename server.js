const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const session = require('express-session');
const { passport, mockAuth } = require('./middleware/auth');
require('dotenv').config();

const db = require('./db/conn');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo-session-key-replace-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport for OAuth
app.use(passport.initialize());
app.use(passport.session());

// Mock authentication for demo purposes (respects demo mode toggle)
app.use(mockAuth);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Authentication routes
app.use('/auth', require('./routes/auth'));

// Routes
app.use('/artists', require('./routes/artists'));
app.use('/albums', require('./routes/albums'));
app.use('/songs', require('./routes/songs'));
app.use('/playlists', require('./routes/playlists'));

// Seed endpoint for populating database with sample data
app.post('/seed', async (req, res) => {
  try {
    const database = db.getDb();
    
    // Sample artists
    const sampleArtists = [
      {
        name: "The Beatles",
        genre: "Rock",
        country: "United Kingdom",
        formed_year: 1960,
        members: ["John Lennon", "Paul McCartney", "George Harrison", "Ringo Starr"],
        biography: "The Beatles were an English rock band formed in Liverpool in 1960.",
        website: "https://www.thebeatles.com",
        social_media: {
          twitter: "@thebeatles",
          instagram: "@thebeatles"
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Queen",
        genre: "Rock",
        country: "United Kingdom",
        formed_year: 1970,
        members: ["Freddie Mercury", "Brian May", "Roger Taylor", "John Deacon"],
        biography: "Queen are a British rock band formed in London in 1970.",
        website: "https://www.queenonline.com",
        social_media: {
          twitter: "@queenwillrock",
          instagram: "@officialqueenmusic"
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Taylor Swift",
        genre: "Pop",
        country: "United States",
        formed_year: 2006,
        members: ["Taylor Swift"],
        biography: "American singer-songwriter known for narrative songs about her personal life.",
        website: "https://www.taylorswift.com",
        social_media: {
          twitter: "@taylorswift13",
          instagram: "@taylorswift"
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Clear existing data and insert sample data
    await database.collection('artists').deleteMany({});
    await database.collection('albums').deleteMany({});
    await database.collection('songs').deleteMany({});
    await database.collection('playlists').deleteMany({});
    
    const artistResult = await database.collection('artists').insertMany(sampleArtists);
    const artistIds = Object.values(artistResult.insertedIds);
    
    // Sample albums
    const sampleAlbums = [
      {
        title: "Abbey Road",
        artist_id: artistIds[0].toString(),
        release_date: "1969-09-26",
        genre: "Rock",
        track_count: 17,
        duration: 47,
        record_label: "Apple Records",
        cover_image_url: "https://example.com/abbey-road.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Bohemian Rhapsody",
        artist_id: artistIds[1].toString(),
        release_date: "1975-10-31",
        genre: "Rock",
        track_count: 12,
        duration: 43,
        record_label: "EMI",
        cover_image_url: "https://example.com/bohemian-rhapsody.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "1989",
        artist_id: artistIds[2].toString(),
        release_date: "2014-10-27",
        genre: "Pop",
        track_count: 13,
        duration: 49,
        record_label: "Big Machine Records",
        cover_image_url: "https://example.com/1989.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Folklore",
        artist_id: artistIds[2].toString(),
        release_date: "2020-07-24",
        genre: "Indie Folk",
        track_count: 16,
        duration: 63,
        record_label: "Republic Records",
        cover_image_url: "https://example.com/folklore.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Sample songs
    const sampleSongs = [
      {
        title: "Come Together",
        album_id: albumIds[0].toString(),
        artist_id: artistIds[0].toString(),
        duration: 259,
        track_number: 1,
        genre: "Rock",
        lyrics: "Here come old flat top, he come grooving up slowly...",
        audio_url: "https://example.com/come-together.mp3",
        featured_artists: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Something",
        album_id: albumIds[0].toString(),
        artist_id: artistIds[0].toString(),
        duration: 183,
        track_number: 2,
        genre: "Rock",
        lyrics: "Something in the way she moves...",
        audio_url: "https://example.com/something.mp3",
        featured_artists: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Bohemian Rhapsody",
        album_id: albumIds[1].toString(),
        artist_id: artistIds[1].toString(),
        duration: 355,
        track_number: 1,
        genre: "Rock",
        lyrics: "Is this the real life? Is this just fantasy?...",
        audio_url: "https://example.com/bohemian-rhapsody.mp3",
        featured_artists: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Shake It Off",
        album_id: albumIds[2].toString(),
        artist_id: artistIds[2].toString(),
        duration: 219,
        track_number: 1,
        genre: "Pop",
        lyrics: "I stay out too late, got nothing in my brain...",
        audio_url: "https://example.com/shake-it-off.mp3",
        featured_artists: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Cardigan",
        album_id: albumIds[3].toString(),
        artist_id: artistIds[2].toString(),
        duration: 239,
        track_number: 1,
        genre: "Indie Folk",
        lyrics: "Vintage tee, brand new phone...",
        audio_url: "https://example.com/cardigan.mp3",
        featured_artists: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const songResult = await database.collection('songs').insertMany(sampleSongs);
    const songIds = Object.values(songResult.insertedIds);
    
    // Sample playlists
    const samplePlaylists = [
      {
        name: "Classic Rock Hits",
        creator_name: "John Doe",
        description: "The best classic rock songs of all time",
        songs: [songIds[0].toString(), songIds[1].toString(), songIds[2].toString()],
        tags: ["rock", "classic", "oldies"],
        is_public: true,
        cover_image_url: "https://example.com/classic-rock-playlist.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Taylor Swift Favorites",
        creator_name: "Jane Smith",
        description: "My favorite Taylor Swift songs",
        songs: [songIds[3].toString(), songIds[4].toString()],
        tags: ["pop", "taylor swift", "favorites"],
        is_public: true,
        cover_image_url: "https://example.com/taylor-swift-playlist.jpg",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Private Mix",
        creator_name: "Bob Johnson",
        description: "My personal music mix",
        songs: [songIds[0].toString(), songIds[3].toString()],
        tags: ["personal", "mix"],
        is_public: false,
        cover_image_url: "",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const playlistResult = await database.collection('playlists').insertMany(samplePlaylists);
    
    res.status(200).json({
      message: 'Database seeded successfully!',
      artistsInserted: artistResult.insertedCount,
      albumsInserted: albumResult.insertedCount,
      songsInserted: songResult.insertedCount,
      playlistsInserted: playlistResult.insertedCount
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({
      error: 'Failed to seed database',
      message: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Music API',
    description: 'A comprehensive REST API for managing artists, albums, songs, and playlists',
    documentation: '/api-docs',
    endpoints: {
      artists: '/artists',
      albums: '/albums',
      songs: '/songs',
      playlists: '/playlists'
    },
    version: '2.0.0'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: ['/artists', '/albums', '/songs', '/playlists', '/api-docs']
  });
});

// Initialize database and start server
db.initDb((err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  } else {
    app.listen(PORT, () => {
      console.log(`🎵 Music API is running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🎤 Artists endpoint: http://localhost:${PORT}/artists`);
      console.log(`💿 Albums endpoint: http://localhost:${PORT}/albums`);
      console.log(`🎶 Songs endpoint: http://localhost:${PORT}/songs`);
      console.log(`📝 Playlists endpoint: http://localhost:${PORT}/playlists`);
    });
  }
});