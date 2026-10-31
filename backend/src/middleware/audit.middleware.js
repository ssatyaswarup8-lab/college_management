import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

export function auditMutations(req, res, next) {
  if (!req.path.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  res.once('finish', () => {
    if (!req.user?.userId || res.statusCode >= 400) return;
    const path = req.originalUrl.split('?')[0];
    const parts = path.split('/').filter(Boolean);
    const resourceIndex = parts[0] === 'api' && parts[1] === 'admin' ? 2 : 1;
    const entityType = (parts[resourceIndex] ?? 'system').replaceAll('-', '_');
    const entityId = parts.slice(resourceIndex + 1).find((part) => /^[a-f\d]{24}$/i.test(part)) ?? null;
    void AuditLog.create({
      actor: req.user.userId,
      action: `${req.method} ${path}`,
      method: req.method,
      path,
      entityType,
      entityId,
      statusCode: res.statusCode,
    }).catch((error) => logger.error('Could not save audit entry.', { message: error.message, path }));
  });
  next();
}
