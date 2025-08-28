const fmtMoney = (n, currency = "USD") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n ?? 0);

export function ResultCard({ itinerary, currency, onToggleFavorite }) {
    const price = itinerary?.price?.raw ?? itinerary?.price ?? null;
    const legs = itinerary?.legs || [];
    const out = legs[0] || {};
    const ret = legs[1] || null;
    const outSeg0 = out?.segments?.[0] || {};
    const outCarrier = outSeg0?.operatingCarrier || outSeg0?.marketingCarrier || {};

    const formatLeg = (leg) => {
        const dep = new Date(leg?.departure ?? leg?.departureDateTime);
        const arr = new Date(leg?.arrival ?? leg?.arrivalDateTime);
        const depStr = isNaN(dep) ? "—" : dep.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const arrStr = isNaN(arr) ? "—" : arr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const from = leg?.origin?.displayCode || leg?.origin?.name || "";
        const to = leg?.destination?.displayCode || leg?.destination?.name || "";
        const stops = (leg?.stopCount ?? leg?.stops?.length ?? 0) || 0;
        const duration = leg?.durationInMinutes || leg?.duration || null;
        const durStr = duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : "";
        return { depStr, arrStr, from, to, stops, durStr };
    };

    const L = formatLeg(out);
    const R = ret ? formatLeg(ret) : null;

    return (
        <div className="rounded-2xl border p-4 shadow-sm bg-white flex flex-col gap-3">
            <div className="flex items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{outCarrier?.name || "Unknown carrier"}</span>
                        {outSeg0?.flightNumber && (
                            <span>• {outSeg0?.operatingCarrier?.alternateId}{outSeg0?.flightNumber}</span>
                        )}
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-3 text-sm">
                        <div>
                            <div className="text-xl font-semibold">{L.depStr}</div>
                            <div className="text-gray-600">{L.from}</div>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                            <div className="text-xs text-gray-500">{L.durStr}</div>
                            <div className="text-xs text-gray-500">{L.stops === 0 ? "Direct" : `${L.stops} stop${L.stops > 1 ? "s" : ""}`}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-semibold">{L.arrStr}</div>
                            <div className="text-gray-600">{L.to}</div>
                        </div>
                    </div>
                    {R && (
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm border-t pt-3">
                            <div>
                                <div className="text-xl font-semibold">{R.depStr}</div>
                                <div className="text-gray-600">{R.from}</div>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <div className="text-xs text-gray-500">{R.durStr}</div>
                                <div className="text-xs text-gray-500">{R.stops === 0 ? "Direct" : `${R.stops} stop${R.stops > 1 ? "s" : ""}`}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-semibold">{R.arrStr}</div>
                                <div className="text-gray-600">{R.to}</div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-32 shrink-0 text-right">
                    <div className="text-2xl font-bold">{price != null ? fmtMoney(price, currency) : "—"}</div>
                    <button
                        onClick={onToggleFavorite}
                        className="mt-2 w-full rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
