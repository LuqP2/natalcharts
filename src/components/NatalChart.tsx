import {
  clockwiseMidpoint,
  displayAngle,
  layoutPlanetLabels,
  normalizeDegrees,
  pointOnCircle,
} from "@/lib/geometry";
import type { AspectKind, ChartData } from "@/lib/types";

const SIGNS = [
  { name: "Áries", symbol: "♈", element: "fire" },
  { name: "Touro", symbol: "♉", element: "earth" },
  { name: "Gêmeos", symbol: "♊", element: "air" },
  { name: "Câncer", symbol: "♋", element: "water" },
  { name: "Leão", symbol: "♌", element: "fire" },
  { name: "Virgem", symbol: "♍", element: "earth" },
  { name: "Libra", symbol: "♎", element: "air" },
  { name: "Escorpião", symbol: "♏", element: "water" },
  { name: "Sagitário", symbol: "♐", element: "fire" },
  { name: "Capricórnio", symbol: "♑", element: "earth" },
  { name: "Aquário", symbol: "♒", element: "air" },
  { name: "Peixes", symbol: "♓", element: "water" },
] as const;

const ELEMENT_FILL = {
  fire: "#ead3bd",
  earth: "#d8dcc6",
  air: "#d9e2e3",
  water: "#cedce3",
};

const ASPECT_STYLE: Record<AspectKind, { color: string; dash?: string }> = {
  conjunction: { color: "#91754f", dash: "3 7" },
  sextile: { color: "#668177", dash: "6 5" },
  square: { color: "#b0645d" },
  trine: { color: "#587d75" },
  opposition: { color: "#a94f4a" },
};

function annularSector(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const startOuter = pointOnCircle(startAngle, outerRadius);
  const endOuter = pointOnCircle(endAngle, outerRadius);
  const endInner = pointOnCircle(endAngle, innerRadius);
  const startInner = pointOnCircle(startAngle, innerRadius);
  const sweep = normalizeDegrees(startAngle - endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function formatDegree(value: number): string {
  const degrees = Math.floor(value);
  const minutes = Math.floor((value - degrees) * 60);
  return `${degrees}°${String(minutes).padStart(2, "0")}′`;
}

export function NatalChart({ chart }: { chart: ChartData }) {
  const ascendant = chart.angles.ascendant;
  const byId = new Map(chart.bodies.map((body) => [body.id, body]));
  const labels = layoutPlanetLabels(chart.bodies, ascendant);

  return (
    <figure className="chart-figure">
      <svg
        className="natal-chart"
        viewBox="0 0 1000 1000"
        role="img"
        aria-labelledby="chart-title chart-description"
      >
        <title id="chart-title">Mandala do mapa natal</title>
        <desc id="chart-description">
          Mandala tropical com casas Placidus, planetas, nodos, Ascendente,
          Meio do Céu e aspectos maiores.
        </desc>

        <circle cx="500" cy="500" r="462" className="chart-paper" />

        {SIGNS.map((sign, index) => {
          const start = displayAngle(index * 30, ascendant);
          const end = displayAngle((index + 1) * 30, ascendant);
          return (
            <path
              key={sign.name}
              d={annularSector(start, end, 356, 440)}
              fill={ELEMENT_FILL[sign.element]}
              className="zodiac-sector"
            />
          );
        })}

        {[440, 356, 238].map((radius) => (
          <circle
            key={radius}
            cx="500"
            cy="500"
            r={radius}
            className="ring-line"
          />
        ))}

        {SIGNS.map((sign, index) => {
          const boundary = pointOnCircle(displayAngle(index * 30, ascendant), 440);
          const boundaryInner = pointOnCircle(
            displayAngle(index * 30, ascendant),
            356,
          );
          const label = pointOnCircle(
            displayAngle(index * 30 + 15, ascendant),
            398,
          );
          return (
            <g key={sign.name}>
              <line
                x1={boundaryInner.x}
                y1={boundaryInner.y}
                x2={boundary.x}
                y2={boundary.y}
                className="zodiac-boundary"
              />
              <text
                x={label.x}
                y={label.y}
                className="zodiac-symbol symbol-font"
                dominantBaseline="central"
                textAnchor="middle"
              >
                {sign.symbol}
              </text>
            </g>
          );
        })}

        {chart.houses.map((house, index) => {
          const angle = displayAngle(house.longitude, ascendant);
          const inner = pointOnCircle(angle, 238);
          const outer = pointOnCircle(angle, 356);
          const nextHouse = chart.houses[(index + 1) % chart.houses.length];
          const midpointLongitude = clockwiseMidpoint(
            house.longitude,
            nextHouse.longitude,
          );
          const numberPoint = pointOnCircle(
            displayAngle(midpointLongitude, ascendant),
            252,
          );
          return (
            <g key={house.number}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                className={house.number % 3 === 1 ? "house-line angle-house" : "house-line"}
              />
              <text
                x={numberPoint.x}
                y={numberPoint.y}
                className="house-number"
                dominantBaseline="central"
                textAnchor="middle"
              >
                {house.number}
              </text>
            </g>
          );
        })}

        {chart.aspects.map((aspect, index) => {
          const from = byId.get(aspect.from);
          const to = byId.get(aspect.to);
          if (!from || !to) return null;
          const fromPoint = pointOnCircle(
            displayAngle(from.longitude, ascendant),
            222,
          );
          const toPoint = pointOnCircle(
            displayAngle(to.longitude, ascendant),
            222,
          );
          const style = ASPECT_STYLE[aspect.kind];
          return (
            <line
              key={`${aspect.from}-${aspect.to}-${index}`}
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={style.color}
              strokeDasharray={style.dash}
              className="aspect-line"
            >
              <title>
                {from.label} — {to.label}: {aspect.kind}, orbe {aspect.orb.toFixed(2)}°
              </title>
            </line>
          );
        })}

        <circle cx="500" cy="500" r="222" className="aspect-boundary" />
        <circle cx="500" cy="500" r="6" className="center-point" />

        {labels.map((layout) => {
          const body = byId.get(layout.id as (typeof chart.bodies)[number]["id"]);
          if (!body) return null;
          const tickInner = pointOnCircle(layout.trueAngle, 322);
          const tickOuter = pointOnCircle(layout.trueAngle, 350);
          const leaderEnd = pointOnCircle(layout.labelAngle, layout.radius - 19);
          return (
            <g key={body.id}>
              <line
                x1={tickInner.x}
                y1={tickInner.y}
                x2={tickOuter.x}
                y2={tickOuter.y}
                className="planet-tick"
              />
              <line
                x1={tickInner.x}
                y1={tickInner.y}
                x2={leaderEnd.x}
                y2={leaderEnd.y}
                className="planet-leader"
              />
              <text
                x={layout.point.x}
                y={layout.point.y - 4}
                className="planet-symbol symbol-font"
                dominantBaseline="central"
                textAnchor="middle"
              >
                {body.symbol}
                <title>
                  {body.label}: {SIGNS[body.signIndex].name} {formatDegree(body.degreeInSign)}
                  {body.retrograde ? ", retrógrado" : ""}
                </title>
              </text>
              <text
                x={layout.point.x}
                y={layout.point.y + 17}
                className="planet-degree"
                dominantBaseline="central"
                textAnchor="middle"
              >
                {formatDegree(body.degreeInSign)}{body.retrograde ? " ℞" : ""}
              </text>
            </g>
          );
        })}

        {[
          { label: "ASC", longitude: chart.angles.ascendant },
          { label: "MC", longitude: chart.angles.midheaven },
        ].map((angle) => {
          const point = pointOnCircle(
            displayAngle(angle.longitude, ascendant),
            461,
          );
          return (
            <text
              key={angle.label}
              x={point.x}
              y={point.y}
              className="angle-label"
              dominantBaseline="central"
              textAnchor="middle"
            >
              {angle.label}
            </text>
          );
        })}
      </svg>

      <figcaption>
        {chart.place.name}
        {chart.place.subdivision ? `, ${chart.place.subdivision}` : ""} · zodíaco
        tropical · casas {chart.warnings.some((warning) => warning.code === "polar-house-substitution") ? "Porphyry" : "Placidus"}
      </figcaption>
    </figure>
  );
}
