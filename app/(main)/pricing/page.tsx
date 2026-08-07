import { Check, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AgentCheckout } from "@/components/billing/AgentCheckout";
import { Button } from "@/components/ui/button";

const AGENT_FEATURES = [
  "Upload unlimited property listings with photos",
  "Pin exact map locations for every home",
  "Receive and manage renter inquiries",
  "Track listing status (active, pending, rented)",
  "Professional agent profile for clients",
  "Dashboard analytics on listings and leads",
];

export default function PricingPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"
            alt="Agent reviewing property documents"
            fill
            priority
            className="object-cover opacity-20"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background"
            aria-hidden="true"
          />
        </div>

        <div className="container relative py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-secondary-foreground bg-secondary/30 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Upload className="h-4 w-4" aria-hidden="true" />
              For agents & landlords
            </p>
            <h1 className="text-4xl md:text-5xl font-heading font-semibold mb-4">
              List homes where renters are already searching
            </h1>
            <p className="text-lg text-muted-foreground text-pretty mb-8">
              Publish listings with photos, amenities, and map pins — then
              respond to leads from people ready to view or rent. Pay with
              M-Pesa or bank transfer.
            </p>
            <Button asChild size="lg">
              <Link href="#subscribe">See plans</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-6">
              Everything you need to market a home
            </h2>
            <ul className="space-y-4">
              {AGENT_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check
                    className="h-5 w-5 text-primary shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <section
            id="subscribe"
            className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-warm-md"
            aria-label="Subscribe"
          >
            <h2 className="text-xl font-heading font-semibold mb-2 text-center">
              Agent plan
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Unlock listing uploads and your agent dashboard via M-Pesa.
            </p>
            <AgentCheckout />
          </section>
        </div>
      </section>
    </main>
  );
}
