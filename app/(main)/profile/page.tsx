import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser, hasActiveAgentPlan } from "@/lib/api/session";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!user.onboardingComplete) redirect("/onboarding");

  const profileUser = {
    _id: user.id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    phoneVerifiedAt: user.phoneVerifiedAt || null,
    emailVerifiedAt: user.emailVerifiedAt || null,
  };

  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm user={profileUser} />
          </CardContent>
        </Card>

        {hasActiveAgentPlan(user) ? (
          <Card>
            <CardHeader>
              <CardTitle>Agent Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Manage your professional agent profile, bio, and license
                information.
              </p>
              <Button asChild>
                <Link href="/dashboard/profile">Manage Agent Profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
