"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveBirthTime } from "@/lib/birth-time";
import { listCountries, searchCities, type CountryOption } from "@/lib/cities";
import type {
  BirthInput,
  BirthPlace,
  ChartData,
  WorkerCalculateRequest,
  WorkerResponse,
} from "@/lib/types";
import { NatalChart } from "./NatalChart";

interface AmbiguousBirthTime {
  input: BirthInput;
  earlierUtc: string;
  laterUtc: string;
}

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(4)}°${value >= 0 ? positive : negative}`;
}

function useChartWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(
    new Map<
      string,
      { resolve: (chart: ChartData) => void; reject: (error: Error) => void }
    >(),
  );

  useEffect(() => {
    const worker = new Worker(new URL("../workers/chart.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = pendingRef.current.get(response.requestId);
      if (!pending) return;
      pendingRef.current.delete(response.requestId);
      if (response.type === "result") pending.resolve(response.chart);
      else pending.reject(new Error(response.message));
    };

    worker.onerror = () => {
      for (const pending of pendingRef.current.values()) {
        pending.reject(new Error("O motor astral não pôde ser iniciado."));
      }
      pendingRef.current.clear();
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  return useCallback((input: BirthInput, instantUtc: string) => {
    if (!workerRef.current) {
      return Promise.reject(new Error("O motor astral ainda está iniciando."));
    }
    const requestId = crypto.randomUUID();
    return new Promise<ChartData>((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject });
      const request: WorkerCalculateRequest = {
        type: "calculate",
        requestId,
        input,
        instantUtc,
      };
      workerRef.current?.postMessage(request);
    });
  }, []);
}

export function BirthChartApp() {
  const calculateInWorker = useChartWorker();
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BirthPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<BirthPlace | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [manualTimeZone, setManualTimeZone] = useState("");
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState("");
  const [chart, setChart] = useState<ChartData | null>(null);
  const [ambiguous, setAmbiguous] = useState<AmbiguousBirthTime | null>(null);

  const maxDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sourceUrl = process.env.NEXT_PUBLIC_SOURCE_URL;

  useEffect(() => {
    let active = true;
    listCountries()
      .then((items) => {
        if (!active) return;
        const displayNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });
        setCountries(
          items
            .map((item) => ({
              ...item,
              name: displayNames.of(item.code) ?? item.name,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        );
      })
      .catch(() => setError("Não foi possível carregar a lista de cidades."))
      .finally(() => {
        if (active) setIsLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (manualMode || !countryCode || cityQuery.trim().length < 2 || selectedPlace) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      searchCities(countryCode, cityQuery)
        .then((matches) => {
          if (active) setSuggestions(matches);
        })
        .catch(() => {
          if (active) setError("Não foi possível pesquisar essa cidade.");
        });
    }, 160);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [cityQuery, countryCode, manualMode, selectedPlace]);

  const makeManualPlace = (): BirthPlace | null => {
    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);
    if (
      !manualName.trim() ||
      !manualLatitude.trim() ||
      !manualLongitude.trim() ||
      !manualTimeZone.trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }
    return {
      id: `manual:${manualName}:${latitude}:${longitude}:${manualTimeZone}`,
      name: manualName.trim(),
      countryCode: "XX",
      countryName: "Local informado manualmente",
      latitude,
      longitude,
      timeZone: manualTimeZone.trim(),
      source: "manual",
    };
  };

  const calculate = async (input: BirthInput, instantUtc: string) => {
    setIsCalculating(true);
    setError("");
    setAmbiguous(null);
    try {
      const result = await calculateInWorker(input, instantUtc);
      setChart(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível gerar a mandala.",
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setAmbiguous(null);
    const place = manualMode ? makeManualPlace() : selectedPlace;
    if (!place) {
      setError(
        manualMode
          ? "Preencha um local, coordenadas válidas e um fuso IANA."
          : "Selecione uma cidade na lista de resultados.",
      );
      return;
    }
    if (!date || !time) {
      setError("Informe a data e a hora exata de nascimento.");
      return;
    }

    const input: BirthInput = { date, time, place };
    const resolution = resolveBirthTime(date, time, place.timeZone);
    if (resolution.status === "nonexistent") {
      setError(
        "Esse horário não existiu nessa cidade por causa da mudança do horário de verão.",
      );
      return;
    }
    if (resolution.status === "invalid") {
      setError(resolution.message);
      return;
    }
    if (resolution.status === "ambiguous") {
      setAmbiguous({
        input,
        earlierUtc: resolution.earlierUtc,
        laterUtc: resolution.laterUtc,
      });
      return;
    }
    void calculate(input, resolution.instantUtc);
  };

  const chooseAmbiguousTime = (choice: "earlier" | "later") => {
    if (!ambiguous) return;
    const instantUtc = choice === "earlier" ? ambiguous.earlierUtc : ambiguous.laterUtc;
    void calculate({ ...ambiguous.input, disambiguation: choice }, instantUtc);
  };

  return (
    <main className="page-shell">
      <header className="masthead">
        <p className="eyebrow">Mandala natal</p>
        <h1>O céu no instante em que você nasceu.</h1>
        <p className="intro">
          Informe seus dados de nascimento para gerar uma mandala tropical completa.
          O cálculo acontece somente neste navegador.
        </p>
      </header>

      <section className={`workspace ${chart ? "has-chart" : ""}`}>
        <form className="birth-form" onSubmit={submit} noValidate>
          <div className="form-heading">
            <span>01</span>
            <div>
              <h2>Dados de nascimento</h2>
              <p>A hora exata é necessária para calcular casas e Ascendente.</p>
            </div>
          </div>

          <div className="field-row two-columns">
            <label>
              <span>Data</span>
              <input
                type="date"
                min="1800-01-01"
                max={maxDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Hora local</span>
              <input
                type="time"
                step="60"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </label>
          </div>

          {!manualMode ? (
            <>
              <label>
                <span>País</span>
                <select
                  value={countryCode}
                  onChange={(event) => {
                    setCountryCode(event.target.value);
                    setCityQuery("");
                    setSelectedPlace(null);
                  }}
                  disabled={isLoadingCities}
                  required
                >
                  <option value="">
                    {isLoadingCities ? "Carregando países…" : "Selecione o país"}
                  </option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="city-field">
                <label>
                  <span>Cidade de nascimento</span>
                  <input
                    type="search"
                    autoComplete="off"
                    placeholder={countryCode ? "Digite pelo menos duas letras" : "Escolha o país primeiro"}
                    value={cityQuery}
                    disabled={!countryCode}
                    onChange={(event) => {
                      setCityQuery(event.target.value);
                      setSelectedPlace(null);
                    }}
                    aria-autocomplete="list"
                    aria-expanded={suggestions.length > 0}
                    aria-controls="city-results"
                    required
                  />
                </label>
                {suggestions.length > 0 && (
                  <ul id="city-results" className="city-results" role="listbox">
                    {suggestions.map((place) => (
                      <li key={place.id}>
                        <button
                          type="button"
                          role="option"
                          onClick={() => {
                            setSelectedPlace(place);
                            setCityQuery(
                              `${place.name}${place.subdivision ? `, ${place.subdivision}` : ""}`,
                            );
                            setSuggestions([]);
                          }}
                        >
                          <strong>{place.name}</strong>
                          <span>
                            {place.subdivision ? `${place.subdivision} · ` : ""}
                            {place.timeZone}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedPlace && (
                  <p className="place-confirmation">
                    {formatCoordinate(selectedPlace.latitude, "N", "S")} · {formatCoordinate(selectedPlace.longitude, "L", "O")} · {selectedPlace.timeZone}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="manual-fields">
              <label>
                <span>Nome do local</span>
                <input
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="Ex.: pequena vila natal"
                />
              </label>
              <div className="field-row two-columns">
                <label>
                  <span>Latitude</span>
                  <input
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={manualLatitude}
                    onChange={(event) => setManualLatitude(event.target.value)}
                    placeholder="-23.5505"
                  />
                </label>
                <label>
                  <span>Longitude</span>
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={manualLongitude}
                    onChange={(event) => setManualLongitude(event.target.value)}
                    placeholder="-46.6333"
                  />
                </label>
              </div>
              <label>
                <span>Fuso IANA</span>
                <input
                  value={manualTimeZone}
                  onChange={(event) => setManualTimeZone(event.target.value)}
                  placeholder="America/Sao_Paulo"
                />
              </label>
            </div>
          )}

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setManualMode((value) => !value);
              setError("");
              setSuggestions([]);
            }}
          >
            {manualMode ? "Voltar à busca de cidades" : "Não encontro minha cidade"}
          </button>

          {ambiguous && (
            <div className="ambiguity-card" role="alert">
              <strong>Essa hora aconteceu duas vezes.</strong>
              <p>
                Houve uma mudança de horário nessa data. Escolha qual ocorrência consta
                no registro de nascimento.
              </p>
              <div className="ambiguity-actions">
                <button type="button" onClick={() => chooseAmbiguousTime("earlier")}>
                  Primeira ocorrência
                </button>
                <button type="button" onClick={() => chooseAmbiguousTime("later")}>
                  Segunda ocorrência
                </button>
              </div>
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={isCalculating}>
            {isCalculating ? "Calculando o céu…" : "Gerar minha mandala"}
          </button>

          <p className="privacy-note">
            Seus dados não são enviados nem salvos. A mandala é calculada localmente.
          </p>
        </form>

        <section className="chart-stage" aria-live="polite">
          {chart ? (
            <>
              <div className="chart-heading">
                <span>02</span>
                <div>
                  <p className="eyebrow">Sua mandala</p>
                  <h2>{chart.place.name}</h2>
                </div>
              </div>
              {chart.warnings.map((warning) => (
                <p className="chart-warning" key={`${warning.code}-${warning.message}`}>
                  {warning.message}
                </p>
              ))}
              <NatalChart chart={chart} />
            </>
          ) : (
            <div className="empty-chart">
              <div className="empty-orbit" aria-hidden="true">
                <span>✦</span>
              </div>
              <p>Sua mandala aparecerá aqui.</p>
              <span>Preencha os dados ao lado para reconstruir o céu do nascimento.</span>
            </div>
          )}
        </section>
      </section>

      <footer className="site-footer">
        <p>
          Cálculos com Swiss Ephemeris · localidades derivadas do{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>{" "}
          (CC BY 4.0)
        </p>
        <p>
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              Código aberto
            </a>
          ) : (
            "Código aberto"
          )}{" "}
          sob AGPL-3.0 · nenhuma interpretação astrológica é produzida.
        </p>
      </footer>
    </main>
  );
}
