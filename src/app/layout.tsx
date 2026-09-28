import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeeWangMai? — KMUTT Student Density Map",
  description:
    "ดูความหนาแน่นของนักศึกษาตามสถานที่ต่าง ๆ ใน มจธ. บนแผนที่จำลอง จากข้อมูลที่ผู้ใช้ร่วมกันรายงาน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
