import QRCode from "qrcode";

const QUIET_ZONE = 4;

export interface VoucherQrShape {
  viewBoxSize: number;
  path: string;
}

export function buildVoucherQrShape(code: string): VoucherQrShape {
  const { size, data } = QRCode.create(code, {
    errorCorrectionLevel: "M",
  }).modules;
  const segments: string[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) {
        segments.push(`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`);
      }
    }
  }

  return { viewBoxSize: size + QUIET_ZONE * 2, path: segments.join("") };
}
