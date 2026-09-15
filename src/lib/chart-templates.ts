export type ChartTemplateId = "obsidian-gold" | "ivory-gold";

export interface ChartTemplate {
  id: ChartTemplateId;
  label: string;
  description: string;
  backgroundImage: string;
  palette: {
    gold: string;
    goldHighlight: string;
    shadow: string;
    text: string;
    mutedText: string;
    tenseAspect: string;
    harmoniousAspect: string;
    neutralAspect: string;
  };
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function publicAsset(path: string): string {
  return `${basePath}${path}`;
}

export const CHART_TEMPLATES: readonly ChartTemplate[] = [
  {
    id: "obsidian-gold",
    label: "Obsidiana",
    description: "Pedra negra e ouro antigo",
    backgroundImage: publicAsset("/assets/templates/obsidian-gold.webp"),
    palette: {
      gold: "#d9a84a",
      goldHighlight: "#ffe5a0",
      shadow: "#241505",
      text: "#f4d58a",
      mutedText: "#e6c878",
      tenseAspect: "#ff746a",
      harmoniousAspect: "#66d2c2",
      neutralAspect: "#f0c56d",
    },
  },
  {
    id: "ivory-gold",
    label: "Marfim",
    description: "Mármore claro e ouro polido",
    backgroundImage: publicAsset("/assets/templates/ivory-gold.webp"),
    palette: {
      gold: "#9a621b",
      goldHighlight: "#f7d889",
      shadow: "#fff8e4",
      text: "#553713",
      mutedText: "#765426",
      tenseAspect: "#a7433d",
      harmoniousAspect: "#347a70",
      neutralAspect: "#8d641f",
    },
  },
] as const;

export function getChartTemplate(id: ChartTemplateId): ChartTemplate {
  return CHART_TEMPLATES.find((template) => template.id === id) ?? CHART_TEMPLATES[0];
}

