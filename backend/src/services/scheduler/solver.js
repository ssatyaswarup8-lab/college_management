import { generateCandidates } from './candidate.generator.js';
import { addAssignment, removeAssignment, validatePlacement } from './hard.constraints.js';

const getId = (session) => session.sourceId ?? session.id;
const getField = (session, camel, snake) => session[camel] ?? session[snake];

function placementCost(session, candidate, context) {
  const periods = Array.from({ length: session.duration }, (_value, index) => candidate.startPeriod + index);
  const room = context.rooms.get(candidate.roomId);
  let cost = candidate.roomSlack;
  if (periods.includes(9)) cost += 20;
  if (room?.capacity && session.size / room.capacity < 0.4) cost += 12;
  const instructor = context.faculty.get(getField(session, 'facultyId', 'faculty_id'));
  for (const preference of instructor?.preferences ?? []) {
    if (preference.type === 'avoid' && (preference.days ?? context.days).includes(candidate.day)) {
      cost += 2 * periods.filter((period) => preference.periods?.includes(period)).length;
    }
  }
  return cost;
}

function degreeOf(session, sessions) {
  const groups = new Set(session.groups ?? []);
  const facultyId = getField(session, 'facultyId', 'faculty_id');
  const basket = getField(session, 'basketSlot', 'basket_slot');
  let degree = 0;
  for (const other of sessions) {
    if (getId(other) === getId(session)) continue;
    if (getField(other, 'facultyId', 'faculty_id') === facultyId) degree += 4;
    if ((other.groups ?? []).some((groupId) => groups.has(groupId))) degree += 2;
    if (basket && getField(other, 'basketSlot', 'basket_slot') === basket) degree += 8;
  }
  return degree;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffleTies(candidates, session, context, random) {
  const decorated = candidates.map((candidate) => ({
    candidate,
    cost: placementCost(session, candidate, context),
    tie: random(),
  }));
  decorated.sort((a, b) => a.cost - b.cost || a.tie - b.tie);
  return decorated.map(({ candidate }) => candidate);
}

export async function solveTimetable(context, sessions, {
  maxNodes = 300_000,
  maxTimeMs = 30_000,
  restarts = 3,
  yieldEvery = 1_000,
} = {}) {
  const startedAt = Date.now();
  const domains = new Map();
  const noDomain = [];
  for (const session of sessions) {
    const id = getId(session);
    const candidates = generateCandidates(session, context);
    if (!candidates.length) noDomain.push(id);
    domains.set(id, candidates);
  }
  if (noDomain.length) {
    return { solved: false, assignments: [], nodes: 0, elapsedMs: Date.now() - startedAt, reason: 'NO_STATIC_CANDIDATES', unscheduledSessionIds: noDomain };
  }

  const ordered = [...sessions].sort((a, b) => {
    const domainDifference = domains.get(getId(a)).length - domains.get(getId(b)).length;
    if (domainDifference) return domainDifference;
    const degreeDifference = degreeOf(b, sessions) - degreeOf(a, sessions);
    if (degreeDifference) return degreeDifference;
    return b.duration - a.duration || b.size - a.size || getId(a).localeCompare(getId(b));
  });

  let totalNodes = 0;
  let bestUnscheduled = ordered.map(getId);
  let timedOut = false;
  for (let attempt = 0; attempt < restarts; attempt += 1) {
    context.assignments = [];
    const placements = new Map();
    const random = seededRandom(0xC17 + attempt * 7919);
    let attemptNodes = 0;

    async function search(index) {
      if (index >= ordered.length) return true;
      if (totalNodes >= maxNodes || Date.now() - startedAt >= maxTimeMs) {
        timedOut = true;
        return false;
      }
      totalNodes += 1;
      attemptNodes += 1;
      if (yieldEvery > 0 && totalNodes % yieldEvery === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }

      const selectedSession = ordered[index];
      const sessionId = getId(selectedSession);
      const selectedCandidates = domains.get(sessionId).filter((candidate) =>
        validatePlacement(context, selectedSession, candidate).length === 0);
      if (!selectedCandidates.length) {
        bestUnscheduled = ordered.slice(index).map(getId);
        return false;
      }

      for (const candidate of shuffleTies(selectedCandidates, selectedSession, context, random)) {
        const assignment = {
          sessionId,
          day: candidate.day,
          startPeriod: candidate.startPeriod,
          roomId: candidate.roomId,
        };
        placements.set(sessionId, assignment);
        addAssignment(context, assignment);
        if (await search(index + 1)) return true;
        removeAssignment(context, sessionId);
        placements.delete(sessionId);
        if (timedOut) break;
      }
      return false;
    }

    if (await search(0)) {
      return {
        solved: true,
        assignments: [...placements.values()],
        nodes: totalNodes,
        elapsedMs: Date.now() - startedAt,
      };
    }
    if (timedOut || attemptNodes === 0) break;
  }

  return {
    solved: false,
    assignments: [],
    nodes: totalNodes,
    elapsedMs: Date.now() - startedAt,
    reason: timedOut ? 'SEARCH_LIMIT_REACHED' : 'NO_VALID_ASSIGNMENT',
    unscheduledSessionIds: bestUnscheduled,
  };
}
