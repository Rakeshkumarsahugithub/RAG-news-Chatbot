import express from 'express';

const router = express.Router();

// POST /api/chat/message - Send a chat message
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId, options = {} } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Message and sessionId are required',
        timestamp: new Date().toISOString()
      });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message must be a non-empty string',
        timestamp: new Date().toISOString()
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        error: 'Message too long (max 1000 characters)',
        timestamp: new Date().toISOString()
      });
    }

    const ragService = req.app.locals.ragService;

    // Update session activity
    await ragService.updateSessionActivity(sessionId);

    // Process the query
    const response = await ragService.processQuery(message.trim(), sessionId, options);

    res.json(response);

  } catch (error) {
    console.error('❌ Chat message error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/chat/history/:sessionId - Get chat history for a session
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required',
        timestamp: new Date().toISOString()
      });
    }

    const ragService = req.app.locals.ragService;
    const history = await ragService.getChatHistory(sessionId, parseInt(limit));

    res.json({
      sessionId: sessionId,
      history: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat history error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/chat/history/:sessionId - Clear chat history for a session
router.delete('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required',
        timestamp: new Date().toISOString()
      });
    }

    const ragService = req.app.locals.ragService;
    const success = await ragService.clearChatHistory(sessionId);

    if (success) {
      res.json({
        message: 'Chat history cleared successfully',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to clear chat history',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Clear chat history error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;