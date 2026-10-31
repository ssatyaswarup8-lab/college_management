const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function calculateStudentGroupGaps({ assignments, sessions, groups, groupIds = null }) {
  const sessionMap = new Map(sessions.map((row) => [row.sourceId ?? row.id, row]));
  const groupMap = new Map(groups.map((row) => [row.sourceId ?? row.id, row]));
  const allowedGroups = groupIds ? new Set(groupIds) : null;
  const occupiedByGroupDay = new Map();

  for (const assignment of assignments) {
    const session = sessionMap.get(assignment.sessionId);
    if (!session) continue;
    for (const groupId of session.groups ?? []) {
      if (allowedGroups && !allowedGroups.has(groupId)) continue;
      const key = `${groupId}|${assignment.day}`;
      if (!occupiedByGroupDay.has(key)) occupiedByGroupDay.set(key, new Set());
      for (let offset = 0; offset < session.duration; offset += 1) {
        occupiedByGroupDay.get(key).add(assignment.startPeriod + offset);
      }
    }
  }

  const gaps = [];
  for (const [key, occupied] of occupiedByGroupDay) {
    const [groupId, day] = key.split('|');
    const periods = [...occupied].sort((left, right) => left - right);
    const gapPeriods = periods.length
      ? Array.from({ length: periods.at(-1) - periods[0] + 1 }, (_value, index) => periods[0] + index)
        .filter((period) => !occupied.has(period))
      : [];
    gaps.push({
      groupId,
      groupName: groupMap.get(groupId)?.name ?? groupId,
      day,
      gapCount: gapPeriods.length,
      gapPeriods,
    });
  }
  return gaps.filter((row) => row.gapCount > 0).sort((left, right) => right.gapCount - left.gapCount
    || left.groupId.localeCompare(right.groupId)
    || DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day));
}

export function compareStudentGroupGaps({ beforeAssignments, afterAssignments, sessions, groups, groupIds }) {
  const before = new Map(calculateStudentGroupGaps({ assignments: beforeAssignments, sessions, groups, groupIds })
    .map((row) => [`${row.groupId}|${row.day}`, row]));
  const after = new Map(calculateStudentGroupGaps({ assignments: afterAssignments, sessions, groups, groupIds })
    .map((row) => [`${row.groupId}|${row.day}`, row]));
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].map((key) => {
    const oldValue = before.get(key);
    const newValue = after.get(key);
    const [groupId, day] = key.split('|');
    const beforeGapPeriods = oldValue?.gapPeriods ?? [];
    const afterGapPeriods = newValue?.gapPeriods ?? [];
    return {
      groupId,
      groupName: oldValue?.groupName ?? newValue?.groupName ?? groupId,
      day,
      beforeGapCount: beforeGapPeriods.length,
      afterGapCount: afterGapPeriods.length,
      difference: afterGapPeriods.length - beforeGapPeriods.length,
      beforeGapPeriods,
      afterGapPeriods,
    };
  }).filter((row) => row.difference !== 0 || row.beforeGapPeriods.join(',') !== row.afterGapPeriods.join(','))
    .sort((left, right) => left.groupId.localeCompare(right.groupId) || DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day));
}
