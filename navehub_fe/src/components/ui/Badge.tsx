import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "pending" | "success" | "neutral" | "danger" | "accent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  pending: "bg-pending-soft text-pending",
  success: "bg-success-soft text-success",
  neutral: "bg-line/60 text-muted",
  danger: "bg-danger-soft text-danger",
  accent: "bg-nave-yellow-soft text-nave-yellow-strong",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}
