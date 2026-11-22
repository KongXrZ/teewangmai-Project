import { Suspense } from "react";
import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { HomeMapContainer } from "@/features/home/components/home-map-container";
import { HomePage } from "@/features/home/components/home-page";

export const metadata: Metadata = {
  title: "หน้าหลัก — TeeWangMai?",
  description: "ดูความหนาแน่นของสถานที่ในมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
};

const comment = [
  "<!--",
  "                       _oo0oo_",
  "                      o8888888o",
  '                      88" . "88',
  "                      (| -_- |)",
  "                      0\\  =  /0",
  "                    ___/`---'\\___",
  "                  .' \\\\|     |// '.",
  "                 / \\\\|||  :  |||// \\",
  "                / _||||| -:- |||||- \\",
  "               |   | \\\\\\  -  /// |   |",
  "               | \\_|  ''\\---/''  |_/ |",
  "               \\  .-\\__  '-'  ___/-. /",
  "             ___'. .'  /--.--\\  `. .'___",
  '          ."" \'<  `.___\\_<|>_/___.\' >\' "".',
  "         | | :  `- \\`.;`\\ _ /`;.`/ - ` : | |",
  "         \\  \\ `_.   \\_ __\\ /__ _/   .-` /  /",
  "     =====`-.____`.___ \\_____/___.-`___.-'=====",
  "                       `=---='",
  "\tนะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ",
  "\tนะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ",
  "\tนะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ",
  "",
  "\tขอให้ผลบุญที่ข้าพเจ้าได้สั่งสมดลให้เว็บแอปนี้ไม่มีบั๊กด้วยเถิด",
  "\tขอให้การทำงานผ่านไปอย่างราบรื่นทุกประการ",
  "\tขอให้อาจารย์แก๊สพึงพอใจในงานของข้าพเจ้าด้วยเถิด",
  "\tขอให้ข้าพเจ้าได้ดูAvengerDoomsDayแบบสบายอกสบายใจด้วยเถิด",
  "\t\t    สาธุ สาธุ สาธุ",
  "",
  "KongXrZ",
  "-->",
].join("\n");

export default function Home() {
  return (
    <MobileShell variant="app">
      <div hidden dangerouslySetInnerHTML={{ __html: comment }} />
      <Suspense fallback={<HomePage isLoading />}>
        <HomeMapContainer />
      </Suspense>
    </MobileShell>
  );
}
