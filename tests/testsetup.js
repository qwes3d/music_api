const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongoServer;
let mongoClient;
let db;

const setupTestDb = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('test-music-api');
  
  // Override the db connection for tests
  const dbConn = require('../db/conn');
  dbConn.getDb = () => db;
  
  return db;
};

const teardownTestDb = async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

const clearTestDb = async () => {
  if (db) {
    const collections = await db.collections();
    await Promise.all(collections.map(collection => collection.deleteMany({})));
  }
};

const seedTestData = async () => {
  // Sample test data
  const sampleArtists = [
    {
      name: "Test Artist 1",
      genre: "Rock",
      country: "USA",
      formed_year: 2000,
      members: ["Member 1", "Member 2"],
      biography: "Test bio 1",
      website: "https://test1.com",
      social_media: { twitter: "@test1" },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: "Test Artist 2",
      genre: "Pop",
      country: "UK",
      formed_year: 2010,
      members: ["Member 3"],
      biography: "Test bio 2",
      website: "https://test2.com",
      social_media: { twitter: "@test2" },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const artistResult = await db.collection('artists').insertMany(sampleArtists);
  const artistIds = Object.values(artistResult.insertedIds);

  const sampleAlbums = [
    {
      title: "Test Album 1",
      artist_id: artistIds[0].toString(),
      release_date: "2020-01-01",
      genre: "Rock",
      track_count: 10,
      duration: 45,
      record_label: "Test Label 1",
      cover_image_url: "https://test1.com/cover.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: "Test Album 2",
      artist_id: artistIds[1].toString(),
      release_date: "2021-01-01",
      genre: "Pop",
      track_count: 12,
      duration: 50,
      record_label: "Test Label 2",
      cover_image_url: "https://test2.com/cover.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const albumResult = await db.collection('albums').insertMany(sampleAlbums);
  const albumIds = Object.values(albumResult.insertedIds);

  const sampleSongs = [
    {
      title: "Test Song 1",
      album_id: albumIds[0].toString(),
      artist_id: artistIds[0].toString(),
      duration: 180,
      track_number: 1,
      genre: "Rock",
      lyrics: "Test lyrics 1",
      audio_url: "https://test1.com/song1.mp3",
      featured_artists: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: "Test Song 2",
      album_id: albumIds[0].toString(),
      artist_id: artistIds[0].toString(),
      duration: 200,
      track_number: 2,
      genre: "Rock",
      lyrics: "Test lyrics 2",
      audio_url: "https://test1.com/song2.mp3",
      featured_artists: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const songResult = await db.collection('songs').insertMany(sampleSongs);
  const songIds = Object.values(songResult.insertedIds);

  const samplePlaylists = [
    {
      name: "Test Playlist 1",
      creator_name: "Test Creator 1",
      description: "Test description 1",
      songs: [songIds[0].toString(), songIds[1].toString()],
      tags: ["test", "rock"],
      is_public: true,
      cover_image_url: "https://test1.com/playlist.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: "Test Playlist 2",
      creator_name: "Test Creator 2",
      description: "Test description 2",
      songs: [songIds[0].toString()],
      tags: ["test", "private"],
      is_public: false,
      cover_image_url: "",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.collection('playlists').insertMany(samplePlaylists);

  return {
    artistIds: artistIds.map(id => id.toString()),
    albumIds: albumIds.map(id => id.toString()),
    songIds: songIds.map(id => id.toString())
  };
};

module.exports = {
  setupTestDb,
  teardownTestDb,
  clearTestDb,
  seedTestData
};