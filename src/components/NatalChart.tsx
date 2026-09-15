import {
  clockwiseMidpoint,
  displayAngle,
  layoutPlanetLabels,
  normalizeDegrees,
  pointOnCircle,
} from "@/lib/geometry";
import {
  getChartTemplate,
  publicAsset,
  type ChartTemplateId,
} from "@/lib/chart-templates";
import type { AspectKind, ChartData } from "@/lib/types";
import type { CSSProperties } from "react";

const SIGNS = [
  { id: "aries", name: "Áries" },
  { id: "taurus", name: "Touro" },
  { id: "gemini", name: "Gêmeos" },
  { id: "cancer", name: "Câncer" },
  { id: "leo", name: "Leão" },
  { id: "virgo", name: "Virgem" },
  { id: "libra", name: "Libra" },
  { id: "scorpio", name: "Escorpião" },
  { id: "sagittarius", name: "Sagitário" },
  { id: "capricorn", name: "Capricórnio" },
  { id: "aquarius", name: "Aquário" },
  { id: "pisces", name: "Peixes" },
] as const;

const ASPECT_DASH: Partial<Record<AspectKind, string>> = {
  conjunction: "3 7",
  sextile: "6 5",
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

export function NatalChart({
  chart,
  templateId = "obsidian-gold",
}: {
  chart: ChartData;
  templateId?: ChartTemplateId;
}) {
  const template = getChartTemplate(templateId);
  const ascendant = chart.angles.ascendant;
  const byId = new Map(chart.bodies.map((body) => [body.id, body]));
  const labels = layoutPlanetLabels(chart.bodies, ascendant);
  const chartStyle = {
    "--chart-gold": template.palette.gold,
    "--chart-gold-highlight": template.palette.goldHighlight,
    "--chart-shadow": template.palette.shadow,
    "--chart-text": template.palette.text,
    "--chart-muted-text": template.palette.mutedText,
  } as CSSProperties;

  const aspectColor = (kind: AspectKind) => {
    if (kind === "square" || kind === "opposition") {
      return template.palette.tenseAspect;
    }
    if (kind === "trine" || kind === "sextile") {
      return template.palette.harmoniousAspect;
    }
    return template.palette.neutralAspect;
  };

  return (
    <figure className="chart-figure" data-template={template.id}>
      <svg
        className="natal-chart"
        viewBox="0 0 1000 1000"
        style={chartStyle}
        role="img"
        aria-labelledby="chart-title chart-description"
      >
        <title id="chart-title">Mandala do mapa natal</title>
        <desc id="chart-description">
          Mandala tropical com casas Placidus, planetas, nodos, Ascendente,
          Meio do Céu e aspectos maiores.
        </desc>

        <defs>
          <linearGradient id="dynamic-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={template.palette.goldHighlight} />
            <stop offset="0.48" stopColor={template.palette.gold} />
            <stop offset="1" stopColor={template.palette.goldHighlight} />
          </linearGradient>
          <filter id="line-relief" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor={template.palette.shadow} floodOpacity="0.9" />
          </filter>
          <filter id="icon-relief" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor={template.palette.shadow} floodOpacity="0.75" />
          </filter>
        </defs>

        <image
          href={template.backgroundImage}
          x="0"
          y="0"
          width="1000"
          height="1000"
          preserveAspectRatio="xMidYMid slice"
          className="template-background"
          aria-hidden="true"
        />

        {SIGNS.map((sign, index) => {
          const start = displayAngle(index * 30, ascendant);
          const end = displayAngle((index + 1) * 30, ascendant);
          return (
            <path
              key={sign.name}
              d={annularSector(start, end, 356, 440)}
              fill="transparent"
              className="zodiac-sector"
            />
          );
        })}

        <circle cx="500" cy="500" r="238" className="ring-line" />

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
              <image
                href={publicAsset(`/assets/zodiac/gilded-relief-web/${sign.id}.webp`)}
                x={label.x - 43}
                y={label.y - 43}
                width="86"
                height="86"
                preserveAspectRatio="xMidYMid meet"
                className="zodiac-symbol zodiac-emblem"
                filter="url(#icon-relief)"
              />
              <title>{sign.name}</title>
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
          return (
            <line
              key={`${aspect.from}-${aspect.to}-${index}`}
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={aspectColor(aspect.kind)}
              strokeDasharray={ASPECT_DASH[aspect.kind]}
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
          const leaderEnd = pointOnCircle(layout.labelAngle, layout.radius - 29);
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
              <image
                href={publicAsset(`/assets/planets/gilded-medallions-web/${body.id}.webp`)}
                x={layout.point.x - 28}
                y={layout.point.y - 28}
                width="56"
                height="56"
                preserveAspectRatio="xMidYMid meet"
                className="planet-symbol planet-medallion"
                filter="url(#icon-relief)"
              />
              <title>
                {body.label}: {SIGNS[body.signIndex].name} {formatDegree(body.degreeInSign)}
                {body.retrograde ? ", retrógrado" : ""}
              </title>
              <text
                x={layout.point.x}
                y={layout.point.y + 38}
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
        {template.label} · {" "}
        {chart.place.name}
        {chart.place.subdivision ? `, ${chart.place.subdivision}` : ""} · zodíaco
        tropical · casas {chart.warnings.some((warning) => warning.code === "polar-house-substitution") ? "Porphyry" : "Placidus"}
      </figcaption>
    </figure>
  );
}
