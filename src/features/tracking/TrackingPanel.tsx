"use client";

import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@/components/maps/google-maps-compat";
import { getTracking } from "@/lib/api";
import type { SwapRequest } from "@/types/swap";
import { MapPin, Navigation, Phone, ShieldCheck, Star, Truck } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type TrackingPanelProps = {
  swapRequest: SwapRequest | null;
  onNext: () => void;
};

type PickupTrackingStatus =
  | "waiting"
  | "crew_assigned"
  | "en_route_pickup"
  | "arrived"
  | "en_route_hub"
  | "delivered_to_hub";

type TrackingViewModel = {
  status: PickupTrackingStatus;
  title: string;
  subtitle: string;
  pickupLocation: { lat: number; lng: number };
  crewLocation: { lat: number; lng: number } | null;
  processingCenter: { label: string; lat: number; lng: number } | null;
  etaLabel: string;
  crewProfile: {
    name: string;
    photoUrl: string;
    rating: number;
    reviewSummary: string[];
    phone: string;
  } | null;
  locationMessage: string;
  nearbyCrews: SwapRequest["tracking"]["nearbyCrews"];
  events: NonNullable<SwapRequest["tracking"]["events"]>;
};

const progressSteps = [
  { key: "REQUESTED", label: "요청 접수" },
  { key: "ASSIGNED", label: "크루 배정" },
  { key: "EN_ROUTE", label: "수거지 이동" },
  { key: "ARRIVED", label: "문앞 도착" },
  { key: "HUB_DONE", label: "e-waste 공장 전달 완료" },
] as const;

function minutesUntil(value?: string | null) {
  if (!value) return 0;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 60000));
}

function deriveStatus(request: SwapRequest): PickupTrackingStatus {
  if (request.tracking.phase === "DELIVERED_TO_EWASTE_HUB" || request.status === "REWARD_READY") {
    return "delivered_to_hub";
  }
  if (request.tracking.phase === "EN_ROUTE_TO_PROCESSING_CENTER") {
    return "en_route_hub";
  }
  if (request.pickupRequest?.status === "ARRIVED" || request.tracking.phase === "PICKUP_CONFIRMED") {
    return "arrived";
  }
  if (request.pickupRequest?.status === "IN_PROGRESS" || request.tracking.phase === "EN_ROUTE_TO_PICKUP") {
    return "en_route_pickup";
  }
  if (request.pickupRequest?.status === "ASSIGNED" || request.tracking.phase === "CREW_ASSIGNED") {
    return "crew_assigned";
  }
  return "waiting";
}

function titleFor(status: PickupTrackingStatus) {
  switch (status) {
    case "crew_assigned":
      return "크루가 배정되었어요";
    case "en_route_pickup":
      return "크루가 수거지로 이동 중이에요";
    case "arrived":
      return "문앞에서 수거를 진행 중이에요";
    case "en_route_hub":
      return "e-waste 공장으로 이동 중이에요";
    case "delivered_to_hub":
      return "e-waste 공장 전달이 완료되었어요";
    default:
      return "근처 수거 크루를 찾고 있어요";
  }
}

function subtitleFor(status: PickupTrackingStatus) {
  switch (status) {
    case "crew_assigned":
      return "배정된 크루의 프로필과 위치를 확인할 수 있어요.";
    case "en_route_pickup":
      return "실시간 위치 갱신으로 크루 이동을 추적하고 있어요.";
    case "arrived":
      return "현장 확인과 수거가 진행 중입니다.";
    case "en_route_hub":
      return "수거 후 처리 허브로 이동하고 있습니다.";
    case "delivered_to_hub":
      return "안심 처리 완료 상태를 확인할 수 있어요.";
    default:
      return "매칭 점수가 높은 크루에게 우선 알림을 보내고 있습니다.";
  }
}

function mapToViewModel(request: SwapRequest): TrackingViewModel | null {
  const pickupLat = request.booking?.pickupLat;
  const pickupLng = request.booking?.pickupLng;

  if (pickupLat == null || pickupLng == null) {
    return null;
  }

  const status = deriveStatus(request);
  const minutes = minutesUntil(request.tracking.estimatedArrivalAt);
  const driverLocation = request.tracking.driverLocation
    ? {
        lat: request.tracking.driverLocation.lat,
        lng: request.tracking.driverLocation.lng,
      }
    : null;

  const locationMessage = request.tracking.metrics?.locationLive
    ? "크루 위치가 실시간으로 업데이트되고 있어요."
    : "최신 위치를 다시 확인하는 중이에요.";

  return {
    status,
    title: titleFor(status),
    subtitle: subtitleFor(status),
    pickupLocation: { lat: pickupLat, lng: pickupLng },
    crewLocation: driverLocation,
    processingCenter: request.tracking.processingCenter ?? null,
    etaLabel: status === "delivered_to_hub" ? "전달 완료" : minutes > 0 ? `${minutes}분 예상` : "곧 도착",
    crewProfile: request.crewProfile
      ? {
          name: request.crewProfile.name,
          photoUrl: request.crewProfile.photoUrl,
          rating: request.crewProfile.rating,
          reviewSummary: request.crewProfile.reviewSummary,
          phone: "+82-10-0000-0000",
        }
      : null,
    locationMessage,
    nearbyCrews: request.tracking.nearbyCrews ?? request.pickupRequest?.nearbyCrews ?? [],
    events: request.tracking.events ?? [],
  };
}

export function TrackingPanel({ swapRequest, onNext }: TrackingPanelProps) {
  const [liveRequest, setLiveRequest] = useState<SwapRequest | null>(swapRequest);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLiveRequest(swapRequest);
  }, [swapRequest]);

  useEffect(() => {
    if (!swapRequest?.id) {
      return undefined;
    }

    let disposed = false;
    const fetchTracking = async () => {
      try {
        const latest = await getTracking(swapRequest.id);
        if (!disposed) {
          setLiveRequest(latest);
          setError(null);
        }
      } catch (requestError) {
        if (!disposed) {
          setError(requestError instanceof Error ? requestError.message : "tracking request failed");
        }
      }
    };

    void fetchTracking();
    const timer = window.setInterval(() => {
      void fetchTracking();
    }, 2000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [swapRequest?.id]);

  const viewModel = liveRequest ? mapToViewModel(liveRequest) : null;

  if (!liveRequest || !viewModel) {
    return (
      <section className="rounded-[28px] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-ink">수거 추적 정보가 아직 준비되지 않았어요</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          예약 또는 바로콜 요청이 접수되면 이 화면에서 수거 크루의 이동 상태를 확인할 수 있습니다.
        </p>
      </section>
    );
  }

  const currentStepIndex = progressIndex(viewModel.status);
  const canOpenReward = viewModel.status === "delivered_to_hub";

  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
      <div className="bg-[linear-gradient(135deg,#fff5f8,#ffffff_55%,#f8fafc)] p-5">
        <span className="inline-flex rounded-full bg-lgred/10 px-3 py-1 text-xs font-black text-lgred">
          이동 중인 크루 확인
        </span>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[2rem] font-black leading-tight text-ink">{viewModel.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{viewModel.subtitle}</p>
          </div>
          <div className="rounded-2xl bg-[#202632] px-4 py-3 text-right text-white">
            <p className="text-xs font-black text-white/60">상태</p>
            <p className="mt-1 text-base font-black">{viewModel.etaLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="-mt-2 rounded-[26px] border border-[#f1d7df] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {viewModel.crewProfile ? (
                <img
                  alt={viewModel.crewProfile.name}
                  className="h-14 w-14 rounded-2xl object-cover"
                  src={viewModel.crewProfile.photoUrl}
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-lgred">
                  <Truck size={22} />
                </span>
              )}
              <div>
                <p className="text-xs font-black text-lgred">배정 크루</p>
                <p className="text-lg font-black text-ink">{viewModel.crewProfile?.name ?? "배정 대기 중"}</p>
                <div className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
                  <Star size={12} className="fill-current text-[#ffb800]" />
                  {viewModel.crewProfile ? viewModel.crewProfile.rating.toFixed(1) : "-"}
                </div>
              </div>
            </div>
            {viewModel.crewProfile ? (
              <a
                className="flex h-11 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700"
                href={`tel:${viewModel.crewProfile.phone}`}
              >
                <Phone size={16} />
                연락
              </a>
            ) : null}
          </div>
          {viewModel.crewProfile ? (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p>{viewModel.crewProfile.reviewSummary[0] ?? "친절하게 수거를 진행해요."}</p>
              <p>{viewModel.crewProfile.reviewSummary[1] ?? "시간 약속을 잘 지켜요."}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 overflow-hidden rounded-[28px] bg-slate-50">
          <TrackingMap viewModel={viewModel} />
        </div>

        <div className="mt-4 rounded-[26px] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-ink">
            <Navigation size={16} />
            수거 진행 상태
          </div>
          <div className="mt-4 space-y-4">
            {progressSteps.map((step, index) => {
              const active = index <= currentStepIndex;
              const time = progressTime(step.key, viewModel.events);
              return (
                <div key={step.key} className="grid grid-cols-[16px_minmax(0,1fr)_64px] items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`h-4 w-4 rounded-full ${active ? "bg-lgred" : "bg-slate-200"}`} />
                    {index < progressSteps.length - 1 ? (
                      <span className={`mt-1 h-10 w-[3px] rounded-full ${active ? "bg-lgred/70" : "bg-slate-200"}`} />
                    ) : null}
                  </div>
                  <div>
                    <p className={`text-sm font-black ${active ? "text-ink" : "text-slate-400"}`}>{step.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{helperText(step.key)}</p>
                  </div>
                  <p className={`text-right text-xs font-semibold ${active ? "text-slate-500" : "text-slate-300"}`}>{time}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoCard icon={<MapPin size={16} />} title="현재 상태" value={viewModel.locationMessage} />
          <InfoCard
            icon={<ShieldCheck size={16} />}
            title="처리 허브"
            value={viewModel.processingCenter?.label ?? "배정 후 표시"}
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">{error}</p>
        ) : null}

        <button
          className="mt-5 h-12 w-full rounded-2xl bg-lgred text-sm font-black text-white disabled:bg-slate-300"
          disabled={!canOpenReward}
          onClick={onNext}
          type="button"
        >
          {canOpenReward ? "전체 보상 확인으로 이동" : "e-waste 공장 전달 대기 중"}
        </button>
      </div>
    </section>
  );
}

function TrackingMap({ viewModel }: { viewModel: TrackingViewModel }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return <FallbackMap viewModel={viewModel} />;
  }

  return <GoogleTrackingMap apiKey={apiKey} viewModel={viewModel} />;
}

function GoogleTrackingMap({
  apiKey,
  viewModel,
}: {
  apiKey: string;
  viewModel: TrackingViewModel;
}) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const center = viewModel.crewLocation ?? viewModel.pickupLocation;
  const routePath = useMemo(() => {
    if (viewModel.crewLocation && viewModel.processingCenter && viewModel.status === "en_route_hub") {
      return [viewModel.crewLocation, viewModel.processingCenter];
    }
    if (viewModel.crewLocation) {
      return [viewModel.crewLocation, viewModel.pickupLocation];
    }
    return [viewModel.pickupLocation];
  }, [viewModel]);

  if (loadError || !isLoaded) {
    return <FallbackMap viewModel={viewModel} />;
  }

  return (
    <GoogleMap
      center={center}
      mapContainerClassName="h-[360px] w-full"
      options={{
        clickableIcons: false,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      }}
      zoom={15}
    >
      <MarkerF position={viewModel.pickupLocation} label={{ color: "#ffffff", fontWeight: "900", text: "수거" }} />
      {viewModel.processingCenter ? (
        <MarkerF
          position={viewModel.processingCenter}
          label={{ color: "#ffffff", fontWeight: "900", text: "허브" }}
        />
      ) : null}
      {viewModel.crewLocation ? (
        <MarkerF position={viewModel.crewLocation} label={{ color: "#ffffff", fontWeight: "900", text: "크루" }} />
      ) : null}
      {viewModel.crewLocation ? (
        <PolylineF
          path={routePath}
          options={{ strokeColor: "#A50034", strokeOpacity: 0.85, strokeWeight: 5 }}
        />
      ) : null}
    </GoogleMap>
  );
}

function FallbackMap({ viewModel }: { viewModel: TrackingViewModel }) {
  return (
    <div className="relative h-[360px] overflow-hidden bg-[radial-gradient(circle_at_72%_24%,rgba(165,0,52,.12),transparent_22%),linear-gradient(180deg,#f8fafc,#eef2f7)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.15)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.15)_1px,transparent_1px)] bg-[length:28px_28px]" />
      <span className="absolute left-[10%] top-[26%] h-3 w-[78%] rotate-[12deg] rounded-full bg-white/90 shadow-sm" />
      <span className="absolute left-[8%] top-[62%] h-3 w-[84%] -rotate-[9deg] rounded-full bg-white/90 shadow-sm" />
      <div className="absolute left-[54%] top-[32%] z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#A50034] text-xs font-black text-white shadow-xl">
        크루
      </div>
      <div className="absolute bottom-[22%] right-[18%] z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#202632] text-xs font-black text-white shadow-lg">
        수거
      </div>
      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-ink shadow">
        {viewModel.title}
      </div>
    </div>
  );
}

function progressIndex(status: PickupTrackingStatus) {
  switch (status) {
    case "waiting":
      return 0;
    case "crew_assigned":
      return 1;
    case "en_route_pickup":
      return 2;
    case "arrived":
    case "en_route_hub":
      return 3;
    case "delivered_to_hub":
      return 4;
    default:
      return 0;
  }
}

function helperText(stepKey: (typeof progressSteps)[number]["key"]) {
  switch (stepKey) {
    case "REQUESTED":
      return "예약 또는 바로콜 요청이 접수된 상태입니다.";
    case "ASSIGNED":
      return "매칭 점수가 높은 크루가 배정됩니다.";
    case "EN_ROUTE":
      return "크루 위치가 실시간으로 갱신됩니다.";
    case "ARRIVED":
      return "문앞 도착 후 실물 확인과 수거가 진행됩니다.";
    case "HUB_DONE":
      return "e-waste 공장 전달 완료 시 안심 처리 완료 알림이 표시됩니다.";
    default:
      return "";
  }
}

function progressTime(stepKey: string, events: NonNullable<SwapRequest["tracking"]["events"]>) {
  const event = [...events].reverse().find((item) => {
    if (stepKey === "REQUESTED") return item.eventType.includes("REQUEST") || item.eventType === "BOOKING_CONFIRMED";
    if (stepKey === "ASSIGNED") return item.eventType === "CREW_ASSIGNED";
    if (stepKey === "EN_ROUTE") return item.eventType === "CREW_DEPARTED";
    if (stepKey === "ARRIVED") return item.eventType === "CREW_ARRIVED";
    if (stepKey === "HUB_DONE") return item.eventType === "EWASTE_HUB_DELIVERED";
    return false;
  });

  if (!event) {
    return "--:--";
  }

  const date = new Date(event.createdAt);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function InfoCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-black text-slate-400">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm font-black leading-6 text-ink">{value}</p>
    </div>
  );
}
