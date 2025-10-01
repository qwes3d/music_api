import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Import our app routes and middleware
import authRouter from '../routes/auth.js';
import artistsRouter from '../routes/artists.js';
import albumsRouter from '../routes/albums.js';
import songsRouter from '../routes/songs.js';
import playlistsRouter from '../routes/playlists.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

let mongoServer;
let client;
let db;
let app;
let server;

jest.mock('../db/conn.js', () => {
  let _db = null;
  return {
    getDb: () => _db,
    initDb: (callback) => callback(null, _db),
    __setDb: (newDb) => { _db = newDb; }
  };
});

import dbModule from '../db/conn.js';

const createTestApp = () => {
  const testApp = express();
  testApp.use(cors());
  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: true }));

  // Mock database connection
  testApp.locals.db = db;

  // Routes
  testApp.use('/auth', authRouter);
  testApp.use('/artists', artistsRouter);
  testApp.use('/albums', albumsRouter);
  testApp.use('/songs', songsRouter);
  testApp.use('/playlists', playlistsRouter);

  return testApp;
};

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
  jest.setTimeout(120000); // Increase Jest timeout to 2 minutes

  // Use real MongoDB instance for testing (more reliable on Windows)
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/testdb';

  // Connect to the test database
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db('testdb');

  // Clear all collections before starting tests
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }

  // Set the db instance in the mocked module
  dbModule.__setDb(db);

  // Create test app
  app = createTestApp();

  // Start server
  server = app.listen(3001);
});

afterAll(async () => {
  if (server) {
    server.close();
  }
  if (client) {
    await client.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
});

describe('Auth API', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
    });

    it('should return error for missing email or password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.collection('users').insertOne({
        email: 'test@example.com',
        password: hashedPassword,
        createdAt: new Date()
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.token).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});

describe('Artists API', () => {
  let authToken;

  beforeEach(async () => {
    // Create a test user and get token
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await db.collection('users').insertOne({
      email: 'test@example.com',
      password: hashedPassword,
      createdAt: new Date()
    });
    authToken = generateToken({ _id: user.insertedId, email: 'test@example.com' });
  });

  describe('GET /artists', () => {
    it('should return empty array when no artists exist', async () => {
      const response = await request(app)
        .get('/artists')
        .expect(200);

      expect(response.body.artists).toEqual([]);
      expect(response.body.pagination.totalItems).toBe(0);
    });

    it('should return all artists with pagination', async () => {
      // Create test artists
      await db.collection('artists').insertMany([
        {
          name: 'Artist 1',
          genre: 'Rock',
          country: 'USA',
          formed_year: 2000,
          members: ['Member 1'],
          biography: 'Bio 1',
          website: 'http://artist1.com',
          social_media: { twitter: '@artist1' },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Artist 2',
          genre: 'Pop',
          country: 'UK',
          formed_year: 2010,
          members: ['Member 2'],
          biography: 'Bio 2',
          website: 'http://artist2.com',
          social_media: { twitter: '@artist2' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const response = await request(app)
        .get('/artists')
        .expect(200);

      expect(response.body.artists).toHaveLength(2);
      expect(response.body.pagination.totalItems).toBe(2);
    });
  });

  describe('POST /artists', () => {
    it('should create a new artist', async () => {
      const artistData = {
        name: 'Test Artist',
        genre: 'Rock',
        country: 'USA',
        formed_year: 2000,
        members: ['John Doe'],
        biography: 'A great artist',
        website: 'http://testartist.com',
        social_media: { twitter: '@testartist' }
      };

      const response = await request(app)
        .post('/artists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(artistData)
        .expect(201);

      expect(response.body.message).toBe('Artist created successfully');
      expect(response.body.artist.name).toBe('Test Artist');
    });

    it('should return validation error for invalid data', async () => {
      const invalidArtistData = {
        name: '', // Invalid: empty name
        genre: 'Rock'
      };

      const response = await request(app)
        .post('/artists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidArtistData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Artist name is required and must be a non-empty string');
    });
  });

  describe('GET /artists/:id', () => {
    it('should return a specific artist', async () => {
      const artist = await db.collection('artists').insertOne({
        name: 'Test Artist',
        genre: 'Rock',
        country: 'USA',
        formed_year: 2000,
        members: ['John Doe'],
        biography: 'A great artist',
        website: 'http://testartist.com',
        social_media: { twitter: '@testartist' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .get(`/artists/${artist.insertedId}`)
        .expect(200);

      expect(response.body.name).toBe('Test Artist');
    });

    it('should return 404 for non-existent artist', async () => {
      const response = await request(app)
        .get('/artists/507f1f77bcf86cd799439011') // Valid ObjectId that doesn't exist
        .expect(404);

      expect(response.body.error).toBe('Artist not found');
    });
  });

  describe('PUT /artists/:id', () => {
    it('should update an artist', async () => {
      const artist = await db.collection('artists').insertOne({
        name: 'Test Artist',
        genre: 'Rock',
        country: 'USA',
        formed_year: 2000,
        members: ['John Doe'],
        biography: 'A great artist',
        website: 'http://testartist.com',
        social_media: { twitter: '@testartist' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const updateData = {
        name: 'Updated Artist',
        genre: 'Pop'
      };

      const response = await request(app)
        .put(`/artists/${artist.insertedId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(204);
    });
  });

  describe('DELETE /artists/:id', () => {
    it('should delete an artist', async () => {
      const artist = await db.collection('artists').insertOne({
        name: 'Test Artist',
        genre: 'Rock',
        country: 'USA',
        formed_year: 2000,
        members: ['John Doe'],
        biography: 'A great artist',
        website: 'http://testartist.com',
        social_media: { twitter: '@testartist' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .delete(`/artists/${artist.insertedId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Artist deleted successfully');
    });
  });
});

describe('Albums API', () => {
  let authToken;
  let artistId;

  beforeEach(async () => {
    // Create a test user and get token
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await db.collection('users').insertOne({
      email: 'test@example.com',
      password: hashedPassword,
      createdAt: new Date()
    });
    authToken = generateToken({ _id: user.insertedId, email: 'test@example.com' });

    // Create a test artist
    const artist = await db.collection('artists').insertOne({
      name: 'Test Artist',
      genre: 'Rock',
      country: 'USA',
      formed_year: 2000,
      members: ['John Doe'],
      biography: 'A great artist',
      website: 'http://testartist.com',
      social_media: { twitter: '@testartist' },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    artistId = artist.insertedId.toString();
  });

  describe('POST /albums', () => {
    it('should create a new album', async () => {
      const albumData = {
        title: 'Test Album',
        artist_id: artistId,
        release_date: '2023-01-01',
        genre: 'Rock',
        track_count: 10,
        duration: 2400,
        record_label: 'Test Label',
        cover_image_url: 'http://example.com/cover.jpg'
      };

      const response = await request(app)
        .post('/albums')
        .set('Authorization', `Bearer ${authToken}`)
        .send(albumData)
        .expect(201);

      expect(response.body.message).toBe('Album created successfully');
      expect(response.body.album.title).toBe('Test Album');
    });

    it('should return error for non-existent artist', async () => {
      const albumData = {
        title: 'Test Album',
        artist_id: '507f1f77bcf86cd799439011', // Non-existent artist ID
        release_date: '2023-01-01',
        genre: 'Rock',
        track_count: 10,
        duration: 2400,
        record_label: 'Test Label'
      };

      const response = await request(app)
        .post('/albums')
        .set('Authorization', `Bearer ${authToken}`)
        .send(albumData)
        .expect(400);

      expect(response.body.error).toBe('Artist not found');
    });
  });

  describe('GET /albums', () => {
    it('should return albums with filtering', async () => {
      // Create test album
      await db.collection('albums').insertOne({
        title: 'Test Album',
        artist_id: artistId,
        release_date: '2023-01-01',
        genre: 'Rock',
        track_count: 10,
        duration: 2400,
        record_label: 'Test Label',
        cover_image_url: 'http://example.com/cover.jpg',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .get('/albums?genre=Rock')
        .expect(200);

      expect(response.body.albums).toHaveLength(1);
      expect(response.body.albums[0].genre).toBe('Rock');
    });
  });
});

describe('Songs API', () => {
  let authToken;
  let artistId;
  let albumId;

  beforeEach(async () => {
    // Create a test user and get token
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await db.collection('users').insertOne({
      email: 'test@example.com',
      password: hashedPassword,
      createdAt: new Date()
    });
    authToken = generateToken({ _id: user.insertedId, email: 'test@example.com' });

    // Create a test artist
    const artist = await db.collection('artists').insertOne({
      name: 'Test Artist',
      genre: 'Rock',
      country: 'USA',
      formed_year: 2000,
      members: ['John Doe'],
      biography: 'A great artist',
      website: 'http://testartist.com',
      social_media: { twitter: '@testartist' },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    artistId = artist.insertedId.toString();

    // Create a test album
    const album = await db.collection('albums').insertOne({
      title: 'Test Album',
      artist_id: artistId,
      release_date: '2023-01-01',
      genre: 'Rock',
      track_count: 10,
      duration: 2400,
      record_label: 'Test Label',
      cover_image_url: 'http://example.com/cover.jpg',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    albumId = album.insertedId.toString();
  });

  describe('POST /songs', () => {
    it('should create a new song', async () => {
      const songData = {
        title: 'Test Song',
        album_id: albumId,
        artist_id: artistId,
        duration: 240,
        track_number: 1,
        genre: 'Rock',
        lyrics: 'Test lyrics',
        audio_url: 'http://example.com/song.mp3'
      };

      const response = await request(app)
        .post('/songs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(songData)
        .expect(201);

      expect(response.body.message).toBe('Song created successfully');
      expect(response.body.song.title).toBe('Test Song');
    });

    it('should return error for duplicate song title in same album', async () => {
      const songData = {
        title: 'Test Song',
        album_id: albumId,
        artist_id: artistId,
        duration: 240,
        track_number: 1,
        genre: 'Rock'
      };

      // Create first song
      await request(app)
        .post('/songs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(songData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/songs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(songData)
        .expect(409);

      expect(response.body.error).toBe('Song already exists');
    });
  });

  describe('GET /songs', () => {
    it('should return songs with pagination and filtering', async () => {
      // Create test songs
      await db.collection('songs').insertMany([
        {
          title: 'Song 1',
          album_id: albumId,
          artist_id: artistId,
          duration: 240,
          track_number: 1,
          genre: 'Rock',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          title: 'Song 2',
          album_id: albumId,
          artist_id: artistId,
          duration: 180,
          track_number: 2,
          genre: 'Pop',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const response = await request(app)
        .get('/songs?genre=Rock&page=1&limit=10')
        .expect(200);

      expect(response.body.songs).toHaveLength(1);
      expect(response.body.songs[0].genre).toBe('Rock');
      expect(response.body.pagination).toBeDefined();
    });
  });
});

describe('Playlists API', () => {
  let authToken;
  let artistId;
  let albumId;
  let songId;

  beforeEach(async () => {
    // Create a test user and get token
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await db.collection('users').insertOne({
      email: 'test@example.com',
      password: hashedPassword,
      createdAt: new Date()
    });
    authToken = generateToken({ _id: user.insertedId, email: 'test@example.com' });

    // Create a test artist
    const artist = await db.collection('artists').insertOne({
      name: 'Test Artist',
      genre: 'Rock',
      country: 'USA',
      formed_year: 2000,
      members: ['John Doe'],
      biography: 'A great artist',
      website: 'http://testartist.com',
      social_media: { twitter: '@testartist' },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    artistId = artist.insertedId.toString();

    // Create a test album
    const album = await db.collection('albums').insertOne({
      title: 'Test Album',
      artist_id: artistId,
      release_date: '2023-01-01',
      genre: 'Rock',
      track_count: 10,
      duration: 2400,
      record_label: 'Test Label',
      cover_image_url: 'http://example.com/cover.jpg',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    albumId = album.insertedId.toString();

    // Create a test song
    const song = await db.collection('songs').insertOne({
      title: 'Test Song',
      album_id: albumId,
      artist_id: artistId,
      duration: 240,
      track_number: 1,
      genre: 'Rock',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    songId = song.insertedId.toString();
  });

  describe('POST /playlists', () => {
    it('should create a new playlist', async () => {
      const playlistData = {
        name: 'Test Playlist',
        creator_name: 'Test User',
        description: 'A test playlist',
        songs: [songId],
        tags: ['rock', 'test'],
        is_public: true,
        cover_image_url: 'http://example.com/playlist.jpg'
      };

      const response = await request(app)
        .post('/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playlistData)
        .expect(201);

      expect(response.body.message).toBe('Playlist created successfully');
      expect(response.body.playlist.name).toBe('Test Playlist');
    });

    it('should return error for duplicate playlist name by same creator', async () => {
      const playlistData = {
        name: 'Test Playlist',
        creator_name: 'Test User',
        description: 'A test playlist',
        songs: [songId],
        tags: ['rock', 'test'],
        is_public: true
      };

      // Create first playlist
      await request(app)
        .post('/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playlistData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playlistData)
        .expect(409);

      expect(response.body.error).toBe('Playlist already exists');
    });
  });

  describe('PUT /playlists/:id/songs/:songId', () => {
    it('should add song to playlist', async () => {
      // Create a playlist
      const playlist = await db.collection('playlists').insertOne({
        name: 'Test Playlist',
        creator_name: 'Test User',
        description: 'A test playlist',
        songs: [],
        tags: ['rock'],
        is_public: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .put(`/playlists/${playlist.insertedId}/songs/${songId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Song added to playlist successfully');
    });
  });

  describe('DELETE /playlists/:id/songs/:songId', () => {
    it('should remove song from playlist', async () => {
      // Create a playlist with a song
      const playlist = await db.collection('playlists').insertOne({
        name: 'Test Playlist',
        creator_name: 'Test User',
        description: 'A test playlist',
        songs: [songId],
        tags: ['rock'],
        is_public: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .delete(`/playlists/${playlist.insertedId}/songs/${songId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Song removed from playlist successfully');
    });
  });
});
