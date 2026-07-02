"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { TABLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils/format";
import { useOnboardingStore } from "@/stores/onboarding.store";

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Dubai",
  "Australia/Sydney",
] as const;

const TEAM_SIZES = ["1", "2-5", "6-20", "20+"] as const;

const schema = z.object({
  name: z.string().min(2, "Workspace name is required"),
  timezone: z.string(),
  teamSize: z.string(),
});

type Values = z.infer<typeof schema>;

export default function WorkspaceStepPage(): JSX.Element {
  const router = useRouter();
  const { session, refresh } = useSession();
  const setWorkspaceId = useOnboardingStore((state) => state.setWorkspaceId);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: "Asia/Kolkata", teamSize: "1" },
  });

  async function onSubmit(values: Values): Promise<void> {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      if (session?.workspace) {
        setWorkspaceId(session.workspace.id);
        router.push("/project");
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.WORKSPACES)
        .insert({
          owner_id: user.id,
          name: values.name,
          slug: slugify(values.name),
          timezone: values.timezone,
          team_size: values.teamSize,
        })
        .select()
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Could not create workspace");
        return;
      }
      setWorkspaceId(data.id);
      await refresh();
      router.push("/project");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your workspace</CardTitle>
        <CardDescription>Your team&apos;s home for AI workflows</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" placeholder="Acme Inc" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-error" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Team size</Label>
            <Controller
              control={control}
              name="teamSize"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-4 gap-2"
                >
                  {TEAM_SIZES.map((size) => (
                    <Label
                      key={size}
                      htmlFor={`size-${size}`}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-md border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                    >
                      <RadioGroupItem id={`size-${size}`} value={size} className="sr-only" />
                      {size}
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
