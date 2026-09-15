import { describe, expect, it } from "vitest";
import {
  clockwiseMidpoint,
  displayAngle,
  layoutPlanetLabels,
  normalizeDegrees,
} from "./geometry";

describe("geometria da mandala", () => {
  it("normaliza ângulos nos dois sentidos", () => {
    expect(normalizeDegrees(361)).toBe(1);
    expect(normalizeDegrees(-1)).toBe(359);
  });

  it("mantém o Ascendente às 9 horas", () => {
    expect(displayAngle(123.4, 123.4)).toBeCloseTo(180, 10);
  });

  it("faz as longitudes avançarem abaixo do Ascendente", () => {
    expect(displayAngle(153.4, 123.4)).toBeCloseTo(150, 10);
  });

  it("calcula o ponto médio atravessando 360 graus", () => {
    expect(clockwiseMidpoint(350, 10)).toBeCloseTo(0, 10);
  });

  it("distribui corpos próximos em faixas sem coordenadas inválidas", () => {
    const labels = layoutPlanetLabels(
      [
        { id: "a", longitude: 10 },
        { id: "b", longitude: 11 },
        { id: "c", longitude: 12 },
        { id: "d", longitude: 13 },
      ],
      180,
    );
    expect(labels).toHaveLength(4);
    for (const label of labels) {
      expect(Number.isFinite(label.point.x)).toBe(true);
      expect(Number.isFinite(label.point.y)).toBe(true);
    }
    expect(new Set(labels.map((label) => `${label.radius}:${label.labelAngle}`)).size).toBe(4);
  });
});
