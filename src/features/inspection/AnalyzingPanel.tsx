import { Camera, ScanLine, Sparkles } from "lucide-react";

type AnalyzingPanelProps = {
  applianceLabel: string;
};

export function AnalyzingPanel({ applianceLabel }: AnalyzingPanelProps) {
  return (
    <section className="flex min-h-full flex-col justify-center overflow-hidden rounded-[28px] bg-[#111318] px-5 py-6 text-white shadow-sm">
      <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute inset-5 animate-spin rounded-full border-2 border-transparent border-t-lgred" />
        <div className="absolute inset-10 rounded-full bg-white/5" />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[32px] bg-lgred shadow-xl shadow-lgred/25">
          <Camera size={38} />
          <ScanLine className="absolute -bottom-2 -right-2 rounded-full bg-white p-1 text-lgred" size={31} />
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs font-black text-lgred">STEP 2</p>
        <h2 className="mt-2 text-3xl font-black">감정중...</h2>
        <p className="mx-auto mt-4 max-w-[280px] text-sm font-semibold leading-6 text-white/70">
          AI가 촬영한 {applianceLabel} 사진에서 제품 종류, 외관 상태, 식별 가능한 정보를
          확인하고 있어요.
        </p>
      </div>

      <div className="mt-8 space-y-3 rounded-2xl bg-white/8 p-4">
        <AnalysisRow active label="가전 종류 확인" />
        <AnalysisRow active label="외관 상태 감지" />
        <AnalysisRow label="예상 보상가 범위 계산" />
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-white/45">
        사진 기반 예상가는 실제 수거 후 검수 결과에 따라 달라질 수 있어요.
      </p>
    </section>
  );
}

function AnalysisRow({ active = false, label }: { active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-white/75">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          active ? "bg-lgred text-white" : "bg-white/10 text-white/45"
        }`}
      >
        <Sparkles size={15} />
      </span>
      <span>{label}</span>
    </div>
  );
}
