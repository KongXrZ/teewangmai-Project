declare module "qrcode" {
  interface QrCodeModel {
    modules: { size: number; data: Uint8Array };
  }

  const QRCode: {
    create(
      text: string,
      options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" },
    ): QrCodeModel;
  };

  export default QRCode;
}
