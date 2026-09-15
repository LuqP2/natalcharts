import {
  Body,
  HouseSystem,
  MAJOR_ASPECTS,
  findAspects,
  normalizeDegrees,
  type OrbScheme,
  type SwissEph,
} from "@kuntay/swisseph";
import type {
  AspectData,
  AspectKind,
  BirthInput,
  BodyId,
  BodyPosition,
  ChartData,
  ChartWarning,
} from "./types";

export const BODY_CONFIG = [
  { id: "sun", label: "Sol", symbol: "☉", body: Body.Sun },
  { id: "moon", label: "Lua", symbol: "☽", body: Body.Moon },
  { id: "mercury", label: "Mercúrio", symbol: "☿", body: Body.Mercury },
  { id: "venus", label: "Vênus", symbol: "♀", body: Body.Venus },
  { id: "mars", label: "Marte", symbol: "♂", body: Body.Mars },
  { id: "jupiter", label: "Júpiter", symbol: "♃", body: Body.Jupiter },
  { id: "saturn", label: "Saturno", symbol: "♄", body: Body.Saturn },
  { id: "uranus", label: "Urano", symbol: "♅", body: Body.Uranus },
  { id: "neptune", label: "Netuno", symbol: "♆", body: Body.Neptune },
  { id: "pluto", label: "Plutão", symbol: "♇", body: Body.Pluto },
] as const;

export const MVP_ORBS: OrbScheme = {
  name: "Mandala Natal MVP",
  byAspect: {
    Conjunction: 8,
    Opposition: 8,
    Trine: 7,
    Square: 7,
    Sextile: 5,
  },
  fallback: 0,
};

const ASPECT_KIND: Record<string, AspectKind> = {
  Conjunction: "conjunction",
  Sextile: "sextile",
  Square: "square",
  Trine: "trine",
  Opposition: "opposition",
};

function utcParts(instantUtc: string) {
  const instant = new Date(instantUtc);
  if (Number.isNaN(instant.getTime())) throw new Error("Instante UTC inválido.");
  return {
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
    hour:
      instant.getUTCHours() +
      instant.getUTCMinutes() / 60 +
      instant.getUTCSeconds() / 3600 +
      instant.getUTCMilliseconds() / 3_600_000,
  };
}

function requireSwiss(body: BodyPosition, source: string, warning: string | null) {
  if (source !== "swiss") {
    throw new Error(
      `O cálculo de ${body.label} não usou a efeméride Swiss. Tente novamente.`,
    );
  }
  return warning;
}

export function calculateChartWithEngine(
  engine: SwissEph,
  input: BirthInput,
  instantUtc: string,
): ChartData {
  const utc = utcParts(instantUtc);
  const jd = engine.julianDay(utc.year, utc.month, utc.day, utc.hour);
  const warnings: ChartWarning[] = [];

  const planets = BODY_CONFIG.map((config) => {
    const position = engine.calcWithSign(jd, config.body, { ephemeris: "swiss" });
    const body: BodyPosition = {
      id: config.id,
      label: config.label,
      symbol: config.symbol,
      longitude: position.longitude,
      longitudeSpeed: position.longitudeSpeed,
      signIndex: position.signIndex,
      degreeInSign: position.degreeInSign,
      retrograde: position.retrograde,
      isPoint: false,
    };
    const warning = requireSwiss(body, position.ephemeris, position.warning);
    if (warning) warnings.push({ code: "ephemeris-warning", message: warning });
    return body;
  });

  const northPosition = engine.calcWithSign(jd, Body.NorthNodeTrue, {
    ephemeris: "swiss",
  });
  const northNode: BodyPosition = {
    id: "north-node",
    label: "Nodo Norte",
    symbol: "☊",
    longitude: northPosition.longitude,
    longitudeSpeed: northPosition.longitudeSpeed,
    signIndex: northPosition.signIndex,
    degreeInSign: northPosition.degreeInSign,
    retrograde: northPosition.retrograde,
    isPoint: true,
  };
  const nodeWarning = requireSwiss(
    northNode,
    northPosition.ephemeris,
    northPosition.warning,
  );
  if (nodeWarning) {
    warnings.push({ code: "ephemeris-warning", message: nodeWarning });
  }

  const southLongitude = normalizeDegrees(northPosition.longitude + 180);
  const southNode: BodyPosition = {
    id: "south-node",
    label: "Nodo Sul",
    symbol: "☋",
    longitude: southLongitude,
    longitudeSpeed: northPosition.longitudeSpeed,
    signIndex: Math.floor(southLongitude / 30),
    degreeInSign: southLongitude % 30,
    retrograde: northPosition.retrograde,
    isPoint: true,
  };

  const houses = engine.houses(
    jd,
    input.place.latitude,
    input.place.longitude,
    HouseSystem.Placidus,
    { ephemeris: "swiss" },
  );

  if (houses.substituted) {
    warnings.push({
      code: "polar-house-substitution",
      message:
        "Nesta latitude, Placidus não é definido; o Swiss Ephemeris usou casas Porphyry.",
    });
  } else if (houses.warning) {
    warnings.push({ code: "ephemeris-warning", message: houses.warning });
  }

  const aspectPoints = planets.map((planet, index) => ({
    name: planet.id,
    longitude: planet.longitude,
    speed: planet.longitudeSpeed,
    body: BODY_CONFIG[index].body,
  }));
  const aspects: AspectData[] = findAspects(aspectPoints, {
    aspects: MAJOR_ASPECTS,
    orbs: MVP_ORBS,
  }).map((aspect) => ({
    from: aspect.from.name as BodyId,
    to: aspect.to.name as BodyId,
    kind: ASPECT_KIND[aspect.aspect.name],
    separation: aspect.separation,
    exactAngle: aspect.aspect.angle,
    orb: aspect.orb,
    applying: aspect.applying,
  }));

  return {
    source: "swiss",
    julianDay: jd,
    instantUtc,
    place: input.place,
    bodies: [...planets, northNode, southNode],
    houses: houses.cusps.map((longitude, index) => ({
      number: index + 1,
      longitude,
    })),
    angles: {
      ascendant: houses.ascendant,
      midheaven: houses.midheaven,
      descendant: houses.descendant,
      imumCoeli: houses.imumCoeli,
    },
    aspects,
    warnings,
  };
}
