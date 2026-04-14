import { requireUserId } from "@/lib/auth";
import { getTopics } from "@/lib/topics";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  await requireUserId();
  const topics = await getTopics();
  return <OnboardingForm topics={topics} />;
}
