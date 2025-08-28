import { useState, useMemo } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { classNames } from './utils/classNames'
import { searchFlights } from './utils/apiHelper'
import { AirportInput, Chip, Field, Modal, ResultCard, Skeleton } from './components'

function defaultDates() {
  const now = new Date();
  const depart = new Date(now);
  depart.setDate(depart.getDate() + 1);
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + 3);
  const toStr = (d) => d.toISOString().slice(0, 10);
  return { depart: toStr(depart), ret: toStr(ret) };
}

export default function App() {
  const { depart, ret } = useMemo(defaultDates, []);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("rapidapi_key") || "");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorSearchFlight, setErrorSearchFlight] = useState({ message: "", state: false })

  const [tripType, setTripType] = useState("round"); // "oneway" | "round"
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [originPicked, setOriginPicked] = useState(null); // the selected airport object
  const [destPicked, setDestPicked] = useState(null);

  const [date, setDate] = useState(depart); // yyyy-mm-dd
  const [returnDate, setReturnDate] = useState(ret);
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState("economy");
  const [sortBy, setSortBy] = useState("best"); // best | price_low | duration_short
  const [currency, setCurrency] = useState("USD");

  const [filters, setFilters] = useState({
    stops: "any", // any | direct | onestop
    airlines: new Set(), // names
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  const hasKeys = Boolean(apiKey);

  function extractParams(item) {
    const p = item?.navigation?.relevantFlightParams || {};
    return { skyId: p.skyId, entityId: p.entityId };
  }

  const canSearch = hasKeys && originPicked && destPicked && date && (tripType === "oneway" || returnDate);

  async function onSearch() {
    if (!canSearch) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const o = extractParams(originPicked);
      const d = extractParams(destPicked);
      const data = await searchFlights(
        {
          originSkyId: o.skyId,
          originEntityId: o.entityId,
          destinationSkyId: d.skyId,
          destinationEntityId: d.entityId,
          date,
          returnDate: tripType === "oneway" ? undefined : returnDate,
          cabinClass: cabin,
          adults,
          sortBy,
          currency,
        },
        apiKey
      );

      const itineraries = data?.itineraries || [];
      setResults(itineraries);
      if (!Array.isArray(itineraries) || itineraries.length === 0) {
        setError("No flights found for those dates.");
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function applyClientFilters(list) {
    let L = Array.isArray(list) ? list.slice() : [];
    if (filters.stops !== "any") {
      L = L.filter((it) => {
        const out = it?.legs?.[0] || {};
        const stops = (out?.stopCount ?? out?.stops?.length ?? 0) || 0;
        if (filters.stops === "direct") return stops === 0;
        if (filters.stops === "onestop") return stops === 1;
        return true;
      });
    }
    if (filters.airlines.size > 0) {
      L = L.filter((it) => {
        const seg0 = it?.legs?.[0]?.segments?.[0] || {};
        const name = seg0?.operatingCarrier?.name || seg0?.marketingCarrier?.name;
        return name && filters.airlines.has(name);
      });
    }
    // Client-side sorting as a fallback
    if (sortBy === "price_low") {
      L.sort((a, b) => (a?.price?.raw ?? 1e9) - (b?.price?.raw ?? 1e9));
    } else if (sortBy === "duration_short") {
      const dur = (x) => x?.legs?.reduce((s, l) => s + (l?.durationInMinutes || 0), 0) || 0;
      L.sort((a, b) => dur(a) - dur(b));
    }
    return L;
  }

  const filteredResults = useMemo(() => applyClientFilters(results), [results, filters, sortBy]);

  const uniqueAirlines = useMemo(() => {
    const set = new Set();
    for (const it of results) {
      const seg0 = it?.legs?.[0]?.segments?.[0] || {};
      const name = seg0?.operatingCarrier?.name || seg0?.marketingCarrier?.name;
      if (name) set.add(name);
    }
    return Array.from(set).sort();
  }, [results]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="text-xl font-bold tracking-tight">✈️ FlightFinder</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      {/* Search Card */}
      <section className="mx-auto max-w-6xl px-4 py-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {/* trip type */}
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { k: "oneway", label: "One-way" },
              { k: "round", label: "Round trip" },
            ].map((t) => (
              <Chip key={t.k} active={tripType === t.k} onClick={() => setTripType(t.k)}>
                {t.label}
              </Chip>
            ))}
            {errorSearchFlight.state &&
              (<div className="text-sm text-red-600 flex items-center">{errorSearchFlight.message}</div>)
            }

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <AirportInput
              label="From"
              placeholder="City or airport"
              value={originText}
              onChange={(v) => { setOriginText(v); setOriginPicked(null); }}
              onPicked={(o) => { setOriginPicked(o); setOriginText(o?.presentation?.title || ""); }}
              apiKey={apiKey}
              setErrorSearchFlight={setErrorSearchFlight}
            />
            <AirportInput
              label="To"
              placeholder="City or airport"
              value={destText}
              onChange={(v) => { setDestText(v); setDestPicked(null); }}
              onPicked={(o) => { setDestPicked(o); setDestText(o?.presentation?.title || ""); }}
              apiKey={apiKey}
              setErrorSearchFlight={setErrorSearchFlight}
            />
            <Field label="Depart">
              <input
                type="date"
                className="h-11 rounded-xl border px-3"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            {tripType === "round" && (
              <Field label="Return">
                <input
                  type="date"
                  className="h-11 rounded-xl border px-3"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </Field>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Passengers">
              <input
                type="number"
                min={1}
                className="h-11 rounded-xl border px-3"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value || "1", 10))}
              />
            </Field>
            <Field label="Cabin">
              <select className="h-11 rounded-xl border px-3" value={cabin} onChange={(e) => setCabin(e.target.value)}>
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </Field>
            <Field label="Sort by">
              <select className="h-11 rounded-xl border px-3" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="best">Best</option>
                <option value="price_low">Lowest price</option>
                <option value="duration_short">Shortest duration</option>
              </select>
            </Field>
            <Field label="Currency">
              <select className="h-11 rounded-xl border px-3" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option>USD</option>
                <option>EUR</option>
                <option>IDR</option>
                <option>AUD</option>
                <option>JPY</option>
                <option>GBP</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              // disabled={!canSearch}
              onClick={onSearch}
              className={classNames(
                "rounded-xl px-4 py-2",
                canSearch ? "bg-black hover:bg-gray-800" : "bg-gray-300 cursor-not-allowed"
              )}
            >
              Search flights
            </button>
            {!hasKeys && (
              <div className="text-sm text-red-600 flex items-center">Add your RapidAPI key in Settings first.</div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filters */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border bg-white p-4 shadow-sm sticky top-[76px]">
            <div className="font-semibold mb-3">Filters</div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Stops</div>
                {[
                  { k: "any", label: "Any" },
                  { k: "direct", label: "Direct" },
                  { k: "onestop", label: "1 stop" },
                ].map((o) => (
                  <label key={o.k} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={filters.stops === o.k}
                      onChange={() => setFilters((f) => ({ ...f, stops: o.k }))}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Airlines</div>
                <div className="max-h-48 overflow-auto pr-1 space-y-1">
                  {uniqueAirlines.length === 0 && (
                    <div className="text-xs text-gray-500">No airlines yet — run a search.</div>
                  )}
                  {uniqueAirlines.map((name) => (
                    <label key={name} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.airlines.has(name)}
                        onChange={(e) =>
                          setFilters((f) => {
                            const s = new Set(f.airlines);
                            if (e.target.checked) s.add(name); else s.delete(name);
                            return { ...f, airlines: s };
                          })
                        }
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <main className="lg:col-span-3">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          )}
          {!loading && error && (
            <div className="rounded-xl border bg-white p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && filteredResults.length === 0 && (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-600">
              Start by searching for flights.
            </div>
          )}
          {!loading && filteredResults.length > 0 && (
            <div className="space-y-3">
              {filteredResults.map((it, idx) => (
                <ResultCard key={idx} itinerary={it} currency={currency} onToggleFavorite={() => { }} />
              ))}
            </div>
          )}
        </main>
      </section>

      <footer className="py-8 text-center text-xs text-gray-500">
        Built with RapidAPI sky-scrapper · This is a demo and not affiliated with Google Flights.
      </footer>

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Paste your RapidAPI key. It will be stored locally in this browser (localStorage) and used for requests to <code>{"sky-scrapper.p.rapidapi.com"}</code>.
          </div>
          <Field label="RapidAPI Key">
            <input
              type="password"
              className="h-11 w-full rounded-xl border px-3"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { localStorage.setItem("rapidapi_key", apiKey); setSettingsOpen(false); }}
              className="rounded-xl bg-black px-4 py-2 hover:bg-gray-800"
            >
              Save
            </button>
            <button
              onClick={() => { setApiKey(""); localStorage.removeItem("rapidapi_key"); }}
              className="rounded-xl border px-4 py-2 hover:bg-gray-50"
            >
              Clear key
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}