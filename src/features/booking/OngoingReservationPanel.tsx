import { Calendar3DIcon } from "@/components/Calendar3DIcon";
import { Service3DIcon } from "@/components/Service3DIcon";
import type { ReactNode } from "react";
import type { BookingPurpose } from "./BookingPanel";

type ReviewStatus =
  | "none"
  | "reserved"
  | "pickup"
  | "reviewPending"
  | "reviewCompleted"
  | "reReviewPending"
  | "reReviewCompleted";

type OngoingReservationPanelProps = {
  bookingPurpose?: BookingPurpose;
  reservationLabel: string;
  reservationAddress: string;
  status: ReviewStatus;
  onChange: () => void;
  onCancel: () => void;
  onOpenCredit: () => void;
};

export function OngoingReservationPanel({
  bookingPurpose = "pickup",
  reservationLabel,
  reservationAddress,
  onChange,
  onCancel,
}: OngoingReservationPanelProps) {
  const isInstallation = bookingPurpose === "installation";

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <Calendar3DIcon className="h-6 w-6 shrink-0" />
        {isInstallation ? "진행 중인 수거 예약이에요" : "진행 중인 예약이에요"}
      </div>

      <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-4">
        <p className="text-xs font-bold text-lgred">예약이 완료됐어요</p>
        <p className="mt-1 text-[15px] font-bold leading-5 text-ink">수거 크루를 찾고있어요</p>
        <p className="mt-2 text-[13px] font-medium leading-5 text-slate-600">
          가까운 크루에게 배차 알림을 보내고 있어요. 크루가 수락하면 위치와 남은 시간을 확인할 수 있어요.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MatchingStep active label="예약 완료" />
          <MatchingStep active label="크루 찾는 중" />
          <MatchingStep label="이동 시작" />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <InfoRow icon={<Service3DIcon type="clock" className="h-9 w-9" />} title="예약 시간이에요" description={reservationLabel || "예약 정보가 없어요"} />
        <InfoRow
          icon={<Service3DIcon type="location" className="h-9 w-9" />}
          title={isInstallation ? "수거 위치예요" : "수거 위치예요"}
          description={
            reservationAddress || (isInstallation ? "입력한 수거 주소를 불러오고 있어요." : "입력한 수거 주소를 불러오고 있어요.")
          }
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-[13px] font-bold text-lgred"
          onClick={onChange}
          type="button"
        >
          예약을 변경할게요
        </button>
        <button
          className="h-12 rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-500"
          onClick={onCancel}
          type="button"
        >
          예약을 취소할게요
        </button>
      </div>
    </section>
  );
}

function MatchingStep({ active = false, label }: { active?: boolean; label: string }) {
  return (
    <div className="rounded-2xl bg-white/80 px-2 py-2 text-center ring-1 ring-white">
      <span className={`mx-auto block h-2 w-2 rounded-full ${active ? "bg-lgred" : "bg-slate-300"}`} />
      <p className={`mt-1 text-[10px] font-semibold leading-4 ${active ? "text-lgred" : "text-slate-400"}`}>{label}</p>
    </div>
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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-bold text-ink">{title}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
}
