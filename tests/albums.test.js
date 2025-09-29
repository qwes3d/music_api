const request = require('supertest');
const express = require('express');
const albumsRouter = require('../routes/albums');
const { setupTestDb, teardownTestDb, clearTestDb, seedTestData } = require('./testsetup');

const app = express();
app.use(express.json());
app.use('/albums', albumsRouter);

describe('Albums API - GET Endpoints', () => {
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

  describe('GET /albums', () => {
    test('should return all albums with default pagination', async () => {
      const response = await request(app)
        .get('/albums')
        .expect(200);

      expect(response.body).toHaveProperty('albums');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.albums).toHaveLength(2);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalItems).toBe(2);
    });

    test('should filter albums by genre', async () => {
      const response = await request(app)
        .get('/albums?genre=Rock')
        .expect(200);

      expect(response.body.albums).toHaveLength(1);
      expect(response.body.albums[0].genre).toBe('Rock');
    });

    test('should filter albums by artist_id', async () => {
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/albums?artist_id=${artistId}`)
        .expect(200);

      expect(response.body.albums).toHaveLength(1);
      expect(response.body.albums[0].artist_id).toBe(artistId);
    });

    test('should filter albums by release year', async () => {
      const response = await request(app)
        .get('/albums?year=2020')
        .expect(200);

      expect(response.body.albums).toHaveLength(1);
      expect(response.body.albums[0].release_date).toContain('2020');
    });

    test('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/albums?limit=150')
        .expect(400);

      expect(response.body.error).toBe('Invalid limit');
    });
  });

  describe('GET /albums/:id', () => {
    test('should return album by valid ID', async () => {
      const albumId = testData.albumIds[0];
      const response = await request(app)
        .get(`/albums/${albumId}`)
        .expect(200);

      expect(response.body._id).toBe(albumId);
      expect(response.body.title).toBe('Test Album 1');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/albums/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid album ID format');
    });

    test('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/albums/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.error).toBe('Album not found');
    });

    test('should return album with all expected fields', async () => {
      const albumId = testData.albumIds[0];
      const response = await request(app)
        .get(`/albums/${albumId}`)
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('artist_id');
      expect(response.body).toHaveProperty('release_date');
      expect(response.body).toHaveProperty('genre');
      expect(response.body).toHaveProperty('track_count');
      expect(response.body).toHaveProperty('duration');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('GET /albums/artist/:artistId', () => {
    test('should return albums for valid artist ID', async () => {
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/albums/artist/${artistId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].artist_id).toBe(artistId);
    });

    test('should return 400 for invalid artist ID format', async () => {
      const response = await request(app)
        .get('/albums/artist/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid artist ID format');
    });

    test('should return empty array for artist with no albums', async () => {
      const response = await request(app)
        .get('/albums/artist/507f1f77bcf86cd799439011')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('should return multiple albums for artist with multiple albums', async () => {
      // This test would pass if we had more test data for the same artist
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/albums/artist/${artistId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(album => {
        expect(album.artist_id).toBe(artistId);
      });
    });
  });
});