import express from 'express';

const router = express.Router();

// POST /api/sessions - Create a new session
router.post('/', async (req, res) => {
  try {
    const { metadata = {} } = req.body;
    
    const ragService = req.app.locals.ragService;
    const session = await ragService.createSession(metadata);

    res.status(201).json(session);

  } catch (error) {
    console.error('❌ Create session error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/session/:sessionId - Get session information
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required',
        timestamp: new Date().toISOString()
      });
    }

    const ragService = req.app.locals.ragService;
    const session = await ragService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
    }

    res.json(session);

  } catch (error) {
    console.error('❌ Get session error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/session/:sessionId - Update session metadata
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { metadata = {} } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required',
        timestamp: new Date().toISOString()
      });
    }

    const ragService = req.app.locals.ragService;
    const session = await ragService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // Update session with new metadata
    const updatedSession = {
      ...session,
      ...metadata,
      lastActivity: new Date().toISOString()
    };

    await ragService.redisClient.setSession(sessionId, updatedSession);

    res.json(updatedSession);

  } catch (error) {
    console.error('❌ Update session error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/session/:sessionId - Delete session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required',
        timestamp: new Date().toISOString()
      });
    }

    const ragService = req.app.locals.ragService;
    
    // Clear chat history and session data
    await ragService.clearChatHistory(sessionId);

    res.json({
      message: 'Session deleted successfully',
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/session/:sessionId/reset - Reset session (clear history but keep session)
router.post('/:sessionId/reset', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required',
        timestamp: new Date().toISOString()
      });
    }

    const ragService = req.app.locals.ragService;
    
    // Get current session or create a basic one if not found
    let session = await ragService.getSession(sessionId);
    
    if (!session) {
      // Create a basic session if it doesn't exist
      session = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0
      };
    }

    // Clear chat history
    await ragService.clearChatHistory(sessionId);
    
    // Update session with reset timestamp
    const updatedSession = {
      ...session,
      lastReset: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0
    };

    await ragService.redisClient.setSession(sessionId, updatedSession);

    res.json({
      message: 'Session reset successfully',
      session: updatedSession,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Reset session error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;