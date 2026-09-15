import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSwissEph, findAspects, MAJOR_ASPECTS, type SwissEph } from "@kuntay/swisseph";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NatalChart } from "@/components/NatalChart";
import { calculateChartWithEngine, MVP_ORBS } from "./calculate-chart";
import type { BirthInput } from "./types";

let engine: SwissEph;

const greenwichInput: BirthInput = {
  date: "2000-01-01",
  time: "12:00",
  place: {
    id: "test:greenwich",
    name: "Greenwich",
    countryCode: "GB",
    countryName: "Reino Unido",
    subdivision: "England",
    latitude: 51.4779,
    longitude: 0,
    timeZone: "Europe/London",
    source: "catalog",
  },
};

beforeAll(async () => {
  const epheDirectory = fileURLToPath(new URL("../../public/ephe/", import.meta.url));
  engine = await createSwissEph({
    files: {
      "sepl_18.se1": fs.readFileSync(`${epheDirectory}sepl_18.se1`),
      "semo_18.se1": fs.readFileSync(`${epheDirectory}semo_18.se1`),
    },
  });
});

afterAll(() => engine.dispose());

describe("adaptador do mapa natal", () => {
  it("mantém os valores de referência do Swiss Ephemeris 2.10.03", () => {
    const chart = calculateChartWithEngine(
      engine,
      greenwichInput,
      "2000-01-01T12:00:00Z",
    );
    const sun = chart.bodies.find((body) => body.id === "sun");
    const moon = chart.bodies.find((body) => body.id === "moon");

    expect(chart.source).toBe("swiss");
    expect(chart.julianDay).toBe(2451545);
    expect(sun?.longitude).toBeCloseTo(280.36891867, 6);
    expect(moon?.longitude).toBeCloseTo(223.32375145, 6);
    expect(chart.angles.ascendant).toBeCloseTo(24.2661892, 5);
    expect(chart.angles.midheaven).toBeCloseTo(279.6110878, 5);
    expect(chart.houses).toHaveLength(12);
    expect(chart.bodies).toHaveLength(12);
  });

  it("mantém Nodo Sul exatamente oposto ao Nodo Norte", () => {
    const chart = calculateChartWithEngine(
      engine,
      greenwichInput,
      "2000-01-01T12:00:00Z",
    );
    const north = chart.bodies.find((body) => body.id === "north-node")!;
    const south = chart.bodies.find((body) => body.id === "south-node")!;
    expect((south.longitude - north.longitude + 360) % 360).toBeCloseTo(180, 10);
  });

  it("expõe a substituição polar de Placidus por Porphyry", () => {
    const polarInput: BirthInput = {
      ...greenwichInput,
      place: {
        ...greenwichInput.place,
        id: "test:tromso",
        name: "Tromsø",
        latitude: 69.6492,
        longitude: 18.9553,
        timeZone: "Europe/Oslo",
      },
    };
    const chart = calculateChartWithEngine(
      engine,
      polarInput,
      "2000-01-01T12:00:00Z",
    );
    expect(chart.houses).toHaveLength(12);
    expect(chart.warnings.some((warning) => warning.code === "polar-house-substitution")).toBe(true);
  });

  it("encontra conjunção atravessando 0 e 360 graus", () => {
    const aspects = findAspects(
      [
        { name: "a", longitude: 359, speed: 1 },
        { name: "b", longitude: 1, speed: 2 },
      ],
      { aspects: MAJOR_ASPECTS, orbs: MVP_ORBS },
    );
    expect(aspects).toHaveLength(1);
    expect(aspects[0].aspect.name).toBe("Conjunction");
    expect(aspects[0].orb).toBe(2);
  });

  it("renderiza um SVG estruturalmente completo sem NaN", () => {
    const chart = calculateChartWithEngine(
      engine,
      greenwichInput,
      "2000-01-01T12:00:00Z",
    );
    const markup = renderToStaticMarkup(createElement(NatalChart, { chart }));
    expect(markup).toContain('viewBox="0 0 1000 1000"');
    expect(markup).toContain("zodiac-sector");
    expect(markup).toContain("planet-symbol");
    expect(markup).toContain("aspect-line");
    expect(markup).not.toContain("NaN");
  });
});
