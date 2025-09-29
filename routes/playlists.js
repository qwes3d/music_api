const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const db = require('../db/conn');
const { requireAuth } = require('../middleware/auth');

// Data validation helper functions
const validatePlaylist = (playlist) => {
  const errors = [];
  
  if (!playlist.name || typeof playlist.name !== 'string' || playlist.name.trim().length === 0) {
    errors.push('Playlist name is required and must be a non-empty string');
  } else if (playlist.name.trim().length > 100) {
    errors.push('Playlist name must be less than 100 characters');
  }
  
  if (!playlist.creator_name || typeof playlist.creator_name !== 'string' || playlist.creator_name.trim().length === 0) {
    errors.push('Creator name is required and must be a non-empty string');
  } else if (playlist.creator_name.trim().length > 100) {
    errors.push('Creator name must be less than 100 characters');
  }
  
  if (playlist.description && (typeof playlist.description !== 'string' || playlist.description.length > 1000)) {
    errors.push('Description must be a string with maximum 1000 characters');
  }
  
  if (playlist.songs && !Array.isArray(playlist.songs)) {
    errors.push('Songs must be an array');
  } else if (playlist.songs) {
    // Validate each song ID
    for (let i = 0; i < playlist.songs.length; i++) {
      if (!ObjectId.isValid(playlist.songs[i])) {
        errors.push(`Song ${i + 1} must be a valid MongoDB ObjectId`);
      }
    }
    
    // Check for duplicate songs
    const songIds = playlist.songs.map(id => id.toString());
    const duplicates = songIds.filter((item, index) => songIds.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate songs are not allowed in the playlist');
    }
  }
  
  if (playlist.tags && !Array.isArray(playlist.tags)) {
    errors.push('Tags must be an array');
  } else if (playlist.tags) {
    for (let i = 0; i < playlist.tags.length; i++) {
      if (!playlist.tags[i] || typeof playlist.tags[i] !== 'string' || playlist.tags[i].trim().length === 0) {
        errors.push(`Tag ${i + 1} must be a non-empty string`);
      } else if (playlist.tags[i].trim().length > 30) {
        errors.push(`Tag ${i + 1} must be less than 30 characters`);
      }
    }
  }
  
  if (playlist.cover_image_url && (typeof playlist.cover_image_url !== 'string' || !isValidUrl(playlist.cover_image_url))) {
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

// GET /playlists - Get all playlists with optional filtering and pagination
router.get('/', async (req, res) => {
  try {
    const database = db.getDb();
    let query = {};
    let options = {};
    
    // Optional filtering
    if (req.query.creator) {
      query.creator_name = new RegExp(req.query.creator, 'i');
    }
    
    if (req.query.tag) {
      query.tags = new RegExp(req.query.tag, 'i');
    }
    
    if (req.query.is_public !== undefined) {
      query.is_public = req.query.is_public === 'true';
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
      
      if (['name', 'creator_name', 'createdAt', 'updatedAt'].includes(sortField)) {
        options.sort = { [sortField]: sortOrder };
      }
    }
    
    const playlists = await database.collection('playlists').find(query, options).toArray();
    const totalCount = await database.collection('playlists').countDocuments(query);
    
    res.status(200).json({
      playlists: playlists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch playlists',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /playlists/:id - Get single playlist by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid playlist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const playlist = await database.collection('playlists').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!playlist) {
      return res.status(404).json({ 
        error: 'Playlist not found',
        message: 'No playlist exists with the provided ID'
      });
    }
    
    res.status(200).json(playlist);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch playlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /playlists/:id/songs - Get all songs in a playlist with details
router.get('/:id/songs', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid playlist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const playlist = await database.collection('playlists').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!playlist) {
      return res.status(404).json({ 
        error: 'Playlist not found',
        message: 'No playlist exists with the provided ID'
      });
    }

    if (!playlist.songs || playlist.songs.length === 0) {
      return res.status(200).json([]);
    }

    // Get detailed song information
    const songIds = playlist.songs.map(id => new ObjectId(id));
    const songs = await database.collection('songs').find({
      _id: { $in: songIds }
    }).toArray();
    
    // Maintain playlist order
    const orderedSongs = playlist.songs.map(songId => 
      songs.find(song => song._id.toString() === songId.toString())
    ).filter(song => song !== undefined);
    
    res.status(200).json(orderedSongs);
  } catch (error) {
    console.error('Error fetching playlist songs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch playlist songs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /playlists - Create new playlist
router.post('/', requireAuth, async (req, res) => {
  try {
    // Sanitize and prepare data
    const playlistData = {
      name: req.body.name?.toString().trim(),
      creator_name: req.body.creator_name?.toString().trim(),
      description: req.body.description?.toString().trim() || '',
      songs: Array.isArray(req.body.songs) ? req.body.songs.filter(id => ObjectId.isValid(id)) : [],
      tags: Array.isArray(req.body.tags) ? 
        req.body.tags.map(t => t?.toString().trim()).filter(t => t) : [],
      is_public: req.body.is_public === true || req.body.is_public === 'true',
      cover_image_url: req.body.cover_image_url?.toString().trim() || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate playlist data
    const validationErrors = validatePlaylist(playlistData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    const database = db.getDb();
    
    // Check if all song IDs exist (if songs are provided)
    if (playlistData.songs.length > 0) {
      const songIds = playlistData.songs.map(id => new ObjectId(id));
      const existingSongs = await database.collection('songs').find({
        _id: { $in: songIds }
      }).toArray();
      
      if (existingSongs.length !== playlistData.songs.length) {
        return res.status(400).json({
          error: 'Invalid songs',
          message: 'One or more song IDs do not exist'
        });
      }
    }

    // Check for duplicate playlist name by the same creator
    const existingPlaylist = await database.collection('playlists').findOne({
      name: new RegExp(`^${playlistData.name}$`, 'i'),
      creator_name: playlistData.creator_name
    });
    
    if (existingPlaylist) {
      return res.status(409).json({
        error: 'Playlist already exists',
        message: 'You already have a playlist with this name'
      });
    }

    const result = await database.collection('playlists').insertOne(playlistData);
    
    // Return created playlist data
    const createdPlaylist = await database.collection('playlists').findOne({
      _id: result.insertedId
    });
    
    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: createdPlaylist
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create playlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /playlists/:id - Update existing playlist
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid playlist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    // Sanitize and prepare data
    const playlistData = {
      name: req.body.name?.toString().trim(),
      creator_name: req.body.creator_name?.toString().trim(),
      description: req.body.description?.toString().trim() || '',
      songs: Array.isArray(req.body.songs) ? req.body.songs.filter(id => ObjectId.isValid(id)) : [],
      tags: Array.isArray(req.body.tags) ? 
        req.body.tags.map(t => t?.toString().trim()).filter(t => t) : [],
      is_public: req.body.is_public === true || req.body.is_public === 'true',
      cover_image_url: req.body.cover_image_url?.toString().trim() || '',
      updatedAt: new Date()
    };

    // Validate playlist data
    const validationErrors = validatePlaylist(playlistData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        details: validationErrors
      });
    }

    const database = db.getDb();
    
    // Check if all song IDs exist (if songs are provided)
    if (playlistData.songs.length > 0) {
      const songIds = playlistData.songs.map(id => new ObjectId(id));
      const existingSongs = await database.collection('songs').find({
        _id: { $in: songIds }
      }).toArray();
      
      if (existingSongs.length !== playlistData.songs.length) {
        return res.status(400).json({
          error: 'Invalid songs',
          message: 'One or more song IDs do not exist'
        });
      }
    }

    const result = await database.collection('playlists').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: playlistData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Playlist not found',
        message: 'No playlist exists with the provided ID'
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update playlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /playlists/:id/songs/:songId - Add song to playlist
router.put('/:id/songs/:songId', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid playlist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    if (!ObjectId.isValid(req.params.songId)) {
      return res.status(400).json({ 
        error: 'Invalid song ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    
    // Check if song exists
    const song = await database.collection('songs').findOne({
      _id: new ObjectId(req.params.songId)
    });
    
    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        message: 'The specified song does not exist'
      });
    }

    // Check if playlist exists and song is not already in it
    const playlist = await database.collection('playlists').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!playlist) {
      return res.status(404).json({
        error: 'Playlist not found',
        message: 'The specified playlist does not exist'
      });
    }

    if (playlist.songs && playlist.songs.includes(req.params.songId)) {
      return res.status(409).json({
        error: 'Song already in playlist',
        message: 'This song is already in the playlist'
      });
    }

    // Add song to playlist
    const result = await database.collection('playlists').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $push: { songs: req.params.songId },
        $set: { updatedAt: new Date() }
      }
    );
    
    res.status(200).json({
      message: 'Song added to playlist successfully'
    });
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to add song to playlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /playlists/:id/songs/:songId - Remove song from playlist
router.delete('/:id/songs/:songId', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid playlist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    if (!ObjectId.isValid(req.params.songId)) {
      return res.status(400).json({ 
        error: 'Invalid song ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    
    // Remove song from playlist
    const result = await database.collection('playlists').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $pull: { songs: req.params.songId },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'Playlist not found',
        message: 'The specified playlist does not exist'
      });
    }
    
    res.status(200).json({
      message: 'Song removed from playlist successfully'
    });
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to remove song from playlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /playlists/:id - Delete playlist
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid playlist ID format',
        message: 'Please provide a valid MongoDB ObjectId'
      });
    }

    const database = db.getDb();
    const result = await database.collection('playlists').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Playlist not found',
        message: 'No playlist exists with the provided ID'
      });
    }
    
    res.status(200).json({
      message: 'Playlist deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete playlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;