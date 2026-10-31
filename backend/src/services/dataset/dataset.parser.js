import { ApiError } from '../../utils/apiError.js';

function parseCsv(text, filename) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (quoted) throw new ApiError(422, 'DATASET_INVALID', `${filename} has an unterminated quoted field.`);
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  if (rows.length < 1) throw new ApiError(422, 'DATASET_INVALID', `${filename} is empty.`);

  const headers = rows.shift().map((header) => header.trim());
  if (headers.some((header) => !header)) throw new ApiError(422, 'DATASET_INVALID', `${filename} has an empty column name.`);
  return rows.filter((values) => values.some((value) => value !== '')).map((values, index) => {
    if (values.length !== headers.length) {
      throw new ApiError(422, 'DATASET_INVALID', `${filename} row ${index + 2} has the wrong number of columns.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

function cellValue(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed === 'True') return true;
  if (trimmed === 'False') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch { return value; }
  }
  return value;
}

function readTable(files, name, required = true) {
  const file = files[`${name}.csv`] ?? files[name];
  if (!file) {
    if (!required) return [];
    throw new ApiError(422, 'DATASET_INVALID', `CSV bundle is missing ${name}.csv.`);
  }
  const buffer = Buffer.isBuffer(file) ? file : file.buffer;
  if (!buffer) throw new ApiError(422, 'DATASET_INVALID', `${name}.csv has no file content.`);
  return parseCsv(buffer.toString('utf8').replace(/^\uFEFF/, ''), `${name}.csv`)
    .map((record) => Object.fromEntries(Object.entries(record).map(([key, value]) => [key, cellValue(value)])));
}

export function parseJsonDataset(buffer) {
  let data;
  try {
    data = JSON.parse(Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer));
  } catch {
    throw new ApiError(422, 'DATASET_INVALID', 'Uploaded file is not valid JSON.');
  }
  return data;
}

export function parseCsvDataset(files, metadata) {
  if (!metadata || typeof metadata !== 'object') {
    throw new ApiError(422, 'DATASET_METADATA_REQUIRED', 'CSV import requires dataset metadata containing calendar and priority settings.');
  }

  const data = {
    ...metadata,
    rooms: readTable(files, 'rooms'),
    faculty: readTable(files, 'faculty'),
    student_groups: readTable(files, 'student_groups'),
    courses: readTable(files, 'courses'),
    sessions: readTable(files, 'sessions'),
    booking_requests: readTable(files, 'booking_requests'),
    cancellations: readTable(files, 'cancellations', false),
    exams: readTable(files, 'exams'),
    room_unavailability: readTable(files, 'room_unavailability', false),
  };
  return data;
}
