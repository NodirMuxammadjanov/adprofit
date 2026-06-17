"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ConnectionStatus } from "@/lib/meta/connection";
import { MetaConnect } from "@/app/(app)/integrations/_components/MetaConnect";
import { CrmConnect } from "@/app/(app)/integrations/_components/CrmConnect";
import { LeadAdsTransfer } from "@/app/(app)/integrations/_components/LeadAdsTransfer";

import { Stepper, type StepKey } from "./Stepper";
import { ProjectStep } from "./ProjectStep";
import { CompletionStep } from "./CompletionStep";

type BannerKind = "connected" | "error" | null;

export type OnboardingWizardProps = {
  /** Joriy loyiha id (loyiha hali yo'q bo'lsa null — 1-qadam). */
  projectId: string | null;
  /** Resume: ulanish holatidan chiqarilgan birinchi tugallanmagan qadam (0..4). */
  initialStep: number;
  userName: string | null;
  /** Har qadamning bajarilgan holati (server-derived). */
  completion: {
    project: boolean;
    meta: boolean;
    crm: boolean;
    lead: boolean;
  };
  meta: {
    hasConnection: boolean;
    status: ConnectionStatus | null;
    adAccountId: string | null;
    pageId: string | null;
    lastSyncedAt: number | null;
  };
  crm: {
    connected: boolean;
    configured: boolean;
    status: ConnectionStatus | null;
    provider: string | null;
    lastSyncedAt: number | null;
  };
  lead: {
    ready: boolean;
    hasMetaPage: boolean;
    crmConfigured: boolean;
  };
  /** OAuth qaytishidan keyingi banner holati (?meta= / ?crm= query'dan). */
  banner: {
    meta: BannerKind;
    crm: BannerKind;
  };
};

const STEP_KEYS: StepKey[] = ["project", "meta", "crm", "lead"];

export function OnboardingWizard(props: OnboardingWizardProps) {
  const { projectId, initialStep, userName, completion, meta, crm, lead, banner } =
    props;
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(initialStep);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const doneFlags = [
    completion.project,
    completion.meta,
    completion.crm,
    completion.lead,
  ];
  // Loyiha yaratilgach 1-qadamga (forma) qaytish mantiqsiz — minimal qadam 1.
  const minStep = projectId ? 1 : 0;
  const isCompletion = activeStep >= STEP_KEYS.length;
  const isLastConfigStep = activeStep === STEP_KEYS.length - 1;

  // Qadam o'zgarganda fokusni sarlavhaga ko'chiramiz (klaviatura/skrinrider).
  useEffect(() => {
    headingRef.current?.focus();
  }, [activeStep]);

  function goNext() {
    // Oxirgi sozlash qadami (lead) → yakunlash ekrani: server reload SHART EMAS,
    // aks holda hammasi tugagan bo'lsa server /dashboard'ga yo'naltirib yuborib,
    // "Tabriklaymiz" ekrani ko'rinmay qoladi.
    if (isLastConfigStep) {
      setActiveStep(STEP_KEYS.length);
      return;
    }
    // Oraliq qadamlar: stepper ✓ belgilari yangilanishi uchun server holatini tortamiz.
    router.refresh();
    setActiveStep((s) => s + 1);
  }

  function goBack() {
    setActiveStep((s) => Math.max(minStep, s - 1));
  }

  function handleStepClick(index: number) {
    if (index < minStep) return;
    if (doneFlags[index] || index <= activeStep) setActiveStep(index);
  }

  function skipForNow() {
    router.push("/dashboard");
  }

  const showResumeNote = initialStep > minStep && initialStep < STEP_KEYS.length;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        {userName ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("welcome", { name: userName })}
          </p>
        ) : null}
      </header>

      <Stepper
        steps={STEP_KEYS}
        activeStep={activeStep}
        doneFlags={doneFlags}
        onStepClick={handleStepClick}
      />

      {showResumeNote ? (
        <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
          {t("resumeNote")}
        </p>
      ) : null}

      <div className="mt-6 flex-1 space-y-4">
        {!isCompletion ? (
          <div className="space-y-1.5">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold tracking-tight focus-visible:outline-none"
            >
              {t(`steps.${STEP_KEYS[activeStep]}.title`)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(`steps.${STEP_KEYS[activeStep]}.subtitle`)}
            </p>
            <p className="text-sm text-foreground/80">
              {t(`steps.${STEP_KEYS[activeStep]}.motivation`)}
            </p>
          </div>
        ) : null}

        {/* OAuth qaytishidan keyingi banner (xato → bir xil qadamda qoladi, qayta urinish). */}
        {banner.meta === "error" ? (
          <div
            role="alert"
            className="rounded-lg border border-kill/30 bg-kill/10 px-4 py-3 text-sm text-foreground"
          >
            {t("banner.metaError")}
          </div>
        ) : banner.meta === "connected" ? (
          <div className="rounded-lg border border-scale/30 bg-scale/10 px-4 py-3 text-sm text-foreground">
            {t("banner.metaConnected")}
          </div>
        ) : null}
        {banner.crm === "error" ? (
          <div
            role="alert"
            className="rounded-lg border border-kill/30 bg-kill/10 px-4 py-3 text-sm text-foreground"
          >
            {t("banner.crmError")}
          </div>
        ) : banner.crm === "connected" ? (
          <div className="rounded-lg border border-scale/30 bg-scale/10 px-4 py-3 text-sm text-foreground">
            {t("banner.crmConnected")}
          </div>
        ) : null}

        {/* Qadam tanasi */}
        {activeStep === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <ProjectStep
                onCreated={() => {
                  router.refresh();
                  setActiveStep(1);
                }}
              />
            </CardContent>
          </Card>
        ) : !projectId ? (
          // Loyiha refresh bilan tortilguncha qisqa kutish holati.
          <p className="text-sm text-muted-foreground">{t("loadingProject")}</p>
        ) : activeStep === 1 ? (
          <MetaConnect
            projectId={projectId}
            hasConnection={meta.hasConnection}
            status={meta.status}
            adAccountId={meta.adAccountId}
            pageId={meta.pageId}
            lastSyncedAt={meta.lastSyncedAt}
          />
        ) : activeStep === 2 ? (
          <CrmConnect
            projectId={projectId}
            connected={crm.connected}
            configured={crm.configured}
            status={crm.status}
            provider={crm.provider}
            lastSyncedAt={crm.lastSyncedAt}
          />
        ) : activeStep === 3 ? (
          <LeadAdsTransfer
            projectId={projectId}
            ready={lead.ready}
            hasMetaPage={lead.hasMetaPage}
            crmConfigured={lead.crmConfigured}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <CompletionStep projectId={projectId} headingRef={headingRef} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pastki navigatsiya — mobilda yopishqoq (sticky) va doim yetib boriladi. */}
      {!isCompletion && activeStep >= 1 && projectId ? (
        <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button variant="ghost" size="sm" onClick={skipForNow}>
            {t("nav.skip")}
          </Button>
          <div className="flex items-center gap-2">
            {activeStep > minStep ? (
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t("nav.back")}
              </Button>
            ) : null}
            <Button onClick={goNext}>
              {isLastConfigStep ? t("nav.finish") : t("nav.next")}
              {!isLastConfigStep ? (
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              ) : null}
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
