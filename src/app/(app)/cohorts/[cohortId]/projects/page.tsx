import { Card } from "@/components/ui";
import { loadCohort } from "../load";

export default async function Projects({ params }: PageProps<"/cohorts/[cohortId]/projects">) {
  await loadCohort(params);
  return (
    <Card title="Capstone project">
      <h2 className="text-2xl font-semibold tracking-tight">Build a production-ready cloud platform</h2>
      <p className="mt-2 max-w-2xl text-muted">
        Teams of three, two weeks, one platform: Terraform, CI/CD, Kubernetes, monitoring and security. Team assignment,
        progress tracking and presentation scheduling land here in Phase 3.
      </p>
    </Card>
  );
}
