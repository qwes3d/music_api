import express from 'express';
const router = express.Router();
import { ObjectId } from 'mongodb';
import db from '../db/conn.js';
import { requireAuth } from '../middleware/auth.js';

// Data validation helper functions
const validateArtist = (artist) => {
  const errors = [];
  
  if (!artist.name || typeof artist.name !== 'string' || artist.name.trim().length === 0) {
    errors.push('Artist name is required and must be a non-empty string');
  } else if (artist.name.trim().length > 100) {
    errors.push('Artist name must be less than 100 characters');
  }
  
  if (!artist.genre || typeof artist.genre !== 'string' || artist.genre.trim().length === 0) {
    errors.push('Genre is required and must be a non-empty string');
  } else if (artist.genre.trim().length > 50) {
    errors.push('Genre must be less than 50 characters');
  }
  
  if (!artist.country || typeof artist.country !== 'string' || artist.country.trim().length === 0) {
    errors.push('Country is required and must be a non-empty string');
  } else if (artist.country.trim().length > 50) {
    errors.push('Country must be less than 50 characters');
  }
  
  if (!artist.formed_year || isNaN(artist.formed_year) || artist.formed_year < 1900 || artist.formed_year > new Date().getFullYear()) {
    errors.push(`Valid formed year is required (1900 - ${new Date().getFullYear()})`);
  }
  
  if (!artist.members || !Array.isArray(artist.members) || artist.members.length === 0) {
    errors.push('At least one member is required');
  } else {
    // Validate each member name
    for (let i = 0; i < artist.members.length; i++) {
      if (!artist.members[i] || typeof artist.members[i] !== 'string' || artist.members[i].trim().length === 0) {
        errors.push(`Member ${i + 1} must be a non-empty string`);
      } else if (artist.members[i].trim().length > 100) {
        errors.push(`Member ${i + 1} name must be less than 100 characters`);
      }
    }
    
    // Check for duplicate members
    const memberNames = artist.members.map(m => m.trim().toLowerCase());
    const duplicates = memberNames.filter((item, index) => memberNames.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate member names are not allowed');
    }
  }
  
  // Optional field validations
  if (artist.biography && (typeof artist.biography !== 'string' || artist.biography.length > 2000)) {
    errors.push('Biography must be a string with maximum 2000 characters');
  }
  
  if (artist.website && (typeof artist.website !== 'string' || !isValidUrl(artist.website))) {
    errors.push('Website must be a valid URL');
  }
  
  if (artist.social_media && typeof artist.social_media !== 'object') {
    errors.push('Social media must be an object');
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

// GET /artists - Get all artists with optional filtering and pagination
router.get('/', async (req, res) => {
  try {
    const database = db.getDb();
    let query = {};
    let options = {};
    
    // Optional filtering by genre or country
    if (req.query.genre) {
      query.genre = new RegExp(req.query.genre, 'i');
    }
    
    if (req.query.country) {
      query.country = new RegExp(req.query.country, 'i');
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
      
      if (['name', 'genre', 'country', 'formed_year', 'createdAt'].includes(sortField)) {
        options.sort = { [sortField]: sortOrder };
      }
    }
    
    const artists = await database.collection('artists').find(query, options).toArray();
    const totalCount = await database.collection('artists').countDocuments(query);
    
    res.status(200).json({
      artists: artists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch artists',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /artists/:id - Get single artist by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid artist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const artist = await database.collection('artists').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!artist) {
      return res.status(404).json({ 
        error: 'Artist not found',
        message: 'No artist exists with the provided ID'
      });
    }
    
    res.status(200).json(artist);
  } catch (error) {
    console.error('Error fetching artist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch artist'
    });
  }
});

// POST /artists - Create new artist
router.post('/', requireAuth, async (req, res) => {
  try {
    // Sanitize and prepare data
    const artistData = {
      name: req.body.name?.toString().trim(),
      genre: req.body.genre?.toString().trim(),
      country: req.body.country?.toString().trim(),
      formed_year: parseInt(req.body.formed_year),
      members: Array.isArray(req.body.members) ? req.body.members.map(m => m?.toString().trim()).filter(m => m) : [],
      biography: req.body.biography?.toString().trim() || '',
      website: req.body.website?.toString().trim() || '',
      social_media: req.body.social_media && typeof req.body.social_media === 'object' ? req.body.social_media : {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate artist data
    const validationErrors = validateArtist(artistData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    // Check for duplicate artist name
    const database = db.getDb();
    const existingArtist = await database.collection('artists').findOne({
      name: new RegExp(`^${artistData.name}$`, 'i')
    });
    
    if (existingArtist) {
      return res.status(409).json({
        error: 'Artist already exists',
        message: 'An artist with this name already exists in the database'
      });
    }

    const result = await database.collection('artists').insertOne(artistData);
    
    // Return created artist data
    const createdArtist = await database.collection('artists').findOne({
      _id: result.insertedId
    });
    
    res.status(201).json({
      message: 'Artist created successfully',
      artist: createdArtist
    });
  } catch (error) {
    console.error('Error creating artist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create artist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /artists/:id - Update existing artist
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid artist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const artistData = {
      name: req.body.name,
      genre: req.body.genre,
      country: req.body.country,
      formed_year: parseInt(req.body.formed_year),
      members: req.body.members,
      biography: req.body.biography || '',
      website: req.body.website || '',
      social_media: req.body.social_media || {},
      updatedAt: new Date()
    };

    // Validate artist data
    const validationErrors = validateArtist(artistData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    const database = db.getDb();
    const result = await database.collection('artists').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: artistData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Artist not found',
        message: 'No artist exists with the provided ID'
      });
    }
    
    res.status(204).send(); // No content response for successful update
  } catch (error) {
    console.error('Error updating artist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update artist'
    });
  }
});

// DELETE /artists/:id - Delete artist
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid artist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    
    // Check if artist has any albums before deleting
    const albumsCount = await database.collection('albums').countDocuments({
      artist_id: req.params.id
    });
    
    if (albumsCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete artist',
        message: `Artist has ${albumsCount} album(s) associated. Please delete albums first.`
      });
    }
    
    const result = await database.collection('artists').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Artist not found',
        message: 'No artist exists with the provided ID'
      });
    }
    
    res.status(200).json({
      message: 'Artist deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete artist'
    });
  }
});

export default router;
