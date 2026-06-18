import { NextResponse } from "next/server";

type CacheEntry = {
  expiresAt: number;
  body: unknown;
};

const cache = new Map<string, CacheEntry>();
let lastNominatimRequestAt = 0;
let nominatimBlockedUntil = 0;

const CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1100;
const BLOCK_BACKOFF_MS = 10 * 60 * 1000;
const USER_AGENT = "Beyond404 local dev geocoder (contact: dev@beyond404.local)";

function cached(key: string) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.body;
}

function remember(key: string, body: unknown) {
  cache.set(key, {
    body,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function waitForNominatimSlot() {
  const elapsed = Date.now() - lastNominatimRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastNominatimRequestAt = Date.now();
}

async function fetchNominatim(url: URL) {
  if (nominatimBlockedUntil > Date.now()) {
    return null;
  }

  await waitForNominatimSlot();
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "ko,en;q=0.8",
      "User-Agent": USER_AGENT,
    },
  }).catch(() => null);

  if (!response) {
    return null;
  }

  if (response.status === 429) {
    nominatimBlockedUntil = Date.now() + BLOCK_BACKOFF_MS;
  }

  return response;
}

function coordinateKey(value: string | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(5);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "reverse") {
    const lat = coordinateKey(searchParams.get("lat"));
    const lon = coordinateKey(searchParams.get("lon"));
    if (!lat || !lon) {
      return NextResponse.json({ message: "lat and lon are required" }, { status: 400 });
    }

    const key = `reverse:${lat}:${lon}`;
    const cachedBody = cached(key);
    if (cachedBody) {
      return NextResponse.json(cachedBody);
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);

    const response = await fetchNominatim(url);
    if (!response || !response.ok) {
      const fallback = { display_name: null };
      remember(key, fallback);
      return NextResponse.json(fallback);
    }

    const body = await response.json();
    remember(key, body);
    return NextResponse.json(body);
  }

  if (mode === "search") {
    const query = searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json([]);
    }

    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 5, 1), 5);
    const key = `search:${query.toLowerCase()}:${limit}`;
    const cachedBody = cached(key);
    if (cachedBody) {
      return NextResponse.json(cachedBody);
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", query);
    url.searchParams.set("countrycodes", "kr");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("addressdetails", "1");

    const response = await fetchNominatim(url);
    if (!response || !response.ok) {
      remember(key, []);
      return NextResponse.json([]);
    }

    const body = await response.json();
    remember(key, body);
    return NextResponse.json(body);
  }

  return NextResponse.json({ message: "unsupported geocode mode" }, { status: 400 });
}
