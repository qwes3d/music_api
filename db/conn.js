const { MongoClient } = require('mongodb');
require('dotenv').config();

let _db;

const initDb = (callback) => {
  if (_db) {
    console.log('Database is already initialized!');
    return callback(null, _db);
  }

  MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/musicdb')
    .then((client) => {
      _db = client.db();
      console.log('✅ Connected to MongoDB successfully!');
      callback(null, _db);
    })
    .catch((err) => {
      console.error('❌ Failed to connect to MongoDB:', err);
      callback(err);
    });
};

const getDb = () => {
  if (!_db) {
    throw new Error('Database not initialized. Call initDb first.');
  }
  return _db;
};

module.exports = {
  initDb,
  getDb
};