export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-semibold tracking-widest text-orange-700">
        KMUTT STUDENT DENSITY MAP
      </p>
      <h1 className="text-4xl font-bold sm:text-5xl">TeeWangMai? ที่ว่างไหม?</h1>
      <p className="text-lg leading-8 text-slate-600">
        ดูความหนาแน่นของนักศึกษาตามสถานที่ต่าง ๆ
        ในมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
        จากข้อมูลที่ผู้ใช้ร่วมกันรายงาน
      </p>
      <section
        aria-labelledby="project-status"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 id="project-status" className="text-xl font-semibold">
          อยู่ระหว่างพัฒนา
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          เตรียมพบกับแผนที่จำลองของมหาวิทยาลัยและระบบรายงานความหนาแน่น
          ขณะนี้ยังไม่มีข้อมูลสถานที่หรือรายงานจากผู้ใช้
        </p>
      </section>
    </main>
  );
}
