export function sendSuccess(res, {
  status = 200,
  message = 'Operation successful',
  data = {},
} = {}) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}
