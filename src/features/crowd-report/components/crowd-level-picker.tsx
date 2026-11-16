"use client";

import { useId, type Ref } from "react";
import { crowdLevels } from "../crowd-report";
import type { CrowdLevel } from "../types";

export interface CrowdLevelPickerProps {
  value: CrowdLevel | null;
  onChange: (level: CrowdLevel) => void;
  disabled?: boolean;
  invalid?: boolean;
  errorId?: string;
  focusRef?: Ref<HTMLInputElement>;
}

export function CrowdLevelPicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
  errorId,
  focusRef,
}: CrowdLevelPickerProps) {
  const name = useId();
  const legendId = useId();

  return (
    <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0">
      <legend
        id={legendId}
        className="mb-2.5 w-full text-center text-[13px] leading-5 text-black"
      >
        กรุณาเลือกความหนาแน่น
      </legend>
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className="grid grid-cols-5 gap-2 min-[400px]:gap-3"
      >
        {crowdLevels.map((option, index) => {
          const selected = value === option.value;
          const focusTarget = value === null ? index === 0 : selected;

          return (
            <div
              key={option.value}
              className="flex min-w-0 flex-col items-center gap-1"
            >
              <label
                data-selected={selected || undefined}
                className={`relative flex h-14 w-full cursor-pointer touch-manipulation items-center justify-center rounded-lg border border-[#1e1e1e] text-lg font-medium text-[#141414] transition-[transform,box-shadow] duration-150 [-webkit-tap-highlight-color:transparent] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[#081828] has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60 data-selected:scale-105 data-selected:border-[3px] data-selected:border-[#ff6200] data-selected:font-bold data-selected:shadow-[0_4px_10px_rgb(255_98_0/35%)] ${option.colorClass}`}
              >
                <input
                  ref={focusTarget ? focusRef : undefined}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={selected}
                  onChange={() => onChange(option.value)}
                  aria-label={`ระดับ ${option.value} ${option.label}`}
                  className="sr-only"
                />
                <span aria-hidden="true">{option.value}</span>
              </label>
              <span
                aria-hidden="true"
                className="min-h-4 text-center text-xs leading-4 whitespace-nowrap text-[#194569]"
              >
                {option.caption ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
