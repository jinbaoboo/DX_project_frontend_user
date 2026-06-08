import { CalendarCheck, Clock, MapPin } from "lucide-react";
import type { ReactNode } from "react";

type ReservationStatusPanelProps = {
  reservationLabel: string;
  reservationAddress: string;
  onChange: () => void;
  onCancel: () => void;
};

export function ReservationStatusPanel({
  reservationLabel,
  reservationAddress,
  onChange,
  onCancel,
}: ReservationStatusPanelProps) {
  return (
    <section className="flex h-full flex-col rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <CalendarCheck size={18} />
        예약 완료
      </div>

      <div className="mt-5 rounded-3xl border border-lgred/15 bg-lgred/5 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lgred text-white">
          <CalendarCheck size={30} />
        </div>
        <p className="mt-4 text-xs font-black text-lgred">수거 예약이 확정됐어요</p>
        <h2 className="mt-2 text-2xl font-black text-ink">{reservationLabel || "예약 시간 확인 중"}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          예약 시간 전까지 ThinQ 홈에서 수거 일정을 확인할 수 있어요.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <InfoRow icon={<Clock size={18} />} title="예약 시간" description={reservationLabel || "예약 시간"} />
        <InfoRow
          icon={<MapPin size={18} />}
          title="수거 위치"
          description={reservationAddress || "뉴델리 LG ThinQ 데모 주소"}
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-sm font-black text-lgred"
          onClick={onChange}
          type="button"
        >
          예약 시간 변경
        </button>
        <button
          className="h-12 rounded-xl bg-slate-100 text-sm font-black text-slate-500"
          onClick={onCancel}
          type="button"
        >
          예약 취소
        </button>
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lgred/10 text-lgred">
        {icon}
      </span>
      <div>
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
      </div>
    </div>
  );
}
