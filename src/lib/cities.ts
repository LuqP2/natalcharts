import type { BirthPlace } from "./types";

interface CityRecord {
  id: string;
  name: string;
  ascii: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  subdivision: string;
  population: number;
  timeZone: string;
}

export interface CountryOption {
  code: string;
  name: string;
}

interface CountriesPayload {
  source: "GeoNames";
  license: "CC-BY-4.0";
  countries: CountryOption[];
}

interface CitiesPayload {
  source: "GeoNames cities15000";
  license: "CC-BY-4.0";
  cities: CityRecord[];
}

let countriesPromise: Promise<CountriesPayload> | undefined;
let citiesPromise: Promise<CitiesPayload> | undefined;

function assetUrl(fileName: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}/data/${fileName}`;
}

async function fetchJson<T>(fileName: string): Promise<T> {
  const response = await fetch(assetUrl(fileName));
  if (!response.ok) throw new Error(`Falha ao carregar ${fileName}.`);
  return (await response.json()) as T;
}

function loadCountries(): Promise<CountriesPayload> {
  countriesPromise ??= fetchJson<CountriesPayload>("countries.json");
  return countriesPromise;
}

function loadCities(): Promise<CitiesPayload> {
  citiesPromise ??= fetchJson<CitiesPayload>("cities.json");
  return citiesPromise;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export async function listCountries(): Promise<CountryOption[]> {
  const payload = await loadCountries();
  if (payload.source !== "GeoNames" || payload.license !== "CC-BY-4.0") {
    throw new Error("A origem da base de países não pôde ser verificada.");
  }
  return payload.countries;
}

export async function searchCities(
  countryCode: string,
  query: string,
  limit = 12,
): Promise<BirthPlace[]> {
  const normalizedQuery = normalizeSearch(query);
  if (!countryCode || normalizedQuery.length < 2) return [];

  const [{ cities, source, license }, countriesPayload] = await Promise.all([
    loadCities(),
    loadCountries(),
  ]);
  if (source !== "GeoNames cities15000" || license !== "CC-BY-4.0") {
    throw new Error("A origem da base de cidades não pôde ser verificada.");
  }
  const countryName =
    countriesPayload.countries.find((country) => country.code === countryCode)?.name ??
    countryCode;

  return cities
    .filter((city) => {
      if (city.countryCode !== countryCode) return false;
      const name = normalizeSearch(city.name);
      const ascii = normalizeSearch(city.ascii);
      const subdivision = normalizeSearch(city.subdivision);
      return (
        name.includes(normalizedQuery) ||
        ascii.includes(normalizedQuery) ||
        subdivision.includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      const aStarts = normalizeSearch(a.name).startsWith(normalizedQuery) ? 1 : 0;
      const bStarts = normalizeSearch(b.name).startsWith(normalizedQuery) ? 1 : 0;
      return bStarts - aStarts || b.population - a.population;
    })
    .slice(0, limit)
    .map((city) => ({
      id: `geonames:${city.id}`,
      name: city.name,
      countryCode: city.countryCode,
      countryName,
      subdivision: city.subdivision || undefined,
      latitude: city.latitude,
      longitude: city.longitude,
      timeZone: city.timeZone,
      source: "catalog" as const,
    }));
}
