"use client";

import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { doc, onSnapshot } from "firebase/firestore";
import { CheckCircle2, Clock, Phone, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db, hasFirebaseConfig } from "@/lib/firebase";
import type { SwapRequest } from "@/types/swap";

type DriverStatus =
  | "requested"
  | "driver_assigned"
  | "driver_on_the_way"
  | "nearby"
  | "arrived"
  | "completed";

type DriverLocation = {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  updatedAt: Date | { toDate: () => Date } | { seconds: number } | null;
};

type TrackingOrder = {
  userId: string;
  driverId: string;
  status: DriverStatus;
  pickupLat: number;
  pickupLng: number;
  estimatedMinutes: number;
  driver: {
    name: string;
    phone: string;
    certificationStatus: string;
  };
  driverLocation?: DriverLocation | null;
};

type TrackingPanelProps = {
  swapRequest: SwapRequest | null;
  onNext: () => void;
};

const statusMessages: Record<DriverStatus, string> = {
  requested: "수거 신청이 완료되었어요",
  driver_assigned: "기사님이 배정되었어요",
  driver_on_the_way: "기사님이 이동 중이에요",
  nearby: "기사님이 곧 도착해요",
  arrived: "기사님이 도착했어요",
  completed: "수거가 완료되었어요",
};

const mockStatusSequence: DriverStatus[] = [
  "requested",
  "driver_assigned",
  "driver_on_the_way",
  "driver_on_the_way",
  "nearby",
  "arrived",
  "completed",
];

const mockPickup = { lat: 28.6197, lng: 77.2196 };

const mockRoute = [
  { lat: 28.6129, lng: 77.2295, heading: 25, speed: 18 },
  { lat: 28.6136, lng: 77.2269, heading: 42, speed: 22 },
  { lat: 28.6152, lng: 77.2242, heading: 55, speed: 21 },
  { lat: 28.617, lng: 77.2221, heading: 71, speed: 16 },
  { lat: 28.6185, lng: 77.2208, heading: 88, speed: 10 },
];

function createMockOrder(routeIndex: number): TrackingOrder {
  const status = mockStatusSequence[Math.min(routeIndex, mockStatusSequence.length - 1)];
  const routePoint = mockRoute[Math.min(Math.max(routeIndex - 1, 0), mockRoute.length - 1)];
  const hasDriverLocation = status !== "requested";

  return {
    userId: "demo-user-001",
    driverId: "driver-arjun-001",
    status,
    pickupLat: mockPickup.lat,
    pickupLng: mockPickup.lng,
    estimatedMinutes: Math.max(1, 15 - routeIndex * 3),
    driver: {
      name: "Arjun Kumar",
      phone: "+91 98765 43210",
      certificationStatus: "LG 인증 수거 파트너",
    },
    driverLocation: hasDriverLocation
      ? {
          ...routePoint,
          updatedAt: new Date(),
        }
      : null,
  };
}

export function TrackingPanel({ swapRequest, onNext }: TrackingPanelProps) {
  const orderId = String(swapRequest?.id ?? "demo-order-001");
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_TRACKING !== "false";
  const firestoreOrder = useFirestoreTrackingOrder(orderId, !useMock);
  const mockOrder = useMockTrackingOrder();
  const { data: order, loading, error } = useMock ? mockOrder : firestoreOrder;

  if (loading) {
    return (
      <TrackingStateBox
        title="수거 정보를 불러오고 있어요"
        description="LG 인증 수거 파트너의 배정 상태를 확인하는 중입니다."
      />
    );
  }

  if (error) {
    return <TrackingStateBox title="연결을 확인해주세요" description={error} />;
  }

  if (!order) {
    return (
      <TrackingStateBox
        title="수거 신청 정보를 찾을 수 없어요"
        description={`orders/${orderId} 문서가 있는지 확인해주세요.`}
      />
    );
  }

  if (order.status === "completed") {
    return <CompletedTrackingView order={order} onNext={onNext} />;
  }

  return <LiveTrackingView order={order} onComplete={onNext} />;
}

function useMockTrackingOrder() {
  const [routeIndex, setRouteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRouteIndex((current) => current + 1);
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  return {
    data: createMockOrder(routeIndex),
    loading: false,
    error: null as string | null,
  };
}

function useFirestoreTrackingOrder(orderId: string, enabled: boolean) {
  const [data, setData] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    if (!hasFirebaseConfig || !db) {
      setLoading(false);
      setError("Firebase 환경변수가 설정되지 않았어요. mock 모드로 먼저 테스트할 수 있어요.");
      return undefined;
    }

    setLoading(true);
    setError(null);

    // 실시간 위치 갱신 구독:
    // orders/{orderId} 문서를 Firestore onSnapshot으로 구독한다.
    // driverLocation.lat/lng 값이 바뀌면 setData가 실행되고,
    // React가 다시 렌더링되면서 지도 위 기사님 마커 위치가 자동 갱신된다.
    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setData(null);
          setLoading(false);
          return;
        }

        setData(snapshot.data() as TrackingOrder);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [enabled, orderId]);

  return { data, loading, error };
}

function LiveTrackingView({
  order,
  onComplete,
}: {
  order: TrackingOrder;
  onComplete: () => void;
}) {
  const updatedAt = normalizeUpdatedAt(order.driverLocation?.updatedAt);
  const locationMessage = getLocationMessage(updatedAt);
  const progressPercent = getProgressPercent(order.status);
  const isLocationStale = locationMessage === "기사님 위치를 다시 확인하고 있어요";

  return (
    <section className="flex min-h-full flex-col rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <Truck size={18} />
        STEP 4. 실시간 안심 수거 트래킹
      </div>

      <section className="mt-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs font-black text-lgred">LG 인증 방문 수거</p>
        <h1 className="mt-1 text-2xl font-black leading-tight text-ink">
          {statusMessages[order.status]}
        </h1>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-lgred to-lgdark transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          {order.driverLocation ? locationMessage : "기사님 위치를 불러오는 중이에요"}
        </p>
      </section>

      <section className="relative mt-3 min-h-[260px] overflow-hidden rounded-[26px] bg-slate-100">
        <TrackingMap order={order} updatedAt={updatedAt} />
        {isLocationStale ? (
          <div className="absolute left-3 right-3 top-3 rounded-2xl bg-white/95 px-3 py-2 text-xs font-black text-lgred shadow-sm">
            마지막 위치가 오래되어 다시 확인 중입니다.
          </div>
        ) : null}
      </section>

      <section className="mt-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lgred text-white">
            <ShieldCheck size={24} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-lgred">
              {order.driver.certificationStatus || "LG 인증 수거 파트너"}
            </p>
            <h2 className="text-lg font-black leading-tight text-ink">{order.driver.name}</h2>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoTile label="예상 도착 시간" value={`${order.estimatedMinutes}분 후`} />
          <InfoTile label="마지막 위치 업데이트" value={formatUpdatedAt(updatedAt)} />
        </div>

        <div className="mt-3 rounded-2xl bg-lgred/5 p-3">
          <div className="flex gap-2">
            <Clock className="mt-0.5 shrink-0 text-lgred" size={16} />
            <p className="text-xs font-bold leading-5 text-slate-600">
              도착 전에 알림을 보내드릴게요. 방문 전에는 LG 인증 파트너 정보를 꼭 확인해주세요.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-lgred/20 bg-white text-sm font-black text-lgred"
            href={`tel:${order.driver.phone}`}
          >
            <Phone size={16} />
            연락하기
          </a>
          <button
            className="h-12 rounded-xl bg-lgred text-sm font-black text-white"
            onClick={onComplete}
          >
            데모: 수거 완료
          </button>
        </div>
      </section>
    </section>
  );
}

function TrackingMap({
  order,
  updatedAt,
}: {
  order: TrackingOrder;
  updatedAt: Date | null;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const pickupLocation = { lat: order.pickupLat, lng: order.pickupLng };
  const driverLocation = order.driverLocation
    ? { lat: order.driverLocation.lat, lng: order.driverLocation.lng }
    : null;

  if (!apiKey) {
    return (
      <PrototypeMapFallback
        hasDriverLocation={Boolean(driverLocation)}
        locationMessage={getLocationMessage(updatedAt)}
      />
    );
  }

  return (
    <GoogleTrackingMap
      apiKey={apiKey}
      driverLocation={driverLocation}
      pickupLocation={pickupLocation}
    />
  );
}

function GoogleTrackingMap({
  apiKey,
  driverLocation,
  pickupLocation,
}: {
  apiKey: string;
  driverLocation: { lat: number; lng: number } | null;
  pickupLocation: { lat: number; lng: number };
}) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const mapCenter = driverLocation ?? pickupLocation;

  if (!isLoaded) {
    return (
      <PrototypeMapFallback
        hasDriverLocation={Boolean(driverLocation)}
        locationMessage="지도를 불러오는 중이에요"
      />
    );
  }

  return (
    <GoogleMap
      center={mapCenter}
      mapContainerClassName="h-full w-full"
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
      <MarkerF
        position={pickupLocation}
        label={{ color: "#ffffff", fontWeight: "900", text: "집" }}
      />
      {driverLocation ? (
        <MarkerF
          position={driverLocation}
          label={{ color: "#ffffff", fontWeight: "900", text: "LG" }}
        />
      ) : null}
      {driverLocation ? (
        <PolylineF
          path={[driverLocation, pickupLocation]}
          options={{ strokeColor: "#A50034", strokeOpacity: 0.85, strokeWeight: 4 }}
        />
      ) : null}
    </GoogleMap>
  );
}

function PrototypeMapFallback({
  hasDriverLocation,
  locationMessage,
}: {
  hasDriverLocation: boolean;
  locationMessage: string;
}) {
  return (
    <div className="relative h-full min-h-[260px] overflow-hidden bg-[radial-gradient(circle_at_70%_34%,rgba(165,0,52,.13),transparent_22%),linear-gradient(145deg,#eef1f6,#dfe5ee)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.22)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.22)_1px,transparent_1px)] bg-[length:34px_34px]" />
      <span className="absolute left-[8%] top-[28%] h-2.5 w-[92%] rotate-[15deg] rounded-full bg-white/80 shadow-sm" />
      <span className="absolute left-[12%] top-[62%] h-2.5 w-[86%] -rotate-[13deg] rounded-full bg-white/80 shadow-sm" />
      <span className="absolute left-[55%] top-[4%] h-[92%] w-2.5 rotate-[7deg] rounded-full bg-white/80 shadow-sm" />

      <div className="absolute bottom-[24%] right-[18%] z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-ink text-xs font-black text-white shadow-lg">
        집
      </div>
      {hasDriverLocation ? (
        <div className="absolute left-[30%] top-[30%] z-10 flex h-11 w-11 animate-pulse items-center justify-center rounded-full border-4 border-white bg-lgred text-xs font-black text-white shadow-lg">
          LG
        </div>
      ) : null}

      <div className="absolute bottom-12 left-3 right-3 z-20 rounded-2xl bg-white/95 px-3 py-3 text-sm font-black text-ink shadow-sm backdrop-blur">
        {locationMessage}
      </div>
      <div className="absolute bottom-3 left-3 z-20 text-[10px] font-bold text-slate-500">
        Google Maps 키가 없을 때 표시되는 데모 지도
      </div>
    </div>
  );
}

function CompletedTrackingView({
  order,
  onNext,
}: {
  order: TrackingOrder;
  onNext: () => void;
}) {
  return (
    <section className="flex min-h-full flex-col rounded-[28px] bg-white p-5 text-center shadow-sm">
      <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-lgred text-white">
        <CheckCircle2 size={32} />
      </div>
      <p className="mt-5 text-xs font-black text-lgred">실시간 안심 수거 트래킹</p>
      <h1 className="mt-2 text-2xl font-black leading-tight text-ink">수거가 완료되었어요</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        {order.driver.name} 파트너가 폐가전을 안전하게 수거했습니다. 최종 검수가 끝나면
        ThinQ 알림으로 크레딧 결과를 알려드릴게요.
      </p>
      <button
        className="mt-auto h-12 w-full rounded-xl bg-lgred text-sm font-black text-white"
        onClick={onNext}
      >
        최종 검수 화면으로 이동
      </button>
    </section>
  );
}

function TrackingStateBox({ title, description }: { title: string; description: string }) {
  return (
    <section className="flex min-h-full flex-col justify-center rounded-[28px] bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-lgred" />
      <h1 className="text-2xl font-black leading-tight text-ink">{title}</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{description}</p>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-cloud p-3">
      <span className="block text-[11px] font-black text-slate-500">{label}</span>
      <strong className="mt-1 block truncate text-sm font-black text-ink">{value}</strong>
    </div>
  );
}

function normalizeUpdatedAt(updatedAt: DriverLocation["updatedAt"] | undefined) {
  if (!updatedAt) return null;
  if (updatedAt instanceof Date) return updatedAt;
  if ("toDate" in updatedAt && typeof updatedAt.toDate === "function") return updatedAt.toDate();
  if ("seconds" in updatedAt && typeof updatedAt.seconds === "number") {
    return new Date(updatedAt.seconds * 1000);
  }
  return null;
}

function formatUpdatedAt(date: Date | null) {
  if (!date) return "위치 정보 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function getLocationMessage(updatedAt: Date | null) {
  if (!updatedAt) return "기사님 위치를 불러오는 중이에요";

  const seconds = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
  if (seconds >= 30) return "기사님 위치를 다시 확인하고 있어요";
  return `${seconds}초 전 위치가 갱신되었어요`;
}

function getProgressPercent(status: DriverStatus) {
  switch (status) {
    case "requested":
      return 12;
    case "driver_assigned":
      return 32;
    case "driver_on_the_way":
      return 62;
    case "nearby":
      return 82;
    case "arrived":
      return 94;
    case "completed":
      return 100;
    default:
      return 50;
  }
}
