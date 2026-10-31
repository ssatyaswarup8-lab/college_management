import * as scenarioService from '../services/scenarios/scenario.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function preview(req, res, next) {
  try {
    const data = await scenarioService.previewScenario(req.body);
    return sendSuccess(res, { message: 'Scenario impact preview generated; no scenario or schedule was saved', data });
  } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try {
    const scenario = await scenarioService.createScenario({ userId: req.user.userId, input: req.body });
    return sendSuccess(res, { status: 201, message: 'Scenario created', data: { scenario } });
  } catch (error) { return next(error); }
}

export async function list(_req, res, next) {
  try {
    const scenarios = await scenarioService.listScenarios();
    return sendSuccess(res, { data: { scenarios } });
  } catch (error) { return next(error); }
}

export async function simulate(req, res, next) {
  try {
    const data = await scenarioService.simulateScenario(req.params.scenarioId, req.body);
    return sendSuccess(res, { message: 'Scenario simulated; production timetable is unchanged', data });
  } catch (error) { return next(error); }
}

export async function compare(req, res, next) {
  try {
    const data = await scenarioService.compareScenario(req.params.scenarioId);
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}

export async function apply(req, res, next) {
  try {
    const scenario = await scenarioService.applyScenario(req.params.scenarioId, req.user.userId);
    return sendSuccess(res, { message: 'Scenario proposal applied', data: { scenario } });
  } catch (error) { return next(error); }
}
