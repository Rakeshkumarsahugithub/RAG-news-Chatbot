import express from 'express';
import jinaMCPService from '../services/jinaMCPService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/search/web
 * @desc    Search the web using Jina MCP
 * @access  Private
 */
router.post('/web', authenticate, async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query parameter is required' 
      });
    }

    const results = await jinaMCPService.searchWeb(query, limit);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/search/read
 * @desc    Read content from a URL using Jina MCP
 * @access  Private
 */
router.post('/read', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL parameter is required' 
      });
    }

    const content = await jinaMCPService.readUrl(url);
    
    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('URL read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read URL content',
      details: error.message
    });
  }
});

export default router;
