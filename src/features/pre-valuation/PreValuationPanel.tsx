import type { SwapRequest } from "@/types/swap";
import { IndianRupee } from "lucide-react";

type PreValuationPanelProps = {
  swapRequest: SwapRequest | null;
  onNext: () => void;
};

export function PreValuationPanel({ swapRequest, onNext }: PreValuationPanelProps) {
  const valuation = swapRequest?.preValuation;
  const hasValuation = Boolean(valuation && valuation.minEstimatedValue > 0);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <IndianRupee size={18} />
        STEP 2. 예상 보상가
      </div>
      {hasValuation && valuation ? (
        <>
          <div className="mt-4 rounded-2xl bg-lgred/10 p-5 text-center">
            <p className="text-xs font-bold text-lgred">사진 기반 예상 범위</p>
            <p className="mt-2 text-3xl font-black text-ink">
              ₹{valuation.minEstimatedValue.toLocaleString()} ~ ₹
              {valuation.maxEstimatedValue.toLocaleString()}
            </p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {valuation.basis.map((item) => (
              <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
          <button
            className="mt-5 h-12 w-full rounded-xl bg-lgred text-sm font-black text-white"
            onClick={onNext}
          >
            이 예상 범위로 예약하기
          </button>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          사진 분석이 끝나면 예상 보상가 범위가 표시됩니다.
        </p>
      )}
    </section>
  );
}
