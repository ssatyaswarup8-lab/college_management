import { BookingRequest } from '../../models/BookingRequest.js';
import { Dataset } from '../../models/Dataset.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { Session } from '../../models/Session.js';
import { ApiError } from '../../utils/apiError.js';
import { roomLocationPreference } from './room-ranking.js';

async function loadRoomContext() {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' }).select('_id');
  const [rooms, closures, sessions, assignments, bookings] = await Promise.all([
    Room.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(),
    version ? ScheduledSession.find({ scheduleVersion: version._id }).lean() : [],
    BookingRequest.find({ dataset: dataset._id, status: 'approved' }).lean(),
  ]);
  const sessionMap = new Map(sessions.map((session) => [session.sourceId, session]));
  return { dataset, rooms, closures, sessionMap, assignments, bookings };
}

function splitFeatures(features) {
  if (Array.isArray(features)) return features;
  return String(features ?? '').split(',').map((feature) => feature.trim()).filter(Boolean);
}

function range(start, duration) {
  return Array.from({ length: duration }, (_value, index) => start + index);
}

function available(room, criteria, context) {
  const { day, startPeriod, duration, attendance, needs = [], needsAccessible = false, roomTypes, use = 'event' } = criteria;
  const endPeriod = startPeriod + duration - 1;
  if (endPeriod > 13 || (use !== 'event' && endPeriod > 9)) return { available: false, reason: 'TIME_OUT_OF_RANGE' };
  if (!(room.allowedUses ?? []).includes(use)) return { available: false, reason: 'USE_NOT_ALLOWED' };
  if (roomTypes?.length && !roomTypes.includes(room.type)) return { available: false, reason: 'ROOM_TYPE_MISMATCH' };
  if (attendance && room.capacity < attendance) return { available: false, reason: 'CAPACITY_INSUFFICIENT' };
  const features = new Set([...(room.features ?? []), ...(room.accessible ? ['accessible'] : [])]);
  if (needsAccessible && !room.accessible) return { available: false, reason: 'ACCESSIBILITY_REQUIRED' };
  if (needs.some((feature) => !features.has(feature))) return { available: false, reason: 'FEATURES_MISSING' };

  const periods = range(startPeriod, duration);
  if (context.closures.some((closure) => closure.roomId === room.sourceId && closure.day === day && closure.periods.some((period) => periods.includes(period)))) {
    return { available: false, reason: 'ROOM_UNAVAILABLE' };
  }
  for (const assignment of context.assignments) {
    if (assignment.roomId !== room.sourceId || assignment.day !== day) continue;
    const session = context.sessionMap.get(assignment.sessionId);
    if (session && startPeriod <= assignment.startPeriod + session.duration - 1 && assignment.startPeriod <= endPeriod) {
      return { available: false, reason: 'ROOM_OCCUPIED_BY_CLASS', conflictingSessionId: assignment.sessionId };
    }
  }
  for (const booking of context.bookings) {
    const decision = booking.decision;
    if (!decision || decision.roomId !== room.sourceId || decision.day !== day) continue;
    if (startPeriod <= decision.endPeriod && decision.startPeriod <= endPeriod) {
      return { available: false, reason: 'ROOM_OCCUPIED_BY_BOOKING', conflictingRequestId: booking.sourceId ?? String(booking._id) };
    }
  }
  return { available: true, reason: null };
}

function weeklyUtilization(room, context) {
  const days = context.dataset.calendar.days;
  const allowedPeriods = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  if ((room.allowedUses ?? []).includes('event')) allowedPeriods.push(10, 11, 12, 13);
  const capacity = new Set(days.flatMap((day) => allowedPeriods.map((period) => `${day}|${period}`)));
  for (const closure of context.closures.filter((item) => item.roomId === room.sourceId)) {
    for (const period of closure.periods) capacity.delete(`${closure.day}|${period}`);
  }
  const occupied = new Set();
  let wastedSeatPeriods = 0;
  let occupiedSeatPeriods = 0;
  for (const assignment of context.assignments) {
    if (assignment.roomId !== room.sourceId) continue;
    const session = context.sessionMap.get(assignment.sessionId);
    if (!session) continue;
    for (const period of range(assignment.startPeriod, session.duration)) {
      occupied.add(`${assignment.day}|${period}`);
      occupiedSeatPeriods += room.capacity;
      wastedSeatPeriods += Math.max(0, room.capacity - session.size);
    }
  }
  for (const booking of context.bookings) {
    const decision = booking.decision;
    if (decision?.roomId !== room.sourceId) continue;
    for (const period of range(decision.startPeriod, decision.endPeriod - decision.startPeriod + 1)) {
      occupied.add(`${decision.day}|${period}`);
      occupiedSeatPeriods += room.capacity;
      wastedSeatPeriods += Math.max(0, room.capacity - (booking.attendance ?? 0));
    }
  }
  const eligibleRoomPeriods = capacity.size;
  const occupiedRoomPeriods = [...occupied].filter((key) => capacity.has(key)).length;
  const byPeriod = allowedPeriods.map((period) => {
    const eligibleDays = days.filter((day) => capacity.has(`${day}|${period}`));
    const occupiedDays = eligibleDays.filter((day) => occupied.has(`${day}|${period}`));
    return {
      period,
      eligibleDays: eligibleDays.length,
      occupiedDays: occupiedDays.length,
      utilizationPercent: eligibleDays.length ? Math.round((occupiedDays.length / eligibleDays.length) * 1000) / 10 : 0,
    };
  });
  return {
    eligibleRoomPeriods,
    occupiedRoomPeriods,
    utilizationPercent: eligibleRoomPeriods ? Math.round((occupiedRoomPeriods / eligibleRoomPeriods) * 1000) / 10 : 0,
    wastedSeatPeriods,
    occupiedSeatPeriods,
    byPeriod,
    measurement: 'occupied room-periods divided by eligible weekly room-periods; bookings and classes count as occupied',
  };
}

export async function listRooms(filters = {}) {
  const context = await loadRoomContext();
  const needs = splitFeatures(filters.features);
  const rows = context.rooms.filter((room) => {
    if (filters.minCapacity && room.capacity < filters.minCapacity) return false;
    if (filters.type && room.type !== filters.type) return false;
    if (filters.accessible !== undefined && room.accessible !== filters.accessible) return false;
    return needs.every((feature) => (room.features ?? []).includes(feature) || (feature === 'accessible' && room.accessible));
  }).map((room) => ({ ...room, utilization: weeklyUtilization(room, context) }));
  return rows;
}

export async function getRoom(roomId) {
  const context = await loadRoomContext();
  const room = context.rooms.find((item) => item.sourceId === roomId);
  if (!room) throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room was not found.');
  return { ...room, utilization: weeklyUtilization(room, context) };
}

export async function findRooms(criteria) {
  const context = await loadRoomContext();
  const originRoom = criteria.originRoomId
    ? context.rooms.find((room) => room.sourceId === criteria.originRoomId)
    : null;
  if (criteria.originRoomId && !originRoom) {
    throw new ApiError(422, 'ROOM_NOT_FOUND', `Unknown origin room ${criteria.originRoomId}.`);
  }
  const originBuilding = originRoom?.building ?? criteria.originBuilding;
  if (originBuilding && !context.rooms.some((room) => room.building.localeCompare(originBuilding, undefined, { sensitivity: 'accent' }) === 0)) {
    throw new ApiError(422, 'BUILDING_NOT_FOUND', `Unknown origin building ${originBuilding}.`);
  }
  if (!context.assignments.length) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'Generate an active timetable before searching time-specific room availability.');
  const results = context.rooms.map((room) => {
    const check = available(room, criteria, context);
    const features = new Set([...(room.features ?? []), ...(room.accessible ? ['accessible'] : [])]);
    const missingFeatures = criteria.needs.filter((feature) => !features.has(feature));
    const excessCapacity = criteria.attendance ? Math.max(0, room.capacity - criteria.attendance) : 0;
    const utilization = weeklyUtilization(room, context);
    const capacityWastePercent = criteria.attendance ? (excessCapacity / room.capacity) * 100 : 0;
    const location = roomLocationPreference(room, originBuilding);
    const locationPenalty = location?.penalty ?? 0;
    const rankScore = (check.available ? 0 : 1_000_000) + locationPenalty + capacityWastePercent + missingFeatures.length * 100 + utilization.utilizationPercent / 100;
    const rankReasons = [check.available ? 'Available for the requested slot' : check.reason];
    if (location) rankReasons.push(location.reason);
    if (criteria.attendance && check.available) rankReasons.push(`Capacity fit: ${room.capacity} seats for ${criteria.attendance} attendees`);
    if (criteria.needs?.length && missingFeatures.length === 0) rankReasons.push('All requested features are available');
    if (criteria.needsAccessible && room.accessible) rankReasons.push('Accessibility requirement is met');
    if (check.available) rankReasons.push(`Weekly room utilization is ${utilization.utilizationPercent}%`);
    return {
      room,
      ...check,
      utilization,
      ...(originBuilding ? { locationPreference: {
        ...(originRoom ? { originRoomId: originRoom.sourceId } : {}),
        originBuilding,
        sameBuilding: location.sameBuilding,
        distanceMeters: null,
      } } : {}),
      rankReasons,
      rankScore,
    };
  }).filter((item) => (!criteria.availableOnly || item.available)
    && (!criteria.roomTypes?.length || criteria.roomTypes.includes(item.room.type)));
  return results.sort((a, b) => a.rankScore - b.rankScore || a.room.sourceId.localeCompare(b.room.sourceId))
    .map(({ rankScore, ...item }) => item);
}

export async function getRoomUtilization(roomId) {
  const context = await loadRoomContext();
  const room = context.rooms.find((item) => item.sourceId === roomId);
  if (!room) throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room was not found.');
  return { roomId, ...weeklyUtilization(room, context) };
}

export async function getRoomUtilizationDashboard({ thresholdPercent = 30 } = {}) {
  const context = await loadRoomContext();
  const rooms = context.rooms.map((room) => {
    const utilization = weeklyUtilization(room, context);
    const idlePeriods = utilization.byPeriod.filter((item) => item.eligibleDays && item.utilizationPercent < thresholdPercent).map((item) => item.period);
    return {
      roomId: room.sourceId,
      name: room.name,
      building: room.building,
      type: room.type,
      capacity: room.capacity,
      ...utilization,
      underutilized: utilization.utilizationPercent < thresholdPercent,
      insight: utilization.utilizationPercent < thresholdPercent
        ? `Low weekly use${idlePeriods.length ? ` during P${idlePeriods.join(', P')}` : ''}.`
        : null,
    };
  }).sort((a, b) => a.utilizationPercent - b.utilizationPercent || a.roomId.localeCompare(b.roomId));
  const underutilizedRooms = rooms.filter((room) => room.underutilized);
  return {
    thresholdPercent,
    roomCount: rooms.length,
    underutilizedCount: underutilizedRooms.length,
    averageUtilizationPercent: rooms.length ? Math.round((rooms.reduce((sum, room) => sum + room.utilizationPercent, 0) / rooms.length) * 10) / 10 : 0,
    underutilizedRooms,
    rooms,
  };
}
