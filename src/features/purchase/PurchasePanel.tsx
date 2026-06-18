"use client";

import { selectReplacementProduct } from "@/lib/api";
import { Service3DIcon } from "@/components/Service3DIcon";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ProductCategoryId =
  | "washing_machine"
  | "refrigerator"
  | "air_conditioner"
  | "microwave"
  | "tv"
  | "air_purifier";

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

type CategoryDefinition = {
  id: ProductCategoryId;
  label: string;
  serviceInfo: string;
  products: Array<Omit<ReplacementProduct, "id" | "categoryId" | "category" | "serviceInfo"> & { slug: string }>;
};

const applianceCategories: CategoryDefinition[] = [
  {
    id: "washing_machine",
    label: "세탁기",
    serviceInfo: "설치 예약 단계에서 기존 세탁기 수거와 새 제품 설치 일정을 함께 확인해요.",
    products: [
      {
        slug: "fg24kn-akor2",
        name: "LG 트롬 오브제컬렉션 세탁기 24kg",
        grade: "프리미엄",
        originalPrice: 1943000,
        sameDayEligible: true,
        imageUrl: "https://www.lge.co.kr/kr/images/washing-machines/md10041839/gallery/large-interior01.jpg",
        summary: "24kg 대용량 / AI DD / 오브제컬렉션",
        detail: "AI DD 기술로 세탁물 특성을 자동 감지하고 최적의 코스로 세탁해요. 24kg 대용량으로 이불, 수건도 한 번에 해결해요.",
        recommendedFor: "가족 세탁량이 많거나 이불, 수건을 자주 세탁하는 집에 추천해요.",
        highlights: ["AI DD가 세탁물 특성에 맞춰 움직여요", "24kg 대용량으로 세탁 빈도를 줄일 수 있어요", "오브제컬렉션 톤으로 인테리어와 잘 맞아요"],
        specs: [
          { label: "용량", value: "24kg" },
          { label: "주요 기능", value: "AI DD" },
          { label: "제품군", value: "오브제컬렉션" },
        ],
        tags: ["24kg", "AI DD", "오브제컬렉션"],
      },
      {
        slug: "t10wv3",
        name: "LG 통돌이 세탁기 10kg 2등급",
        grade: "보급형",
        originalPrice: 479000,
        sameDayEligible: true,
        imageUrl: "https://www.lge.co.kr/kr/images/washing-machines/md10708830/gallery/medium-interior01.jpg",
        summary: "10kg / 통돌이 / 2등급",
        detail: "통돌이 방식으로 강력한 세탁력을 발휘하고 10kg 용량으로 1~2인 가구에 꼭 맞는 크기예요.",
        recommendedFor: "혼자 또는 둘이 사는 집에서 실속 있는 세탁기를 원할 때 추천해요.",
        highlights: ["통돌이 방식으로 강력한 세탁력을 제공해요", "10kg 용량으로 1~2인 가구에 딱 맞아요", "에너지 2등급으로 전기요금 부담이 적어요"],
        specs: [
          { label: "용량", value: "10kg" },
          { label: "타입", value: "통돌이" },
          { label: "에너지", value: "2등급" },
        ],
        tags: ["10kg", "통돌이", "2등급"],
      },
      {
        slug: "fg21kn-obj",
        name: "LG 트롬 오브제컬렉션 세탁기 21kg 3등급",
        grade: "프리미엄",
        originalPrice: 1490000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/washing-machines/md10412832/gallery/medium-interior01.jpg",
        summary: "21kg / AI DD / 오브제컬렉션 / 3등급",
        detail: "21kg 대용량으로 대가족 세탁량을 거뜬히 처리하고 오브제컬렉션 디자인으로 공간에 잘 어울려요.",
        recommendedFor: "3인 이상 가족이나 이불·수건 세탁이 잦은 집에 추천해요.",
        highlights: ["21kg 대용량으로 대가족 세탁도 한 번에 해결해요", "오브제컬렉션 디자인으로 인테리어와 잘 어울려요", "AI DD 기술로 세탁물 특성에 맞는 코스를 자동 선택해요"],
        specs: [
          { label: "용량", value: "21kg" },
          { label: "주요 기능", value: "AI DD" },
          { label: "에너지", value: "3등급" },
        ],
        tags: ["21kg", "AI DD", "오브제컬렉션"],
      },
    ],
  },
  {
    id: "refrigerator",
    label: "냉장고",
    serviceInfo: "대형 제품이라 설치 공간과 동선을 먼저 확인하고, 수거와 설치 방문을 함께 진행해요.",
    products: [
      {
        slug: "s834mee111",
        name: "LG 디오스 AI 오브제컬렉션 냉장고 832L",
        grade: "프리미엄",
        originalPrice: 2350000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/refrigerators/md10635830/gallery/medium-interior01.jpg",
        summary: "832L / 양문형 / 매직스페이스 / 1등급",
        detail: "832L 대용량 양문형으로 식재료 보관 공간이 넉넉하고 매직스페이스로 수납이 편해요. AI가 최적 온도를 유지해요.",
        recommendedFor: "식재료 보관량이 많거나 주방 가전을 통일하고 싶은 집에 추천해요.",
        highlights: ["832L 대용량으로 보관 공간이 넉넉해요", "AI 기능으로 최적 온도를 유지해요", "오브제컬렉션으로 주방 인테리어와 잘 어울려요"],
        specs: [
          { label: "용량", value: "832L" },
          { label: "타입", value: "양문형" },
          { label: "에너지", value: "1등급" },
        ],
        tags: ["832L", "양문형", "오브제컬렉션"],
      },
      {
        slug: "me300l-1grade",
        name: "LG 모던엣지 냉장고 300L 1등급",
        grade: "일반/중형",
        originalPrice: 980000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/refrigerators/md09091857/gallery/medium-interior01.jpg",
        summary: "300L / 모던엣지 / 1등급",
        detail: "300L 용량으로 2~3인 가구에 딱 맞고 에너지 1등급으로 전기요금 부담을 줄여줘요. 모던엣지 디자인으로 주방에 깔끔하게 어울려요.",
        recommendedFor: "2~3인 가구나 에너지 효율을 중요하게 보는 집에 추천해요.",
        highlights: ["300L 용량으로 2~3인 가구에 적합해요", "에너지 1등급으로 전기요금을 아낄 수 있어요", "모던엣지 디자인으로 주방 인테리어와 잘 어울려요"],
        specs: [
          { label: "용량", value: "300L" },
          { label: "에너지", value: "1등급" },
          { label: "디자인", value: "모던엣지" },
        ],
        tags: ["300L", "1등급", "모던엣지"],
      },
      {
        slug: "dios-fitmax-504l",
        name: "LG 디오스 오브제컬렉션 냉장고 Fit & Max 504L 2등급",
        grade: "프리미엄",
        originalPrice: 3850000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/refrigerators/md10555924/gallery/medium-interior01.jpg",
        summary: "504L / Fit & Max / 오브제컬렉션 / 2등급",
        detail: "504L Fit & Max 설계로 공간 활용도를 극대화하고 오브제컬렉션 디자인으로 주방 인테리어의 중심이 돼요.",
        recommendedFor: "넓은 수납 공간과 프리미엄 디자인을 동시에 원하는 집에 추천해요.",
        highlights: ["504L Fit & Max로 수납 공간을 최대한 활용해요", "오브제컬렉션 디자인으로 주방의 완성도를 높여요", "디오스 라인의 검증된 냉장 성능을 제공해요"],
        specs: [
          { label: "용량", value: "504L" },
          { label: "설계", value: "Fit & Max" },
          { label: "에너지", value: "2등급" },
        ],
        tags: ["504L", "Fit & Max", "오브제컬렉션"],
      },
    ],
  },
  {
    id: "tv",
    label: "TV",
    serviceInfo: "벽걸이 설치 여부와 기존 TV 수거 방식을 설치 예약 단계에서 함께 확인해요.",
    products: [
      {
        slug: "oled48c6kna",
        name: "LG 올레드 evo AI 스탠드형 48인치",
        grade: "프리미엄",
        originalPrice: 2389000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/tvs/md10770850/gallery/OLED48C6KNA_st_mo.jpg",
        summary: "48인치 / OLED evo / AI 화질",
        detail: "OLED evo 패널로 완벽한 블랙과 생생한 색상을 경험할 수 있어요. AI 기술로 콘텐츠에 맞게 화질을 최적화해요.",
        recommendedFor: "거실 메인 TV를 프리미엄으로 교체하려는 집에 추천해요.",
        highlights: ["OLED evo 패널로 완벽한 화질을 제공해요", "AI 화질 최적화로 콘텐츠별 최적 화면을 보여줘요", "스탠드형으로 설치가 간편해요"],
        specs: [
          { label: "크기", value: "48인치" },
          { label: "패널", value: "OLED evo" },
          { label: "타입", value: "스탠드형" },
        ],
        tags: ["48인치", "OLED evo", "AI 화질"],
      },
      {
        slug: "led107-stand",
        name: "LG 일반 LED TV (스탠드형) 107cm",
        grade: "일반/중형",
        originalPrice: 670000,
        sameDayEligible: true,
        imageUrl: "https://www.lge.co.kr/kr/images/tvs/md08989826/gallery/medium-interior01.jpg",
        summary: "107cm(42인치) / LED / 스탠드형",
        detail: "107cm 화면으로 영화, 드라마 시청에 충분하고 스탠드형이라 설치가 간편해요. 합리적인 가격의 일반 LED 모델이에요.",
        recommendedFor: "거실 서브 TV나 방에 놓을 적당한 크기의 TV를 찾는 집에 추천해요.",
        highlights: ["107cm 화면으로 영화·드라마 시청에 충분해요", "스탠드형으로 별도 설치 없이 바로 사용해요", "합리적인 가격으로 부담 없이 교체할 수 있어요"],
        specs: [
          { label: "화면 크기", value: "107cm (42인치)" },
          { label: "패널", value: "LED" },
          { label: "타입", value: "스탠드형" },
        ],
        tags: ["107cm", "42인치", "LED"],
      },
      {
        slug: "led80-stand",
        name: "LG 일반 LED TV (스탠드형) 80cm",
        grade: "보급형",
        originalPrice: 450000,
        sameDayEligible: true,
        imageUrl: "https://www.lge.co.kr/kr/images/tvs/md10791858/gallery/medium-interior01.jpg",
        summary: "80cm(32인치) / LED / 스탠드형",
        detail: "80cm 콤팩트한 크기로 방이나 주방에 두기 좋고 부담 없는 가격으로 가볍게 교체할 수 있어요.",
        recommendedFor: "침실이나 주방에 작은 TV를 놓고 싶은 집에 추천해요.",
        highlights: ["80cm 콤팩트한 크기로 좁은 공간에도 잘 맞아요", "스탠드형으로 설치 없이 바로 사용해요", "실속 있는 가격으로 부담 없이 교체해요"],
        specs: [
          { label: "화면 크기", value: "80cm (32인치)" },
          { label: "패널", value: "LED" },
          { label: "타입", value: "스탠드형" },
        ],
        tags: ["80cm", "32인치", "LED"],
      },
    ],
  },
  {
    id: "air_conditioner",
    label: "에어컨",
    serviceInfo: "설치 환경에 따라 배관과 실외기 위치 확인이 필요하고, 기존 제품 수거와 새 제품 설치를 함께 안내해요.",
    products: [
      {
        slug: "sq07gj3wes-akor",
        name: "LG 휘센 벽걸이에어컨 22.8㎡ 1등급",
        grade: "일반/중형",
        originalPrice: 1388000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/air-conditioners/md10731831/gallery/medium-interior01.jpg",
        summary: "22.8㎡ / 1등급 / 벽걸이형",
        detail: "에너지 효율 1등급으로 전기요금 부담을 줄이면서 22.8㎡ 공간을 쾌적하게 냉방해요.",
        recommendedFor: "방 하나를 집중 냉방하거나 에너지 효율을 중요하게 보는 집에 추천해요.",
        highlights: ["에너지 효율 1등급으로 전기요금을 아껴요", "22.8㎡ 공간에 최적화되어 있어요", "휘센 라인의 안정적인 냉방 성능이에요"],
        specs: [
          { label: "냉방 면적", value: "22.8㎡" },
          { label: "에너지", value: "1등급" },
          { label: "타입", value: "벽걸이형" },
        ],
        tags: ["22.8㎡", "1등급", "휘센"],
      },
      {
        slug: "4season-22-1grade",
        name: "LG 휘센 사계절에어컨 (벽걸이) 22㎡ 1등급",
        grade: "프리미엄",
        originalPrice: 1998000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/air-conditioners/md10248830/gallery/medium-interior01.jpg",
        summary: "22㎡ / 사계절 / 벽걸이 / 1등급",
        detail: "냉방과 난방을 모두 지원하는 사계절 에어컨으로 연중 내내 쾌적한 실내 환경을 유지해요. 에너지 1등급으로 전기요금 부담도 낮아요.",
        recommendedFor: "냉난방을 하나로 해결하고 싶은 집이나 에너지 효율을 중요하게 보는 분께 추천해요.",
        highlights: ["냉방·난방 모두 지원해 사계절 내내 쾌적해요", "에너지 1등급으로 전기요금을 아낄 수 있어요", "22㎡에 최적화된 벽걸이 타입이에요"],
        specs: [
          { label: "냉방 면적", value: "22㎡" },
          { label: "기능", value: "냉난방 사계절" },
          { label: "에너지", value: "1등급" },
        ],
        tags: ["22㎡", "사계절", "1등급"],
      },
      {
        slug: "winner-obj-65",
        name: "LG 휘센 오브제컬렉션 위너 에어컨 65.9㎡",
        grade: "프리미엄",
        originalPrice: 2533000,
        sameDayEligible: false,
        imageUrl: "https://www.lge.co.kr/kr/images/air-conditioners/md09948826/gallery/medium-interior01.jpg",
        summary: "65.9㎡ / 위너 / 오브제컬렉션",
        detail: "65.9㎡ 넓은 공간을 강력하게 냉방하고 오브제컬렉션 위너 디자인으로 거실 인테리어와 자연스럽게 어울려요.",
        recommendedFor: "거실처럼 넓은 공간을 냉방하거나 프리미엄 디자인 에어컨을 원하는 집에 추천해요.",
        highlights: ["65.9㎡ 넓은 공간도 강력하게 냉방해요", "오브제컬렉션 위너 디자인으로 거실 인테리어와 잘 어울려요", "휘센 라인의 검증된 냉방 성능을 제공해요"],
        specs: [
          { label: "냉방 면적", value: "65.9㎡" },
          { label: "타입", value: "벽걸이형" },
          { label: "제품군", value: "오브제컬렉션 위너" },
        ],
        tags: ["65.9㎡", "위너", "오브제컬렉션"],
      },
    ],
  },
  {
    id: "microwave",
    label: "전자레인지",
    serviceInfo: "소형 가전은 배송 설치 부담이 적고, 기존 제품은 수거 예약 단계에서 함께 확인해요.",
    products: [
      {
        slug: "mlj39ewo",
        name: "LG 디오스 오브제컬렉션 광파오븐 39L",
        grade: "보급형",
        originalPrice: 490000,
        sameDayEligible: true,
        imageUrl: "https://www.lge.co.kr/kr/images/microwaves-and-ovens/md10101827/gallery/medium-interior02.jpg",
        summary: "39L / 광파오븐 / 오브제컬렉션",
        detail: "광파 기술로 전자레인지와 오븐 기능을 하나로 쓸 수 있는 39L 대용량 제품이에요.",
        recommendedFor: "간단한 홈쿡과 오븐 조리를 자주 하는 집에 추천해요.",
        highlights: ["광파오븐으로 전자레인지와 오븐 기능을 함께 써요", "39L 넉넉한 용량이에요", "오브제컬렉션으로 주방 인테리어와 잘 어울려요"],
        specs: [
          { label: "용량", value: "39L" },
          { label: "기능", value: "광파오븐" },
          { label: "제품군", value: "오브제컬렉션" },
        ],
        tags: ["39L", "광파오븐", "오브제컬렉션"],
      },
      {
        slug: "obj-mw-25l",
        name: "LG 디오스 오브제컬렉션 전자레인지 25L",
        grade: "보급형",
        originalPrice: 339000,
        sameDayEligible: true,
        imageUrl: "https://www.lge.co.kr/kr/images/microwaves-and-ovens/md10739828/gallery/medium-interior01.jpg",
        summary: "25L / 전자레인지 / 오브제컬렉션",
        detail: "25L 용량으로 1~2인 가구에 적합하고 오브제컬렉션 디자인으로 주방 인테리어와 자연스럽게 어울려요.",
        recommendedFor: "간단한 음식 데우기와 해동을 주로 하는 1~2인 가구에 추천해요.",
        highlights: ["25L 용량으로 1~2인 가구 일상 사용에 충분해요", "오브제컬렉션 디자인으로 주방과 잘 어울려요", "합리적인 가격으로 부담 없이 교체할 수 있어요"],
        specs: [
          { label: "용량", value: "25L" },
          { label: "타입", value: "전자레인지" },
          { label: "제품군", value: "오브제컬렉션" },
        ],
        tags: ["25L", "전자레인지", "오브제컬렉션"],
      },
      {
        slug: "obj-oven-32l",
        name: "LG 디오스 오브제컬렉션 광파오븐 32L",
        grade: "일반/중형",
        originalPrice: 1055000,
        sameDayEligible: true,
        imageUrl: "https://www.lge.co.kr/kr/images/microwaves-and-ovens/md10200826/gallery/medium-interior01.jpg",
        summary: "32L / 광파오븐 / 오브제컬렉션",
        detail: "32L 광파오븐으로 전자레인지와 오븐 기능을 하나로 쓸 수 있어요. 오브제컬렉션 디자인으로 주방 분위기를 높여줘요.",
        recommendedFor: "오븐 요리를 즐기거나 주방 가전을 오브제컬렉션으로 통일하고 싶은 집에 추천해요.",
        highlights: ["광파오븐으로 전자레인지·오븐 기능을 하나로 써요", "32L 용량으로 다양한 요리에 활용할 수 있어요", "오브제컬렉션으로 주방 인테리어 완성도를 높여요"],
        specs: [
          { label: "용량", value: "32L" },
          { label: "기능", value: "광파오븐" },
          { label: "제품군", value: "오브제컬렉션" },
        ],
        tags: ["32L", "광파오븐", "오브제컬렉션"],
      },
    ],
  },
];

export const purchaseProducts: ReplacementProduct[] = applianceCategories.flatMap((category) =>
  category.products.map(({ slug, ...product }) => ({
    ...product,
    id: `${category.id}-${slug}`,
    categoryId: category.id,
    category: category.label,
    serviceInfo: category.serviceInfo,
  })),
);

export function getDefaultProductIdForCategory(categoryId: ProductCategoryId): ProductId | null {
  return purchaseProducts.find((product) => product.categoryId === categoryId)?.id ?? null;
}

function gradeFromPrice(price: number): string {
  if (price >= 1_500_000) return "프리미엄";
  if (price >= 500_000) return "일반";
  return "보급형";
}

function creditRateFor(grade: string): number {
  switch (grade) {
    case "프리미엄": return 0.10;
    case "보급형":   return 0.04;
    default:         return 0.07;
  }
}

function calculatePurchaseBenefit(baseCredit: number, productPrice: number) {
  const grade = gradeFromPrice(productPrice);
  const rate = creditRateFor(grade);
  const productPriceBonus = Math.round((productPrice * rate) / 1000) * 1000;
  return baseCredit + productPriceBonus;
}

function categoryLabel(categoryId: ProductCategoryId) {
  return applianceCategories.find((category) => category.id === categoryId)?.label ?? "가전";
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<"all" | ProductCategoryId>(preferredCategoryId);
  const selectedPurchaseBenefit = selectedProduct
    ? calculatePurchaseBenefit(estimatedCredit, selectedProduct.originalPrice)
    : 0;
  const selectedFinalPrice = selectedProduct
    ? Math.max(selectedProduct.originalPrice - selectedPurchaseBenefit, 0)
    : 0;
  const preferredCategoryLabel = categoryLabel(preferredCategoryId);
  const orderedCategories = [
    ...applianceCategories.filter((category) => category.id === preferredCategoryId),
    ...applianceCategories.filter((category) => category.id !== preferredCategoryId),
  ];
  const categoryOptions = orderedCategories.map((category) => ({ id: category.id, label: category.label }));
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
      <p className="mt-2 text-xs leading-5 text-slate-500">
        수거 신청한 {preferredCategoryLabel}와 같은 카테고리를 먼저 보여드려요. 다른 가전 카테고리도 함께 비교할 수 있어요.
      </p>

      <div className="mt-4 rounded-3xl border border-lgred/10 bg-[linear-gradient(135deg,#fff7fa,#ffffff_58%,#f8fafc)] p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <RewardCoinIcon />
          <div className="min-w-0 flex-1">
            <p className="whitespace-nowrap text-[13px] font-bold leading-5 text-ink">기본 예상 보상이에요</p>
            <p className="mt-1 whitespace-nowrap text-[24px] font-bold leading-7 text-lgred">{estimatedCredit.toLocaleString()}원</p>
            <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-500">
              제품을 선택하면 가격대에 따라 추가 혜택이 함께 계산돼요.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-ink">가전제품 카테고리</h3>
        </div>
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
                      <span className="text-[11px] font-semibold text-slate-500">혜택</span>
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
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            {selectedProduct.summary}
          </p>
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
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff4d6] ring-1 ring-[#f4d27c]">
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
        <ellipse cx="20" cy="27" rx="10" ry="4" fill="#f1b72f" opacity="0.65" />
        <path d="M10 23.5v3.3c0 2.4 4.5 4.3 10 4.3s10-1.9 10-4.3v-3.3" fill="#ffd65d" />
        <ellipse cx="20" cy="23.5" rx="10" ry="4.3" fill="#ffeaa6" stroke="#d9a41f" strokeWidth="1.2" />
        <path d="M13.2 19.2v3.5c0 2.1 3.1 3.8 6.8 3.8s6.8-1.7 6.8-3.8v-3.5" fill="#ffc73d" />
        <ellipse cx="20" cy="19.2" rx="6.8" ry="3.8" fill="#fff1bd" stroke="#d9a41f" strokeWidth="1.1" />
        <path d="M17.3 18.4c1.3-.7 4.1-.7 5.4 0" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
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
    <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/70 px-4 backdrop-blur-[1px]" onClick={onClose}>
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
              <PriceTile label="예상 혜택" value={`${purchaseBenefit.toLocaleString()}원`} accent />
              <PriceTile label="예상 결제" value={`${finalPrice.toLocaleString()}원`} strong />
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

            <div className="mt-3 rounded-3xl bg-lgred/5 p-4">
              <p className="text-[13px] font-bold text-ink">배송/설치 안내</p>
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{product.serviceInfo}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-4 pt-3 shadow-[0_-12px_24px_rgba(15,23,42,.08)]">
          <button
            className="h-12 w-full rounded-2xl bg-lgred text-[13px] font-bold text-white"
            onClick={onOrder}
            type="button"
          >
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
