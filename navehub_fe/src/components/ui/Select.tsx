import type { ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function Select({ label, id, className, children, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        className={cn(
          "rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm text-ink",
          "focus:border-nave-yellow-strong focus:outline-none focus:ring-2 focus:ring-nave-yellow/40",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
