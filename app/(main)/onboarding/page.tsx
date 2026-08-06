import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/forms/OnboardingForm";
import { getSessionUser } from "@/lib/api/session";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.onboardingComplete) redirect("/");

  return (
    <div className="container max-w-md py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to GreenKey Realty</h1>
        <p className="text-muted-foreground">
          Let&apos;s set up your profile to get started.
        </p>
      </div>

      <OnboardingForm
        defaultName={user.name || ""}
        defaultEmail={user.email || ""}
        defaultPhone={user.phone || ""}
        phoneVerified={Boolean(user.phoneVerifiedAt && user.phone)}
        emailVerified={Boolean(user.emailVerifiedAt && user.email)}
      />
    </div>
  );
}
