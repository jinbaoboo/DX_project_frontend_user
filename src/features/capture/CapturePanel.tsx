"use client";

import {
  Camera,
  CheckCircle2,
  Home,
  Loader2,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

type ApplianceId = "washing_machine" | "refrigerator" | "air_conditioner" | "microwave" | "tv" | "air_purifier";
type CapturePhase = "camera" | "recognizing" | "sticker-camera" | "sticker-recognizing" | "review";
type CaptureTarget = "exterior" | "label";

export type CaptureSubmission = {
  exteriorPhotoFileName: string;
  exteriorPhotoUrl?: string;
  labelPhotoFileName: string;
  labelPhotoUrl?: string;
  agreedToCreditPolicy: boolean;
  applianceType: ApplianceId;
  brand: string;
  modelName: string;
  estimatedAge: string;
  exteriorCondition: string;
};

export type CapturePreviewResult = Partial<RecognizedAppliance>;

type CapturePanelProps = {
  fileName: string;
  loading: boolean;
  applianceId: ApplianceId;
  applianceLabel: string;
  onFileChange: (fileName: string) => void;
  onPreviewAnalyze?: (submission: CaptureSubmission) => Promise<CapturePreviewResult | null | undefined>;
  onAnalyze: (submission: CaptureSubmission) => void;
  onCancel: () => void;
  onHome?: () => void;
};

type RecognizedAppliance = {
  applianceType: string;
  brand: string;
  modelName: string;
  capacity?: string;
  size?: string; // small | medium | large
  estimatedAge: string;
  exteriorCondition: string;
  confidence: number;
  weightKg?: number | null; // actual weight from API or DB
};

type LookupSpecResult = {
  brand?: string;
  modelName?: string;
  applianceType?: string;
  capacity?: string;
  size?: string;
  releaseYear?: number;
  weight_kg?: number;
};

type ModelSpecValidation =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "matched"; spec: LookupSpecResult }
  | { status: "mismatched"; spec: LookupSpecResult }
  | { status: "not_found" };

const targetDescriptions: Record<
  CaptureTarget,
  { title: string; description: string; demoLabel: string }
> = {
  exterior: {
    title: "\uAC00\uC804 \uC678\uAD00 \uC804\uCCB4\uAC00 \uBCF4\uC774\uB3C4\uB85D \uCD2C\uC601\uD574 \uC8FC\uC138\uC694",
    description: "\uC815\uBA74 \uB610\uB294 \uC0AC\uC120\uC5D0\uC11C \uC8FC\uC694 \uD30C\uC190 \uC5EC\uBD80\uAC00 \uBCF4\uC774\uB294 \uAC01\uB3C4\uB85C \uB9DE\uCDB0\uC8FC\uC138\uC694.",
    demoLabel: "\uC678\uAD00 \uCD2C\uC601",
  },
  label: {
    title: "\uB4B7 \uB77C\uBCA8\uC758 \uBAA8\uB378\uBA85\uACFC \uC81C\uC870 \uC815\uBCF4\uAC00 \uBCF4\uC774\uB3C4\uB85D \uCD2C\uC601\uD574 \uC8FC\uC138\uC694",
    description: "\uC2DC\uB9AC\uC5BC/\uBAA8\uB378\uBA85\uC774 \uD750\uB9AC\uC9C0 \uC54A\uB3C4\uB85D \uAC00\uAE4C\uC774 \uB9DE\uCDB0 \uCD2C\uC601\uD574 \uC8FC\uC138\uC694.",
    demoLabel: "\uB4B7 \uB77C\uBCA8 \uCD2C\uC601",
  },
};

const recognitionByAppliance: Record<ApplianceId, RecognizedAppliance> = {
  washing_machine: {
    applianceType: "\uC138\uD0C1\uAE30",
    brand: "unknown",
    modelName: "unknown",
    estimatedAge: "3-5\uB144",
    exteriorCondition: "\uC0DD\uD65C \uC2A4\uD06C\uB798\uCE58 \uACBD\uBBF8",
    confidence: 88,
  },
  refrigerator: {
    applianceType: "\uB0C9\uC7A5\uACE0",
    brand: "unknown",
    modelName: "unknown",
    estimatedAge: "4-6\uB144",
    exteriorCondition: "\uBB38\uCABD \uC2A4\uD06C\uB798\uCE58 \uC18C\uB7C9",
    confidence: 84,
  },
  air_conditioner: {
    applianceType: "\uC5D0\uC5B4\uCEE8",
    brand: "unknown",
    modelName: "unknown",
    estimatedAge: "2-4\uB144",
    exteriorCondition: "\uC2E4\uB0B4\uAE30 \uD45C\uBA74 \uC591\uD638",
    confidence: 86,
  },
  microwave: {
    applianceType: "\uC804\uC790\uB808\uC778\uC9C0",
    brand: "unknown",
    modelName: "unknown",
    estimatedAge: "5\uB144 \uC774\uC0C1",
    exteriorCondition: "\uC0DD\uD65C \uC624\uC5FC \uD754\uC801",
    confidence: 79,
  },
  tv: {
    applianceType: "TV",
    brand: "unknown",
    modelName: "unknown",
    estimatedAge: "2-3\uB144",
    exteriorCondition: "\uD654\uBA74 \uC678\uAD00 \uC591\uD638",
    confidence: 90,
  },
  air_purifier: {
    applianceType: "\uACF5\uAE30\uCCAD\uC815\uAE30",
    brand: "unknown",
    modelName: "unknown",
    estimatedAge: "2-4\uB144",
    exteriorCondition: "\uD544\uD130 \uC8FC\uBCC0 \uC591\uD638",
    confidence: 82,
  },
};

const METAL_PRICES = {
  steel: 280,
  aluminum: 1800,
  copper: 9800,
};

const METAL_RATIOS: Record<ApplianceId, { steel: number; aluminum: number; copper: number }> = {
  washing_machine: { steel: 0.62, aluminum: 0.05, copper: 0.025 },
  refrigerator: { steel: 0.58, aluminum: 0.04, copper: 0.018 },
  air_conditioner: { steel: 0.42, aluminum: 0.16, copper: 0.055 },
  microwave: { steel: 0.54, aluminum: 0.03, copper: 0.012 },
  tv: { steel: 0.18, aluminum: 0.07, copper: 0.01 },
  air_purifier: { steel: 0.22, aluminum: 0.06, copper: 0.02 },
};

const APPLIANCE_WEIGHTS: Record<ApplianceId, Record<string, number>> = {
  washing_machine: { "\uC18C\uD615": 45, "\uC911\uD615": 62, "\uB300\uD615": 78 },
  refrigerator: { "\uC18C\uD615": 55, "\uC911\uD615": 82, "\uB300\uD615": 115 },
  air_conditioner: { "\uC18C\uD615": 18, "\uC911\uD615": 32, "\uB300\uD615": 48 },
  microwave: { "\uC18C\uD615": 10, "\uC911\uD615": 13, "\uB300\uD615": 17 },
  tv: { "\uC18C\uD615": 9, "\uC911\uD615": 16, "\uB300\uD615": 25 },
  air_purifier: { "\uC18C\uD615": 6, "\uC911\uD615": 9, "\uB300\uD615": 13 },
};
const MODEL_WEIGHT_DB: Record<string, number> = {};

const CREDIT_RATIO_MATRIX: Record<string, number[]> = {
  premium: [0.08, 0.1, 0.12],
  standard: [0.05, 0.07, 0.09],
  basic: [0.03, 0.04, 0.05],
};

const DUMMY_NEW_PRODUCT = { price: 1000000 };
const DUMMY_SWAP_COUNT = 1;
const CAP_RATIO = 0.15;

function getWeightForCalc(
  applianceType: string,
  size?: string,
  modelName?: string,
  weightKg?: number | null,
) {
  if (weightKg) return { weight: weightKg, fromDB: true };
  if (modelName && MODEL_WEIGHT_DB[modelName]) {
    return { weight: MODEL_WEIGHT_DB[modelName], fromDB: true };
  }

  const key = normalizeApplianceId(applianceType);
  const grade = size && APPLIANCE_WEIGHTS[key]?.[size] ? size : "\uC911\uD615";
  return { weight: APPLIANCE_WEIGHTS[key]?.[grade] ?? 40, fromDB: false };
}

function normalizeApplianceId(applianceType: string): ApplianceId {
  const normalized = applianceType.trim().toLowerCase();
  if (normalized === "washing_machine") return "washing_machine";
  if (normalized === "refrigerator") return "refrigerator";
  if (normalized === "air_conditioner") return "air_conditioner";
  if (normalized === "microwave") return "microwave";
  if (normalized === "tv") return "tv";
  if (normalized === "air_purifier") return "air_purifier";
  if (applianceType === "\uB0C9\uC7A5\uACE0") return "refrigerator";
  if (applianceType === "\uC5D0\uC5B4\uCEE8") return "air_conditioner";
  if (applianceType === "\uC804\uC790\uB808\uC778\uC9C0") return "microwave";
  if (applianceType === "TV") return "tv";
  if (applianceType === "\uACF5\uAE30\uCCAD\uC815\uAE30") return "air_purifier";
  return "washing_machine";
}

function applianceLabelById(applianceId: ApplianceId) {
  switch (applianceId) {
    case "refrigerator":
      return "냉장고";
    case "air_conditioner":
      return "에어컨";
    case "microwave":
      return "전자레인지";
    case "tv":
      return "TV";
    case "air_purifier":
      return "공기청정기";
    case "washing_machine":
    default:
      return "세탁기";
  }
}

function calculateScrapValue(applianceType: string, weight: number) {
  const ratios = METAL_RATIOS[normalizeApplianceId(applianceType)];
  return Math.round(
    weight * ratios.steel * METAL_PRICES.steel +
      weight * ratios.aluminum * METAL_PRICES.aluminum +
      weight * ratios.copper * METAL_PRICES.copper,
  );
}

function getNewProductTier(price: number) {
  if (price >= 1500000) return "premium";
  if (price >= 700000) return "standard";
  return "basic";
}

function calculateFinalCredit(
  applianceType: string,
  size: string | undefined,
  newProductPrice: number,
  swapCount: number,
  modelName?: string,
  weightKg?: number | null,
) {
  const { weight, fromDB } = getWeightForCalc(applianceType, size, modelName, weightKg);
  const scrap = calculateScrapValue(applianceType, weight);
  const tier = getNewProductTier(newProductPrice);
  const ratio = CREDIT_RATIO_MATRIX[tier][Math.min(Math.max(swapCount, 1), 3) - 1];
  const bonus = Math.min(Math.round(newProductPrice * ratio), Math.round(newProductPrice * CAP_RATIO));

  return {
    total: scrap + bonus,
    scrap,
    bonus,
    ratio,
    tier,
    weightFromDB: fromDB,
  };
}

function releaseYearToAge(releaseYear: number) {
  const currentYear = new Date().getFullYear();
  const age = Math.max(currentYear - releaseYear, 0);
  if (age <= 1) return "1\uB144 \uC774\uD558";
  if (age <= 3) return "1-3\uB144";
  if (age <= 5) return "3-5\uB144";
  return "5\uB144 \uC774\uC0C1";
}

async function postVisionApi<T>(path: string, imageData: string): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageData }),
  });

  if (!response.ok) {
    throw new Error(`Vision API failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function callAnalyzeApi(imageData: string): Promise<RecognizedAppliance> {
  return postVisionApi<RecognizedAppliance>("/api/analyze", imageData);
}

async function callLabelApi(imageData: string): Promise<{ brand?: string; modelName?: string }> {
  return postVisionApi<{ brand?: string; modelName?: string }>("/api/analyze-label", imageData);
}

async function callLookupSpecsApi(modelName: string): Promise<LookupSpecResult> {
  const normalizedModelName = modelName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const response = await fetch(
    `/api/swap-requests/appliance-specs/lookup?modelName=${encodeURIComponent(normalizedModelName)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Lookup specs failed: ${response.status}`);
  }

  const spec = (await response.json()) as {
    brand?: string;
    applianceType?: string;
    modelName?: string;
    sizeGrade?: string;
    sizeMetric?: string;
    weightKg?: number | string | null;
  };

  return {
    applianceType: spec.applianceType,
    brand: spec.brand,
    modelName: spec.modelName || normalizedModelName,
    capacity: spec.sizeMetric,
    size: spec.sizeGrade,
    releaseYear: undefined,
    weight_kg: spec.weightKg == null ? undefined : Number(spec.weightKg),
  };
}

function knownText(value?: string | null) {
  const text = value?.trim() ?? "";
  if (!text) return "";
  if (["unknown", "null", "undefined", "n/a", "-"].includes(text.toLowerCase())) return "";
  return text;
}

function normalizeSpecText(value?: string | null) {
  return knownText(value).replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function mergeKnownRecognizedInfo(base: RecognizedAppliance, incoming?: CapturePreviewResult | null): RecognizedAppliance {
  if (!incoming) return base;

  return {
    ...base,
    applianceType: knownText(incoming.applianceType) || base.applianceType,
    brand: knownText(incoming.brand) || base.brand,
    modelName: knownText(incoming.modelName) || base.modelName,
    capacity: knownText(incoming.capacity) || base.capacity,
    size: knownText(incoming.size) || base.size,
    estimatedAge: knownText(incoming.estimatedAge) || base.estimatedAge,
    exteriorCondition: knownText(incoming.exteriorCondition) || base.exteriorCondition,
    confidence: incoming.confidence ?? base.confidence,
    weightKg: incoming.weightKg ?? base.weightKg,
  };
}

const GUIDE_FRAME_PROFILES: Record<ApplianceId, { width: string; aspectRatio: string; maxHeight: string }> = {
  refrigerator: { width: "min(68vw, 260px)", aspectRatio: "9 / 16", maxHeight: "52dvh" },
  washing_machine: { width: "min(72vw, 285px)", aspectRatio: "4 / 5", maxHeight: "48dvh" },
  air_conditioner: { width: "min(68vw, 260px)", aspectRatio: "9 / 16", maxHeight: "52dvh" },
  microwave: { width: "min(82vw, 320px)", aspectRatio: "16 / 10", maxHeight: "34dvh" },
  tv: { width: "min(84vw, 330px)", aspectRatio: "16 / 9", maxHeight: "34dvh" },
  air_purifier: { width: "min(58vw, 220px)", aspectRatio: "3 / 5", maxHeight: "52dvh" },
};

const LABEL_GUIDE_FRAME_STYLE: CSSProperties = {
  width: "min(82vw, 320px)",
  aspectRatio: "16 / 9",
  maxHeight: "32dvh",
};

function getGuideFrameStyle(applianceId: ApplianceId, target: CaptureTarget): CSSProperties {
  if (target === "label") {
    return LABEL_GUIDE_FRAME_STYLE;
  }

  const profile = GUIDE_FRAME_PROFILES[applianceId];
  return {
    width: profile.width,
    aspectRatio: profile.aspectRatio,
    maxHeight: profile.maxHeight,
  };
}

export function CapturePanel({
  fileName,
  loading,
  applianceId,
  applianceLabel,
  onFileChange,
  onPreviewAnalyze,
  onAnalyze,
  onCancel,
  onHome,
}: CapturePanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStartPromiseRef = useRef<Promise<void> | null>(null);
  const recognitionRunRef = useRef(0);
  const [phase, setPhase] = useState<CapturePhase>("camera");
  const [target, setTarget] = useState<CaptureTarget>("exterior");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [exteriorPhotoFileName, setExteriorPhotoFileName] = useState(fileName);
  const [labelPhotoFileName, setLabelPhotoFileName] = useState("");
  const [exteriorPreviewUrl, setExteriorPreviewUrl] = useState("");
  const [labelPreviewUrl, setLabelPreviewUrl] = useState("");
  const [capturedImageData, setCapturedImageData] = useState("");
  const [stickerImageData, setStickerImageData] = useState("");
  const [recognizedInfo, setRecognizedInfo] = useState<RecognizedAppliance>(
    recognitionByAppliance[applianceId],
  );

  useEffect(() => {
    setRecognizedInfo(recognitionByAppliance[applianceId]);
  }, [applianceId]);

  // Keep the capture flow moving even if the preview analysis is still running.
  useEffect(() => {
    if (phase !== "recognizing") return;

    if (!capturedImageData) {
      const timer = window.setTimeout(() => setPhase("review"), 900);
      return () => window.clearTimeout(timer);
    }

    let live = true;

    // Move to label capture after a short preview delay.
    const transitionTimer = window.setTimeout(() => {
      if (live) setPhase("sticker-camera");
    }, 2500);

    // Update recognition data when the background analysis returns.
    callAnalyzeApi(capturedImageData)
      .then((result) => { if (live) setRecognizedInfo(result); })
      .catch(() => {});

    return () => { live = false; window.clearTimeout(transitionTimer); };
  }, [phase, capturedImageData, applianceId]);

  useEffect(() => {
    if (loading || (phase !== "camera" && phase !== "sticker-camera")) {
      stopCamera();
      return undefined;
    }

    if (streamRef.current) {
      void attachCameraStream(streamRef.current);
      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }

    void startCamera();
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [loading, phase, target]);

  useEffect(() => {
    if (loading || (phase !== "camera" && phase !== "sticker-camera")) return undefined;

    const retryCamera = () => {
      if (document.visibilityState !== "visible") return;
      if (cameraReady || cameraStartPromiseRef.current) return;
      void startCamera();
    };

    window.addEventListener("focus", retryCamera);
    window.addEventListener("pageshow", retryCamera);
    document.addEventListener("visibilitychange", retryCamera);

    return () => {
      window.removeEventListener("focus", retryCamera);
      window.removeEventListener("pageshow", retryCamera);
      document.removeEventListener("visibilitychange", retryCamera);
    };
  }, [cameraReady, loading, phase]);

  useEffect(() => {
    if (phase !== "sticker-recognizing") return;
    if (!stickerImageData) { setPhase("review"); return; }

    // Snapshot current recognition data to avoid stale updates.
    const prevModelName = recognizedInfo.modelName;
    const prevBrand = recognizedInfo.brand;
    const prevEstimatedAge = recognizedInfo.estimatedAge;

    const runId = recognitionRunRef.current + 1;
    recognitionRunRef.current = runId;
    const isStale = () => recognitionRunRef.current !== runId;

    const fallbackTimer = window.setTimeout(() => {
      if (isStale()) return;
      setPhase("review");
    }, 30000);

    (async () => {
      try {
        let nextInfo = recognizedInfo;

        // Step 1: read brand and model text from the label image.
        let labelResult: { brand?: string; modelName?: string } = {};

        try {
          labelResult = await callLabelApi(stickerImageData);
          if (isStale()) return;
        } catch {
          // In production, /api/analyze-label can be routed to Spring and return 404.
          // The Spring photo analysis below is the reliable source, so keep going.
          labelResult = {};
        }

        const mergedModelName = knownText(labelResult.modelName) || knownText(prevModelName);
        const mergedBrand = knownText(labelResult.brand) || knownText(prevBrand);

        if (mergedModelName) {
          // Step 2: look up specs by model name.
          try {
            const specs = await callLookupSpecsApi(mergedModelName);
            if (isStale()) return;

            nextInfo = {
              ...nextInfo,
              brand: mergedBrand || specs.brand || nextInfo.brand,
              modelName: specs.modelName || mergedModelName,
              capacity: specs.capacity || nextInfo.capacity,
              size: specs.size || nextInfo.size,
              estimatedAge: specs.releaseYear
                ? releaseYearToAge(specs.releaseYear)
                : prevEstimatedAge,
              // Store weight from API if available for more accurate credit calculation.
              weightKg: specs.weight_kg ?? nextInfo.weightKg,
            };
          } catch {
            // Keep OCR result even if spec lookup fails.
            nextInfo = {
              ...nextInfo,
              brand: mergedBrand || nextInfo.brand,
              modelName: mergedModelName,
            };
          }
        } else {
          // If no model name was found, keep any recognized brand.
          nextInfo = {
            ...nextInfo,
            brand: mergedBrand || nextInfo.brand,
          };
        }

        if (onPreviewAnalyze && !isStale()) {
          try {
            const previewResult = await onPreviewAnalyze({
              exteriorPhotoFileName,
              exteriorPhotoUrl: exteriorPreviewUrl,
              labelPhotoFileName,
              labelPhotoUrl: labelPreviewUrl,
              agreedToCreditPolicy: true,
              applianceType: applianceId,
              brand: nextInfo.brand,
              modelName: nextInfo.modelName,
              estimatedAge: nextInfo.estimatedAge,
              exteriorCondition: nextInfo.exteriorCondition,
            });
            if (isStale()) return;
            nextInfo = mergeKnownRecognizedInfo(nextInfo, previewResult);
          } catch {
            // Keep OCR/spec results even if server preview analysis fails.
          }
        }

        setRecognizedInfo(nextInfo);
      } catch {
        // On OCR failure, preserve the previous values.
      } finally {
        window.clearTimeout(fallbackTimer);
        if (!isStale()) setPhase("review");
      }
    })();

    return () => { window.clearTimeout(fallbackTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stickerImageData]);

  useEffect(() => {
    return () => {
      recognitionRunRef.current += 1;
      stopCamera();
      if (exteriorPreviewUrl) URL.revokeObjectURL(exteriorPreviewUrl);
      if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    };
  }, [exteriorPreviewUrl, labelPreviewUrl]);

  function getCameraConstraints(): MediaStreamConstraints {
    return {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920, max: 4096 },
        height: { ideal: 1080, max: 4096 },
        frameRate: { ideal: 30 },
      },
    };
  }

  function getFallbackCameraConstraints(): MediaStreamConstraints {
    return {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  }

  function getBasicCameraConstraints(): MediaStreamConstraints {
    return {
      audio: false,
      video: true,
    };
  }

  async function requestCameraStream() {
    try {
      return await navigator.mediaDevices.getUserMedia(getCameraConstraints());
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const canRetryWithRelaxedConstraints = name !== "NotAllowedError" && name !== "PermissionDeniedError";

      if (!canRetryWithRelaxedConstraints) {
        throw error;
      }

      try {
        return await navigator.mediaDevices.getUserMedia(getFallbackCameraConstraints());
      } catch (fallbackError) {
        const fallbackName = fallbackError instanceof DOMException ? fallbackError.name : "";
        const canRetryWithBasicCamera = fallbackName !== "NotAllowedError" && fallbackName !== "PermissionDeniedError";

        if (!canRetryWithBasicCamera) {
          throw fallbackError;
        }

        return navigator.mediaDevices.getUserMedia(getBasicCameraConstraints());
      }
    }
  }

  function waitForCameraRelease() {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, 250);
    });
  }

  function hasCameraApi() {
    return typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  }

  function getCameraUnavailableMessage() {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "현재 주소가 보안 주소가 아니라 카메라가 차단됐어요. PC에서는 localhost, 휴대폰에서는 HTTPS 주소로 접속해 주세요.";
    }

    return "이 브라우저에서는 실시간 카메라를 사용할 수 없어요. Chrome 또는 Safari에서 다시 열어 주세요.";
  }

  function getCameraErrorMessage(error: unknown) {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return getCameraUnavailableMessage();
    }

    const name = error instanceof DOMException ? error.name : "";

    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "카메라 권한을 허용해야 실시간 촬영을 진행할 수 있습니다.";
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "사용 가능한 카메라를 찾지 못했어요. 카메라가 있는 기기에서 다시 시도해 주세요.";
    }

    if (name === "NotReadableError" || name === "TrackStartError") {
      return "다른 앱이나 브라우저 탭이 카메라를 사용 중일 수 있어요. 카메라를 닫고 다시 시도해 주세요.";
    }

    if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
      return "현재 기기에서 요청한 카메라 설정을 사용할 수 없어요. 다시 시도해 주세요.";
    }

    return "카메라를 시작하지 못했어요. 브라우저 권한과 접속 주소를 확인해 주세요.";
  }

  async function attachCameraStream(stream: MediaStream) {
    if (!videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = stream;
    video.muted = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("controlsList", "nodownload nofullscreen noremoteplayback");
    await video.play();

    if (!video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, 1200);
        video.onloadedmetadata = () => {
          window.clearTimeout(timer);
          resolve();
        };
      });
    }

    setCameraReady(true);
    setCameraMessage("");
  }

  async function openCamera(nextTarget: CaptureTarget, nextPhase: Extract<CapturePhase, "camera" | "sticker-camera">) {
    setTarget(nextTarget);
    setCameraReady(false);
    setCameraMessage("");

    if (!hasCameraApi()) {
      setPhase(nextPhase);
      setCameraMessage(getCameraUnavailableMessage());
      return;
    }

    stopCamera();
    setPhase(nextPhase);
  }

  async function startCamera() {
    if (!hasCameraApi()) {
      setCameraReady(false);
      setCameraMessage(getCameraUnavailableMessage());
      return;
    }

    if (cameraStartPromiseRef.current) {
      try {
        await cameraStartPromiseRef.current;
      } catch {
        // The active camera start attempt already updates the UI message.
      }
      return;
    }

    const startPromise = (async () => {
      stopCamera();
      await waitForCameraRelease();
      setCameraMessage("");
      const stream = await requestCameraStream();

      streamRef.current = stream;
      await attachCameraStream(stream);
    })();

    cameraStartPromiseRef.current = startPromise;

    try {
      await startPromise;
    } catch (error) {
      stopCamera();
      setCameraReady(false);
      setCameraMessage(getCameraErrorMessage(error));
    } finally {
      if (cameraStartPromiseRef.current === startPromise) {
        cameraStartPromiseRef.current = null;
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function saveCapture(dataUrl: string, generatedFileName: string) {
    if (target === "exterior") {
      if (exteriorPreviewUrl) URL.revokeObjectURL(exteriorPreviewUrl);
      setExteriorPreviewUrl(dataUrl);
      setCapturedImageData(dataUrl);
      setExteriorPhotoFileName(generatedFileName);
      onFileChange(generatedFileName);
      setTarget("label");
      setPhase("recognizing");
      stopCamera();
      return;
    }

    if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    setLabelPreviewUrl(dataUrl);
    setStickerImageData(dataUrl);
    setLabelPhotoFileName(generatedFileName);
    setPhase("sticker-recognizing");
    stopCamera();
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
        setCameraMessage("사진 캡처 중 문제가 발생했습니다. 카메라를 다시 실행한 뒤 시도해 주세요.");
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraMessage("카메라 화면이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const frame = frameRef.current;
    if (frame) {
      // Crop only the guide frame area.
      const videoRect = video.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();

      // Convert CSS pixels to actual video pixels.
      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;

      const sx = Math.max(0, (frameRect.left - videoRect.left) * scaleX);
      const sy = Math.max(0, (frameRect.top - videoRect.top) * scaleY);
      const sw = Math.min(frameRect.width * scaleX, video.videoWidth - sx);
      const sh = Math.min(frameRect.height * scaleY, video.videoHeight - sy);

      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      // If there is no guide frame, capture the full frame.
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    saveCapture(
      canvas.toDataURL("image/jpeg", 0.92),
      `swapit-${target}-${applianceId}-${Date.now()}.jpg`,
    );
  }

  function handleStickerCapture() {
    handleCapture();
  }

  function createDemoCapture() {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 960;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.fillStyle = "#191d26";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#a50034";
    context.fillRect(48, 48, canvas.width - 96, canvas.height - 96);
    context.fillStyle = "#ffffff";
    context.font = "bold 44px sans-serif";
    context.fillText(applianceLabel, 68, 150);
    context.font = "bold 34px sans-serif";
    context.fillText(targetDescriptions[target].demoLabel, 68, 210);
    context.font = "28px sans-serif";
    context.fillText(new Date().toLocaleString("ko-KR"), 68, 280);

    saveCapture(
      canvas.toDataURL("image/jpeg", 0.9),
      `swapit-${target}-demo-${Date.now()}.jpg`,
    );
  }

  function resetAllCaptures() {
    recognitionRunRef.current += 1;
    if (exteriorPreviewUrl) URL.revokeObjectURL(exteriorPreviewUrl);
    if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    setExteriorPreviewUrl("");
    setLabelPreviewUrl("");
    setCapturedImageData("");
    setStickerImageData("");
    setExteriorPhotoFileName("");
    setLabelPhotoFileName("");
    onFileChange("");
    void openCamera("exterior", "camera");
  }

  if (loading) {
    return <AnalyzingView applianceLabel={applianceLabel} />;
  }

  if (phase === "recognizing") {
    return <RecognizingView applianceLabel={applianceLabel} />;
  }

  if (phase === "review") {
    return (
      <ReviewView
        applianceLabel={applianceLabel}
        exteriorPhotoFileName={exteriorPhotoFileName}
        labelPhotoFileName={labelPhotoFileName}
        exteriorPreviewUrl={exteriorPreviewUrl}
        labelPreviewUrl={labelPreviewUrl}
        selectedApplianceId={applianceId}
        recognizedInfo={recognizedInfo}
        onChange={setRecognizedInfo}
        onRetake={resetAllCaptures}
        onHome={onHome}
        onAnalyze={() =>
          onAnalyze({
            exteriorPhotoFileName,
            exteriorPhotoUrl: exteriorPreviewUrl,
            labelPhotoFileName,
            labelPhotoUrl: labelPreviewUrl,
            agreedToCreditPolicy: true,
            applianceType: applianceId,
            brand: recognizedInfo.brand,
            modelName: recognizedInfo.modelName,
            estimatedAge: recognizedInfo.estimatedAge,
            exteriorCondition: recognizedInfo.exteriorCondition,
          })
        }
      />
    );
  }

  if (phase === "sticker-camera") {
    return (
      <section className="relative h-full overflow-hidden bg-[#111318] text-white">
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            className={`capture-camera-video pointer-events-none h-full w-full select-none object-cover [backdrop-filter:none] [filter:none] ${
              cameraReady ? "opacity-100" : "opacity-0"
            }`}
            autoPlay
            controls={false}
            disablePictureInPicture
            muted
            playsInline
            controlsList="nodownload nofullscreen noremoteplayback"
            onContextMenu={(event) => event.preventDefault()}
            style={{ filter: "none", backdropFilter: "none" }}
          />
          {!cameraReady && <CameraFallback target="label" />}
          <div className="pointer-events-none absolute inset-0 bg-black/15" />
        </div>

        <div className="relative z-20 flex items-center justify-between px-6 pt-[max(22px,env(safe-area-inset-top))]">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/85">2 / 2</span>
          <button className="text-sm font-semibold text-white/70" onClick={() => setPhase("review")} type="button">
            {"\uAC74\uB108\uB6F0\uAE30"}
          </button>
        </div>

        <div className="absolute inset-x-0 z-10 flex flex-col items-center justify-center gap-4 px-6" style={{ top: "max(86px,calc(env(safe-area-inset-top) + 72px))", bottom: "max(132px,calc(env(safe-area-inset-bottom) + 112px))" }}>
          <p className="text-center text-base font-bold text-white">{"\uBAA8\uB378 \uB77C\uBCA8 \uC2A4\uD2F0\uCEE4\uB97C \uCC0D\uC5B4\uC8FC\uC138\uC694"}</p>
          <p className="rounded-full bg-black/55 px-4 py-2 text-[11px] font-semibold text-white/90">
            {"\uAE00\uC528\uAC00 \uC798 \uBCF4\uC774\uB3C4\uB85D \uAC00\uAE4C\uC774 \uB300\uC8FC\uC138\uC694"}
          </p>
          <div
            ref={frameRef}
            className="w-full max-w-[290px] rounded-2xl border-2 border-dashed border-white/65"
            style={getGuideFrameStyle(applianceId, "label")}
          />
          <p className="text-center text-[11px] font-semibold leading-5 text-white/55">
            {"\uD6C4\uBA74, \uCE21\uBA74, \uC81C\uD488 \uB0B4\uBD80 \uC5B4\uB514\uB4E0 \uB77C\uBCA8\uC774 \uC788\uB294 \uACF3\uC744 \uCC0D\uC5B4\uC8FC\uC138\uC694"}
          </p>
        </div>

        {cameraMessage ? (
          <div className="absolute left-6 right-6 top-[max(92px,calc(env(safe-area-inset-top)+68px))] z-30 rounded-2xl bg-black/55 px-4 py-3 text-center text-xs font-bold leading-5 text-white/85">
            {cameraMessage}
          </div>
        ) : null}

        <div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-20 flex items-center justify-center">
          <button
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-white/15 p-1 shadow-xl shadow-black/35"
            onClick={handleStickerCapture}
            type="button"
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-lgred">
              <Camera size={31} />
            </span>
          </button>
        </div>
      </section>
    );
  }

  if (phase === "sticker-recognizing") {
    return (
      <section className="flex min-h-full flex-col items-center justify-center gap-6 overflow-hidden bg-[#111318] px-8 text-white">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute h-14 w-14 animate-scanPulse rounded-full bg-lgred/35" />
          <span className="absolute h-14 w-14 animate-scanPulse rounded-full bg-lgred/35 [animation-delay:0.67s]" />
          <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-lgred">
            <ScanLine size={24} />
          </span>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{"\uB77C\uBCA8 \uBD84\uC11D \uC911"}</p>
          <p className="mt-2 text-sm font-semibold text-white/60">{"\uBAA8\uB378\uBA85\uACFC \uC2A4\uD399 \uC815\uBCF4\uB97C \uC77D\uACE0 \uC788\uC5B4\uC694"}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-full overflow-hidden bg-[#111318] text-white">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className={`capture-camera-video pointer-events-none h-full w-full select-none object-cover ${cameraReady ? "opacity-100" : "opacity-0"}`}
          autoPlay
          controls={false}
          disablePictureInPicture
          muted
          playsInline
          controlsList="nodownload nofullscreen noremoteplayback"
          onContextMenu={(event) => event.preventDefault()}
        />
        {!cameraReady ? <CameraFallback target={target} /> : null}
        <div className="pointer-events-none absolute inset-0 bg-black/12" />
      </div>

      <div className="relative z-20 flex items-center justify-between px-6 pt-[max(22px,env(safe-area-inset-top))]">
        <button className="text-sm font-semibold text-white" onClick={onCancel} type="button">
          {"\uCDE8\uC18C"}
        </button>
        <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white/90">
          {target === "exterior" ? "1/2 \uC678\uAD00 \uC0AC\uC9C4" : "2/2 \uB77C\uBCA8 \uC0AC\uC9C4"}
        </span>
      </div>

      <div className="absolute inset-x-0 z-10 flex flex-col items-center justify-center gap-3" style={{ top: "max(76px,calc(env(safe-area-inset-top) + 60px))", bottom: "max(128px,calc(env(safe-area-inset-bottom) + 108px))" }}>
        <div
          ref={frameRef}
          className="rounded-[20px] border-2 border-[#35ff77]"
          style={getGuideFrameStyle(applianceId, target)}
        />
        <p className="rounded-full bg-black/55 px-4 py-2 text-center text-[11px] font-semibold text-white/90">
          {targetDescriptions[target].title}
        </p>
      </div>

      {cameraMessage ? (
          <div className="absolute left-6 right-6 top-[max(92px,calc(env(safe-area-inset-top)+68px))] z-30 rounded-2xl bg-black/55 px-4 py-3 text-center text-xs font-bold leading-5 text-white/85">
          {cameraMessage}
        </div>
      ) : null}

      <div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-20 flex items-center justify-center">
        <button
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-white/15 p-1 shadow-xl shadow-black/35"
          onClick={handleCapture}
          type="button"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-lgred">
            <Camera size={30} />
          </span>
        </button>
      </div>
    </section>
  );
}
function CameraFallback({ target }: { target: CaptureTarget }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#252a31]">
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/25 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/70">
        {targetDescriptions[target].demoLabel}
      </div>
    </div>
  );
}

function RecognizingView({ applianceLabel }: { applianceLabel: string }) {
  const steps = [
    "\uC678\uAD00 \uC0C1\uD0DC \uBD84\uC11D",
    "\uBE0C\uB79C\uB4DC\uC640 \uBAA8\uB378\uBA85 \uCD94\uC815",
    "\uC608\uC0C1 \uC5F0\uC2DD \uBC0F \uC0C1\uD0DC \uBD84\uB958",
  ];

  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white">
      <div className="flex items-start justify-between gap-4 px-5 pt-16">
        <div>
          <h2 className="mt-1 text-xl font-bold">{"VLM + OpenAI \uBD84\uC11D \uC911"}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
          {applianceLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-5 pb-8">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-16 w-16 animate-scanPulse rounded-full bg-lgred/35" />
          <span className="absolute h-16 w-16 animate-scanPulse rounded-full bg-lgred/35 [animation-delay:0.67s]" />
          <span className="absolute h-16 w-16 animate-scanPulse rounded-full bg-lgred/35 [animation-delay:1.33s]" />
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-lgred">
            <ScanLine size={28} />
          </span>
        </div>

        <ul className="w-full space-y-3">
          {steps.map((label, index) => (
            <li
              key={label}
              className="flex animate-fadeSlideIn items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 opacity-0"
              style={{ animationDelay: `${0.15 + index * 0.28}s` }}
            >
              <CheckCircle2 size={18} className="shrink-0 text-lgred" />
              <span className="text-sm font-semibold">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
function ReviewView({
  applianceLabel,
  exteriorPhotoFileName,
  labelPhotoFileName,
  exteriorPreviewUrl,
  labelPreviewUrl,
  selectedApplianceId,
  recognizedInfo,
  onChange,
  onRetake,
  onHome,
  onAnalyze,
}: {
  applianceLabel: string;
  exteriorPhotoFileName: string;
  labelPhotoFileName: string;
  exteriorPreviewUrl: string;
  labelPreviewUrl: string;
  selectedApplianceId: ApplianceId;
  recognizedInfo: RecognizedAppliance;
  onChange: (value: RecognizedAppliance) => void;
  onRetake: () => void;
  onHome?: () => void;
  onAnalyze: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [modelSpecValidation, setModelSpecValidation] = useState<ModelSpecValidation>({ status: "idle" });
  const previewUrl = exteriorPreviewUrl || labelPreviewUrl;
  const fileName = exteriorPhotoFileName || labelPhotoFileName;
  const modelForValidation = knownText(recognizedInfo.modelName);

  useEffect(() => {
    let live = true;

    if (!modelForValidation) {
      setModelSpecValidation({ status: "idle" });
      return () => {
        live = false;
      };
    }

    setModelSpecValidation({ status: "checking" });

    const timer = window.setTimeout(() => {
      callLookupSpecsApi(modelForValidation)
        .then((spec) => {
          if (!live) return;

          const specType = knownText(spec.applianceType);
          if (!specType) {
            setModelSpecValidation({ status: "not_found" });
            return;
          }

          const matchesSelectedType = normalizeApplianceId(specType) === selectedApplianceId;
          setModelSpecValidation(matchesSelectedType ? { status: "matched", spec } : { status: "mismatched", spec });
        })
        .catch(() => {
          if (live) setModelSpecValidation({ status: "not_found" });
        });
    }, 350);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [modelForValidation, selectedApplianceId]);

  useEffect(() => {
    if (modelSpecValidation.status !== "matched") return;

    const spec = modelSpecValidation.spec;
    const nextBrand = knownText(recognizedInfo.brand) || knownText(spec.brand);
    const nextModelName = knownText(spec.modelName) || recognizedInfo.modelName;
    const nextApplianceType = applianceLabel;
    const nextWeightKg = spec.weight_kg ?? recognizedInfo.weightKg;

    if (
      nextApplianceType !== recognizedInfo.applianceType ||
      nextBrand !== recognizedInfo.brand ||
      nextModelName !== recognizedInfo.modelName ||
      nextWeightKg !== recognizedInfo.weightKg
    ) {
      onChange({
        ...recognizedInfo,
        applianceType: nextApplianceType,
        brand: nextBrand || recognizedInfo.brand,
        modelName: nextModelName,
        capacity: spec.capacity || recognizedInfo.capacity,
        size: spec.size || recognizedInfo.size,
        estimatedAge: spec.releaseYear ? releaseYearToAge(spec.releaseYear) : recognizedInfo.estimatedAge,
        weightKg: nextWeightKg,
      });
    }
  }, [applianceLabel, modelSpecValidation, onChange, recognizedInfo]);

  const credit = calculateFinalCredit(
    recognizedInfo.applianceType,
    recognizedInfo.size,
    DUMMY_NEW_PRODUCT.price,
    DUMMY_SWAP_COUNT,
    recognizedInfo.modelName || undefined,
    recognizedInfo.weightKg,
  );
  const ready = Boolean(exteriorPhotoFileName && labelPhotoFileName);
  const matchedSpec = modelSpecValidation.status === "matched" ? modelSpecValidation.spec : null;
  const effectiveBrand = knownText(recognizedInfo.brand) || knownText(matchedSpec?.brand);
  const effectiveModelName = knownText(recognizedInfo.modelName) || knownText(matchedSpec?.modelName);
  const hasUnknownRequiredInfo = !effectiveBrand || !effectiveModelName;
  const recognizedApplianceType = knownText(recognizedInfo.applianceType);
  const hasApplianceTypeMismatch =
    modelSpecValidation.status !== "matched" &&
    Boolean(recognizedApplianceType) &&
    normalizeApplianceId(recognizedApplianceType) !== selectedApplianceId;
  const hasModelSpecMismatch = modelSpecValidation.status === "mismatched";
  const hasBrandSpecMismatch =
    modelSpecValidation.status === "matched" &&
    Boolean(knownText(recognizedInfo.brand)) &&
    Boolean(knownText(modelSpecValidation.spec.brand)) &&
    normalizeSpecText(recognizedInfo.brand) !== normalizeSpecText(modelSpecValidation.spec.brand);
  const modelSpecTypeLabel =
    modelSpecValidation.status === "mismatched"
      ? applianceLabelById(normalizeApplianceId(modelSpecValidation.spec.applianceType ?? ""))
      : "";
  const modelSpecIsUnavailable = modelSpecValidation.status === "checking" || modelSpecValidation.status === "not_found";
  const shouldBlockAnalyze =
    hasUnknownRequiredInfo ||
    hasApplianceTypeMismatch ||
    hasModelSpecMismatch ||
    hasBrandSpecMismatch ||
    modelSpecIsUnavailable;

  return (
    <section className="phone-scroll flex h-full min-h-0 flex-col overflow-y-auto bg-white px-5 pb-0 pt-16 shadow-sm">
      {showModal && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setShowModal(false)}>
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
            onClick={() => setShowModal(false)}
            type="button"
          >
            <X size={20} />
          </button>
          <img src={previewUrl} alt="captured appliance preview" className="max-h-screen max-w-full object-contain p-4" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mt-1 text-xl font-bold text-ink">{"AI\uAC00 \uBD84\uC11D\uD55C \uACB0\uACFC\uC608\uC694"}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onHome ? (
            <button
              aria-label="홈으로 이동"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white text-lgred shadow-sm"
              onClick={onHome}
              type="button"
            >
              <Home size={16} />
            </button>
          ) : null}
          <span className="rounded-full bg-lgred/10 px-3 py-1 text-xs font-bold text-lgred">
            {applianceLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-ink">{"\uCD2C\uC601\uD55C \uC81C\uD488 \uC774\uBBF8\uC9C0"}</p>
        <span className="text-[11px] font-bold text-slate-500">{"\uD074\uB9AD\uD558\uBA74 \uD06C\uAC8C \uBCFC \uC218 \uC788\uC5B4\uC694"}</span>
      </div>

      <div
        className="mt-2 w-full cursor-pointer overflow-hidden rounded-3xl bg-[#111318] shadow-sm"
        style={{ minHeight: 180 }}
        onClick={() => previewUrl && setShowModal(true)}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="captured appliance" style={{ display: "block", width: "100%", height: "auto" }} />
        ) : (
          <div className="flex h-56 flex-col items-center justify-center text-white/70">
            <Camera size={34} />
            <p className="mt-3 max-w-[230px] truncate text-xs font-bold">{fileName}</p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-3xl bg-lgred/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lgred text-white">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{"\uC815\uBCF4 \uD655\uC778 \uD6C4 \uAC10\uC815\uC744 \uC9C4\uD589\uD574\uC694"}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {"AI 분석 결과예요. 틀린 내용은 수정할 수 있어요."}
            </p>
          </div>
        </div>
      </div>

      {modelSpecValidation.status === "checking" ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-black text-slate-700">모델 정보를 확인하는 중이에요.</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            입력한 모델명이 제품 DB와 일치하는지 확인하고 있어요.
          </p>
        </div>
      ) : hasModelSpecMismatch ? (
        <div className="mt-3 rounded-2xl border border-lgred/20 bg-lgred/5 px-4 py-3">
          <p className="text-sm font-black text-lgred">
            DB 기준 {modelSpecTypeLabel} 제품이에요.
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            선택한 {applianceLabel}와 일치해야 감정할 수 있어요.
          </p>
        </div>
      ) : hasBrandSpecMismatch ? (
        <div className="mt-3 rounded-2xl border border-lgred/20 bg-lgred/5 px-4 py-3">
          <p className="text-sm font-black text-lgred">입력한 브랜드가 DB의 모델 정보와 달라요.</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            DB 기준 브랜드는 {modelSpecValidation.spec.brand}입니다. 브랜드와 모델명을 다시 확인해 주세요.
          </p>
        </div>
      ) : modelSpecValidation.status === "not_found" && modelForValidation ? (
        <div className="mt-3 rounded-2xl border border-lgred/20 bg-lgred/5 px-4 py-3">
          <p className="text-sm font-black text-lgred">입력한 모델을 제품 DB에서 찾지 못했어요.</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            모델명을 다시 확인하거나 라벨이 잘 보이도록 다시 촬영해 주세요.
          </p>
        </div>
      ) : hasApplianceTypeMismatch ? (
        <div className="mt-3 rounded-2xl border border-lgred/20 bg-lgred/5 px-4 py-3">
          <p className="text-sm font-black text-lgred">
            촬영한 제품이 {applianceLabel}가 아닌 것 같아요.
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            처음 선택한 가전 종류와 사진에서 인식된 제품이 달라요. 제품을 다시 확인한 뒤 촬영해 주세요.
          </p>
        </div>
      ) : hasUnknownRequiredInfo ? (
        <div className="mt-3 rounded-2xl border border-lgred/20 bg-lgred/5 px-4 py-3">
          <p className="text-sm font-black text-lgred">브랜드와 모델명을 확인하지 못했어요.</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            라벨의 모델명이 잘 보이도록 다시 촬영해 주세요.
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <InfoInput label={"\uAC00\uC804 \uC885\uB958"} value={recognizedInfo.applianceType} readOnly onChange={(value) => onChange({ ...recognizedInfo, applianceType: value })} />
        <InfoInput label={"\uBE0C\uB79C\uB4DC"} value={recognizedInfo.brand} onChange={(value) => onChange({ ...recognizedInfo, brand: value })} />
        <InfoInput label={"\uBAA8\uB378\uBA85"} value={recognizedInfo.modelName} onChange={(value) => onChange({ ...recognizedInfo, modelName: value })} />
        <InfoInput label={"\uC608\uC0C1 \uC5F0\uC2DD"} value={recognizedInfo.estimatedAge} readOnly onChange={(value) => onChange({ ...recognizedInfo, estimatedAge: value })} />
        <InfoInput label={"\uC678\uAD00 \uC0C1\uD0DC"} value={recognizedInfo.exteriorCondition} readOnly onChange={(value) => onChange({ ...recognizedInfo, exteriorCondition: value })} />
      </div>

      {credit !== null && (
        <div className="mt-4 overflow-hidden rounded-3xl bg-lgred">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold text-white/65">{"\uC608\uC0C1 \uD06C\uB808\uB527"}</p>
              <p className="mt-0.5 text-3xl font-bold text-white">
                {credit.total.toLocaleString("ko-KR")}
                <span className="ml-1 text-lg font-bold text-white/80">{"\uC6D0"}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white/60">{recognizedInfo.size} {recognizedInfo.applianceType}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/45">{DUMMY_SWAP_COUNT}{"\uD68C \uAD50\uD658 \uAE30\uC900"}</p>
            </div>
          </div>
        </div>
      )}

      <div className={`sticky bottom-0 -mx-5 mt-5 grid gap-2 bg-white/95 px-5 pb-5 pt-3 shadow-[0_-14px_28px_rgba(255,255,255,.92)] ${shouldBlockAnalyze ? "grid-cols-1" : "grid-cols-2"}`}>
        <button className="h-12 rounded-xl border border-lgred/20 bg-white text-sm font-bold text-lgred" onClick={onRetake} type="button">
          {"\uB2E4\uC2DC \uCD2C\uC601"}
        </button>
        {!shouldBlockAnalyze ? (
          <button
            className="h-12 rounded-xl bg-lgred px-2 text-[13px] font-bold text-white disabled:bg-slate-300"
            disabled={!ready}
            onClick={onAnalyze}
            type="button"
          >
            {"\uC815\uBCF4 \uD655\uC778 \uD6C4 \uAC10\uC815\uD558\uAE30"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function InfoInput({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        className={`mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-ink outline-none ${readOnly ? "bg-slate-50" : "bg-white focus:border-lgred"}`}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AnalyzingView({ applianceLabel }: { applianceLabel: string }) {
  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 pt-16">
        <div>
          <h2 className="mt-1 text-xl font-bold">{"\uAC10\uC815\uC744 \uC9C4\uD589\uD558\uACE0 \uC788\uC5B4\uC694"}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
          {applianceLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-6">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-16 w-16 animate-scanPulse rounded-full bg-lgred/35" />
          <span className="absolute h-16 w-16 animate-scanPulse rounded-full bg-lgred/35 [animation-delay:0.67s]" />
          <span className="absolute h-16 w-16 animate-scanPulse rounded-full bg-lgred/35 [animation-delay:1.33s]" />
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-lgred">
            <Loader2 className="animate-spin" size={26} />
          </span>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{"\uC0AC\uC9C4\uACFC \uB77C\uBCA8 \uC815\uBCF4\uB97C \uBC18\uC601\uD558\uACE0 \uC788\uC5B4\uC694"}</p>
          <p className="mt-2 text-sm font-semibold text-white/60">
            {"\uC608\uC0C1 \uD06C\uB808\uB527\uACFC \uC678\uAD00 \uC0C1\uD0DC\uB97C \uACC4\uC0B0\uD558\uB294 \uC911\uC785\uB2C8\uB2E4."}
          </p>
        </div>
      </div>
    </section>
  );
}
