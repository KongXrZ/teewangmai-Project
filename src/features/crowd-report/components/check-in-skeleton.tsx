import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { SkeletonBlock } from "@/features/profile/components/profile-ui";

export function CheckInSkeleton() {
  return (
    <>
      <main
        aria-busy="true"
        className="flex min-w-0 flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-black min-[400px]:px-[22px]"
      >
        <span role="status" className="sr-only">
          กำลังตรวจสอบการเข้าสู่ระบบ
        </span>
        <header className="flex gap-1.5 pl-1.5">
          <span
            aria-hidden="true"
            className="mt-1.5 h-[55px] w-2 shrink-0 rounded-full bg-[#ff5815]"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(2rem,8vw,2.375rem)] leading-[1.2] font-bold">
              เช็คอิน
            </h1>
            <SkeletonBlock className="!bg-[#e2e4e8] mt-1 h-5 w-3/4 rounded-md" />
          </div>
        </header>
        <div className="mt-3 px-1.5">
          <SkeletonBlock className="!bg-[#e2e4e8] aspect-[428/300] w-full rounded-[10px]" />
        </div>
        <div className="mt-6 flex flex-col gap-4 px-1.5">
          <div>
            <SkeletonBlock className="!bg-[#e2e4e8] mx-auto mb-2.5 h-5 w-40 rounded-md" />
            <div className="grid grid-cols-5 gap-2 pb-5 min-[400px]:gap-3">
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonBlock
                  key={index}
                  className="!bg-[#e2e4e8] h-14 w-full rounded-lg"
                />
              ))}
            </div>
          </div>
          <SkeletonBlock className="!bg-[#e2e4e8] mx-auto h-[58px] w-full max-w-[358px] rounded-[14px]" />
        </div>
      </main>
      <BottomNavigation selected="scan" />
    </>
  );
}
