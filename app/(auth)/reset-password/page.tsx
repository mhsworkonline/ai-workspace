"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage(): JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values): Promise<void> {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated");
      router.push("/dashboard");
    } catch {
      toast.error("Connection lost. Please check your internet connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>Choose a strong password for your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <p className="text-xs text-error" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
            {errors.confirm ? (
              <p className="text-xs text-error" role="alert">
                {errors.confirm.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
