const request = require('supertest');
const express = require('express');
const playlistsRouter = require('../routes/playlists');
const { setupTestDb, teardownTestDb, clearTestDb, seedTestData } = require('./testsetup');

const app = express();
app.use(express.json());
app.use('/playlists', playlistsRouter);

describe('Playlists API - GET Endpoints', () => {
  let testData;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    testData = await seedTestData();
  });

  describe('GET /playlists', () => {
    test('should return all playlists with default pagination', async () => {
      const response = await request(app)
        .get('/playlists')
        .expect(200);

      expect(response.body).toHaveProperty('playlists');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.playlists).toHaveLength(2);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalItems).toBe(2);
    });

    test('should filter playlists by creator name', async () => {
      const response = await request(app)
        .get('/playlists?creator=Test Creator 1')
        .expect(200);

      expect(response.body.playlists).toHaveLength(1);
      expect(response.body.playlists[0].creator_name).toBe('Test Creator 1');
    });

    test('should filter playlists by tag', async () => {
      const response = await request(app)
        .get('/playlists?tag=rock')
        .expect(200);

      expect(response.body.playlists).toHaveLength(1);
      expect(response.body.playlists[0].tags).toContain('rock');
    });

    test('should filter playlists by public status', async () => {
      const response = await request(app)
        .get('/playlists?is_public=true')
        .expect(200);

      expect(response.body.playlists).toHaveLength(1);
      expect(response.body.playlists[0].is_public).toBe(true);
    });

    test('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/playlists?limit=150')
        .expect(400);

      expect(response.body.error).toBe('Invalid limit');
    });
  });

  describe('GET /playlists/:id', () => {
    test('should return playlist by valid ID', async () => {
      // Get playlist ID from database
      const db = require('../db/conn').getDb();
      const playlists = await db.collection('playlists').find().toArray();
      const playlistId = playlists[0]._id.toString();

      const response = await request(app)
        .get(`/playlists/${playlistId}`)
        .expect(200);

      expect(response.body._id).toBe(playlistId);
      expect(response.body.name).toBe('Test Playlist 1');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/playlists/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid playlist ID format');
    });

    test('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/playlists/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.error).toBe('Playlist not found');
    });

    test('should return playlist with all expected fields', async () => {
      const db = require('../db/conn').getDb();
      const playlists = await db.collection('playlists').find().toArray();
      const playlistId = playlists[0]._id.toString();

      const response = await request(app)
        .get(`/playlists/${playlistId}`)
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('creator_name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('songs');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('is_public');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('GET /playlists/:id/songs', () => {
    test('should return songs in playlist with valid ID', async () => {
      const db = require('../db/conn').getDb();
      const playlists = await db.collection('playlists').find().toArray();
      const playlistId = playlists[0]._id.toString();

      const response = await request(app)
        .get(`/playlists/${playlistId}/songs`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('artist_id');
      expect(response.body[0]).toHaveProperty('album_id');
    });

    test('should return 400 for invalid playlist ID format', async () => {
      const response = await request(app)
        .get('/playlists/invalid-id/songs')
        .expect(400);

      expect(response.body.error).toBe('Invalid playlist ID format');
    });

    test('should return 404 for non-existent playlist ID', async () => {
      const response = await request(app)
        .get('/playlists/507f1f77bcf86cd799439011/songs')
        .expect(404);

      expect(response.body.error).toBe('Playlist not found');
    });

    test('should return empty array for playlist with no songs', async () => {
      // Create a playlist with no songs for this test
      const db = require('../db/conn').getDb();
      const emptyPlaylist = {
        name: "Empty Playlist",
        creator_name: "Test Creator",
        description: "Empty test playlist",
        songs: [],
        tags: ["empty"],
        is_public: true,
        cover_image_url: "",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('playlists').insertOne(emptyPlaylist);
      const playlistId = result.insertedId.toString();

      const response = await request(app)
        .get(`/playlists/${playlistId}/songs`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('should maintain song order as defined in playlist', async () => {
      const db = require('../db/conn').getDb();
      const playlists = await db.collection('playlists').find().toArray();
      const playlist = playlists[0];
      const playlistId = playlist._id.toString();

      const response = await request(app)
        .get(`/playlists/${playlistId}/songs`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Verify that songs are returned in the same order as in playlist.songs array
      for (let i = 0; i < response.body.length; i++) {
        expect(response.body[i]._id).toBe(playlist.songs[i]);
      }
    });
  });
});