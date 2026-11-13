"use client";

import type { BadgeFilter } from "../types";
import { badgeFilters } from "../view-model";

export interface BadgeFilterTabsProps {
  value: BadgeFilter;
  onChange: (filter: BadgeFilter) => void;
}

export function BadgeFilterTabs({ value, onChange }: BadgeFilterTabsProps) {
  return (
    <div
      role="group"
      aria-label="กรองเหรียญ"
      className="grid grid-cols-3 gap-1 rounded-xl bg-[#f0f1f3] p-1"
    >
      {badgeFilters.map((filter) => {
        const active = filter.id === value;
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter.id)}
            className={`h-11 min-w-0 cursor-pointer touch-manipulation truncate rounded-lg border-0 px-2 text-[13px] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#e0622a] ${
              active
                ? "bg-white font-semibold text-[#e0622a] shadow-[0_1px_2px_rgb(0_0_0/8%)]"
                : "bg-transparent text-[#6b7280] hover:text-[#141414]"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
