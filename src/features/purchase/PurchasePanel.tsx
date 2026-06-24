"use client";

import { Service3DIcon } from "@/components/Service3DIcon";
import { selectReplacementProduct } from "@/lib/api";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export type ProductCategoryId = "washing_machine" | "refrigerator" | "air_conditioner" | "microwave" | "tv";

export type ProductId = string;
export type ProductGrade = "프리미엄" | "일반/중형" | "보급형";

export type ReplacementProduct = {
  id: ProductId;
  categoryId: ProductCategoryId;
  category: string;
  name: string;
  grade: ProductGrade;
  originalPrice: number;
  sameDayEligible: boolean;
  imageUrl: string;
  summary: string;
  detail: string;
  recommendedFor: string;
  serviceInfo: string;
  highlights: string[];
  specs: { label: string; value: string }[];
  tags: string[];
};

type PurchasePanelProps = {
  estimatedCredit: number;
  preferredCategoryId: ProductCategoryId;
  selectedProductId: ProductId | null;
  swapRequestId?: number | null;
  onSelectProduct: (productId: ProductId) => void;
  onContinueToBooking: () => void;
};

const categoryLabels: Record<ProductCategoryId, string> = {
  washing_machine: "세탁기",
  refrigerator: "냉장고",
  air_conditioner: "에어컨",
  microwave: "전자레인지",
  tv: "TV",
};

export const purchaseProducts: ReplacementProduct[] = [
  {
    id: "washing-machine-objet-24",
    categoryId: "washing_machine",
    category: "세탁기",
    name: "LG 오브제컬렉션 세탁기 24kg",
    grade: "프리미엄",
    originalPrice: 1943000,
    sameDayEligible: true,
    imageUrl: "https://www.lge.co.kr/kr/images/washing-machines/md10041839/gallery/large-interior01.jpg",
    summary: "24kg / AI DD / 오브제컬렉션",
    detail: "대용량 세탁과 AI 세탁 코스를 지원하는 프리미엄 세탁기입니다.",
    recommendedFor: "가족 세탁물이 많고 세탁 시간을 줄이고 싶은 집에 잘 맞아요.",
    serviceInfo: "수거 예약 후 설치 일정까지 한 번에 이어서 안내해 드려요.",
    highlights: ["AI DD 세탁 코스", "24kg 대용량", "오브제컬렉션 디자인"],
    specs: [
      { label: "용량", value: "24kg" },
      { label: "핵심 기능", value: "AI DD" },
      { label: "제품군", value: "오브제컬렉션" },
    ],
    tags: ["24kg", "AI DD", "오브제컬렉션"],
  },
  {
    id: "washing-machine-tromm-21",
    categoryId: "washing_machine",
    category: "세탁기",
    name: "LG TROMM 세탁기 21kg",
    grade: "프리미엄",
    originalPrice: 1490000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/washing-machines/md10412832/gallery/medium-interior01.jpg",
    summary: "21kg / 트롬 / 대용량",
    detail: "대가족 빨래를 넉넉하게 처리하기 좋은 대용량 세탁기입니다.",
    recommendedFor: "빨래 양이 많고 이불 세탁까지 하는 집에 추천해요.",
    serviceInfo: "설치 공간과 배수 환경은 예약 단계에서 함께 확인해요.",
    highlights: ["21kg 대용량", "트롬 기능", "프리미엄 교체 설치"],
    specs: [
      { label: "용량", value: "21kg" },
      { label: "핵심 기능", value: "트롬" },
      { label: "제품군", value: "TROMM" },
    ],
    tags: ["21kg", "트롬", "TROMM"],
  },
  {
    id: "washing-machine-basic-10",
    categoryId: "washing_machine",
    category: "세탁기",
    name: "LG 통돌이 세탁기 10kg",
    grade: "보급형",
    originalPrice: 479000,
    sameDayEligible: true,
    imageUrl: "https://www.lge.co.kr/kr/images/washing-machines/md10708830/gallery/medium-interior01.jpg",
    summary: "10kg / 통돌이 / 실속형",
    detail: "가볍게 교체하기 좋은 실속형 세탁기입니다.",
    recommendedFor: "1~2인 가구나 보조 세탁기가 필요한 경우에 잘 맞아요.",
    serviceInfo: "빠른 수거 요청과 연동해 간편하게 진행할 수 있어요.",
    highlights: ["실속형 가격", "10kg 용량", "간편한 교체"],
    specs: [
      { label: "용량", value: "10kg" },
      { label: "형태", value: "통돌이" },
      { label: "제품군", value: "실속형" },
    ],
    tags: ["10kg", "통돌이", "실속형"],
  },
  {
    id: "refrigerator-dios-832",
    categoryId: "refrigerator",
    category: "냉장고",
    name: "LG DIOS 오브제컬렉션 냉장고 832L",
    grade: "프리미엄",
    originalPrice: 2350000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/refrigerators/md10635830/gallery/medium-interior01.jpg",
    summary: "832L / 양문형 / 오브제컬렉션",
    detail: "대용량 수납과 프리미엄 디자인을 동시에 원하는 경우에 잘 맞아요.",
    recommendedFor: "대가족이거나 냉장 공간이 넉넉하게 필요한 집에 추천해요.",
    serviceInfo: "설치 공간과 문 열림 동선은 예약 단계에서 함께 확인해요.",
    highlights: ["832L 대용량", "양문형", "오브제컬렉션"],
    specs: [
      { label: "용량", value: "832L" },
      { label: "형태", value: "양문형" },
      { label: "등급", value: "프리미엄" },
    ],
    tags: ["832L", "양문형", "오브제컬렉션"],
  },
  {
    id: "refrigerator-fitmax-504",
    categoryId: "refrigerator",
    category: "냉장고",
    name: "LG DIOS Fit & Max 냉장고 504L",
    grade: "프리미엄",
    originalPrice: 3850000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/refrigerators/md10555924/gallery/medium-interior01.jpg",
    summary: "504L / Fit & Max / 슬림형",
    detail: "공간 활용을 높이면서도 깔끔한 주방 연출이 가능한 냉장고입니다.",
    recommendedFor: "수납과 인테리어를 함께 고려하는 집에 잘 맞아요.",
    serviceInfo: "주방 진입 동선과 냉장고 문 열림 공간을 함께 체크해요.",
    highlights: ["Fit & Max 설계", "504L 용량", "슬림 설치감"],
    specs: [
      { label: "용량", value: "504L" },
      { label: "형태", value: "슬림형" },
      { label: "제품군", value: "DIOS" },
    ],
    tags: ["504L", "Fit & Max", "DIOS"],
  },
  {
    id: "refrigerator-300l",
    categoryId: "refrigerator",
    category: "냉장고",
    name: "LG 일반형 냉장고 300L",
    grade: "일반/중형",
    originalPrice: 980000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/refrigerators/md09091857/gallery/medium-interior01.jpg",
    summary: "300L / 일반형 / 1등급",
    detail: "가정에서 부담 없이 쓰기 좋은 균형형 냉장고입니다.",
    recommendedFor: "2~3인 가구의 기본 냉장고 교체용으로 추천해요.",
    serviceInfo: "기본 설치 환경만 맞으면 빠르게 교체가 가능해요.",
    highlights: ["300L 용량", "기본형 구조", "에너지 효율"],
    specs: [
      { label: "용량", value: "300L" },
      { label: "형태", value: "일반형" },
      { label: "등급", value: "1등급" },
    ],
    tags: ["300L", "일반형", "1등급"],
  },
  {
    id: "aircon-whisen-22",
    categoryId: "air_conditioner",
    category: "에어컨",
    name: "LG 휘센 벽걸이 에어컨 22㎡",
    grade: "일반/중형",
    originalPrice: 1388000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/air-conditioners/md10731831/gallery/medium-interior01.jpg",
    summary: "22㎡ / 1등급 / 벽걸이형",
    detail: "기본 냉방 성능과 에너지 효율을 고르게 갖춘 제품입니다.",
    recommendedFor: "작은 방이나 서브 공간 교체 설치에 적합해요.",
    serviceInfo: "실외기 위치와 설치 동선은 예약 단계에서 함께 조율해요.",
    highlights: ["22㎡ 냉방", "1등급", "벽걸이형"],
    specs: [
      { label: "냉방 면적", value: "22㎡" },
      { label: "형태", value: "벽걸이형" },
      { label: "등급", value: "1등급" },
    ],
    tags: ["22㎡", "1등급", "벽걸이형"],
  },
  {
    id: "aircon-4season-22",
    categoryId: "air_conditioner",
    category: "에어컨",
    name: "LG 휘센 사계절 에어컨 22㎡",
    grade: "프리미엄",
    originalPrice: 1998000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/air-conditioners/md10248830/gallery/medium-interior01.jpg",
    summary: "22㎡ / 사계절 / 프리미엄",
    detail: "냉방과 공기 관리 기능을 함께 원하는 경우에 적합한 모델입니다.",
    recommendedFor: "사계절 활용도를 높이고 싶은 집에 추천해요.",
    serviceInfo: "배관 길이와 벽 타공 조건을 함께 확인해요.",
    highlights: ["사계절 운전", "22㎡ 대형", "프리미엄 라인"],
    specs: [
      { label: "냉방 면적", value: "22㎡" },
      { label: "제품군", value: "사계절" },
      { label: "등급", value: "프리미엄" },
    ],
    tags: ["사계절", "22㎡", "프리미엄"],
  },
  {
    id: "aircon-winner-65",
    categoryId: "air_conditioner",
    category: "에어컨",
    name: "LG 휘센 타워 에어컨 65.9㎡",
    grade: "프리미엄",
    originalPrice: 2533000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/air-conditioners/md09948826/gallery/medium-interior01.jpg",
    summary: "65.9㎡ / 타워형 / 거실형",
    detail: "넓은 거실 공간을 빠르게 냉방하는 프리미엄 타워형 에어컨이에요.",
    recommendedFor: "거실 메인 냉방기를 교체하려는 집에 잘 맞아요.",
    serviceInfo: "설치 공간과 이동 동선을 넉넉히 사전 확인해야 해요.",
    highlights: ["거실형 대형", "65.9㎡ 냉방", "프리미엄 디자인"],
    specs: [
      { label: "냉방 면적", value: "65.9㎡" },
      { label: "형태", value: "타워형" },
      { label: "등급", value: "프리미엄" },
    ],
    tags: ["65.9㎡", "타워형", "프리미엄"],
  },
  {
    id: "microwave-25l",
    categoryId: "microwave",
    category: "전자레인지",
    name: "LG 전자레인지 25L",
    grade: "보급형",
    originalPrice: 339000,
    sameDayEligible: true,
    imageUrl: "https://www.lge.co.kr/kr/images/microwaves-and-ovens/md10739828/gallery/medium-interior01.jpg",
    summary: "25L / 기본형 / 심플 디자인",
    detail: "간편한 조리와 해동에 집중한 실속형 전자레인지예요.",
    recommendedFor: "1~2인 가구나 보조 조리 가전이 필요한 경우에 잘 맞아요.",
    serviceInfo: "소형 가전은 빠른 수거 요청과 함께 진행하기 좋아요.",
    highlights: ["25L 용량", "실속형 가격", "간편 조리"],
    specs: [
      { label: "용량", value: "25L" },
      { label: "형태", value: "기본형" },
      { label: "등급", value: "보급형" },
    ],
    tags: ["25L", "실속형", "전자레인지"],
  },
  {
    id: "microwave-39l",
    categoryId: "microwave",
    category: "전자레인지",
    name: "LG 광파오븐 39L",
    grade: "일반/중형",
    originalPrice: 490000,
    sameDayEligible: true,
    imageUrl: "https://www.lge.co.kr/kr/images/microwaves-and-ovens/md10101827/gallery/medium-interior02.jpg",
    summary: "39L / 광파오븐 / 스팀 조리",
    detail: "전자레인지와 오븐 기능을 함께 쓰고 싶은 사용자에게 적합해요.",
    recommendedFor: "조리 기능을 조금 더 다양하게 쓰고 싶은 집에 잘 맞아요.",
    serviceInfo: "소형 가전으로 비교적 설치 부담이 적어요.",
    highlights: ["39L 용량", "광파오븐", "스팀 조리"],
    specs: [
      { label: "용량", value: "39L" },
      { label: "형태", value: "광파오븐" },
      { label: "등급", value: "일반/중형" },
    ],
    tags: ["39L", "광파오븐", "스팀"],
  },
  {
    id: "microwave-objet-gwangpa-32l",
    categoryId: "microwave",
    category: "전자레인지",
    name: "LG 오브제컬렉션 광파오븐 32L",
    grade: "일반/중형",
    originalPrice: 1055000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/microwaves-and-ovens/md10200826/gallery/medium-interior01.jpg",
    summary: "32L / 광파오븐 / 오브제컬렉션",
    detail: "주방 인테리어와 조리 기능을 함께 고려한 광파오븐입니다.",
    recommendedFor: "디자인과 조리 기능을 모두 챙기고 싶은 집에 잘 맞아요.",
    serviceInfo: "주방 가구와 배치 공간을 함께 확인해 주세요.",
    highlights: ["32L 용량", "광파오븐", "오브제컬렉션"],
    specs: [
      { label: "용량", value: "32L" },
      { label: "형태", value: "광파오븐" },
      { label: "제품군", value: "오브제컬렉션" },
    ],
    tags: ["32L", "광파오븐", "오브제컬렉션"],
  },
  {
    id: "tv-oled-48",
    categoryId: "tv",
    category: "TV",
    name: "LG OLED evo TV 48인치",
    grade: "프리미엄",
    originalPrice: 2389000,
    sameDayEligible: false,
    imageUrl: "https://www.lge.co.kr/kr/images/tvs/md10770850/gallery/OLED48C6KNA_st_mo.jpg",
    summary: "48인치 / OLED evo / 스탠드형",
    detail: "프리미엄 화질과 세련된 디자인이 강점인 TV예요.",
    recommendedFor: "거실 메인 TV 교체를 생각하는 집에 잘 어울려요.",
    serviceInfo: "TV 수거와 설치 배송 일정을 예약 단계에서 함께 확인해요.",
    highlights: ["OLED evo", "48인치", "프리미엄 화면"],
    specs: [
      { label: "크기", value: "48인치" },
      { label: "패널", value: "OLED evo" },
      { label: "형태", value: "스탠드형" },
    ],
    tags: ["48인치", "OLED evo", "스탠드형"],
  },
  {
    id: "tv-led-107",
    categoryId: "tv",
    category: "TV",
    name: "LG LED TV 107cm",
    grade: "일반/중형",
    originalPrice: 670000,
    sameDayEligible: true,
    imageUrl: "https://www.lge.co.kr/kr/images/tvs/md08989826/gallery/medium-interior01.jpg",
    summary: "107cm / LED / 실속형",
    detail: "가성비 있게 거실이나 방 TV를 교체하기 좋은 모델이에요.",
    recommendedFor: "서브 TV나 실속형 교체를 찾는 경우에 추천해요.",
    serviceInfo: "기본 스탠드형으로 설치가 비교적 간단해요.",
    highlights: ["107cm 화면", "LED 패널", "실속형 가격"],
    specs: [
      { label: "크기", value: "107cm" },
      { label: "패널", value: "LED" },
      { label: "형태", value: "스탠드형" },
    ],
    tags: ["107cm", "LED", "실속형"],
  },
  {
    id: "tv-led-80-stand",
    categoryId: "tv",
    category: "TV",
    name: "LG LED TV 80cm",
    grade: "보급형",
    originalPrice: 450000,
    sameDayEligible: true,
    imageUrl: "https://www.lge.co.kr/kr/images/tvs/md10791858/gallery/medium-interior01.jpg",
    summary: "80cm / LED / 스탠드형",
    detail: "작은 방이나 보조 공간에 두기 좋은 LED TV입니다.",
    recommendedFor: "컴팩트한 TV를 부담 없이 교체하고 싶은 집에 잘 맞아요.",
    serviceInfo: "소형 TV라 이동과 설치 부담이 적습니다.",
    highlights: ["80cm 화면", "LED 패널", "스탠드형"],
    specs: [
      { label: "크기", value: "80cm" },
      { label: "패널", value: "LED" },
      { label: "형태", value: "스탠드형" },
    ],
    tags: ["80cm", "LED", "스탠드형"],
  },
];

export function getDefaultProductIdForCategory(categoryId: ProductCategoryId): ProductId | null {
  return purchaseProducts.find((product) => product.categoryId === categoryId)?.id ?? null;
}

function gradeFromPrice(price: number): ProductGrade {
  if (price >= 1_500_000) return "프리미엄";
  if (price >= 500_000) return "일반/중형";
  return "보급형";
}

function creditRateFor(grade: ProductGrade): number {
  switch (grade) {
    case "프리미엄":
      return 0.1;
    case "보급형":
      return 0.04;
    default:
      return 0.07;
  }
}

function calculatePurchaseBenefit(baseCredit: number, productPrice: number) {
  const grade = gradeFromPrice(productPrice);
  const rate = creditRateFor(grade);
  const productPriceBonus = Math.round((productPrice * rate) / 1000) * 1000;
  return baseCredit + productPriceBonus;
}

function getProductReviewMeta(product: ReplacementProduct) {
  const seed = product.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    rating: (4.6 + (seed % 4) * 0.1).toFixed(1),
    reviewCount: 80 + (seed % 240),
  };
}

export function PurchasePanel({
  estimatedCredit,
  preferredCategoryId,
  selectedProductId,
  swapRequestId,
  onSelectProduct,
  onContinueToBooking,
}: PurchasePanelProps) {
  const selectedProduct = purchaseProducts.find((product) => product.id === selectedProductId) ?? null;
  const [detailProduct, setDetailProduct] = useState<ReplacementProduct | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<ProductCategoryId>(preferredCategoryId);
  const selectedPurchaseBenefit = selectedProduct ? calculatePurchaseBenefit(estimatedCredit, selectedProduct.originalPrice) : 0;
  const selectedFinalPrice = selectedProduct ? Math.max(selectedProduct.originalPrice - selectedPurchaseBenefit, 0) : 0;

  const categoryOptions = Object.entries(categoryLabels).map(([id, label]) => ({
    id: id as ProductCategoryId,
    label,
  }));

  const visibleProducts = purchaseProducts.filter((product) => product.categoryId === selectedCategoryId);

  useEffect(() => {
    setSelectedCategoryId(preferredCategoryId);
  }, [preferredCategoryId]);

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <Service3DIcon type="shopping" className="h-7 w-7 shrink-0" />
        LG 교체 제품을 선택해요
      </div>

      <div className="mt-4 rounded-3xl border border-lgred/15 bg-[linear-gradient(135deg,#fff1f6,#ffffff_58%,#fff7fa)] p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <RewardCoinIcon />
          <div className="min-w-0 flex-1">
            <p className="whitespace-nowrap text-[13px] font-bold leading-5 text-ink">기본 예상 보상 크레딧</p>
            <p className="mt-1 whitespace-nowrap text-[24px] font-bold leading-7 text-lgred">
              {estimatedCredit.toLocaleString()}원
            </p>
            <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-500">
              제품을 선택하면 적용 혜택과 예상 결제 금액을 함께 확인할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-[13px] font-bold text-ink">카테고리</h3>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryOptions.map((category) => {
            const active = selectedCategoryId === category.id;

            return (
              <button
                key={category.id}
                className={`shrink-0 rounded-full px-3 py-2 text-[12px] font-bold transition ${
                  active ? "bg-lgred text-white shadow-sm" : "bg-slate-100 text-slate-600"
                }`}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
          {visibleProducts.map((product) => {
            const active = selectedProduct?.id === product.id;
            const purchaseBenefit = calculatePurchaseBenefit(estimatedCredit, product.originalPrice);
            const finalPrice = Math.max(product.originalPrice - purchaseBenefit, 0);
            const reviewMeta = getProductReviewMeta(product);

            return (
              <button
                key={product.id}
                className={`relative h-[348px] w-[212px] shrink-0 snap-start overflow-hidden rounded-3xl border-2 text-left transition ${
                  active
                    ? "border-[#d85f86] bg-[#fff6f9] shadow-[inset_0_0_0_1px_rgba(216,95,134,0.16)]"
                    : "border-slate-200 bg-slate-50 shadow-sm"
                }`}
                onClick={() => {
                  setDetailProduct(null);
                  onSelectProduct(product.id);
                }}
                type="button"
              >
                <div className="relative h-[132px] bg-[#eaf1ff]">
                  <img alt={product.name} className="h-full w-full object-cover" src={product.imageUrl} />
                  {active ? (
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#c21855] shadow-sm ring-1 ring-[#f0bfd0]">
                      선택됨
                    </span>
                  ) : null}
                </div>
                <div className="p-3 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-lgred">{product.category}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                      {product.grade}
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-3 min-h-[60px] text-[15px] font-bold leading-5 text-ink">{product.name}</h3>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                    평점 {reviewMeta.rating} · 리뷰 {reviewMeta.reviewCount.toLocaleString()}개
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">예상 결제</span>
                      <span className="text-[15px] font-bold leading-5 tabular-nums text-ink">
                        {finalPrice.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">적용 혜택</span>
                      <span className="text-[15px] font-bold leading-5 tabular-nums text-lgred">
                        {purchaseBenefit.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedProduct ? (
        <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
            <Service3DIcon type="check" className="h-7 w-7 shrink-0" />
            선택한 제품이에요
          </div>
          <p className="mt-2 text-[15px] font-bold leading-5 text-ink">{selectedProduct.name}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{selectedProduct.summary}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-500">예상 혜택</p>
              <p className="mt-1 text-[13px] font-bold text-lgred">{selectedPurchaseBenefit.toLocaleString()}원</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-500">예상 결제</p>
              <p className="mt-1 text-[13px] font-bold text-ink">{selectedFinalPrice.toLocaleString()}원</p>
            </div>
          </div>
        </div>
      ) : null}

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-lgred text-[13px] font-bold text-white disabled:bg-slate-300"
        disabled={!selectedProduct}
        onClick={() => {
          if (selectedProduct) {
            setDetailProduct(selectedProduct);
          }
        }}
        type="button"
      >
        제품 보기
      </button>

      {detailProduct ? (
        <ProductDetailSheet
          estimatedCredit={estimatedCredit}
          onClose={() => setDetailProduct(null)}
          onOrder={() => {
            if (swapRequestId != null) {
              selectReplacementProduct(swapRequestId, {
                productId: detailProduct.id,
                productName: detailProduct.name,
                productGrade: gradeFromPrice(detailProduct.originalPrice),
                productPrice: detailProduct.originalPrice,
                sameDayEligible: detailProduct.sameDayEligible,
              }).catch(() => {});
            }
            onSelectProduct(detailProduct.id);
            setDetailProduct(null);
            onContinueToBooking();
          }}
          product={detailProduct}
        />
      ) : null}
    </section>
  );
}

function RewardCoinIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lgred/10 ring-1 ring-lgred/20">
      <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 32 32">
        <rect x="5" y="7" width="22" height="18" rx="5" fill="#fff7fa" stroke="#bd0044" strokeWidth="1.8" />
        <path d="M8.8 13.5h14.4" stroke="#bd0044" strokeLinecap="round" strokeWidth="2" />
        <path d="M10 20.2l3 3 7-7" fill="none" stroke="#bd0044" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      </svg>
    </span>
  );
}

function ProductDetailSheet({
  estimatedCredit,
  product,
  onClose,
  onOrder,
}: {
  estimatedCredit: number;
  product: ReplacementProduct;
  onClose: () => void;
  onOrder: () => void;
}) {
  const purchaseBenefit = calculatePurchaseBenefit(estimatedCredit, product.originalPrice);
  const finalPrice = Math.max(product.originalPrice - purchaseBenefit, 0);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("swapit-phone-viewport"));
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="absolute inset-0 z-[80] flex items-end justify-center bg-black/70 px-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[84%] min-h-[70%] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-[sheetUp_.24s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative h-72 overflow-hidden rounded-t-[28px] bg-[#f5f7fb]">
            <img alt={product.name} className="h-full w-full object-cover object-center" src={product.imageUrl} />
            <button
              aria-label="제품 상세 닫기"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-lgred/10 px-3 py-1 text-[11px] font-bold text-lgred">
                {product.category}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                {product.grade}
              </span>
              {product.sameDayEligible ? (
                <span className="rounded-full bg-[#dff8e7] px-3 py-1 text-[11px] font-semibold text-[#1b8f45]">
                  당일 배송 가능
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-[17px] font-bold leading-6 text-ink">{product.name}</h3>
            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">{product.detail}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <PriceTile label="정가" value={`${product.originalPrice.toLocaleString()}원`} />
              <PriceTile accent label="예상 혜택" value={`${purchaseBenefit.toLocaleString()}원`} />
              <PriceTile label="예상 결제" strong value={`${finalPrice.toLocaleString()}원`} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-3xl bg-slate-50 p-4">
              <p className="text-[13px] font-bold text-ink">이런 경우에 잘 맞아요</p>
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{product.recommendedFor}</p>
            </div>

            <div className="mt-3 rounded-3xl bg-slate-50 p-4">
              <p className="text-[13px] font-bold text-ink">주요 포인트</p>
              <div className="mt-3 space-y-2">
                {product.highlights.map((highlight) => (
                  <div key={highlight} className="flex gap-2 text-xs font-medium leading-5 text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lgred" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {product.specs.map((spec) => (
                <div key={spec.label} className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-500">{spec.label}</p>
                  <p className="mt-1 text-[12px] font-bold leading-4 text-ink">{spec.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-4 pt-3 shadow-[0_-12px_24px_rgba(15,23,42,.08)]">
          <button className="h-12 w-full rounded-2xl bg-lgred text-[13px] font-bold text-white" onClick={onOrder} type="button">
            주문하기
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

function PriceTile({
  label,
  value,
  accent = false,
  strong = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-[13px] font-bold ${strong ? "text-ink" : accent ? "text-lgred" : "text-slate-600"}`}>
        {value}
      </p>
    </div>
  );
}
