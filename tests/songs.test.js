const request = require('supertest');
const express = require('express');
const songsRouter = require('../routes/songs');
const { setupTestDb, teardownTestDb, clearTestDb, seedTestData } = require('./testsetup');

const app = express();
app.use(express.json());
app.use('/songs', songsRouter);

describe('Songs API - GET Endpoints', () => {
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

  describe('GET /songs', () => {
    test('should return all songs with default pagination', async () => {
      const response = await request(app)
        .get('/songs')
        .expect(200);

      expect(response.body).toHaveProperty('songs');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.songs).toHaveLength(2);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalItems).toBe(2);
    });

    test('should filter songs by genre', async () => {
      const response = await request(app)
        .get('/songs?genre=Rock')
        .expect(200);

      expect(response.body.songs).toHaveLength(2);
      response.body.songs.forEach(song => {
        expect(song.genre).toBe('Rock');
      });
    });

    test('should filter songs by artist_id', async () => {
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/songs?artist_id=${artistId}`)
        .expect(200);

      expect(response.body.songs).toHaveLength(2);
      response.body.songs.forEach(song => {
        expect(song.artist_id).toBe(artistId);
      });
    });

    test('should filter songs by album_id', async () => {
      const albumId = testData.albumIds[0];
      const response = await request(app)
        .get(`/songs?album_id=${albumId}`)
        .expect(200);

      expect(response.body.songs).toHaveLength(2);
      response.body.songs.forEach(song => {
        expect(song.album_id).toBe(albumId);
      });
    });

    test('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/songs?limit=150')
        .expect(400);

      expect(response.body.error).toBe('Invalid limit');
    });
  });

  describe('GET /songs/:id', () => {
    test('should return song by valid ID', async () => {
      const songId = testData.songIds[0];
      const response = await request(app)
        .get(`/songs/${songId}`)
        .expect(200);

      expect(response.body._id).toBe(songId);
      expect(response.body.title).toBe('Test Song 1');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/songs/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid song ID format');
    });

    test('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/songs/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.error).toBe('Song not found');
    });

    test('should return song with all expected fields', async () => {
      const songId = testData.songIds[0];
      const response = await request(app)
        .get(`/songs/${songId}`)
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('album_id');
      expect(response.body).toHaveProperty('artist_id');
      expect(response.body).toHaveProperty('duration');
      expect(response.body).toHaveProperty('genre');
      expect(response.body).toHaveProperty('track_number');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('GET /songs/album/:albumId', () => {
    test('should return songs for valid album ID', async () => {
      const albumId = testData.albumIds[0];
      const response = await request(app)
        .get(`/songs/album/${albumId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      response.body.forEach(song => {
        expect(song.album_id).toBe(albumId);
      });
    });

    test('should return 400 for invalid album ID format', async () => {
      const response = await request(app)
        .get('/songs/album/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid album ID format');
    });

    test('should return empty array for album with no songs', async () => {
      const response = await request(app)
        .get('/songs/album/507f1f77bcf86cd799439011')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('should return songs sorted by track number', async () => {
      const albumId = testData.albumIds[0];
      const response = await request(app)
        .get(`/songs/album/${albumId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].track_number).toBe(1);
      expect(response.body[1].track_number).toBe(2);
    });
  });

  describe('GET /songs/artist/:artistId', () => {
    test('should return songs for valid artist ID', async () => {
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/songs/artist/${artistId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      response.body.forEach(song => {
        expect(song.artist_id).toBe(artistId);
      });
    });

    test('should return 400 for invalid artist ID format', async () => {
      const response = await request(app)
        .get('/songs/artist/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid artist ID format');
    });

    test('should return empty array for artist with no songs', async () => {
      const response = await request(app)
        .get('/songs/artist/507f1f77bcf86cd799439011')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('should return all songs by artist across different albums', async () => {
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/songs/artist/${artistId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(song => {
        expect(song.artist_id).toBe(artistId);
      });
    });
  });
});