import { getReadiness } from '../services/system/health.service.js';

export async function ready(_req, res, next) {
  try {
    const health = await getReadiness();
    return res.status(health.ready ? 200 : 503).json({
      success: health.ready,
      message: health.ready ? 'CIT scheduling API is ready' : 'CIT scheduling API is not ready',
      data: health,
    });
  } catch (error) { return next(error); }
}
