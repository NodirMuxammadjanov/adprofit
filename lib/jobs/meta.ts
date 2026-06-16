import { JOB, enqueue } from "@/lib/jobs/queue";

/** Loyiha uchun Meta sync ishini navbatga qo'yadi. */
export async function enqueueMetaSync(projectId: string) {
  return enqueue(JOB.metaSync, { projectId });
}
