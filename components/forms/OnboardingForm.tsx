"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { completeUserOnboarding } from "@/actions/users";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
});

type FormData = z.infer<typeof formSchema>;

interface OnboardingFormProps {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
}

export function OnboardingForm({
  defaultName,
  defaultEmail,
  defaultPhone,
}: OnboardingFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      phone: defaultPhone,
    },
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        await completeUserOnboarding({
          name: data.name,
          phone: data.phone,
          email: data.email,
        });
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to complete onboarding. Please try again.";
        toast.error(message);
        const lower = message.toLowerCase();
        if (lower.includes("phone")) {
          form.setError("phone", { message });
        }
        if (lower.includes("email")) {
          form.setError("email", { message });
        }
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      placeholder="07XX XXX XXX or +254…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LoadingButton
              type="submit"
              className="w-full"
              loading={isPending}
              loadingText="Setting up..."
            >
              Complete Setup
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
