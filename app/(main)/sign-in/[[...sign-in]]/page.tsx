import { Suspense } from "react";
import { PhoneOtpSignIn } from "@/components/auth/PhoneOtpSignIn";

export default function SignInPage() {
  return (
    <div className="container flex items-center justify-center py-16">
      <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
        <PhoneOtpSignIn />
      </Suspense>
    </div>
  );
}
