"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type StepKey = "project" | "meta" | "crm" | "lead";

type StepperProps = {
  /** Qadamlar tartibi (stepper yorlig'i uchun kalit). */
  steps: StepKey[];
  /** Joriy ko'rsatilayotgan qadam (0..steps.length). */
  activeStep: number;
  /** Har qadamning bajarilgan holati (server-derived). */
  doneFlags: boolean[];
  /** Qadamga bosilganda (faqat bajarilgan yoki o'tilgan qadamlar bosiladi). */
  onStepClick?: (index: number) => void;
};

/**
 * Onboarding sehrgari sarlavhasi: 1 Loyiha · 2 Meta · 3 CRM · 4 Lead transfer.
 * Har qadam done / current / upcoming holatini ko'rsatadi; joriy qadamda
 * aria-current="step". Faqat rangga tayanmaslik uchun done — ✓ ikonka bilan.
 */
export function Stepper({
  steps,
  activeStep,
  doneFlags,
  onStepClick,
}: StepperProps) {
  const t = useTranslations("onboarding");

  return (
    <nav aria-label={t("stepper.listLabel")}>
      <ol className="flex items-start">
        {steps.map((key, index) => {
          const isDone = doneFlags[index] ?? false;
          const isCurrent = index === activeStep;
          const isUpcoming = !isDone && !isCurrent;
          // O'tilgan yoki bajarilgan qadamlarga qaytish mumkin.
          const navigable =
            Boolean(onStepClick) && (isDone || index <= activeStep);
          const stateLabel = isDone
            ? t("stepper.done")
            : isCurrent
              ? t("stepper.current")
              : t("stepper.upcoming");

          const circle = (
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors",
                isCurrent &&
                  "border-primary bg-primary text-primary-foreground",
                isDone && !isCurrent &&
                  "border-scale bg-scale text-scale-foreground",
                isUpcoming && "border-border bg-muted text-muted-foreground",
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
          );

          const labelBlock = (
            <span className="flex flex-col">
              <span
                className={cn(
                  "text-xs font-medium sm:text-sm",
                  isCurrent
                    ? "text-foreground"
                    : isDone
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {t(`stepper.${key}`)}
              </span>
              <span className="sr-only">{stateLabel}</span>
            </span>
          );

          return (
            <li
              key={key}
              className="flex flex-1 items-center last:flex-none"
              aria-current={isCurrent ? "step" : undefined}
            >
              {navigable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  className="flex flex-col items-center gap-1.5 rounded-md p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:gap-2 sm:text-left"
                >
                  {circle}
                  {labelBlock}
                </button>
              ) : (
                <span className="flex flex-col items-center gap-1.5 p-1 text-center sm:flex-row sm:gap-2 sm:text-left">
                  {circle}
                  {labelBlock}
                </span>
              )}

              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-2 h-px flex-1 sm:mx-3",
                    doneFlags[index] ? "bg-scale" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
