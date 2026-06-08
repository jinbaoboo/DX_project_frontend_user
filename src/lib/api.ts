import type { SwapRequest } from "@/types/swap";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window === "undefined"
    ? "http://127.0.0.1:8080"
    : `${window.location.protocol}//${window.location.hostname}:8080`);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function createSwapRequest() {
  return request<SwapRequest>("/api/swap-requests", {
    method: "POST",
    body: JSON.stringify({
      userName: "Demo User",
      phoneNumber: "+91-90000-00000",
    }),
  });
}

export function analyzePhoto(id: number, fileName: string) {
  return request<SwapRequest>(`/api/swap-requests/${id}/photos`, {
    method: "POST",
    body: JSON.stringify({ fileName }),
  });
}

export function confirmBooking(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/booking`, {
    method: "POST",
    body: JSON.stringify({
      bookingDate: "2026-06-12",
      bookingTime: "10:00",
      address: "Bengaluru, Karnataka",
    }),
  });
}

export function completeFinalValuation(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/final-valuation/mock`, {
    method: "POST",
  });
}
