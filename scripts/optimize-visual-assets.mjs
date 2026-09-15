import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();

async function ensureDirectory(relativePath) {
  await mkdir(path.join(root, relativePath), { recursive: true });
}

async function optimizeImage(input, output, width, quality = 88) {
  await sharp(path.join(root, input))
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality, alphaQuality: 100, smartSubsample: true })
    .toFile(path.join(root, output));
}

async function optimizeDirectory(inputDirectory, outputDirectory, width) {
  await ensureDirectory(outputDirectory);
  const files = (await readdir(path.join(root, inputDirectory)))
    .filter((file) => file.toLowerCase().endsWith(".png"));

  await Promise.all(
    files.map((file) =>
      optimizeImage(
        path.join(inputDirectory, file),
        path.join(outputDirectory, `${path.parse(file).name}.webp`),
        width,
        90,
      ),
    ),
  );
}

await ensureDirectory("public/assets/templates");
await optimizeImage(
  "assets/source/templates/obsidian-gold.png",
  "public/assets/templates/obsidian-gold.webp",
  1800,
  90,
);
await optimizeImage(
  "assets/source/templates/ivory-gold.png",
  "public/assets/templates/ivory-gold.webp",
  1800,
  90,
);
await optimizeDirectory(
  "public/assets/zodiac/gilded-relief",
  "public/assets/zodiac/gilded-relief-web",
  512,
);
await optimizeDirectory(
  "public/assets/planets/gilded-medallions",
  "public/assets/planets/gilded-medallions-web",
  512,
);

console.log("Visual assets optimized.");

