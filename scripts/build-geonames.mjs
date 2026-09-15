import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [citiesPath, countriesPath, adminPath, outputDirectory] = process.argv.slice(2);

if (!citiesPath || !countriesPath || !adminPath || !outputDirectory) {
  throw new Error(
    "Uso: node scripts/build-geonames.mjs <cities15000.txt> <countryInfo.txt> <admin1CodesASCII.txt> <diretorio-saida>",
  );
}

const [citiesRaw, countriesRaw, adminRaw] = await Promise.all([
  readFile(citiesPath, "utf8"),
  readFile(countriesPath, "utf8"),
  readFile(adminPath, "utf8"),
]);

const countries = countriesRaw
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const fields = line.split("\t");
    return { code: fields[0], name: fields[4] };
  })
  .filter((country) => country.code && country.name)
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

const adminNames = new Map(
  adminRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const fields = line.split("\t");
      return [fields[0], fields[1]];
    }),
);

const cities = citiesRaw
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const fields = line.split("\t");
    const countryCode = fields[8];
    const adminCode = fields[10];
    return {
      id: fields[0],
      name: fields[1],
      ascii: fields[2],
      latitude: Number(fields[4]),
      longitude: Number(fields[5]),
      countryCode,
      subdivision: adminNames.get(`${countryCode}.${adminCode}`) ?? "",
      population: Number(fields[14]) || 0,
      timeZone: fields[17],
    };
  })
  .filter(
    (city) =>
      city.id &&
      city.name &&
      city.countryCode &&
      city.timeZone &&
      Number.isFinite(city.latitude) &&
      Number.isFinite(city.longitude),
  );

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(
    path.join(outputDirectory, "countries.json"),
    JSON.stringify({ source: "GeoNames", license: "CC-BY-4.0", countries }),
  ),
  writeFile(
    path.join(outputDirectory, "cities.json"),
    JSON.stringify({ source: "GeoNames cities15000", license: "CC-BY-4.0", cities }),
  ),
]);

console.log(`GeoNames: ${countries.length} países e ${cities.length} cidades.`);
