"use client";

import HomeRounded from "@mui/icons-material/HomeRounded";
import PinDrop from "@mui/icons-material/PinDrop";
import QrCodeScannerRounded from "@mui/icons-material/QrCodeScannerRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import Person from "@mui/icons-material/Person";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navigationItems = [
  { id: "home", label: "หน้าหลัก", icon: HomeRounded, href: "/" },
  { id: "places", label: "สถานที่", icon: PinDrop, href: "/locations" },
  {
    id: "scan",
    label: "สแกน QR Code",
    icon: QrCodeScannerRounded,
    primary: true,
  },
  { id: "rewards", label: "แลกรางวัล", icon: StarRounded, href: "/rewards" },
  { id: "profile", label: "โปรไฟล์", icon: Person },
] as const;

export type NavigationItemId = (typeof navigationItems)[number]["id"];

export interface BottomNavigationProps {
  selected?: NavigationItemId;
  defaultSelected?: NavigationItemId;
  onChange?: (id: NavigationItemId) => void;
}

export function BottomNavigation({
  selected: controlledSelected,
  defaultSelected = "home",
  onChange,
}: BottomNavigationProps) {
  const [internalSelected, setInternalSelected] =
    useState<NavigationItemId>(defaultSelected);
  const selected = controlledSelected ?? internalSelected;
  const router = useRouter();
  const pathname = usePathname();

  function handleSelect(item: (typeof navigationItems)[number]) {
    if (controlledSelected === undefined) {
      setInternalSelected(item.id);
    }
    onChange?.(item.id);
    if ("href" in item && item.href !== pathname) {
      router.push(item.href);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[476px]">
      <nav
        aria-label="เมนูหลัก"
        className="grid h-[calc(5rem+env(safe-area-inset-bottom,0px))] grid-cols-5 rounded-t-[40px] bg-[#ff5815] px-3.5 pb-[env(safe-area-inset-bottom,0px)]"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = selected === item.id;
          const primary = "primary" in item && item.primary;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => handleSelect(item)}
              data-active={active}
              data-primary={primary || undefined}
              className={`group relative flex min-w-0 cursor-pointer touch-manipulation flex-col items-center justify-end rounded border-0 bg-transparent px-0.5 pb-3 transition-colors duration-150 [-webkit-tap-highlight-color:transparent] before:absolute before:top-0 before:left-1/2 before:h-[2.5px] before:w-8 before:-translate-x-1/2 before:bg-[#081828] before:transition-opacity before:duration-150 focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-[#081828] ${
                primary ? "gap-0" : "gap-2.5"
              } ${
                active
                  ? "text-[#081828] before:opacity-100"
                  : "text-white before:opacity-0"
              }`}
            >
              <span
                className={
                  primary
                    ? "absolute -top-8 flex h-[66px] w-[66px] rounded-full bg-[#ff5815] p-1"
                    : "flex h-[33px] w-[33px] items-center justify-center"
                }
              >
                {primary ? (
                  <span
                    className={`flex h-full w-full items-center justify-center rounded-full bg-white shadow-[inset_0_0_4px_1.5px_rgb(8_24_40/42%),inset_0_1.5px_2.5px_rgb(8_24_40/20%)] transition-[color,box-shadow] duration-150 group-active:shadow-[inset_0_2px_6px_2px_rgb(8_24_40/48%)] ${
                      active ? "text-[#081828]" : "text-[#ff5815]"
                    }`}
                  >
                    <Icon aria-hidden="true" sx={{ fontSize: 40 }} />
                  </span>
                ) : (
                  <Icon aria-hidden="true" sx={{ fontSize: 33 }} />
                )}
              </span>
              <span
                className={`max-w-full text-center text-[13px] font-normal whitespace-nowrap ${
                  primary ? "leading-4" : "leading-[17px]"
                }`}
              >
                {item.id === "scan" ? (
                  <>
                    <span className="block">สแกน</span>
                    <span className="block">QR Code</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
