"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({ email: z.string().email("Enter a valid email address") });

type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage(): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values): Promise<void> {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
    } catch {
      toast.error("Connection lost. Please check your internet connection.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <MailCheck className="h-10 w-10 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            If an account exists for that address, we sent a password reset link.
          </p>
          <Button variant="outline" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a reset link</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-error" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Send reset link
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
