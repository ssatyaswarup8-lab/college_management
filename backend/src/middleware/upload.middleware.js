import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const allowedExtensions = new Set(['.json', '.csv']);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 10, fields: 20 },
  fileFilter(_req, file, callback) {
    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!extension || !allowedExtensions.has(extension)) {
      return callback(new ApiError(422, 'UNSUPPORTED_FILE_TYPE', 'Upload a JSON file or CSV dataset files.'));
    }
    return callback(null, true);
  },
});

function mapUploadError(error) {
  if (!(error instanceof multer.MulterError)) return error;
  const tooLarge = error.code === 'LIMIT_FILE_SIZE';
  return new ApiError(
    tooLarge ? 413 : 400,
    tooLarge ? 'UPLOAD_TOO_LARGE' : 'UPLOAD_INVALID',
    tooLarge ? 'Dataset upload exceeds the 20 MB limit.' : 'Dataset upload has too many or invalid files.',
    { uploadCode: error.code },
  );
}

function wrapUpload(handler) {
  return (req, res, next) => handler(req, res, (error) => next(error ? mapUploadError(error) : undefined));
}

export const uploadJsonFile = wrapUpload(parser.single('file'));

export const uploadCsvFiles = wrapUpload(parser.fields([
  { name: 'rooms.csv', maxCount: 1 },
  { name: 'faculty.csv', maxCount: 1 },
  { name: 'student_groups.csv', maxCount: 1 },
  { name: 'courses.csv', maxCount: 1 },
  { name: 'sessions.csv', maxCount: 1 },
  { name: 'booking_requests.csv', maxCount: 1 },
  { name: 'cancellations.csv', maxCount: 1 },
  { name: 'exams.csv', maxCount: 1 },
  { name: 'room_unavailability.csv', maxCount: 1 },
]));
