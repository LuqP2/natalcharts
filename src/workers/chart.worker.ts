/// <reference lib="webworker" />

import {
  FetchEphemeris,
  createSwissEph,
  type SwissEph,
} from "@kuntay/swisseph";
import { calculateChartWithEngine } from "../lib/calculate-chart";
import type {
  WorkerCalculateRequest,
  WorkerResponse,
} from "../lib/types";

let enginePromise: Promise<SwissEph> | undefined;

function localEphemerisBaseUrl(): string {
  const workerUrl = new URL(self.location.href);
  const basePath = workerUrl.pathname.split("/_next/")[0];
  return `${workerUrl.origin}${basePath}/ephe`;
}

async function getEngine(): Promise<SwissEph> {
  if (!enginePromise) {
    enginePromise = createSwissEph().then(async (engine) => {
      const loaded = await engine.loadEphemeris(
        new FetchEphemeris({ baseUrl: localEphemerisBaseUrl() }),
        { fromYear: 1800, toYear: 2399, kinds: ["planets", "moon"] },
      );
      if (loaded.missing.length > 0) {
        engine.dispose();
        throw new Error(
          `Não foi possível carregar as efemérides: ${loaded.missing.join(", ")}.`,
        );
      }
      return engine;
    });
  }
  return enginePromise;
}

self.onmessage = async (event: MessageEvent<WorkerCalculateRequest>) => {
  const request = event.data;
  if (request.type !== "calculate") return;

  try {
    const engine = await getEngine();
    const chart = calculateChartWithEngine(engine, request.input, request.instantUtc);
    const response: WorkerResponse = {
      type: "result",
      requestId: request.requestId,
      chart,
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      type: "error",
      requestId: request.requestId,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível calcular a mandala.",
    };
    self.postMessage(response);
  }
};

export {};
