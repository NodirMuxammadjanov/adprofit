import { JOB, enqueue } from "@/lib/jobs/queue";

/** CRM sync ishini navbatga qo'yish (API yoki cron'dan). */
export async function enqueueCrmSync(projectId: string) {
  return enqueue(JOB.crmSync, { projectId });
}
