import { useEffect, useState } from "react";
import { searchAirports } from "../utils/apiHelper";
import { Field } from "./Field";

function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

function AirportOption({ item, onSelect }) {
    const label = item?.presentation?.title || "";
    const subtitle = item?.presentation?.suggestionTitle || "";
    return (
        <button
            onClick={() => onSelect(item)}
            className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
        >
            <div className="font-medium">{label}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
        </button>
    );
}

export function AirportInput({ label, value, onChange, onPicked, apiKey, placeholder, setErrorSearchFlight }) {
    const [focused, setFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState([]);
    const debounced = useDebouncedValue(value, 300);

    useEffect(() => {
        let ok = true;
        async function run() {
            if (!debounced || debounced.length < 2) {
                setOptions([]);
                return;
            }
            try {
                setLoading(true);
                const res = await searchAirports(debounced, apiKey);
                if (!ok) return;
                setOptions(res);
                setErrorSearchFlight({ message: "", state: false })
            } catch (e) {
                setErrorSearchFlight({ message: e.message ? e.message : "an error occured from rappidapi", state: true })
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        run();
        return () => { ok = false; };
    }, [debounced, apiKey]);

    return (
        <div className="relative">
            <Field label={label}>
                <input
                    className="h-11 rounded-xl border px-3 outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 150)}
                />
            </Field>
            {focused && (options?.length > 0 || loading) && (
                <div className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-xl border bg-white shadow">
                    {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
                    {!loading && options.map((o) => (
                        <AirportOption key={o?.entityId + o?.skyId} item={o} onSelect={onPicked} />
                    ))}
                </div>
            )}
        </div>
    );
}