const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const db = require('../db/conn');
const { requireAuth } = require('../middleware/auth');

// Data validation helper functions
const validateSong = (song) => {
  const errors = [];
  
  if (!song.title || typeof song.title !== 'string' || song.title.trim().length === 0) {
    errors.push('Song title is required and must be a non-empty string');
  } else if (song.title.trim().length > 200) {
    errors.push('Song title must be less than 200 characters');
  }
  
  if (!song.album_id || !ObjectId.isValid(song.album_id)) {
    errors.push('Valid album ID is required');
  }
  
  if (!song.artist_id || !ObjectId.isValid(song.artist_id)) {
    errors.push('Valid artist ID is required');
  }
  
  if (!song.duration || isNaN(song.duration) || song.duration < 1) {
    errors.push('Valid duration in seconds is required (minimum 1)');
  } else if (song.duration > 3600) {
    errors.push('Duration cannot exceed 3600 seconds (1 hour)');
  }
  
  if (song.track_number && (isNaN(song.track_number) || song.track_number < 1)) {
    errors.push('Track number must be a positive integer');
  } else if (song.track_number && song.track_number > 200) {
    errors.push('Track number cannot exceed 200');
  }
  
  if (!song.genre || typeof song.genre !== 'string' || song.genre.trim().length === 0) {
    errors.push('Genre is required and must be a non-empty string');
  } else if (song.genre.trim().length > 50) {
    errors.push('Genre must be less than 50 characters');
  }
  
  // Optional field validations
  if (song.lyrics && (typeof song.lyrics !== 'string' || song.lyrics.length > 10000)) {
    errors.push('Lyrics must be a string with maximum 10,000 characters');
  }
  
  if (song.audio_url && (typeof song.audio_url !== 'string' || !isValidUrl(song.audio_url))) {
    errors.push('Audio URL must be a valid URL');
  }
  
  if (song.featured_artists && !Array.isArray(song.featured_artists)) {
    errors.push('Featured artists must be an array');
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

// GET /songs - Get all songs with optional filtering and pagination
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
    
    if (req.query.album_id && ObjectId.isValid(req.query.album_id)) {
      query.album_id = req.query.album_id;
    }
    
    if (req.query.duration_min || req.query.duration_max) {
      query.duration = {};
      if (req.query.duration_min) {
        const minDuration = parseInt(req.query.duration_min);
        if (!isNaN(minDuration)) query.duration.$gte = minDuration;
      }
      if (req.query.duration_max) {
        const maxDuration = parseInt(req.query.duration_max);
        if (!isNaN(maxDuration)) query.duration.$lte = maxDuration;
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
      
      if (['title', 'genre', 'duration', 'track_number', 'createdAt'].includes(sortField)) {
        options.sort = { [sortField]: sortOrder };
      }
    }
    
    const songs = await database.collection('songs').find(query, options).toArray();
    const totalCount = await database.collection('songs').countDocuments(query);
    
    res.status(200).json({
      songs: songs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch songs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /songs/:id - Get single song by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid song ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const song = await database.collection('songs').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!song) {
      return res.status(404).json({ 
        error: 'Song not found',
        message: 'No song exists with the provided ID'
      });
    }
    
    res.status(200).json(song);
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch song',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /songs/album/:albumId - Get songs by album
router.get('/album/:albumId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.albumId)) {
      return res.status(400).json({ 
        error: 'Invalid album ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const songs = await database.collection('songs')
      .find({ album_id: req.params.albumId })
      .sort({ track_number: 1 })
      .toArray();
    
    res.status(200).json(songs);
  } catch (error) {
    console.error('Error fetching songs by album:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch songs for the specified album',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /songs/artist/:artistId - Get songs by artist
router.get('/artist/:artistId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.artistId)) {
      return res.status(400).json({ 
        error: 'Invalid artist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const songs = await database.collection('songs')
      .find({ artist_id: req.params.artistId })
      .toArray();
    
    res.status(200).json(songs);
  } catch (error) {
    console.error('Error fetching songs by artist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch songs for the specified artist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /songs - Create new song
router.post('/', requireAuth, async (req, res) => {
  try {
    // Sanitize and prepare data
    const songData = {
      title: req.body.title?.toString().trim(),
      album_id: req.body.album_id?.toString().trim(),
      artist_id: req.body.artist_id?.toString().trim(),
      duration: parseInt(req.body.duration),
      track_number: req.body.track_number ? parseInt(req.body.track_number) : null,
      genre: req.body.genre?.toString().trim(),
      lyrics: req.body.lyrics?.toString().trim() || '',
      audio_url: req.body.audio_url?.toString().trim() || '',
      featured_artists: Array.isArray(req.body.featured_artists) ? 
        req.body.featured_artists.map(a => a?.toString().trim()).filter(a => a) : [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate song data
    const validationErrors = validateSong(songData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    const database = db.getDb();
    
    // Check if album exists
    const album = await database.collection('albums').findOne({
      _id: new ObjectId(songData.album_id)
    });
    
    if (!album) {
      return res.status(400).json({
        error: 'Album not found',
        message: 'The specified album does not exist'
      });
    }

    // Check if artist exists
    const artist = await database.collection('artists').findOne({
      _id: new ObjectId(songData.artist_id)
    });
    
    if (!artist) {
      return res.status(400).json({
        error: 'Artist not found',
        message: 'The specified artist does not exist'
      });
    }

    // Check for duplicate song title in the same album
    const existingSong = await database.collection('songs').findOne({
      title: new RegExp(`^${songData.title}$`, 'i'),
      album_id: songData.album_id
    });
    
    if (existingSong) {
      return res.status(409).json({
        error: 'Song already exists',
        message: 'This album already has a song with this title'
      });
    }

    // Check for duplicate track number in the same album
    if (songData.track_number) {
      const existingTrack = await database.collection('songs').findOne({
        album_id: songData.album_id,
        track_number: songData.track_number
      });
      
      if (existingTrack) {
        return res.status(409).json({
          error: 'Track number already exists',
          message: 'This album already has a song with this track number'
        });
      }
    }

    const result = await database.collection('songs').insertOne(songData);
    
    // Return created song data
    const createdSong = await database.collection('songs').findOne({
      _id: result.insertedId
    });
    
    res.status(201).json({
      message: 'Song created successfully',
      song: createdSong
    });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create song',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /songs/:id - Update existing song
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid song ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    // Sanitize and prepare data
    const songData = {
      title: req.body.title?.toString().trim(),
      album_id: req.body.album_id?.toString().trim(),
      artist_id: req.body.artist_id?.toString().trim(),
      duration: parseInt(req.body.duration),
      track_number: req.body.track_number ? parseInt(req.body.track_number) : null,
      genre: req.body.genre?.toString().trim(),
      lyrics: req.body.lyrics?.toString().trim() || '',
      audio_url: req.body.audio_url?.toString().trim() || '',
      featured_artists: Array.isArray(req.body.featured_artists) ? 
        req.body.featured_artists.map(a => a?.toString().trim()).filter(a => a) : [],
      updatedAt: new Date()
    };

    // Validate song data
    const validationErrors = validateSong(songData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    const database = db.getDb();
    
    // Check if album exists
    const album = await database.collection('albums').findOne({
      _id: new ObjectId(songData.album_id)
    });
    
    if (!album) {
      return res.status(400).json({
        error: 'Album not found',
        message: 'The specified album does not exist'
      });
    }

    // Check if artist exists
    const artist = await database.collection('artists').findOne({
      _id: new ObjectId(songData.artist_id)
    });
    
    if (!artist) {
      return res.status(400).json({
        error: 'Artist not found',
        message: 'The specified artist does not exist'
      });
    }

    const result = await database.collection('songs').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: songData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Song not found',
        message: 'No song exists with the provided ID'
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update song',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /songs/:id - Delete song
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid song ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const result = await database.collection('songs').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Song not found',
        message: 'No song exists with the provided ID'
      });
    }
    
    res.status(200).json({
      message: 'Song deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete song',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;