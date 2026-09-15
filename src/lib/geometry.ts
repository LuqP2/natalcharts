export interface Point {
  x: number;
  y: number;
}

export interface PlanetLabelInput {
  id: string;
  longitude: number;
}

export interface PlanetLabelLayout extends PlanetLabelInput {
  trueAngle: number;
  labelAngle: number;
  radius: number;
  point: Point;
}

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function displayAngle(longitude: number, ascendant: number): number {
  return normalizeDegrees(180 - normalizeDegrees(longitude - ascendant));
}

export function pointOnCircle(
  angleDegrees: number,
  radius: number,
  center = 500,
): Point {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: center + Math.cos(radians) * radius,
    y: center + Math.sin(radians) * radius,
  };
}

export function clockwiseMidpoint(start: number, end: number): number {
  const distance = normalizeDegrees(end - start);
  return normalizeDegrees(start + distance / 2);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function layoutPlanetLabels(
  bodies: PlanetLabelInput[],
  ascendant: number,
): PlanetLabelLayout[] {
  const placed: PlanetLabelLayout[] = [];
  const candidates = [
    { radius: 315, offset: 0 },
    { radius: 262, offset: 0 },
    { radius: 315, offset: -5 },
    { radius: 262, offset: 5 },
    { radius: 315, offset: 10 },
    { radius: 262, offset: -10 },
    { radius: 315, offset: -15 },
    { radius: 262, offset: 15 },
  ];

  const sorted = bodies
    .map((body) => ({ ...body, trueAngle: displayAngle(body.longitude, ascendant) }))
    .sort((a, b) => a.trueAngle - b.trueAngle);

  for (const body of sorted) {
    let selected: PlanetLabelLayout | undefined;

    for (const candidate of candidates) {
      const labelAngle = normalizeDegrees(body.trueAngle + candidate.offset);
      const point = pointOnCircle(labelAngle, candidate.radius);
      if (placed.every((other) => distance(point, other.point) >= 58)) {
        selected = {
          ...body,
          labelAngle,
          radius: candidate.radius,
          point,
        };
        break;
      }
    }

    placed.push(
      selected ?? {
        ...body,
        labelAngle: body.trueAngle,
        radius: placed.length % 2 === 0 ? 315 : 262,
        point: pointOnCircle(
          body.trueAngle,
          placed.length % 2 === 0 ? 315 : 262,
        ),
      },
    );
  }

  return placed;
}
