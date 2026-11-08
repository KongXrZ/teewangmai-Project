import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Thai } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-noto-sans-thai",
});

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
    <html lang="th" className={notoSansThai.variable}>
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
