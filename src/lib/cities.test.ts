import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { listCountries, searchCities } from "./cities";

describe("catálogo mundial de cidades", () => {
  beforeAll(() => {
    const dataDirectory = fileURLToPath(new URL("../../public/data/", import.meta.url));
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      const fileName = String(input).endsWith("countries.json")
        ? "countries.json"
        : "cities.json";
      return new Response(fs.readFileSync(`${dataDirectory}${fileName}`), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
  });

  it("lista países e encontra cidades com fuso IANA", async () => {
    const countries = await listCountries();
    expect(countries.some((country) => country.code === "BR")).toBe(true);
    expect(countries.some((country) => country.code === "JP")).toBe(true);

    const matches = await searchCities("BR", "Sao Paulo");
    const saoPaulo = matches.find((place) => place.name === "São Paulo" || place.name === "Sao Paulo");
    expect(saoPaulo?.timeZone).toBe("America/Sao_Paulo");
    expect(saoPaulo?.latitude).toBeTypeOf("number");
  });
});
