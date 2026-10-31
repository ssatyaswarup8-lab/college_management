import { effectiveCategory } from './booking.validator.js';

export function bookingPriority(dataset, request) {
  const order = dataset.priorityOrder ?? dataset.priority_order ?? [];
  const requestedCategory = request.requestedCategory ?? request.requested_category ?? null;
  const category = effectiveCategory(dataset, request);
  const orderIndex = order.indexOf(category);
  const requestedIndex = order.indexOf(requestedCategory);
  return {
    category,
    rank: orderIndex >= 0 ? orderIndex + 1 : order.length || 1,
    requestedCategory,
    requestedRank: requestedIndex >= 0 ? requestedIndex + 1 : null,
    roleCapApplied: Boolean(requestedCategory && category !== requestedCategory),
    priorityOrder: order,
  };
}

export function compareBookingPriority(dataset, left, right) {
  const priorityDifference = bookingPriority(dataset, left).rank - bookingPriority(dataset, right).rank;
  if (priorityDifference) return priorityDifference;
  return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
}

function field(row, camel, snake) {
  return row?.[camel] ?? row?.[snake];
}

export function findHigherPriorityPendingConflicts(dataset, request, placement, pendingRequests) {
  const currentPriority = bookingPriority(dataset, request);
  const endPeriod = placement.startPeriod + request.durationPeriods - 1;
  const currentGroups = new Set(request.mandatoryForGroups ?? request.mandatory_for_groups ?? []);
  return pendingRequests.filter((other) => {
    if ((request._id && String(other._id) === String(request._id)) ||
      (request.sourceId && other.sourceId && String(other.sourceId) === String(request.sourceId))) return false;
    const otherPriority = bookingPriority(dataset, other);
    if (otherPriority.rank >= currentPriority.rank) return false;
    const overlapsWindow = (other.windows ?? []).some((window) => {
      const from = field(window, 'fromPeriod', 'from_period');
      const to = field(window, 'toPeriod', 'to_period');
      return window.day === placement.day && from <= endPeriod && placement.startPeriod <= to;
    });
    if (!overlapsWindow) return false;
    const sameRequestedRoom = Boolean(other.requestedRoom && other.requestedRoom === placement.roomId);
    const otherGroups = other.mandatoryForGroups ?? other.mandatory_for_groups ?? [];
    const sharedMandatoryGroups = otherGroups.filter((groupId) => currentGroups.has(groupId));
    if (!sameRequestedRoom && !sharedMandatoryGroups.length) return false;
    return true;
  }).map((other) => {
    const priority = bookingPriority(dataset, other);
    const sharedMandatoryGroups = (other.mandatoryForGroups ?? other.mandatory_for_groups ?? [])
      .filter((groupId) => (request.mandatoryForGroups ?? request.mandatory_for_groups ?? []).includes(groupId));
    return {
      requestId: other.sourceId ?? String(other._id),
      title: other.title,
      priorityCategory: priority.category,
      priorityRank: priority.rank,
      sharedRequestedRoom: Boolean(other.requestedRoom && other.requestedRoom === placement.roomId),
      sharedMandatoryGroups,
    };
  }).sort((left, right) => left.priorityRank - right.priorityRank);
}
