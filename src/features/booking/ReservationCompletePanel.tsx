import { Calendar3DIcon } from "@/components/Calendar3DIcon";
import { Service3DIcon } from "@/components/Service3DIcon";
import type { BookingPurpose } from "./BookingPanel";

type ReservationCompletePanelProps = {
  bookingPurpose?: BookingPurpose;
  reservationAddress: string;
  reservationLabel: string;
  onClose: () => void;
  onViewReservation: () => void;
};

export function ReservationCompletePanel({
  bookingPurpose = "pickup",
  reservationAddress,
  reservationLabel,
  onClose,
  onViewReservation,
}: ReservationCompletePanelProps) {
  const copy =
    bookingPurpose === "installation"
      ? {
          confirmedLabel: "예약이 완료됐어요",
          description: "설치와 기존 제품 수거를 함께 진행할 크루를 찾고있어요.",
          locationTitle: "수거 위치예요",
          locationFallback: "입력한 수거 주소를 불러오고 있어요.",
        }
      : {
          confirmedLabel: "예약이 완료됐어요",
          description: "예약된 시간에 방문할 수거 크루를 찾고있어요.",
          locationTitle: "수거 위치예요",
          locationFallback: "입력한 수거 주소를 불러오고 있어요.",
        };

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <Calendar3DIcon className="h-6 w-6 shrink-0" />
        예약이 완료됐어요
      </div>

      <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-4 text-center">
        <Service3DIcon type="check" className="mx-auto h-16 w-16" />
        <p className="mt-4 text-xs font-bold text-lgred">{copy.confirmedLabel}</p>
        <h2 className="mt-2 text-[18px] font-bold leading-6 text-ink">{reservationLabel || "예약 정보를 확인하고 있어요"}</h2>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{copy.description}</p>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <span className="absolute h-12 w-12 animate-ping rounded-full bg-lgred/10" />
            <Service3DIcon type="truck" className="relative h-11 w-11" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold leading-5 text-ink">수거 크루를 찾고있어요</p>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              가까운 크루가 수락하면 이동 경로와 예상 도착 시간을 바로 확인할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <Service3DIcon type="location" className="h-10 w-10 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-ink">{copy.locationTitle}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {reservationAddress || copy.locationFallback}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-[13px] font-bold text-lgred"
          onClick={onClose}
          type="button"
        >
          닫을게요
        </button>
        <button
          className="h-12 rounded-xl bg-lgred text-[13px] font-bold text-white"
          onClick={onViewReservation}
          type="button"
        >
          예약을 확인할게요
        </button>
      </div>
    </section>
  );
}
