import { runRecommendationsCompute } from "../../lib/recommendations/compute";

type ComputePayload = { projectId: string };

/** pg-boss handler (v10: massiv yoki yakka job). */
export async function recommendationsComputeHandler(job: unknown) {
  const data = (
    Array.isArray(job)
      ? (job[0] as { data?: ComputePayload })?.data
      : (job as { data?: ComputePayload })?.data
  ) as ComputePayload | undefined;
  if (!data?.projectId) return { skipped: true as const };
  return runRecommendationsCompute(data.projectId);
}
