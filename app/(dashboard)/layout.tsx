import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { getSessionUser } from "@/lib/api/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen bg-accent/20">
      <DashboardSidebar />
      <main id="main" className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
