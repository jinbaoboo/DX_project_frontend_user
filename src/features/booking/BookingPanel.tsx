"use client";

import { getBookingAvailability } from "@/lib/api";
import type { BookingAvailabilitySlot } from "@/lib/api";
import type { SwapRequest } from "@/types/swap";
import { Calendar3DIcon } from "@/components/Calendar3DIcon";
import { Service3DIcon } from "@/components/Service3DIcon";
import { Loader2, MapPin, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type BookingPanelProps = {
  swapRequest: SwapRequest | null;
  loading: boolean;
  bookingPurpose?: BookingPurpose;
  errorMessage?: string;
  onBooking: (booking: BookingSelection) => void;
};

type BookingMode = "schedule" | "call";
type PickupMethod = "gps" | "manual";
export type BookingPurpose = "pickup" | "installation";

type BookingCopy = {
  title: string;
  description: string;
  notice?: string;
  scheduleModeLabel: string;
  callModeLabel: string;
  dateTitle: string;
  datePickerLabel: string;
  timeTitle: string;
  timeDescription: string;
  unavailableTimeLabel: string;
  scheduleLoadingLabel: string;
  scheduleSubmitLabel: string;
  addressMapFallback: string;
  locationPermissionError: string;
  locationFetchError: string;
  manualRequiredError: string;
  addressNotFoundError: string;
  coordinateError: string;
  callReservedAt: string;
  currentDetailLabel: string;
  mapDescription: string;
  currentLocationEyebrow: string;
  currentAddressFallback: string;
  detailHint: string;
  detailPlaceholder: string;
  refreshLocationLabel: string;
  matchingLabel: string;
  callLoadingLabel: string;
  callSubmitLabel: string;
  mapAdjustHint: string;
  mapPinLabel: string;
  manualTitle: string;
  manualDescription: string;
  manualButtonLabel: string;
  manualAddressPlaceholder: string;
  manualDetailPlaceholder: string;
  manualSecureError: string;
  manualFetchError: string;
};

type PickupCoordinates = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  source?: "browser_geolocation" | "manual_pin" | "address_geocode";
};

type AddressSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

export type BookingSelection = {
  mode: BookingMode;
  reservedAt: string;
  pickupAddress?: string;
  detailAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupAccuracyMeters?: number;
  pickupSource?: string;
  bookingDate?: string;
  bookingTime?: string;
};

const KakaoCanvasMap = dynamic(
  () => import("@/components/maps/KakaoCanvasMap").then((module) => module.KakaoCanvasMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[linear-gradient(180deg,#f5f6f8,#e8edf3)]" />,
  },
);

const kakaoMapAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() ?? "";

const defaultAddress = "";
const defaultPreviewCoordinates: PickupCoordinates = {
  lat: 37.557527,
  lng: 126.925464,
  accuracyMeters: 30,
  source: "manual_pin",
};
const ADDRESS_LOOKUP_PENDING = "\uC8FC\uC18C\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.";
const ADDRESS_LOOKUP_FAILED = "\uC8FC\uC18C\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC9C0\uB3C4 \uC704\uCE58\uB97C \uB2E4\uC2DC \uC870\uC815\uD574 \uC8FC\uC138\uC694.";
const emptyMapMarkers: [] = [];
const emptyMapPath: [] = [];
const KOREAN_REGION_PREFIX =
  /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충청북도|충남|충청남도|전북|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주)/;

const bookingCopies: Record<BookingPurpose, BookingCopy> = {
  pickup: {
    title: "수거 예약을 진행해요",
    description:
      "시간 예약은 날짜와 시간을 직접 선택하고, 바로콜은 현재 위치 또는 직접 입력한 주소를 기준으로 바로 접수할 수 있어요.",
    scheduleModeLabel: "수거 시간 예약",
    callModeLabel: "빠른 수거 요청",
    dateTitle: "수거 날짜를 선택해요",
    datePickerLabel: "달력에서 수거 날짜를 선택해요",
    timeTitle: "수거 시간을 선택해요",
    timeDescription: "09:00부터 18:00까지, 30분 단위로 예약 가능한 시간만 표시돼요.",
    unavailableTimeLabel: "예약 마감",
    scheduleLoadingLabel: "예약 접수 중...",
    scheduleSubmitLabel: "수거 요청을 예약했어요",
    addressMapFallback: "수거 위치를 검색해 주세요",
    locationPermissionError:
      "현재 접속 환경에서는 GPS 사용이 제한되어 있어요. HTTPS 환경에서 위치 권한을 허용하거나 직접 입력으로 진행해 주세요.",
    locationFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 직접 입력으로 진행해 주세요.",
    manualRequiredError: "수거 위치를 직접 입력해 주세요.",
    addressNotFoundError: "입력한 주소를 찾지 못했어요. 주소를 다시 확인해 주세요.",
    coordinateError: "수거 위치 좌표를 확인하지 못했어요. 다시 시도해 주세요.",
    callReservedAt: "빠른 수거 요청 접수",
    currentDetailLabel: "현재 위치",
    mapDescription: "지도에는 현재 선택된 수거 위치가 표시돼요.",
    currentLocationEyebrow: "내 위치 확인",
    currentAddressFallback: "현재 위치를 확인해 주세요",
    detailHint: "필요하면 상세 위치를 추가해 주세요.",
    detailPlaceholder: "상세 주소를 입력해주세요",
    refreshLocationLabel: "현재 위치를 다시 확인할게요",
    matchingLabel: "빠른 수거 요청 접수 중...",
    callLoadingLabel: "빠른 수거 요청 접수 중...",
    callSubmitLabel: "바로콜 예약하기",
    mapAdjustHint: "",
    mapPinLabel: "수거 위치",
    manualTitle: "수거 위치를 직접 입력해요",
    manualDescription: "현재 위치를 불러오거나 주소 검색 결과를 선택해 수거 위치를 지정할 수 있어요.",
    manualButtonLabel: "현재 위치로 지정할게요",
    manualAddressPlaceholder: "서울특별시 중구 세종대로 110",
    manualDetailPlaceholder: "상세 위치를 입력해 주세요",
    manualSecureError: "현재 위치는 HTTPS 또는 localhost 환경에서만 사용할 수 있어요.",
    manualFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 주소를 직접 입력해 주세요.",
  },
  installation: {
    title: "수거 예약을 진행해요",
    description:
      "교체할 제품의 수거 날짜와 시간을 선택하고, 빠른 요청으로 바로 접수할 수도 있어요.",
    notice: "새 제품 설치가 함께 있는 경우에도 수거 예약 기준으로 동일하게 접수돼요.",
    scheduleModeLabel: "수거 시간 예약",
    callModeLabel: "빠른 수거 요청",
    dateTitle: "수거 날짜를 선택해요",
    datePickerLabel: "달력에서 수거 날짜를 선택해요",
    timeTitle: "수거 시간을 선택해요",
    timeDescription: "수거 가능한 시간만 표시돼요. 선택한 시간에 수거 예약이 진행돼요.",
    unavailableTimeLabel: "예약 마감",
    scheduleLoadingLabel: "수거 예약 접수 중...",
    scheduleSubmitLabel: "수거 예약을 요청할게요",
    addressMapFallback: "수거 위치를 검색해 주세요",
    locationPermissionError:
      "현재 접속 환경에서는 GPS 사용이 제한되어 있어요. HTTPS 환경에서 위치 권한을 허용하거나 수거 위치를 직접 입력해 주세요.",
    locationFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 수거 위치를 직접 입력해 주세요.",
    manualRequiredError: "수거 위치를 직접 입력해 주세요.",
    addressNotFoundError: "입력한 주소를 찾지 못했어요. 주소를 다시 확인해 주세요.",
    coordinateError: "수거 위치 좌표를 확인하지 못했어요. 다시 시도해 주세요.",
    callReservedAt: "빠른 수거 요청 접수",
    currentDetailLabel: "현재 위치",
    mapDescription: "지도에는 현재 선택된 수거 위치가 표시돼요.",
    currentLocationEyebrow: "수거 위치 확인",
    currentAddressFallback: "수거 위치를 확인해 주세요",
    detailHint: "엘리베이터, 주차, 기존 제품 위치처럼 수거에 필요한 정보를 추가해 주세요.",
    detailPlaceholder: "상세 주소를 입력해주세요",
    refreshLocationLabel: "현재 위치를 다시 확인할게요",
    matchingLabel: "빠른 수거 요청 접수 중...",
    callLoadingLabel: "빠른 수거 요청 접수 중...",
    callSubmitLabel: "바로콜 예약하기",
    mapAdjustHint: "",
    mapPinLabel: "수거 위치",
    manualTitle: "수거 위치를 직접 입력해요",
    manualDescription: "현재 위치를 불러오거나 주소 검색 결과를 선택해 수거 위치를 지정할 수 있어요.",
    manualButtonLabel: "현재 위치로 지정할게요",
    manualAddressPlaceholder: "서울특별시 중구 세종대로 110",
    manualDetailPlaceholder: "상세 주소를 입력해주세요",
    manualSecureError: "현재 위치는 HTTPS 또는 localhost 환경에서만 사용할 수 있어요.",
    manualFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 수거 주소를 직접 입력해 주세요.",
  },
};

const timeSlots = Array.from({ length: 19 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function isPastTimeSlot(date: string, time: string) {
  if (!date || !time) return false;
  const target = new Date(`${date}T${time}:00`);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() < Date.now();
}

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  if (!value) {
    return "날짜를 선택해 주세요.";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatReservedAt(date: string, time: string) {
  return `${date} ${time}`;
}

function isSecureGpsAvailable() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext && "geolocation" in navigator;
}

function formatKoreanDisplayName(value?: string | null) {
  if (!value) return "";

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

async function reverseGeocode(latitude: number, longitude: number) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const params = new URLSearchParams({
        format: "json",
        lat: String(latitude),
        lon: String(longitude),
        t: String(Date.now()),
      });
      params.set("mode", "reverse");
      const response = await fetch(`/api/geocode?${params.toString()}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("reverse geocoding failed");
      }

      const data = (await response.json()) as { display_name?: string | null };
      const address = formatKoreanDisplayName(data.display_name);
      if (!address) {
        throw new Error("reverse geocoding returned no address");
      }
      return address;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("reverse geocoding failed");
}

async function geocodeAddress(query: string) {
  const params = new URLSearchParams({
    format: "json",
    q: query,
    countrycodes: "kr",
    limit: "1",
    addressdetails: "1",
  });
  params.set("mode", "search");
  const response = await fetch(`/api/geocode?${params.toString()}`);
  if (!response.ok) {
    throw new Error("address geocoding failed");
  }

  const data = (await response.json()) as AddressSuggestion[];
  const first = data[0];
  if (!first) {
    throw new Error("address not found");
  }

  return {
    address: formatKoreanDisplayName(first.display_name) || first.display_name,
    coordinates: {
      lat: Number(first.lat),
      lng: Number(first.lon),
    },
  };
}

export function BookingPanel({ swapRequest, loading, bookingPurpose = "pickup", errorMessage, onBooking }: BookingPanelProps) {
  const [mode, setMode] = useState<BookingMode>("schedule");
  const canBook = Boolean(swapRequest);
  const copy = bookingCopies[bookingPurpose];
  const allowInstantCall = true;

  useEffect(() => {
    if (!allowInstantCall) {
      setMode("schedule");
    }
  }, [allowInstantCall]);

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <Calendar3DIcon className="h-6 w-6 shrink-0" />
        {copy.title}
      </div>

      {allowInstantCall ? (
        <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <ModeButton active={mode === "schedule"} label={copy.scheduleModeLabel} onClick={() => setMode("schedule")} />
          <ModeButton active={mode === "call"} label={copy.callModeLabel} onClick={() => setMode("call")} />
        </div>
      ) : null}

      <div className="mt-4">
        {!allowInstantCall || mode === "schedule" ? (
          <ScheduleBooking
            canBook={canBook}
            copy={copy}
            hideManualHeader={false}
            loading={loading}
            onBooking={onBooking}
          />
        ) : (
          <InstantCallBooking canBook={canBook} copy={copy} loading={loading} onBooking={onBooking} />
        )}
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-10 rounded-xl text-[13px] transition ${
        active ? "bg-white font-bold text-lgred shadow-sm" : "font-semibold text-slate-500"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ScheduleBooking({
  canBook,
  copy,
  hideManualHeader = false,
  loading,
  onBooking,
}: {
  canBook: boolean;
  copy: BookingCopy;
  hideManualHeader?: boolean;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [detailAddress, setDetailAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<PickupCoordinates | null>(null);
  const [availability, setAvailability] = useState<BookingAvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [pinLocating, setPinLocating] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const reverseLookupSeqRef = useRef(0);

  const handleUseCurrentLocation = async () => {
    if (!isSecureGpsAvailable()) {
      return;
    }
    setPinLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
      });
      const coords = position.coords;
      const nextCoords = { lat: coords.latitude, lng: coords.longitude };
      const nextPreciseCoords = {
        ...nextCoords,
        accuracyMeters: coords.accuracy,
        source: "browser_geolocation" as const,
      };
      setPickupCoords(nextPreciseCoords);
      const lookupSeq = ++reverseLookupSeqRef.current;
      const previousAddress = pickupAddress;
      if (!previousAddress || previousAddress === ADDRESS_LOOKUP_FAILED) {
        setPickupAddress(ADDRESS_LOOKUP_PENDING);
      }
      let nextAddress = "";
      try {
        nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
      } catch {
        // 좌표만으로도 충분히 유효해요.
      }
      if (lookupSeq !== reverseLookupSeqRef.current) return;
      setPickupCoords(nextPreciseCoords);
      if (nextAddress) {
        setPickupAddress(nextAddress);
      } else {
        setPickupAddress(previousAddress || ADDRESS_LOOKUP_PENDING);
      }
    } catch {
      // 위치 권한 거부/실패 시 조용히 무시해요.
    } finally {
      setPinLocating(false);
    }
  };

  const selectScheduleMapLocation = async (nextCoords: PickupCoordinates) => {
    const preciseCoords = {
      ...nextCoords,
      accuracyMeters: nextCoords.accuracyMeters ?? 10,
      source: "manual_pin" as const,
    };
    setPickupCoords(preciseCoords);

    let nextAddress = "";
    const lookupSeq = ++reverseLookupSeqRef.current;
    const previousAddress = pickupAddress;
    if (!previousAddress || previousAddress === ADDRESS_LOOKUP_FAILED) {
      setPickupAddress(ADDRESS_LOOKUP_PENDING);
    }
    try {
      nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
    } catch {
      // 지도 중앙 위치만으로도 예약 좌표는 충분히 저장할 수 있어요.
    }

    if (lookupSeq !== reverseLookupSeqRef.current) return;
    if (nextAddress) {
        setPickupAddress(nextAddress);
      } else {
        setPickupAddress(previousAddress || ADDRESS_LOOKUP_PENDING);
      }
  };

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError("");
      try {
        const result = await getBookingAvailability(selectedDate);
        if (!active) return;
        setAvailability(result.slots);
        const nextAvailable = result.slots.find((slot) => slot.available)?.time ?? "";
        setSelectedTime((currentSelectedTime) => {
          const selectedSlot = result.slots.find((slot) => slot.time === currentSelectedTime);
          return !selectedSlot?.available && nextAvailable ? nextAvailable : currentSelectedTime;
        });
      } catch {
        if (!active) return;
        setAvailability([]);
        setAvailabilityError("예약 현황을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.");
      } finally {
        if (active) {
          setAvailabilityLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      active = false;
    };
  }, [selectedDate]);

  const availabilityByTime = useMemo(
    () => new Map(availability.map((slot) => [slot.time, slot])),
    [availability],
  );
  const selectedSlot = availabilityByTime.get(selectedTime);
  const selectedTimeUnavailable = selectedSlot ? !selectedSlot.available || isPastTimeSlot(selectedDate, selectedTime) : false;
  const previewCoordinates = pickupCoords ?? defaultPreviewCoordinates;
  const hasPickupAddress =
    pickupAddress.trim().length > 0 &&
    pickupAddress !== ADDRESS_LOOKUP_PENDING &&
    pickupAddress !== ADDRESS_LOOKUP_FAILED;

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-slate-50">
        <PickupPreviewMap
          addressLabel={pickupAddress || "수거 위치를 확인해 주세요"}
          coordinates={previewCoordinates}
          onCoordinateSelect={(coordinates) => void selectScheduleMapLocation(coordinates)}
          onLocate={() => void handleUseCurrentLocation()}
          locating={pinLocating}
        />
      </div>

      <ManualAddressEditor
        address={pickupAddress}
        copy={copy}
        detailAddress={detailAddress}
        hideHeader={hideManualHeader}
        onAddressChange={setPickupAddress}
        onCoordinateChange={setPickupCoords}
        onDetailAddressChange={setDetailAddress}
      />

      <button
        className="mt-3 flex min-h-16 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition active:scale-[0.99]"
        onClick={() => setTimePickerOpen(true)}
        type="button"
      >
        <Calendar3DIcon className="h-9 w-9 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-ink">수거 희망 시간 선택</span>
          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
            {formatDateLabel(selectedDate)} · {selectedTime}
          </span>
        </span>
        <span className="text-[12px] font-bold text-lgred">변경</span>
      </button>

      {timePickerOpen ? (
        <ScheduleTimeSheet
          availabilityByTime={availabilityByTime}
          availabilityError={availabilityError}
          availabilityLoading={availabilityLoading}
          copy={copy}
          onClose={() => setTimePickerOpen(false)}
          onDateChange={setSelectedDate}
          onTimeChange={setSelectedTime}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />
      ) : null}

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-[#202632] text-[13px] font-bold text-white disabled:bg-slate-300"
        disabled={!canBook || loading || !selectedDate || !selectedTime || !hasPickupAddress || availabilityLoading}
        onClick={() => {
          onBooking({
            mode: "schedule",
            reservedAt: formatReservedAt(selectedDate, selectedTime),
            pickupAddress,
            detailAddress,
            pickupLat: pickupCoords?.lat,
            pickupLng: pickupCoords?.lng,
            pickupAccuracyMeters: pickupCoords?.accuracyMeters,
            pickupSource: pickupCoords?.source,
            bookingDate: selectedDate,
            bookingTime: selectedTime,
          });
        }}
        type="button"
      >
        {loading ? copy.scheduleLoadingLabel : copy.scheduleSubmitLabel}
      </button>
    </div>
  );
}

function ScheduleTimeSheet({
  availabilityByTime,
  availabilityError,
  availabilityLoading,
  copy,
  onClose,
  onDateChange,
  onTimeChange,
  selectedDate,
  selectedTime,
}: {
  availabilityByTime: Map<string, BookingAvailabilitySlot>;
  availabilityError: string;
  availabilityLoading: boolean;
  copy: BookingCopy;
  onClose: () => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  selectedDate: string;
  selectedTime: string;
}) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const selectedDateParts = parseDateParts(selectedDate);
  const selectedHour = selectedTime.slice(0, 2);
  const selectedMinute = selectedTime.slice(3, 5);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, index) => currentYear + index);
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from(
    { length: daysInMonth(selectedDateParts.year, selectedDateParts.month) },
    (_, index) => index + 1,
  );
  const hours = Array.from(new Set(timeSlots.map((time) => time.slice(0, 2))));
  const minutes = ["00", "30"];

  const isTimeUnavailable = (time: string) => {
    if (!timeSlots.includes(time)) return true;
    if (isPastTimeSlot(selectedDate, time)) return true;
    const minute = Number(time.slice(3, 5));
    const availabilityMinute = minute < 30 ? "00" : "30";
    const availabilityKey = `${time.slice(0, 2)}:${availabilityMinute}`;
    const slot = availabilityByTime.get(availabilityKey);
    return availabilityLoading || (slot ? !slot.available : false);
  };

  const setDatePart = (nextPart: Partial<typeof selectedDateParts>) => {
    const nextYear = nextPart.year ?? selectedDateParts.year;
    const nextMonth = nextPart.month ?? selectedDateParts.month;
    const maxDay = daysInMonth(nextYear, nextMonth);
    const nextDay = Math.min(nextPart.day ?? selectedDateParts.day, maxDay);
    onDateChange(formatDateValue(nextYear, nextMonth, nextDay));
  };

  const selectHour = (hour: string) => {
    const preferred = `${hour}:${selectedMinute}`;
    if (!isTimeUnavailable(preferred)) {
      onTimeChange(preferred);
      return;
    }

    const nextAvailable = timeSlots.find((time) => time.startsWith(`${hour}:`) && !isTimeUnavailable(time));
    if (nextAvailable) {
      onTimeChange(nextAvailable);
    }
  };

  const selectMinute = (minute: string) => {
    const nextTime = `${selectedHour}:${minute}`;
    if (!isTimeUnavailable(nextTime)) {
      onTimeChange(nextTime);
    }
  };

  useEffect(() => {
    setPortalTarget(document.getElementById("swapit-phone-viewport"));
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div className="absolute inset-0 z-[90] flex items-end justify-center bg-black/60 px-3 pt-6 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-[sheetUp_.24s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-[13px] font-bold text-lgred">예약 시간</p>
            <h3 className="mt-1 text-[17px] font-bold text-ink">희망 시간을 선택해요</h3>
          </div>
          <button
            aria-label="시간 선택 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink">{copy.dateTitle}</p>
              <p className="text-[11px] font-bold text-lgred">{formatDateLabel(selectedDate)}</p>
            </div>
            <div className="relative mt-4 grid grid-cols-[1.1fr_0.9fr_0.9fr] gap-2 overflow-hidden rounded-3xl bg-white px-2 py-2 shadow-sm">
              <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-11 -translate-y-1/2 rounded-2xl border-y border-slate-200 bg-slate-50/70" />
              <WheelColumn
                label="년"
                onSelect={(value) => setDatePart({ year: Number(value) })}
                options={years.map((year) => ({ label: String(year), value: String(year) }))}
                selectedValue={String(selectedDateParts.year)}
              />
              <WheelColumn
                label="월"
                onSelect={(value) => setDatePart({ month: Number(value) })}
                options={months.map((month) => ({ label: String(month).padStart(2, "0"), value: String(month) }))}
                selectedValue={String(selectedDateParts.month)}
              />
              <WheelColumn
                label="일"
                onSelect={(value) => setDatePart({ day: Number(value) })}
                options={days.map((day) => ({ label: String(day).padStart(2, "0"), value: String(day) }))}
                selectedValue={String(selectedDateParts.day)}
              />
            </div>
          </section>

          <section className="mt-3 rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-ink">{copy.timeTitle}</p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{copy.timeDescription}</p>
              </div>
              {availabilityLoading ? <Loader2 className="shrink-0 animate-spin text-lgred" size={18} /> : null}
            </div>

            {availabilityError ? (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
                {availabilityError}
              </p>
            ) : null}

            <div className="relative mt-4 grid grid-cols-2 gap-2 overflow-hidden rounded-3xl bg-white px-2 py-2 shadow-sm">
              <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-11 -translate-y-1/2 rounded-2xl border-y border-slate-200 bg-slate-50/70" />
              <WheelColumn
                label="시"
                onSelect={selectHour}
                options={hours.map((hour) => ({
                  disabled: timeSlots.filter((time) => time.startsWith(`${hour}:`)).every(isTimeUnavailable),
                  label: hour,
                  value: hour,
                }))}
                selectedValue={selectedHour}
              />
              <WheelColumn
                label="분"
                onSelect={selectMinute}
                options={minutes.map((minute) => ({
                  disabled: isTimeUnavailable(`${selectedHour}:${minute}`),
                  label: minute,
                  value: minute,
                }))}
                selectedValue={selectedMinute}
              />
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_24px_rgba(15,23,42,.08)]">
          <button
            className="h-12 w-full rounded-2xl bg-lgred text-[13px] font-bold text-white"
            onClick={onClose}
            type="button"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

function WheelColumn({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: { label: string; value: string; disabled?: boolean }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<number | null>(null);

  const selectCenteredOption = () => {
    const list = listRef.current;
    if (!list) return;

    const listRect = list.getBoundingClientRect();
    const listCenter = listRect.top + listRect.height / 2;
    const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>("[data-wheel-value]"));
    const nearest = buttons
      .filter((button) => button.dataset.wheelDisabled !== "true")
      .map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          button,
          distance: Math.abs(rect.top + rect.height / 2 - listCenter),
        };
      })
      .sort((left, right) => left.distance - right.distance)[0]?.button;

    const nextValue = nearest?.dataset.wheelValue;
    if (nextValue && nextValue !== selectedValue) {
      onSelect(nextValue);
    }
  };

  useEffect(() => {
    const target = listRef.current?.querySelector("[data-wheel-active='true']");
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedValue, options.length]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current != null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    if (scrollTimerRef.current != null) {
      window.clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = window.setTimeout(() => {
      selectCenteredOption();
    }, 140);
  };

  return (
    <div className="relative z-10 min-w-0">
      <div
        className="h-36 snap-y snap-proximity overflow-y-auto overscroll-contain scroll-smooth py-[46px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
        ref={listRef}
      >
        {options.map((option) => {
          const active = selectedValue === option.value;

          return (
            <button
              key={option.value}
              className={`flex h-11 w-full snap-center items-center justify-center rounded-2xl text-center transition ${
                active ? "text-[22px] font-black text-ink" : "text-[15px] font-semibold text-slate-400"
              } ${option.disabled && !active ? "opacity-30" : ""}`}
              data-wheel-active={active ? "true" : undefined}
              data-wheel-disabled={option.disabled ? "true" : undefined}
              data-wheel-value={option.value}
              disabled={option.disabled}
              onClick={() => onSelect(option.value)}
              type="button"
            >
              {option.label}
              <span className={`ml-1 text-[11px] ${active ? "text-slate-500" : "text-slate-300"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function parseDateParts(value: string) {
  const fallback = todayString();
  const [year, month, day] = (value || fallback).split("-").map(Number);
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) ? month : new Date().getMonth() + 1,
    day: Number.isFinite(day) ? day : new Date().getDate(),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function InstantCallBooking({
  canBook,
  copy,
  loading,
  onBooking,
}: {
  canBook: boolean;
  copy: BookingCopy;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>("gps");
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [detailAddress, setDetailAddress] = useState("");
  const [gpsCoords, setGpsCoords] = useState<PickupCoordinates | null>(null);
  const [manualCoords, setManualCoords] = useState<PickupCoordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [matching, setMatching] = useState(false);
  const reverseLookupSeqRef = useRef(0);

  const activeCoords = pickupMethod === "gps" ? gpsCoords : manualCoords;
  const mapCoords = activeCoords ?? gpsCoords ?? manualCoords ?? defaultPreviewCoordinates;
  const mapLabel = locating
    ? ADDRESS_LOOKUP_PENDING
    : pickupMethod === "gps"
      ? pickupAddress || copy.currentAddressFallback
      : pickupAddress || copy.addressMapFallback;

  const refreshCurrentLocation = async () => {
    if (!isSecureGpsAvailable()) {
      setGpsCoords(null);
      setLocationError(
        copy.locationPermissionError,
      );
      return null;
    }

    setLocating(true);
    setLocationError("");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
      });
      const coords = position.coords;

      const nextCoords = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracyMeters: coords.accuracy,
        source: "browser_geolocation" as const,
      };

      setGpsCoords(nextCoords);
      const lookupSeq = ++reverseLookupSeqRef.current;
      const previousAddress = pickupAddress;
      if (!previousAddress || previousAddress === ADDRESS_LOOKUP_FAILED) {
        setPickupAddress(ADDRESS_LOOKUP_PENDING);
      }
      let nextAddress = "";
      try {
        nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
      } catch {
        // Reverse geocoding failure should not block GPS usage.
      }

      if (lookupSeq !== reverseLookupSeqRef.current) return { coords: nextCoords, address: previousAddress };
      setGpsCoords(nextCoords);
      if (nextAddress) {
        setPickupAddress(nextAddress);
      } else {
        setPickupAddress(previousAddress || ADDRESS_LOOKUP_PENDING);
      }
      return { coords: nextCoords, address: nextAddress || previousAddress };
    } catch {
      setGpsCoords(null);
      setLocationError(copy.locationFetchError);
      return null;
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (pickupMethod === "gps") {
      void refreshCurrentLocation();
    }
  }, [pickupMethod]);

  const selectMapLocation = async (nextCoords: PickupCoordinates) => {
    setLocationError("");
    const preciseCoords = {
      ...nextCoords,
      accuracyMeters: nextCoords.accuracyMeters ?? 10,
      source: "manual_pin" as const,
    };

    if (pickupMethod === "gps") {
      setGpsCoords(preciseCoords);
    } else {
      setManualCoords(preciseCoords);
    }

    let nextAddress = "";
    const lookupSeq = ++reverseLookupSeqRef.current;
    const previousAddress = pickupAddress;
    if (!previousAddress || previousAddress === ADDRESS_LOOKUP_FAILED) {
      setPickupAddress(ADDRESS_LOOKUP_PENDING);
    }
    try {
      nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
    } catch {
      // Map tapping should still update coordinates even if address lookup fails.
    }

    if (lookupSeq !== reverseLookupSeqRef.current) return;
    if (nextAddress) {
        setPickupAddress(nextAddress);
      } else {
        setPickupAddress(previousAddress || ADDRESS_LOOKUP_PENDING);
      }
  };

  const startMatching = async () => {
    setMatching(true);
    setLocationError("");

    let finalAddress = pickupAddress;
    let finalCoords = activeCoords;

    if (pickupMethod === "gps") {
      if (!finalCoords) {
        const refreshed = await refreshCurrentLocation();
        if (!refreshed) {
          setMatching(false);
          return;
        }
        finalAddress = refreshed.address;
        finalCoords = refreshed.coords;
      }
    } else {
      const trimmedAddress = pickupAddress.trim();
      if (!trimmedAddress) {
        setLocationError(copy.manualRequiredError);
        setMatching(false);
        return;
      }

      try {
        const result = await geocodeAddress(trimmedAddress);
        finalAddress = result.address;
        finalCoords = {
          ...result.coordinates,
          accuracyMeters: 30,
          source: "address_geocode",
        };
        setPickupAddress(result.address);
        setManualCoords(finalCoords);
      } catch {
        setLocationError(copy.addressNotFoundError);
        setMatching(false);
        return;
      }
    }

    if (!finalCoords) {
      setLocationError(copy.coordinateError);
      setMatching(false);
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    onBooking({
      mode: "call",
      reservedAt: copy.callReservedAt,
      pickupAddress: finalAddress,
      detailAddress: detailAddress || (pickupMethod === "gps" ? copy.currentDetailLabel : ""),
      pickupLat: finalCoords.lat,
      pickupLng: finalCoords.lng,
      pickupAccuracyMeters: finalCoords.accuracyMeters,
      pickupSource: finalCoords.source,
    });

    setMatching(false);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-slate-50">
        <PickupPreviewMap
          addressLabel={mapLabel}
          coordinates={mapCoords}
          onCoordinateSelect={(coordinates) => void selectMapLocation(coordinates)}
          onLocate={() => void refreshCurrentLocation()}
          locating={locating}
        />
      </div>

      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
        {copy.mapDescription}
      </p>

      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <ModeButton active={pickupMethod === "gps"} label="현재 위치" onClick={() => setPickupMethod("gps")} />
        <ModeButton active={pickupMethod === "manual"} label="직접 입력" onClick={() => setPickupMethod("manual")} />
      </div>

      {pickupMethod === "gps" ? (
        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Service3DIcon type="location" className="h-10 w-10 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-500">{copy.currentLocationEyebrow}</p>
              <p className="mt-1 text-[15px] font-bold leading-5 text-ink">{pickupAddress || copy.currentAddressFallback}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">상세 주소를 입력해 주세요.</p>
            </div>
          </div>
          <input
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-ink outline-none focus:border-lgred"
            placeholder="상세 주소를 입력해주세요"
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
          />
          <button
            className="mt-3 h-11 w-full rounded-2xl border border-lgred/20 bg-white text-[13px] font-bold text-lgred"
            onClick={() => void refreshCurrentLocation()}
            type="button"
          >
            {copy.refreshLocationLabel}
          </button>
        </div>
      ) : (
        <ManualAddressEditor
          address={pickupAddress}
          copy={copy}
          detailAddress={detailAddress}
          onAddressChange={setPickupAddress}
          onCoordinateChange={setManualCoords}
          onDetailAddressChange={setDetailAddress}
        />
      )}

      {locationError ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
          {locationError}
        </p>
      ) : null}

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-[#202632] text-[13px] font-bold text-white disabled:bg-slate-300"
        disabled={!canBook || loading || locating || matching}
        onClick={() => void startMatching()}
        type="button"
      >
        {matching ? copy.matchingLabel : loading ? copy.callLoadingLabel : copy.callSubmitLabel}
      </button>
    </div>
  );
}

function PickupPreviewMap({
  adjustHint,
  addressLabel,
  coordinates,
  onCoordinateSelect,
  onLocate,
  locating = false,
}: {
  adjustHint?: string;
  addressLabel: string;
  coordinates: PickupCoordinates | null;
  onCoordinateSelect?: (coordinates: PickupCoordinates) => void;
  onLocate?: () => void;
  locating?: boolean;
}) {
  if (!coordinates) {
    return <PickupMapFallback addressLabel={addressLabel} />;
  }

  return (
    <PickupInteractiveMap
      adjustHint={adjustHint}
      coordinates={coordinates}
      locating={locating}
      onCoordinateSelect={onCoordinateSelect}
      onLocate={onLocate}
    />
  );
}

function sameCoordinates(left: PickupCoordinates, right: PickupCoordinates) {
  return Math.abs(left.lat - right.lat) < 0.000001 && Math.abs(left.lng - right.lng) < 0.000001;
}

function PickupInteractiveMap({
  adjustHint,
  coordinates,
  locating,
  onCoordinateSelect,
  onLocate,
}: {
  adjustHint?: string;
  coordinates: PickupCoordinates;
  locating: boolean;
  onCoordinateSelect?: (coordinates: PickupCoordinates) => void;
  onLocate?: () => void;
}) {
  const [draftCoordinates, setDraftCoordinates] = useState<PickupCoordinates>(coordinates);

  useEffect(() => {
    setDraftCoordinates(coordinates);
  }, [coordinates.accuracyMeters, coordinates.lat, coordinates.lng, coordinates.source]);

  const handleDraftCoordinateChange = (nextCoordinates: PickupCoordinates) => {
    const nextDraft = {
      ...nextCoordinates,
      accuracyMeters: nextCoordinates.accuracyMeters ?? coordinates.accuracyMeters,
      source: "manual_pin" as const,
    };

    setDraftCoordinates((current) => (sameCoordinates(current, nextDraft) ? current : nextDraft));
    if (!sameCoordinates(coordinates, nextDraft)) {
      onCoordinateSelect?.(nextDraft);
    }
  };

  return (
    <div className="relative h-[360px] w-full overflow-hidden bg-slate-100">
      {kakaoMapAppKey ? (
        <KakaoCanvasMap
          appKey={kakaoMapAppKey}
          center={draftCoordinates}
          className="h-full w-full"
          maxZoom={20}
          markers={emptyMapMarkers}
          onCenterChangeEnd={handleDraftCoordinateChange}
          path={emptyMapPath}
          syncCenter
          zoom={19}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <div>
              <p className="text-sm font-black text-ink">Kakao Maps 연결이 필요합니다</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                NEXT_PUBLIC_KAKAO_MAP_APP_KEY 값을 확인한 뒤 앱을 다시 실행해 주세요.
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-[calc(100%-6px)] flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lgred text-white shadow-[0_10px_24px_rgba(193,0,63,0.28)] ring-4 ring-white/90">
          <MapPin size={27} />
        </div>
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-lgred/35" />
      </div>
      {adjustHint ? (
        <div className="pointer-events-none absolute left-4 right-4 top-4 rounded-2xl bg-white/90 px-4 py-3 text-center text-xs font-semibold text-slate-700 shadow">
          {adjustHint}
        </div>
      ) : null}
      <button
        type="button"
        aria-label="현재 위치로 이동"
        className="absolute bottom-4 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-lg transition active:scale-95 disabled:opacity-60"
        disabled={!onLocate || locating}
        onClick={onLocate}
      >
        {locating ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={22} />}
      </button>
    </div>
  );
}

function PickupMapFallback({
  showMarker = false,
}: {
  addressLabel: string;
  showMarker?: boolean;
}) {
  return (
    <div className="relative h-[360px] bg-[radial-gradient(circle_at_72%_24%,rgba(255,184,0,.25),transparent_18%),linear-gradient(180deg,#f5f6f8,#e8edf3)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.16)_1px,transparent_1px)] bg-[length:28px_28px]" />
      {showMarker ? (
        <Service3DIcon type="location" className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2" />
      ) : null}
    </div>
  );
}

function ManualAddressEditor({
  address,
  copy,
  detailAddress,
  hideHeader = false,
  onAddressChange,
  onCoordinateChange,
  onDetailAddressChange,
}: {
  address: string;
  copy: BookingCopy;
  detailAddress: string;
  hideHeader?: boolean;
  onAddressChange: (address: string) => void;
  onCoordinateChange: (coordinates: PickupCoordinates) => void;
  onDetailAddressChange: (address: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [inputValue, setInputValue] = useState(address);
  const reverseLookupSeqRef = useRef(0);
  const selectedSuggestionRef = useRef("");

  useEffect(() => {
    setInputValue(address);
  }, [address]);

  useEffect(() => {
    const query = inputValue.trim();
    if (query.length < 2 || query === selectedSuggestionRef.current) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          mode: "search",
          format: "json",
          q: query,
          countrycodes: "kr",
          limit: "5",
          addressdetails: "1",
        });
        const response = await fetch(`/api/geocode?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("address search failed");
        }
        const data = (await response.json()) as AddressSuggestion[];
        setSuggestions(data);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    const nextAddress = formatKoreanDisplayName(suggestion.display_name) || suggestion.display_name;
    selectedSuggestionRef.current = nextAddress;
    setInputValue(nextAddress);
    setSuggestions([]);
    setLocationError("");
    onAddressChange(nextAddress);
    onCoordinateChange({
      lat: Number(suggestion.lat),
      lng: Number(suggestion.lon),
      accuracyMeters: 30,
      source: "address_geocode",
    });
  };

  const useCurrentLocation = async () => {
    if (!isSecureGpsAvailable()) {
      setLocationError(copy.manualSecureError);
      return;
    }

    setLocating(true);
    setLocationError("");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
      });
      const coords = position.coords;
      const nextCoords = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracyMeters: coords.accuracy,
        source: "browser_geolocation" as const,
      };

      let nextAddress = ADDRESS_LOOKUP_PENDING;
      const lookupSeq = ++reverseLookupSeqRef.current;
      const previousAddress = inputValue && inputValue !== ADDRESS_LOOKUP_PENDING ? inputValue : address;
      setInputValue(nextAddress);
      setSuggestions([]);
      onAddressChange(nextAddress);
      onCoordinateChange(nextCoords);
      try {
        nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
      } catch {
        // Coordinates are still useful even if reverse geocoding fails.
        nextAddress = previousAddress || ADDRESS_LOOKUP_PENDING;
      }

      if (lookupSeq !== reverseLookupSeqRef.current) return;
      setInputValue(nextAddress);
      setSuggestions([]);
      onAddressChange(nextAddress);
      onCoordinateChange(nextCoords);
    } catch {
      setLocationError(copy.manualFetchError);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="relative z-20 mt-4 overflow-visible rounded-3xl bg-slate-50 p-4">
      {!hideHeader ? (
        <div className="mb-3 flex items-center gap-3">
          <Service3DIcon type="search" className="h-10 w-10 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-ink">{copy.manualTitle}</p>
            <p className="text-xs font-semibold text-slate-500">
              {copy.manualDescription}
            </p>
          </div>
        </div>
      ) : null}

      <input
        className="h-11 w-full rounded-2xl border border-lgred/20 bg-white px-4 text-[13px] font-semibold text-ink outline-none focus:border-lgred"
        placeholder={copy.manualAddressPlaceholder}
        value={inputValue}
        onChange={(event) => {
          selectedSuggestionRef.current = "";
          setInputValue(event.target.value);
          onAddressChange(event.target.value);
        }}
      />
      <input
        className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-ink outline-none focus:border-lgred"
        placeholder={copy.manualDetailPlaceholder}
        value={detailAddress}
        onChange={(event) => onDetailAddressChange(event.target.value)}
      />

      <div className="mt-2 min-h-4">
        {searching ? (
          <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-slate-500">
            <Loader2 className="animate-spin" size={13} />
            주소 검색 중...
          </div>
        ) : null}
      </div>

      {locationError ? (
        <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
          {locationError}
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="relative z-30 mt-3 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display_name}`}
              className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(suggestion)}
              type="button"
            >
              <span className="line-clamp-2 text-[12px] font-bold leading-5 text-ink">
                {formatKoreanDisplayName(suggestion.display_name) || suggestion.display_name}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
