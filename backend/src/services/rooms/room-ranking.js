export function roomLocationPreference(room, originBuilding) {
  if (!originBuilding) return null;
  const sameBuilding = room.building.localeCompare(originBuilding, undefined, { sensitivity: 'accent' }) === 0;
  return {
    sameBuilding,
    penalty: sameBuilding ? 0 : 1000,
    reason: sameBuilding
      ? `Same building as origin (${originBuilding})`
      : `Different building from origin (${originBuilding}); exact distance is not in the dataset`,
  };
}
