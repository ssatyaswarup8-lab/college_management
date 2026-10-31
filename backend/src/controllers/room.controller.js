import * as roomService from '../services/rooms/room.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const rooms = await roomService.listRooms(req.query);
    return sendSuccess(res, { data: { rooms } });
  } catch (error) { return next(error); }
}

export async function getOne(req, res, next) {
  try {
    const room = await roomService.getRoom(req.params.roomId);
    return sendSuccess(res, { data: { room } });
  } catch (error) { return next(error); }
}

export async function available(req, res, next) {
  try {
    const needs = String(req.query.needs ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    const roomTypes = req.query.type ? [req.query.type] : undefined;
    const rooms = await roomService.findRooms({
      ...req.query,
      needs,
      roomTypes,
      needsAccessible: req.query.accessible === true,
      availableOnly: req.query.availableOnly !== false,
    });
    return sendSuccess(res, { data: { rooms } });
  } catch (error) { return next(error); }
}

export async function find(req, res, next) {
  try {
    const rooms = await roomService.findRooms(req.body);
    return sendSuccess(res, { data: { rooms } });
  } catch (error) { return next(error); }
}

export async function utilization(req, res, next) {
  try {
    const data = await roomService.getRoomUtilization(req.params.roomId);
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}

export async function utilizationDashboard(req, res, next) {
  try {
    const data = await roomService.getRoomUtilizationDashboard(req.query);
    return sendSuccess(res, { data });
  } catch (error) { return next(error); }
}
