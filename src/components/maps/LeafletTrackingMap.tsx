"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Coordinates = {
  lat: number;
  lng: number;
};

type MarkerConfig = {
  key: string;
  position: Coordinates;
  variant: "pickup" | "crew" | "hub";
  label?: string;
};

type LeafletTrackingMapProps = {
  center: Coordinates;
  markers: MarkerConfig[];
  path?: Coordinates[];
  className?: string;
  maxZoom?: number;
  minZoom?: number;
  onCenterChangeEnd?: (coordinates: Coordinates) => void;
  onMapClick?: (coordinates: Coordinates) => void;
  syncCenter?: boolean;
  zoom?: number;
};

type GoogleMapsApi = any;

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __swapitGoogleMapsPromise?: Promise<GoogleMapsApi>;
    __swapitGoogleMapsLoaded?: () => void;
    gm_authFailure?: () => void;
  }
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!googleMapsApiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing"));
  }

  if (!window.__swapitGoogleMapsPromise) {
    window.__swapitGoogleMapsPromise = new Promise((resolve, reject) => {
      const waitForExistingScript = () => {
        const startedAt = Date.now();
        const intervalId = window.setInterval(() => {
          if (window.google?.maps) {
            window.clearInterval(intervalId);
            resolve(window.google);
            return;
          }

          if (Date.now() - startedAt > 8000) {
            window.clearInterval(intervalId);
            reject(new Error("Google Maps script timed out"));
          }
        }, 100);
      };

      const existingScript = document.querySelector<HTMLScriptElement>("script[src*='maps.googleapis.com/maps/api/js']");
      if (existingScript) {
        waitForExistingScript();
        return;
      }

      window.__swapitGoogleMapsLoaded = () => {
        if (window.google?.maps) {
          resolve(window.google);
        } else {
          reject(new Error("Google Maps script loaded without maps API"));
        }
      };

      window.gm_authFailure = () => {
        window.dispatchEvent(new Event("swapit-google-maps-auth-failure"));
        reject(new Error("Google Maps authentication failed"));
      };

      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: googleMapsApiKey,
        language: "ko",
        region: "IN",
        loading: "async",
        v: "weekly",
        callback: "__swapitGoogleMapsLoaded",
      });

      script.async = true;
      script.id = "swapit-google-maps-leaflet";
      script.dataset.swapitGoogleMaps = "true";
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.onerror = () => reject(new Error("Google Maps script failed to load"));
      document.head.appendChild(script);
    }).catch((error) => {
      window.__swapitGoogleMapsPromise = undefined;
      throw error;
    });
  }

  return window.__swapitGoogleMapsPromise;
}

function markerColor(variant: MarkerConfig["variant"]) {
  if (variant === "crew") return "#c1003f";
  if (variant === "hub") return "#16a34a";
  return "#2563eb";
}

function markerScale(variant: MarkerConfig["variant"]) {
  return variant === "pickup" ? 11 : 12;
}

function createHomeMarkerIcon(googleApi: GoogleMapsApi) {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r="18" fill="#2563eb" stroke="#ffffff" stroke-width="4"/>
      <path d="M12 21.5 21 14l9 7.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-5v-6.5h-5V31h-5A1.5 1.5 0 0 1 12 29.5v-8Z" fill="#ffffff"/>
    </svg>
  `);

  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new googleApi.maps.Size(42, 42),
    anchor: new googleApi.maps.Point(21, 21),
  };
}

function createMarkerIcon(googleApi: GoogleMapsApi, marker: MarkerConfig) {
  if (marker.label === "home") {
    return createHomeMarkerIcon(googleApi);
  }

  return {
    fillColor: markerColor(marker.variant),
    fillOpacity: 1,
    path: googleApi.maps.SymbolPath.CIRCLE,
    scale: markerScale(marker.variant),
    strokeColor: "#ffffff",
    strokeWeight: 3,
  };
}

function createMarkerLabel(label?: string) {
  if (label === "home") return undefined;

  const safeLabel = (label ?? "").slice(0, 1).toUpperCase();
  if (!safeLabel) return undefined;

  return {
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "800",
    text: safeLabel,
  };
}

export function LeafletTrackingMap({
  center,
  markers,
  path = [],
  className,
  maxZoom = 22,
  minZoom = 3,
  onCenterChangeEnd,
  onMapClick,
  syncCenter = false,
  zoom = 17,
}: LeafletTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());
  const polylineRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const mapInteractionListenersRef = useRef<any[]>([]);
  const initializedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const autoAdjustingRef = useRef(false);
  const shouldReportCenterRef = useRef(false);
  const onCenterChangeEndRef = useRef(onCenterChangeEnd);
  const [loadError, setLoadError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const normalizedPath = useMemo(() => path.filter(Boolean), [path]);

  useEffect(() => {
    onCenterChangeEndRef.current = onCenterChangeEnd;
  }, [onCenterChangeEnd]);

  useEffect(() => {
    const handleAuthFailure = () => {
      setLoadError("Google Maps authentication failed");
    };

    window.addEventListener("swapit-google-maps-auth-failure", handleAuthFailure);
    return () => {
      window.removeEventListener("swapit-google-maps-auth-failure", handleAuthFailure);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let tilesLoaded = false;
    const timeoutId = window.setTimeout(() => {
      if (mounted && !tilesLoaded) {
        setLoadError("Google Maps tile loading timed out");
      }
    }, 9000);

    loadGoogleMaps()
      .then((googleApi) => {
        const container = containerRef.current;
        if (!mounted || !container) {
          return;
        }

        if (mapRef.current) {
          tilesLoaded = true;
          window.clearTimeout(timeoutId);
          setMapReady(true);
          return;
        }

        if (!(container instanceof HTMLElement) || !container.isConnected) {
          return;
        }

        const frameId = window.requestAnimationFrame(() => {
          if (!mounted || !container.isConnected || mapRef.current) {
            return;
          }

          const map = new googleApi.maps.Map(container, {
            center,
            clickableIcons: true,
            disableDefaultUI: false,
            fullscreenControl: false,
            gestureHandling: "greedy",
            mapTypeControl: false,
            maxZoom,
            minZoom,
            scaleControl: true,
            streetViewControl: false,
            zoom,
            zoomControl: true,
          });

          mapRef.current = map;
          const tilesLoadedListener = googleApi.maps.event.addListenerOnce(map, "tilesloaded", () => {
            tilesLoaded = true;
            window.clearTimeout(timeoutId);
            if (mounted) {
              setMapReady(true);
            }
          });
          mapInteractionListenersRef.current = [
            tilesLoadedListener,
            map.addListener("dragstart", () => {
              userInteractedRef.current = true;
              shouldReportCenterRef.current = true;
            }),
            map.addListener("zoom_changed", () => {
              if (!autoAdjustingRef.current && initializedRef.current) {
                userInteractedRef.current = true;
                shouldReportCenterRef.current = true;
              }
            }),
            map.addListener("idle", () => {
              const callback = onCenterChangeEndRef.current;
              const mapCenter = map.getCenter();
              if (!callback || !mapCenter || autoAdjustingRef.current || !shouldReportCenterRef.current) {
                return;
              }

              shouldReportCenterRef.current = false;
              callback({
                lat: mapCenter.lat(),
                lng: mapCenter.lng(),
              });
            }),
          ];
        });

        mapInteractionListenersRef.current.push({
          remove: () => window.cancelAnimationFrame(frameId),
        });
      })
      .catch((error: Error) => {
        if (mounted) {
          window.clearTimeout(timeoutId);
          setLoadError(error.message);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      mapInteractionListenersRef.current.forEach((listener) => listener.remove());
      mapInteractionListenersRef.current = [];
    };
  }, [maxZoom, minZoom, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!syncCenter || !map || !window.google?.maps) return;

    const mapCenter = map.getCenter();
    const centerChanged =
      !mapCenter ||
      Math.abs(mapCenter.lat() - center.lat) > 0.000001 ||
      Math.abs(mapCenter.lng() - center.lng) > 0.000001;

    if (!centerChanged) return;

    autoAdjustingRef.current = true;
    map.setCenter(center);
    window.setTimeout(() => {
      autoAdjustingRef.current = false;
    }, 0);
  }, [center, syncCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const googleApi = window.google;
    if (!map || !googleApi?.maps) return;

    const activeMarkerKeys = new Set<string>();

    markers.forEach((marker) => {
      activeMarkerKeys.add(marker.key);
      const existingMarker = markerRefs.current.get(marker.key);

      if (existingMarker) {
        existingMarker.setPosition(marker.position);
        existingMarker.setIcon(createMarkerIcon(googleApi, marker));
        existingMarker.setLabel(createMarkerLabel(marker.label));
        existingMarker.setTitle(marker.label ?? "");
        existingMarker.setMap(map);
        return;
      }

      markerRefs.current.set(
        marker.key,
        new googleApi.maps.Marker({
          icon: createMarkerIcon(googleApi, marker),
          label: createMarkerLabel(marker.label),
          map,
          position: marker.position,
          title: marker.label,
        }),
      );
    });

    markerRefs.current.forEach((marker, key) => {
      if (!activeMarkerKeys.has(key)) {
        marker.setMap(null);
        markerRefs.current.delete(key);
      }
    });

    if (normalizedPath.length > 1) {
      if (polylineRef.current) {
        polylineRef.current.setPath(normalizedPath);
      } else {
        polylineRef.current = new googleApi.maps.Polyline({
          geodesic: false,
          map,
          path: normalizedPath,
          strokeColor: "#1f6fff",
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
      }
    } else if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!initializedRef.current && !userInteractedRef.current) {
      autoAdjustingRef.current = true;
      initializedRef.current = true;

      const points = [...markers.map((marker) => marker.position), ...normalizedPath];
      if (points.length > 1) {
        const bounds = new googleApi.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 64);
      } else {
        map.setCenter(center);
        map.setZoom(zoom);
      }

      window.setTimeout(() => {
        autoAdjustingRef.current = false;
      }, 0);
    }
  }, [center, markers, normalizedPath, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }

    if (onMapClick) {
      clickListenerRef.current = map.addListener("click", (event: any) => {
        const latLng = event.latLng;
        if (!latLng) return;
        onMapClick({
          lat: latLng.lat(),
          lng: latLng.lng(),
        });
      });
    }

    return () => {
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
    };
  }, [onMapClick]);

  if (loadError) {
    const missingKey = loadError.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

    return (
      <StaticMapFallback className={className} markers={markers}>
        <div className="rounded-2xl bg-white/90 px-4 py-3 text-center shadow-sm">
          <p className="text-sm font-bold text-ink">Google Maps 연결이 필요합니다</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            {missingKey
              ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 환경변수를 설정한 뒤 다시 빌드해주세요."
              : "Google Cloud에서 Maps JavaScript API, 결제, 도메인 제한 설정을 확인해주세요."}
          </p>
        </div>
      </StaticMapFallback>
    );
  }

  return (
    <div className={`${className ?? ""} relative overflow-hidden bg-[radial-gradient(circle_at_72%_24%,rgba(255,184,0,.18),transparent_18%),linear-gradient(180deg,#f5f6f8,#e8edf3)]`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!mapReady ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl bg-white/90 px-4 py-3 text-center text-xs font-bold text-slate-600 shadow-sm">
          지도를 불러오고 있어요
        </div>
      ) : null}
    </div>
  );
}

function StaticMapFallback({
  children,
  className,
  markers,
}: {
  children?: ReactNode;
  className?: string;
  markers: MarkerConfig[];
}) {
  const primaryMarker = markers[0];

  return (
    <div className={`${className ?? ""} relative overflow-hidden bg-[radial-gradient(circle_at_72%_24%,rgba(255,184,0,.22),transparent_18%),linear-gradient(180deg,#f5f6f8,#e8edf3)]`}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.18)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.18)_1px,transparent_1px)] bg-[length:28px_28px]" />
      {primaryMarker ? (
        <div
          className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white text-xs font-black text-white shadow-xl"
          style={{ backgroundColor: markerColor(primaryMarker.variant) }}
        >
          {(primaryMarker.label ?? "P").slice(0, 1).toUpperCase()}
        </div>
      ) : null}
      {children ? (
        <div className="absolute inset-x-4 top-4 z-10 flex justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
