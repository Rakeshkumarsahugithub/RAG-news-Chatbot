import express from 'express';

const router = express.Router();

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  try {
    const ragService = req.app.locals.ragService;
    
    const health = await ragService.healthCheck();
    const stats = await ragService.getStats();
    
    const response = {
      status: health.ragService,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      components: health.components,
      stats: stats
    };

    const statusCode = health.ragService === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/components - Detailed component health
router.get('/components', async (req, res) => {
  try {
    const ragService = req.app.locals.ragService;
    const health = await ragService.healthCheck();
    
    res.json({
      components: health.components,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Component health check error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/stats - Service statistics
router.get('/stats', async (req, res) => {
  try {
    const ragService = req.app.locals.ragService;
    const stats = await ragService.getStats();
    
    res.json(stats);

  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;