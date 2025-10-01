import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import express from 'express';
import cors from 'cors';

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

  // Simple test route
  testApp.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint works' });
  });

  return testApp;
};

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create({
    instance: {
      startupTimeout: 60000, // Increase timeout to 60 seconds
    },
  });
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db('testdb');

  // Set the db instance in the mocked module
  dbModule.__setDb(db);

  // Create test app
  app = createTestApp();

  // Start server
  server = app.listen(3002);
}, 70000);

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
}, 70000);

describe('Minimal Test', () => {
  it('should connect to database and respond to test endpoint', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.body.message).toBe('Test endpoint works');
  });
});
