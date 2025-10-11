"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SliderProps
  extends React.ComponentProps<typeof SliderPrimitive.Root> {
  showMoodDots?: boolean;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  showMoodDots = false,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  const currentValue = _values[0] || min;

  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        className={cn(
          "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "bg-muted relative grow overflow-hidden rounded-full border border-black/40 data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          )}
        >
          <SliderPrimitive.Range
            data-slot="slider-range"
            className={cn(
              "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            )}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="border-primary bg-background ring-ring/50 block size-5 shrink-0 rounded-full border-2 shadow-md transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing relative z-10"
          />
        ))}
      </SliderPrimitive.Root>

      {/* Mood dots overlay */}
      {showMoodDots && (
        <div className="absolute inset-0 flex items-center pointer-events-none z-0">
          {Array.from({ length: max - min + 1 }, (_, index) => {
            const dotValue = min + index;
            const isActive = dotValue <= currentValue;
            const position = (index / (max - min)) * 100;
            const isUnderThumb = Math.abs(dotValue - currentValue) < 0.1; // Hide dot when thumb is directly on it

            return (
              <div
                key={dotValue}
                className={cn(
                  "absolute w-3.5 h-3.5 rounded-full border border-black/60 transition-all duration-200",
                  isActive
                    ? "bg-primary border-primary"
                    : "bg-background border-black/60",
                  isUnderThumb ? "opacity-0" : "opacity-100",
                )}
                style={{ left: `${position}%`, transform: "translateX(-50%)" }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export { Slider };
