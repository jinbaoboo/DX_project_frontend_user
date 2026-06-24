import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080";

function normalizeModelName(modelName: string) {
  return modelName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const { modelName } = (await request.json()) as { modelName: string };

    if (!modelName?.trim()) {
      return NextResponse.json({ error: "모델명이 없습니다." }, { status: 400 });
    }

    const normalizedModelName = normalizeModelName(modelName);
    const url = new URL("/api/swap-requests/appliance-specs/lookup", API_BASE_URL);
    url.searchParams.set("modelName", normalizedModelName);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "스펙을 찾지 못했습니다." }, { status: response.status });
    }

    const spec = (await response.json()) as {
      brand?: string;
      applianceType?: string;
      modelName?: string;
      sizeGrade?: string;
      sizeMetric?: string;
      weightKg?: number | string | null;
    };

    return NextResponse.json({
      applianceType: spec.applianceType,
      brand: spec.brand,
      modelName: spec.modelName || normalizedModelName,
      capacity: spec.sizeMetric,
      size: spec.sizeGrade,
      releaseYear: undefined,
      powerConsumption: undefined,
      weight_kg: spec.weightKg == null ? undefined : Number(spec.weightKg),
    });
  } catch (error) {
    console.error("[Lookup specs error]", error);
    return NextResponse.json({ error: "스펙 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
