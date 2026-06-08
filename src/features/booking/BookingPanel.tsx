"use client";

import type { SwapRequest } from "@/types/swap";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Radio,
  Truck,
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

type BookingPanelProps = {
  swapRequest: SwapRequest | null;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
};

type BookingMode = "schedule" | "call";
export type BookingSelection = {
  mode: BookingMode;
  reservedAt: string;
  pickupAddress?: string;
};
type ScheduleStage = "calendar" | "time";
type CallStage = "select" | "searching" | "matched";
type AddressSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);
const availableDays = [7, 8, 10, 11, 13, 15, 18, 21, 22, 25, 27];
const timeSlots = ["09:30", "11:00", "13:30", "15:00", "17:30"] as const;

export function BookingPanel({ swapRequest, loading, onBooking }: BookingPanelProps) {
  const [mode, setMode] = useState<BookingMode>("schedule");
  const canBook = Boolean(swapRequest && swapRequest.preValuation.minEstimatedValue > 0);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <CalendarCheck size={18} />
        STEP 3. 수거 예약
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        달력으로 가능한 시간을 예약하거나, 지도에서 위치를 찍고 바로 수거 크루를 호출하세요.
      </p>

      <div className="mt-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <ModeButton active={mode === "schedule"} label="시간 예약" onClick={() => setMode("schedule")} />
        <ModeButton active={mode === "call"} label="바로 콜" onClick={() => setMode("call")} />
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {mode === "schedule" ? (
          <ScheduleBooking canBook={canBook} loading={loading} onBooking={onBooking} />
        ) : (
          <InstantCallBooking canBook={canBook} loading={loading} onBooking={onBooking} />
        )}
      </div>
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
      className={`h-9 rounded-xl text-xs font-black transition ${
        active ? "bg-white text-lgred shadow-sm" : "text-slate-500"
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
  loading,
  onBooking,
}: {
  canBook: boolean;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [stage, setStage] = useState<ScheduleStage>("calendar");
  const [selectedDay, setSelectedDay] = useState(10);
  const [selectedTime, setSelectedTime] = useState<(typeof timeSlots)[number]>("11:00");
  const [pickupAddress, setPickupAddress] = useState("A-12, New Delhi demo street");
  const [pickupPoint, setPickupPoint] = useState({ x: 54, y: 58 });

  const handleScheduleMapClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    setPickupPoint({
      x: Math.min(86, Math.max(14, x)),
      y: Math.min(82, Math.max(18, y)),
    });
  };

  if (stage === "time") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-ink"
            onClick={() => setStage("calendar")}
            type="button"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="text-right">
            <p className="text-xs font-black text-slate-400">선택 날짜</p>
            <p className="text-sm font-black text-ink">6월 {selectedDay}일</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-lgred/5 p-4">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 shrink-0 text-lgred" size={18} />
            <p className="text-xs font-semibold leading-5 text-slate-600">
              선택한 날짜에 가능한 수거 시간을 골라주세요.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {timeSlots.map((time) => {
            const active = selectedTime === time;
            return (
              <button
                key={time}
                className={`h-10 rounded-xl border text-sm font-black ${
                  active ? "border-lgred bg-lgred text-white" : "border-slate-200 bg-slate-50 text-ink"
                }`}
                onClick={() => setSelectedTime(time)}
                type="button"
              >
                {time}
              </button>
            );
          })}
        </div>

        <InfoCard
          className="hidden"
          icon={<MapPin size={17} />}
          title="수거 위치"
          description="뉴델리 LG ThinQ 데모 주소"
        />

        <LocationEditor
          address={pickupAddress}
          pickupPoint={pickupPoint}
          onAddressChange={setPickupAddress}
          onMapClick={handleScheduleMapClick}
        />

        <button
          className="mt-3 h-12 w-full rounded-xl bg-lgred text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canBook || loading}
          onClick={() =>
            onBooking({
              mode: "schedule",
              reservedAt: `6월 ${selectedDay}일 ${selectedTime}`,
              pickupAddress: `지도 선택 위치 · ${pickupAddress}`,
            })
          }
        >
          {loading ? "예약 중" : "예약 확정하기"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-black text-slate-400">2026년 6월</p>
          <h3 className="mt-1 text-lg font-black text-ink">예약 가능 날짜</h3>
        </div>
        <span className="rounded-full bg-lgred/10 px-3 py-1 text-xs font-black text-lgred">
          {availableDays.length}일 가능
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const available = availableDays.includes(day);
          const active = selectedDay === day;
          return (
            <button
              key={day}
              className={`h-8 rounded-xl text-xs font-black transition ${
                active
                  ? "bg-lgred text-white"
                  : available
                    ? "bg-lgred/10 text-lgred"
                    : "bg-slate-50 text-slate-300"
              }`}
              disabled={!available}
              onClick={() => {
                setSelectedDay(day);
                setStage("time");
              }}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 shrink-0 text-lgred" size={18} />
          <p className="text-xs font-semibold leading-5 text-slate-600">
            날짜를 누르면 해당 날짜의 예약 가능 시간 선택 화면으로 넘어갑니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function InstantCallBooking({
  canBook,
  loading,
  onBooking,
}: {
  canBook: boolean;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [stage, setStage] = useState<CallStage>("select");
  const [pickupPoint, setPickupPoint] = useState({ x: 52, y: 56 });

  const handleMapClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (stage !== "select") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    setPickupPoint({
      x: Math.min(86, Math.max(14, x)),
      y: Math.min(82, Math.max(18, y)),
    });
  };

  const startMatching = () => {
    setStage("searching");
    window.setTimeout(() => setStage("matched"), 1700);
  };

  return (
    <div className="flex h-full flex-col">
      <button
        className="relative h-[264px] overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#eef1f6,#dfe5ee)] text-left"
        onClick={handleMapClick}
        type="button"
      >
        <MapGrid />
        <Road className="left-[12%] top-[28%] h-[10px] w-[88%] rotate-[16deg]" />
        <Road className="left-[18%] top-[64%] h-[10px] w-[78%] -rotate-[13deg]" />
        <Road className="left-[42%] top-[4%] h-[92%] w-[10px] rotate-[8deg]" />
        <Road className="left-[72%] top-[2%] h-[96%] w-[10px] -rotate-[7deg]" />

        <PickupMarker x={pickupPoint.x} y={pickupPoint.y} />

        {stage === "matched" ? (
          <DriverMarker pickupPoint={pickupPoint} />
        ) : (
          <>
            <CrewDot className="left-[22%] top-[24%]" label="18분" />
            <CrewDot className="right-[18%] top-[32%]" label="12분" />
            <CrewDot className="bottom-[20%] left-[30%]" label="24분" />
          </>
        )}

        {stage === "searching" ? <SearchingOverlay /> : null}

        <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/94 p-3 shadow-sm backdrop-blur">
          {stage === "matched" ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-lgred">매칭 성공</p>
                <p className="mt-1 text-sm font-black text-ink">LG 수거 크루 2호</p>
              </div>
              <span className="rounded-full bg-lgred px-3 py-1 text-xs font-black text-white">12분</span>
            </div>
          ) : (
            <div>
              <p className="text-xs font-black text-slate-400">수거 위치 선택</p>
              <p className="mt-1 text-sm font-black text-ink">지도에서 원하는 위치를 찍어주세요</p>
            </div>
          )}
        </div>
      </button>

      {stage === "select" ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <InfoCard compact icon={<Navigation size={17} />} title="직접 위치 선택" description="지도 터치로 지정" />
            <InfoCard compact icon={<Radio size={17} />} title="근처 크루 호출" description="가장 가까운 크루" />
          </div>
          <button
            className="mt-3 h-12 w-full rounded-xl bg-lgred text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canBook}
            onClick={startMatching}
            type="button"
          >
            근처 수거크루 호출하기
          </button>
        </>
      ) : null}

      {stage === "searching" ? (
        <div className="mt-3 rounded-2xl bg-lgred/5 p-4 text-center">
          <Loader2 className="mx-auto animate-spin text-lgred" size={24} />
          <p className="mt-2 text-sm font-black text-ink">기사 찾는 중...</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">근처 수거 크루에게 요청을 보내고 있어요.</p>
        </div>
      ) : null}

      {stage === "matched" ? (
        <button
          className="mt-3 h-12 w-full rounded-xl bg-lgred text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canBook || loading}
          onClick={() =>
            onBooking({
              mode: "call",
              reservedAt: "바로 콜",
            })
          }
        >
          {loading ? "확정 중" : "매칭된 크루로 수거 확정"}
        </button>
      ) : null}
    </div>
  );
}

function LocationEditor({
  address,
  pickupPoint,
  onAddressChange,
  onMapClick,
}: {
  address: string;
  pickupPoint: { x: number; y: number };
  onAddressChange: (address: string) => void;
  onMapClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(address);
  const [lockedAddress, setLockedAddress] = useState(address);

  useEffect(() => {
    setSelectedAddress(address);
  }, [address]);

  useEffect(() => {
    const query = selectedAddress.trim();

    if (query.length < 3 || query === lockedAddress) {
      setSuggestions([]);
      setSearchingAddress(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingAddress(true);

      try {
        const params = new URLSearchParams({
          format: "json",
          q: query,
          countrycodes: "in",
          limit: "5",
          addressdetails: "1",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Address search failed");
        }

        const data = (await response.json()) as AddressSuggestion[];
        setSuggestions(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingAddress(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lockedAddress, selectedAddress]);

  const handleAddressInput = (value: string) => {
    setSelectedAddress(value);
    setLockedAddress("");
    onAddressChange(value);
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion.display_name);
    setLockedAddress(suggestion.display_name);
    setSuggestions([]);
    onAddressChange(suggestion.display_name);
  };

  return (
    <div className="mt-auto rounded-2xl bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lgred/10 text-lgred">
            <MapPin size={17} />
          </span>
          <div>
            <p className="text-xs font-black text-ink">수거 위치</p>
            <p className="text-[11px] font-semibold text-slate-400">지도에서 위치를 찍고 상세 주소를 입력하세요</p>
          </div>
        </div>
      </div>

      <button
        className="relative h-[118px] w-full overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#eef1f6,#dfe5ee)] text-left"
        onClick={onMapClick}
        type="button"
      >
        <MapGrid />
        <Road className="left-[8%] top-[32%] h-[8px] w-[92%] rotate-[14deg]" />
        <Road className="left-[20%] top-[72%] h-[8px] w-[72%] -rotate-[12deg]" />
        <Road className="left-[58%] top-[2%] h-[96%] w-[8px] rotate-[7deg]" />
        <PickupMarker x={pickupPoint.x} y={pickupPoint.y} compact />
        <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
          지도 터치로 위치 설정
        </span>
      </button>

      <input
        className="mt-2 h-10 w-full rounded-xl border border-lgred/20 bg-white px-3 text-xs font-bold text-ink outline-none focus:border-lgred"
        value={selectedAddress}
        onChange={(event) => handleAddressInput(event.target.value)}
        placeholder="주소를 검색하거나 상세 주소를 입력해주세요"
      />
      <div className="mt-2 min-h-[18px]">
        {searchingAddress ? (
          <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-slate-400">
            <Loader2 className="animate-spin" size={13} />
            주소 검색 중...
          </div>
        ) : selectedAddress.trim().length >= 3 && suggestions.length === 0 && selectedAddress !== lockedAddress ? (
          <p className="px-1 text-[11px] font-semibold text-slate-400">추천 주소가 없으면 직접 입력해도 됩니다.</p>
        ) : null}
      </div>
      {suggestions.length > 0 ? (
        <div className="mt-2 max-h-32 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display_name}`}
              className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0"
              onClick={() => handleSuggestionSelect(suggestion)}
              type="button"
            >
              <span className="line-clamp-2 text-[11px] font-bold leading-4 text-ink">
                {suggestion.display_name}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MapGrid() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.26)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.26)_1px,transparent_1px)] bg-[size:32px_32px]" />
  );
}

function Road({ className }: { className: string }) {
  return <div className={`absolute rounded-full bg-white/80 shadow-sm ${className}`} />;
}

function PickupMarker({ compact = false, x, y }: { compact?: boolean; x: number; y: number }) {
  return (
    <div
      className="absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className={`flex items-center justify-center rounded-full border-white bg-lgred text-white shadow-lg ${compact ? "h-8 w-8 border-[3px]" : "h-10 w-10 border-4"}`}>
        <MapPin size={compact ? 15 : 19} />
      </span>
      <span className={`${compact ? "hidden" : "mt-1"} rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-ink shadow-sm`}>수거 위치</span>
    </div>
  );
}

function DriverMarker({ pickupPoint }: { pickupPoint: { x: number; y: number } }) {
  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-700"
      style={{ left: `${Math.max(16, pickupPoint.x - 18)}%`, top: `${Math.max(18, pickupPoint.y - 20)}%` }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lgred shadow-lg ring-4 ring-lgred/20">
        <Truck size={20} />
      </span>
      <span className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-ink shadow-sm">12분</span>
    </div>
  );
}

function CrewDot({ className, label }: { className: string; label: string }) {
  return (
    <div className={`absolute flex flex-col items-center ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lgred shadow-md">
        <Truck size={16} />
      </span>
      <span className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-ink shadow-sm">{label}</span>
    </div>
  );
}

function SearchingOverlay() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/72 backdrop-blur-sm">
      <div className="rounded-3xl bg-white px-6 py-5 text-center shadow-xl">
        <Loader2 className="mx-auto animate-spin text-lgred" size={30} />
        <p className="mt-3 text-sm font-black text-ink">기사 찾는 중...</p>
      </div>
    </div>
  );
}

function InfoCard({
  className = "",
  compact = false,
  icon,
  title,
  description,
}: {
  className?: string;
  compact?: boolean;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={`rounded-2xl bg-slate-50 ${compact ? "p-3" : "p-4"} ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lgred/10 text-lgred">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-ink">{title}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
