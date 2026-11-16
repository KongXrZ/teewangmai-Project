export type QrDecoder = (video: HTMLVideoElement) => Promise<string | null>;

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

type FrameDecoder = (video: HTMLVideoElement) => Promise<string | null>;

const MAX_DECODE_SIDE = 720;
const QR_FORMATS = new Set(["qr_code", "unknown"]);

async function createNativeDecoder(): Promise<FrameDecoder | null> {
  const Detector = (
    globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (!Detector) return null;

  try {
    const formats = (await Detector.getSupportedFormats?.()) ?? [];
    if (!formats.includes("qr_code")) return null;
    const detector = new Detector();

    return async (video) => {
      try {
        const barcodes = await detector.detect(video);
        return (
          barcodes.find(
            (barcode) => QR_FORMATS.has(barcode.format) && barcode.rawValue,
          )?.rawValue ?? null
        );
      } catch {
        return null;
      }
    };
  } catch {
    return null;
  }
}

async function createCanvasDecoder(): Promise<FrameDecoder> {
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  return async (video) => {
    const { videoWidth, videoHeight } = video;
    if (!context || videoWidth === 0 || videoHeight === 0) return null;

    const scale = Math.min(
      1,
      MAX_DECODE_SIDE / Math.max(videoWidth, videoHeight),
    );
    const width = Math.round(videoWidth * scale);
    const height = Math.round(videoHeight * scale);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    context.drawImage(video, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const result = jsQR(image.data, width, height, {
      inversionAttempts: "dontInvert",
    });
    return result?.data || null;
  };
}

export async function createQrDecoder(): Promise<QrDecoder> {
  const [native, canvas] = await Promise.all([
    createNativeDecoder(),
    createCanvasDecoder(),
  ]);

  return async (video) => (await native?.(video)) ?? canvas(video);
}
