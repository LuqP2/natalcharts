export type BodyId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "north-node"
  | "south-node";

export type AspectKind =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposition";

export interface BirthPlace {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  subdivision?: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: "catalog" | "manual";
}

export interface BirthInput {
  date: string;
  time: string;
  place: BirthPlace;
  disambiguation?: "earlier" | "later";
}

export interface BodyPosition {
  id: BodyId;
  label: string;
  symbol: string;
  longitude: number;
  longitudeSpeed: number;
  signIndex: number;
  degreeInSign: number;
  retrograde: boolean;
  isPoint: boolean;
}

export interface HouseCusp {
  number: number;
  longitude: number;
}

export interface ChartAngles {
  ascendant: number;
  midheaven: number;
  descendant: number;
  imumCoeli: number;
}

export interface AspectData {
  from: BodyId;
  to: BodyId;
  kind: AspectKind;
  separation: number;
  exactAngle: number;
  orb: number;
  applying?: boolean;
}

export interface ChartWarning {
  code: "polar-house-substitution" | "ephemeris-warning";
  message: string;
}

export interface ChartData {
  source: "swiss";
  julianDay: number;
  instantUtc: string;
  place: BirthPlace;
  bodies: BodyPosition[];
  houses: HouseCusp[];
  angles: ChartAngles;
  aspects: AspectData[];
  warnings: ChartWarning[];
}

export interface WorkerCalculateRequest {
  type: "calculate";
  requestId: string;
  input: BirthInput;
  instantUtc: string;
}

export type WorkerResponse =
  | {
      type: "result";
      requestId: string;
      chart: ChartData;
    }
  | {
      type: "error";
      requestId: string;
      message: string;
    };
