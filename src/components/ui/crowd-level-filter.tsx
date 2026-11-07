"use client";

import { useState, type ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import Diversity3 from "@mui/icons-material/Diversity3";
import PeopleAlt from "@mui/icons-material/PeopleAlt";
import Person from "@mui/icons-material/Person";
import SelectAll from "@mui/icons-material/SelectAll";

export type CrowdLevelFilterValue = "all" | "low" | "medium" | "high";

interface CrowdLevelOption {
  id: CrowdLevelFilterValue;
  label: string;
  icon: ComponentType<SvgIconProps>;
  iconColorClass: string;
  selectedBgClass: string;
}

const crowdLevelOptions: CrowdLevelOption[] = [
  {
    id: "all",
    label: "ทั้งหมด",
    icon: SelectAll,
    iconColorClass: "text-black",
    selectedBgClass: "bg-[#ff6200]",
  },
  {
    id: "low",
    label: "คนน้อย",
    icon: Person,
    iconColorClass: "text-[#0daf2b]",
    selectedBgClass: "bg-[#0daf2b]",
  },
  {
    id: "medium",
    label: "ปานกลาง",
    icon: PeopleAlt,
    iconColorClass: "text-[#dfdf20]",
    selectedBgClass: "bg-[#dfdf20]",
  },
  {
    id: "high",
    label: "คนหนาแน่น",
    icon: Diversity3,
    iconColorClass: "text-[#ff0000]",
    selectedBgClass: "bg-[#ff0000]",
  },
];

export interface CrowdLevelFilterProps {
  selected?: CrowdLevelFilterValue;
  defaultSelected?: CrowdLevelFilterValue;
  onChange?: (id: CrowdLevelFilterValue) => void;
}

export function CrowdLevelFilter({
  selected: controlledSelected,
  defaultSelected = "all",
  onChange,
}: CrowdLevelFilterProps) {
  const [internalSelected, setInternalSelected] =
    useState<CrowdLevelFilterValue>(defaultSelected);
  const selected = controlledSelected ?? internalSelected;

  const handleSelect = (id: CrowdLevelFilterValue) => {
    if (controlledSelected === undefined) {
      setInternalSelected(id);
    }
    onChange?.(id);
  };

  return (
    <div className="@container">
      <section
        aria-label="กรองตามความหนาแน่น"
        className="grid grid-cols-2 gap-1 @min-[19.5rem]:grid-cols-[1fr_1fr_1.12fr_1.35fr]"
      >
        {crowdLevelOptions.map((category) => {
          const Icon = category.icon;
          const isSelected = selected === category.id;

          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isSelected}
              data-category={category.id}
              data-selected={isSelected ? "true" : undefined}
              onClick={() => handleSelect(category.id)}
              className={`flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-0.5 rounded-full border-0 px-1 text-[12.5px] leading-none font-bold whitespace-nowrap shadow-[0_1px_3px_rgb(0_0_0/12%)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6200] ${
                isSelected
                  ? `${category.selectedBgClass} text-white`
                  : "bg-white text-black"
              }`}
            >
              <Icon
                aria-hidden="true"
                sx={{ fontSize: 19 }}
                className={`shrink-0 transition-colors duration-150 ${
                  isSelected ? "text-white" : category.iconColorClass
                }`}
              />
              <span>{category.label}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
