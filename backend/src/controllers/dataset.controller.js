import { Dataset } from '../models/Dataset.js';
import { activateDataset, getDatasetActivationImpact, importDataset, previewDataset } from '../services/dataset/dataset.service.js';
import { parseCsvDataset, parseJsonDataset } from '../services/dataset/dataset.parser.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/apiResponse.js';

function fileMap(files = {}) {
  return Object.fromEntries(Object.entries(files).map(([name, values]) => [name, values[0]]));
}

function parseMetadata(value) {
  if (!value) throw new ApiError(422, 'DATASET_METADATA_REQUIRED', 'Include a metadata JSON form field with calendar and priority settings.');
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(422, 'DATASET_INVALID', 'The metadata form field is not valid JSON.');
  }
}

function requireJsonFile(file) {
  if (!file) throw new ApiError(400, 'FILE_REQUIRED', 'Upload the dataset in the multipart field named "file".');
  if (!file.originalname.toLowerCase().endsWith('.json')) {
    throw new ApiError(422, 'UNSUPPORTED_FILE_TYPE', 'This endpoint accepts a .json dataset file.');
  }
  return parseJsonDataset(file.buffer);
}

function requireCsvFiles(files, metadataField) {
  if (!files || Object.keys(files).length === 0) {
    throw new ApiError(400, 'FILES_REQUIRED', 'Upload the starter-pack CSV files as named multipart fields.');
  }
  return parseCsvDataset(fileMap(files), parseMetadata(metadataField));
}

export async function previewJson(req, res, next) {
  try {
    const preview = previewDataset(requireJsonFile(req.file));
    return sendSuccess(res, { message: 'Dataset preview generated', data: preview });
  } catch (error) { return next(error); }
}

export async function importJson(req, res, next) {
  try {
    const data = requireJsonFile(req.file);
    const dataset = await importDataset(data, { sourceFileName: req.file.originalname, importedBy: req.user.userId });
    return sendSuccess(res, { status: 201, message: 'Dataset imported as a preview version', data: { dataset } });
  } catch (error) { return next(error); }
}

export async function previewCsv(req, res, next) {
  try {
    const preview = previewDataset(requireCsvFiles(req.files, req.body?.metadata));
    return sendSuccess(res, { message: 'CSV dataset preview generated', data: preview });
  } catch (error) { return next(error); }
}

export async function importCsv(req, res, next) {
  try {
    const data = requireCsvFiles(req.files, req.body?.metadata);
    const dataset = await importDataset(data, { sourceFileName: 'CSV bundle', importedBy: req.user.userId });
    return sendSuccess(res, { status: 201, message: 'CSV dataset imported as a preview version', data: { dataset } });
  } catch (error) { return next(error); }
}

export async function listDatasets(_req, res, next) {
  try {
    const datasets = await Dataset.find().sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { data: { datasets } });
  } catch (error) { return next(error); }
}

export async function activate(req, res, next) {
  try {
    const dataset = await activateDataset(req.params.datasetVersionId, req.user.userId);
    return sendSuccess(res, { message: 'Dataset version activated', data: { dataset } });
  } catch (error) { return next(error); }
}

export async function activationImpact(req, res, next) {
  try {
    const impact = await getDatasetActivationImpact(req.params.datasetVersionId);
    return sendSuccess(res, { data: { impact } });
  } catch (error) { return next(error); }
}
