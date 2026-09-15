import { describe, expect, it } from "vitest";
import { resolveBirthTime } from "./birth-time";

describe("resolveBirthTime", () => {
  it("converte um horário normal usando o fuso da cidade", () => {
    expect(resolveBirthTime("1990-05-15", "14:30", "Asia/Kolkata")).toEqual({
      status: "valid",
      instantUtc: "1990-05-15T09:00:00Z",
    });
  });

  it("detecta uma hora duplicada no fim do horário de verão", () => {
    const result = resolveBirthTime(
      "2021-11-07",
      "01:30",
      "America/New_York",
    );
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.earlierUtc).toBe("2021-11-07T05:30:00Z");
      expect(result.laterUtc).toBe("2021-11-07T06:30:00Z");
    }
  });

  it("detecta uma hora inexistente no início do horário de verão", () => {
    expect(
      resolveBirthTime("2018-11-04", "00:30", "America/Sao_Paulo"),
    ).toEqual({ status: "nonexistent" });
  });

  it("detecta um dia removido na mudança da linha internacional de data", () => {
    expect(
      resolveBirthTime("2011-12-30", "12:00", "Pacific/Apia"),
    ).toEqual({ status: "nonexistent" });
  });

  it("recusa um fuso IANA inválido", () => {
    expect(resolveBirthTime("2000-01-01", "12:00", "Mars/Olympus").status).toBe(
      "invalid",
    );
  });
});
