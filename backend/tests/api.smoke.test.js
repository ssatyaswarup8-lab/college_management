import request from 'supertest';
import app from '../src/app.js';

describe('API access and response envelope', () => {
  test('health endpoint returns the standard success response without MongoDB', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'ok' } });
  });

  test.each(['/api/admin/audit', '/api/notifications'])('%s requires authentication', async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });
});
