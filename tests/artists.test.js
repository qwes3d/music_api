const request = require('supertest');
const express = require('express');
const artistsRouter = require('../routes/artists');
const { setupTestDb, teardownTestDb, clearTestDb, seedTestData } = require('./testsetup');

const app = express();
app.use(express.json());
app.use('/artists', artistsRouter);

describe('Artists API - GET Endpoints', () => {
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

  describe('GET /artists', () => {
    test('should return all artists with default pagination', async () => {
      const response = await request(app)
        .get('/artists')
        .expect(200);

      expect(response.body).toHaveProperty('artists');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.artists).toHaveLength(2);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalItems).toBe(2);
    });

    test('should filter artists by genre', async () => {
      const response = await request(app)
        .get('/artists?genre=Rock')
        .expect(200);

      expect(response.body.artists).toHaveLength(1);
      expect(response.body.artists[0].genre).toBe('Rock');
    });

    test('should filter artists by country', async () => {
      const response = await request(app)
        .get('/artists?country=UK')
        .expect(200);

      expect(response.body.artists).toHaveLength(1);
      expect(response.body.artists[0].country).toBe('UK');
    });

    test('should paginate artists correctly', async () => {
      const response = await request(app)
        .get('/artists?page=1&limit=1')
        .expect(200);

      expect(response.body.artists).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalPages).toBe(2);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrev).toBe(false);
    });

    test('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/artists?limit=150')
        .expect(400);

      expect(response.body.error).toBe('Invalid limit');
    });
  });

  describe('GET /artists/:id', () => {
    test('should return artist by valid ID', async () => {
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/artists/${artistId}`)
        .expect(200);

      expect(response.body._id).toBe(artistId);
      expect(response.body.name).toBe('Test Artist 1');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/artists/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid artist ID format');
    });

    test('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/artists/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.error).toBe('Artist not found');
    });

    test('should return artist with all expected fields', async () => {
      const artistId = testData.artistIds[0];
      const response = await request(app)
        .get(`/artists/${artistId}`)
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('genre');
      expect(response.body).toHaveProperty('country');
      expect(response.body).toHaveProperty('formed_year');
      expect(response.body).toHaveProperty('members');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });
});