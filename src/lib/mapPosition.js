export const DEFAULT_SECTORS = [
  { id: "north", label: "Member defence" },
  { id: "east", label: "Campaign work" },
  { id: "south", label: "Branch activity" },
  { id: "west", label: "Reconnect / follow-up" },
];
export const DEFAULT_SECTOR_SIZES = [90, 90, 90, 90];

const hash = (value) => {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

export function defaultMapPosition(person) {
  const numeric = Number(String(person.id || "").match(/\d+/)?.[0]);
  const seed = hash(`${person.id}:${person.name}`);
  return {
    mapAngle:
      Number.isFinite(numeric) && numeric > 0
        ? (numeric * 137.507764) % 360
        : seed % 360,
    mapOffset: (((seed >>> 8) % 101) / 100) * 3.2 - 1.6,
  };
}

export function withMapPosition(person) {
  const fallback = defaultMapPosition(person);
  return {
    ...person,
    mapAngle: Number.isFinite(person.mapAngle)
      ? person.mapAngle
      : fallback.mapAngle,
    mapOffset: Number.isFinite(person.mapOffset)
      ? person.mapOffset
      : fallback.mapOffset,
  };
}

export function positionPeople(people) {
  const groups = new Map();
  people.forEach((person) => {
    if (!groups.has(person.layer)) groups.set(person.layer, []);
    groups.get(person.layer).push(person);
  });
  return people.map((person) => {
    if (Number.isFinite(person.mapAngle) && Number.isFinite(person.mapOffset))
      return person;
    const peers = groups.get(person.layer),
      index = peers.indexOf(person),
      layerShift =
        ["constituency", "member", "involved", "active", "core"].indexOf(
          person.layer,
        ) * 27;
    return {
      ...person,
      mapAngle: ((index / Math.max(1, peers.length)) * 360 + layerShift) % 360,
      mapOffset: ((index % 3) - 1) * 1.45,
    };
  });
}

export const normaliseSectorSizes = (sizes) => {
  const values = (
    Array.isArray(sizes) && sizes.length === 4 ? sizes : DEFAULT_SECTOR_SIZES
  ).map((value) => Math.max(20, Number(value) || 90));
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => (value / total) * 360);
};
export const sectorIndexForAngle = (angle, sizes = DEFAULT_SECTOR_SIZES, startAngle = 0) => {
  const value = ((((Number(angle) || 0) - startAngle) % 360) + 360) % 360,
    normalised = normaliseSectorSizes(sizes);
  let edge = 0;
  for (let index = 0; index < normalised.length; index++) {
    edge += normalised[index];
    if (value < edge) return index;
  }
  return 3;
};
export const sectorAngle = (index, sizes = DEFAULT_SECTOR_SIZES, startAngle = 0) => {
  const normalised = normaliseSectorSizes(sizes);
  return (
    startAngle + normalised.slice(0, index).reduce((sum, value) => sum + value, 0) +
    normalised[index] / 2
  );
};

export const remapAngleBetweenSectorSizes = (angle, fromSizes, toSizes, fromAngle = 0, toAngle = 0) => {
  const from = normaliseSectorSizes(fromSizes),
    to = normaliseSectorSizes(toSizes),
    index = sectorIndexForAngle(angle, from, fromAngle),
    value = ((((Number(angle) || 0) - fromAngle) % 360) + 360) % 360,
    fromStart = from.slice(0, index).reduce((sum, size) => sum + size, 0),
    toStart = to.slice(0, index).reduce((sum, size) => sum + size, 0),
    progress = Math.max(0, Math.min(1, (value - fromStart) / from[index]));
  return (toAngle + toStart + progress * to[index] + 360) % 360;
};
