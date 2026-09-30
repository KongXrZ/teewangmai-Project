export default function Home() {
  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 break-words sm:max-w-2xl sm:justify-center">
      <p className="text-xs font-semibold tracking-widest text-orange-700 sm:text-sm">
        KMUTT STUDENT DENSITY MAP
      </p>
      <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
        TeeWangMai?
        <span className="mt-2 block text-2xl sm:text-3xl">ที่ว่างไหม?</span>
      </h1>
      <p className="text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
        ดูความหนาแน่นของนักศึกษาตามสถานที่ต่าง ๆ
        ในมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
        จากข้อมูลที่ผู้ใช้ร่วมกันรายงาน
      </p>
      <section
        aria-labelledby="project-status"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 id="project-status" className="text-xl font-semibold">
          อยู่ระหว่างพัฒนา ;-;
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          เตรียมพบกับแผนที่จำลองของมหาวิทยาลัยและระบบรายงานความหนาแน่น
          ขณะนี้ยังไม่มีข้อมูลสถานที่หรือรายงานจากผู้ใช้
        </p>
      </section>
    </main>
  );
}
