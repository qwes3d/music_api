import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import db from '../db/conn.js';
import { requireAuth } from '../middleware/auth.js';

// Data validation helper functions
const validateAlbum = (album) => {
  const errors = [];
  
  if (!album.title || typeof album.title !== 'string' || album.title.trim().length === 0) {
    errors.push('Album title is required and must be a non-empty string');
  } else if (album.title.trim().length > 200) {
    errors.push('Album title must be less than 200 characters');
  }
  
  if (!album.artist_id || !ObjectId.isValid(album.artist_id)) {
    errors.push('Valid artist ID is required');
  }
  
  if (!album.release_date) {
    errors.push('Release date is required');
  } else {
    const date = new Date(album.release_date);
    if (isNaN(date.getTime())) {
      errors.push('Valid release date is required (YYYY-MM-DD format)');
    } else if (date > new Date()) {
      errors.push('Release date cannot be in the future');
    } else if (date < new Date('1900-01-01')) {
      errors.push('Release date cannot be before 1900');
    }
  }
  
  if (!album.genre || typeof album.genre !== 'string' || album.genre.trim().length === 0) {
    errors.push('Genre is required and must be a non-empty string');
  } else if (album.genre.trim().length > 50) {
    errors.push('Genre must be less than 50 characters');
  }
  
  if (!album.track_count || isNaN(album.track_count) || album.track_count < 1) {
    errors.push('Valid track count is required (minimum 1)');
  } else if (album.track_count > 200) {
    errors.push('Track count cannot exceed 200');
  }
  
  if (!album.duration || isNaN(album.duration) || album.duration < 1) {
    errors.push('Valid duration in minutes is required (minimum 1)');
  } else if (album.duration > 600) {
    errors.push('Duration cannot exceed 600 minutes (10 hours)');
  }
  
  // Optional field validations
  if (album.record_label && (typeof album.record_label !== 'string' || album.record_label.length > 100)) {
    errors.push('Record label must be a string with maximum 100 characters');
  }
  
  if (album.cover_image_url && (typeof album.cover_image_url !== 'string' || !isValidUrl(album.cover_image_url))) {
    errors.push('Cover image URL must be a valid URL');
  }
  
  return errors;
};

// URL validation helper
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// GET /albums - Get all albums with optional filtering and pagination
router.get('/', async (req, res) => {
  try {
    const database = db.getDb();
    let query = {};
    let options = {};
    
    // Optional filtering
    if (req.query.genre) {
      query.genre = new RegExp(req.query.genre, 'i');
    }
    
    if (req.query.artist_id && ObjectId.isValid(req.query.artist_id)) {
      query.artist_id = req.query.artist_id;
    }
    
    if (req.query.year) {
      const year = parseInt(req.query.year);
      if (!isNaN(year)) {
        query.release_date = {
          $gte: `${year}-01-01`,
          $lte: `${year}-12-31`
        };
      }
    }
    
    // Optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (limit > 100) {
      return res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit cannot exceed 100 items per page'
      });
    }
    
    const skip = (page - 1) * limit;
    options.skip = skip;
    options.limit = limit;
    
    // Optional sorting
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      
      if (['title', 'genre', 'release_date', 'track_count', 'duration', 'createdAt'].includes(sortField)) {
        options.sort = { [sortField]: sortOrder };
      }
    }
    
    const albums = await database.collection('albums').find(query, options).toArray();
    const totalCount = await database.collection('albums').countDocuments(query);
    
    res.status(200).json({
      albums: albums,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch albums',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /albums/:id - Get single album by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid album ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const album = await database.collection('albums').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!album) {
      return res.status(404).json({ 
        error: 'Album not found',
        message: 'No album exists with the provided ID'
      });
    }
    
    res.status(200).json(album);
  } catch (error) {
    console.error('Error fetching album:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch album'
    });
  }
});

// GET /albums/artist/:artistId - Get albums by artist
router.get('/artist/:artistId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.artistId)) {
      return res.status(400).json({ 
        error: 'Invalid artist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const albums = await database.collection('albums')
      .find({ artist_id: req.params.artistId })
      .toArray();
    
    res.status(200).json(albums);
  } catch (error) {
    console.error('Error fetching albums by artist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch albums for the specified artist'
    });
  }
});

// POST /albums - Create new album
router.post('/', requireAuth, async (req, res) => {
  try {
    // Sanitize and prepare data
    const albumData = {
      title: req.body.title?.toString().trim(),
      artist_id: req.body.artist_id?.toString().trim(),
      release_date: req.body.release_date?.toString().trim(),
      genre: req.body.genre?.toString().trim(),
      track_count: parseInt(req.body.track_count),
      duration: parseInt(req.body.duration),
      record_label: req.body.record_label?.toString().trim() || '',
      cover_image_url: req.body.cover_image_url?.toString().trim() || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate album data
    const validationErrors = validateAlbum(albumData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    // Check if artist exists
    const database = db.getDb();
    const artist = await database.collection('artists').findOne({
      _id: new ObjectId(albumData.artist_id)
    });
    
    if (!artist) {
      return res.status(400).json({
        error: 'Artist not found',
        message: 'The specified artist does not exist'
      });
    }

    // Check for duplicate album title for the same artist
    const existingAlbum = await database.collection('albums').findOne({
      title: new RegExp(`^${albumData.title}$`, 'i'),
      artist_id: albumData.artist_id
    });
    
    if (existingAlbum) {
      return res.status(409).json({
        error: 'Album already exists',
        message: 'This artist already has an album with this title'
      });
    }

    const result = await database.collection('albums').insertOne(albumData);
    
    // Return created album data
    const createdAlbum = await database.collection('albums').findOne({
      _id: result.insertedId
    });
    
    res.status(201).json({
      message: 'Album created successfully',
      album: createdAlbum
    });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create album',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /albums/:id - Update existing album
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid album ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const albumData = {
      title: req.body.title,
      artist_id: req.body.artist_id,
      release_date: req.body.release_date,
      genre: req.body.genre,
      track_count: parseInt(req.body.track_count),
      duration: parseInt(req.body.duration),
      record_label: req.body.record_label || '',
      cover_image_url: req.body.cover_image_url || '',
      updatedAt: new Date()
    };

    // Validate album data
    const validationErrors = validateAlbum(albumData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    // Check if artist exists
    const database = db.getDb();
    const artist = await database.collection('artists').findOne({
      _id: new ObjectId(albumData.artist_id)
    });
    
    if (!artist) {
      return res.status(400).json({
        error: 'Artist not found',
        message: 'The specified artist does not exist'
      });
    }

    const result = await database.collection('albums').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: albumData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Album not found',
        message: 'No album exists with the provided ID'
      });
    }
    
    res.status(204).send(); // No content response for successful update
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update album'
    });
  }
});

// DELETE /albums/:id - Delete album
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid album ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const result = await database.collection('albums').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Album not found',
        message: 'No album exists with the provided ID'
      });
    }
    
    res.status(200).json({
      message: 'Album deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete album'
    });
  }
});

export default router;
