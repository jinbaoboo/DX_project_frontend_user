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
const KAKAO_API_KEY =
  process.env.KAKAO_REST_API_KEY?.trim() || process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() || "";
const KOREAN_REGION_PREFIX =
  /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충청북도|충남|충청남도|전북|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주)/;

function formatKoreanDisplayName(value?: string | null) {
  if (!value) return value ?? null;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized.includes(",")) {
    return normalized;
  }

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part !== "\uB300\uD55C\uBBFC\uAD6D" && part !== "South Korea" && !/^\d{5}$/.test(part));

  if (parts.length === 2 && !KOREAN_REGION_PREFIX.test(parts[0]) && KOREAN_REGION_PREFIX.test(parts[1])) {
    return parts.join(", ");
  }

  return parts.reverse().join(" ").replace(/\s+/g, " ").trim();
}

function normalizeGeocodeBody<T>(body: T): T {
  if (Array.isArray(body)) {
    return body.map((item) =>
      item && typeof item === "object" && "display_name" in item
        ? { ...item, display_name: formatKoreanDisplayName(String(item.display_name ?? "")) }
        : item,
    ) as T;
  }

  if (body && typeof body === "object" && "display_name" in body) {
    return { ...body, display_name: formatKoreanDisplayName(String(body.display_name ?? "")) } as T;
  }

  return body;
}

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
    cache: "no-store",
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

async function fetchKakao(url: URL) {
  if (!KAKAO_API_KEY) {
    return null;
  }

  return fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `KakaoAK ${KAKAO_API_KEY}`,
    },
  }).catch(() => null);
}

function kakaoReverseAddress(body: unknown) {
  const documents = (body as { documents?: { road_address?: { address_name?: string }; address?: { address_name?: string } }[] })
    .documents;
  const first = documents?.[0];
  return first?.road_address?.address_name ?? first?.address?.address_name ?? null;
}

function kakaoRegionAddress(body: unknown) {
  const documents = (body as {
    documents?: {
      region_type?: string;
      region_1depth_name?: string;
      region_2depth_name?: string;
      region_3depth_name?: string;
      region_4depth_name?: string;
    }[];
  }).documents ?? [];
  const region = documents.find((item) => item.region_type === "B") ?? documents[0];
  if (!region) return null;

  return [
    region.region_1depth_name,
    region.region_2depth_name,
    region.region_3depth_name,
    region.region_4depth_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function kakaoSearchResults(body: unknown) {
  const documents = (body as { documents?: { address_name?: string; x?: string; y?: string }[] }).documents ?? [];
  return documents
    .map((item) => ({
      display_name: item.address_name ?? "",
      lat: item.y ?? "",
      lon: item.x ?? "",
    }))
    .filter((item) => item.display_name && item.lat && item.lon);
}

function kakaoKeywordSearchResults(body: unknown) {
  const documents =
    (body as {
      documents?: {
        address_name?: string;
        place_name?: string;
        road_address_name?: string;
        x?: string;
        y?: string;
      }[];
    }).documents ?? [];

  return documents
    .map((item) => {
      const address = item.road_address_name || item.address_name || "";
      const placeName = item.place_name || "";
      return {
        display_name: [placeName, address].filter(Boolean).join(", "),
        lat: item.y ?? "",
        lon: item.x ?? "",
      };
    })
    .filter((item) => item.display_name && item.lat && item.lon);
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

    const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json");
    kakaoUrl.searchParams.set("x", lon);
    kakaoUrl.searchParams.set("y", lat);
    kakaoUrl.searchParams.set("input_coord", "WGS84");

    const kakaoResponse = await fetchKakao(kakaoUrl);
    if (kakaoResponse?.ok) {
      const address = kakaoReverseAddress(await kakaoResponse.json());
      if (address) {
        const body = { display_name: formatKoreanDisplayName(address) };
        remember(key, body);
        return NextResponse.json(body);
      }
    }

    const kakaoRegionUrl = new URL("https://dapi.kakao.com/v2/local/geo/coord2regioncode.json");
    kakaoRegionUrl.searchParams.set("x", lon);
    kakaoRegionUrl.searchParams.set("y", lat);

    const kakaoRegionResponse = await fetchKakao(kakaoRegionUrl);
    if (kakaoRegionResponse?.ok) {
      const address = kakaoRegionAddress(await kakaoRegionResponse.json());
      if (address) {
        const body = { display_name: formatKoreanDisplayName(address) };
        remember(key, body);
        return NextResponse.json(body);
      }
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");

    const response = await fetchNominatim(url);
    if (!response || !response.ok) {
      return NextResponse.json({ display_name: null });
    }

    const body = normalizeGeocodeBody(await response.json());
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

    const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/address.json");
    kakaoUrl.searchParams.set("query", query);
    kakaoUrl.searchParams.set("size", String(limit));

    const kakaoResponse = await fetchKakao(kakaoUrl);
    if (kakaoResponse?.ok) {
      const body = kakaoSearchResults(await kakaoResponse.json()).map((item) => ({
        ...item,
        display_name: formatKoreanDisplayName(item.display_name),
      }));
      if (body.length > 0) {
        remember(key, body);
        return NextResponse.json(body);
      }
    }

    const kakaoKeywordUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    kakaoKeywordUrl.searchParams.set("query", query);
    kakaoKeywordUrl.searchParams.set("size", String(limit));

    const kakaoKeywordResponse = await fetchKakao(kakaoKeywordUrl);
    if (kakaoKeywordResponse?.ok) {
      const body = kakaoKeywordSearchResults(await kakaoKeywordResponse.json());
      if (body.length > 0) {
        remember(key, body);
        return NextResponse.json(body);
      }
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", query);
    url.searchParams.set("countrycodes", "kr");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("addressdetails", "1");

    const response = await fetchNominatim(url);
    if (!response || !response.ok) {
      return NextResponse.json([]);
    }

    const body = normalizeGeocodeBody(await response.json());
    remember(key, body);
    return NextResponse.json(body);
  }

  return NextResponse.json({ message: "unsupported geocode mode" }, { status: 400 });
}
