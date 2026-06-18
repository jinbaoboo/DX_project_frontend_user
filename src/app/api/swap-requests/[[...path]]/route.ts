const backendOrigin =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8082";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function copyBackendResponse(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("x-swapit-route", "swap-requests-handler");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function backendUrl(path: string) {
  return new URL(path, backendOrigin);
}

async function postJson(path: string, body: unknown) {
  return fetch(backendUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

async function createInstantCallWithFallback(request: Request) {
  const payload = await request.json();
  const directResponse = await postJson("/api/swap-requests/instant-call", payload);

  if (directResponse.status !== 404) {
    return copyBackendResponse(directResponse);
  }

  const applianceType = payload.applianceType ?? "washing_machine";
  const createResponse = await postJson("/api/swap-requests", {
    userId: payload.userId,
    userName: payload.userName,
    phoneNumber: payload.phoneNumber,
    applianceType,
  });

  if (!createResponse.ok) {
    return copyBackendResponse(createResponse);
  }

  const created = await createResponse.json();
  const swapRequestId = created.id;

  const photoResponse = await postJson(`/api/swap-requests/${swapRequestId}/photos`, {
    fileName: "preview-washer-front.jpg",
    exteriorPhotoFileName: "preview-washer-front.jpg",
    labelPhotoFileName: "preview-washer-label.jpg",
    imageUrl: "preview-washer-front.jpg",
    applianceType,
    agreedToCreditPolicy: true,
  });

  if (!photoResponse.ok) {
    return copyBackendResponse(photoResponse);
  }

  const acceptResponse = await postJson(`/api/swap-requests/${swapRequestId}/pre-valuation/accept`, {});
  if (!acceptResponse.ok) {
    return copyBackendResponse(acceptResponse);
  }

  const instantCallResponse = await postJson(`/api/swap-requests/${swapRequestId}/instant-call`, {
    address: payload.address,
    detailAddress: payload.detailAddress ?? "",
    pickupLat: payload.pickupLat,
    pickupLng: payload.pickupLng,
    pickupAccuracyMeters: payload.pickupAccuracyMeters,
    pickupSource: payload.pickupSource,
  });

  return copyBackendResponse(instantCallResponse);
}

async function proxySwapRequest(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const requestUrl = new URL(request.url);
  const joinedPath = path.join("/");

  if (request.method === "POST" && joinedPath === "instant-call") {
    return createInstantCallWithFallback(request);
  }

  const targetUrl = backendUrl(`/api/swap-requests/${joinedPath}`);
  targetUrl.search = requestUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, init);
  return copyBackendResponse(response);
}

export const GET = proxySwapRequest;
export const POST = proxySwapRequest;
export const PATCH = proxySwapRequest;
export const PUT = proxySwapRequest;
export const DELETE = proxySwapRequest;
