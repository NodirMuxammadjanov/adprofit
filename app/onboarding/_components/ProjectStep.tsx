"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProject } from "@/lib/projects/hooks";

type ProjectStepProps = {
  /** Loyiha muvaffaqiyatli yaratilgach chaqiriladi (sehrgar keyingi qadamga o'tadi). */
  onCreated: () => void;
};

/**
 * Onboarding 1-qadam: mijoz loyihasini yaratish.
 * CreateProjectDialog'ning form/logikasini qayta ishlatadi (useCreateProject),
 * lekin modal emas — sehrgar ichida to'liq enli inline forma.
 */
export function ProjectStep({ onCreated }: ProjectStepProps) {
  const t = useTranslations("onboarding");
  const tp = useTranslations("projects");
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(tp("create.nameRequired"));
      return;
    }
    setError(null);
    createProject.mutate(
      { name: trimmed, currency },
      { onSuccess: () => onCreated() },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onboarding-project-name">
          {tp("create.nameLabel")}
        </Label>
        <Input
          id="onboarding-project-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError(null);
          }}
          placeholder={tp("create.namePlaceholder")}
          disabled={createProject.isPending}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-project-currency">
          {tp("create.currencyLabel")}
        </Label>
        <Select
          value={currency}
          onValueChange={setCurrency}
          disabled={createProject.isPending}
        >
          <SelectTrigger id="onboarding-project-currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="UZS">UZS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={createProject.isPending} className="w-full sm:w-auto">
        {createProject.isPending
          ? t("loadingProject")
          : t("steps.project.submit")}
      </Button>
    </form>
  );
}
