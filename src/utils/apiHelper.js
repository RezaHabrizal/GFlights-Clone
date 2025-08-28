const RAPID_HOST = "sky-scrapper.p.rapidapi.com";
const AUTOCOMPLETE_URL = `https://${RAPID_HOST}/api/v1/flights/searchAirport`;
const SEARCH_URL = `https://${RAPID_HOST}/api/v2/flights/searchFlights`;

async function rapidGet(url, params, apiKey) {
    const u = new URL(url);
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        u.searchParams.set(k, String(v));
    });
    const res = await fetch(u.toString(), {
        headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": RAPID_HOST,
        },
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`API ${res.status}: ${t}`);
    }
    return res.json();
}

export async function searchAirports(query, apiKey) {
    if (!query || query.length < 2) return [];
    const json = await rapidGet(
        AUTOCOMPLETE_URL,
        { query, locale: "en-US" },
        apiKey
    );
    return json?.data ?? [];
}

export async function searchFlights({
    originSkyId,
    originEntityId,
    destinationSkyId,
    destinationEntityId,
    date,
    returnDate,
    cabinClass = "economy",
    adults = 1,
    sortBy = "best",
    currency = "USD",
    market = "en-US",
    countryCode = "US",
}, apiKey) {
    const json = await rapidGet(
        SEARCH_URL,
        {
            originSkyId,
            originEntityId,
            destinationSkyId,
            destinationEntityId,
            date,
            returnDate,
            cabinClass,
            adults,
            sortBy,
            currency,
            market,
            countryCode,
        },
        apiKey
    );
    return json?.data ?? json; // some responses return root .data
}