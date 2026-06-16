import { JOB, enqueue } from "./queue";

/** recommendations.compute ishini navbatga qo'yadi (sync'dan keyin yoki qo'lda). */
export async function enqueueRecommendationsCompute(projectId: string) {
  return enqueue(JOB.recommendationsCompute, { projectId });
}
