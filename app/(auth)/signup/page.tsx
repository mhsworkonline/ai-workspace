"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const signupSchema = z.object({
  fullName: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage(): JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupValues): Promise<void> {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        router.push("/welcome");
        router.refresh();
      } else {
        setEmailSent(true);
      }
    } catch {
      toast.error("Connection lost. Please check your internet connection.");
    } finally {
      setSubmitting(false);
    }
  }

  if (emailSent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <MailCheck className="h-10 w-10 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent you a verification link. Click it to activate your account and start building.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start automating your work with AI workflows</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" placeholder="Jane Doe" {...register("fullName")} />
            {errors.fullName ? (
              <p className="text-xs text-error" role="alert">
                {errors.fullName.message}
              </p>
            ) : null}
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-error" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Create account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
