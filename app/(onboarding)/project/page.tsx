"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { createProject } from "@/lib/api/projects";
import { useOnboardingStore } from "@/stores/onboarding.store";

const SUGGESTIONS = ["Marketing", "Startup", "YouTube", "Personal", "Client"] as const;

const schema = z.object({ name: z.string().min(2, "Project name is required") });

type Values = z.infer<typeof schema>;

export default function ProjectStepPage(): JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const setProjectId = useOnboardingStore((state) => state.setProjectId);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values): Promise<void> {
    if (!session?.workspace) {
      toast.error("Create a workspace first");
      router.push("/workspace");
      return;
    }
    setSubmitting(true);
    try {
      const project = await createProject({ workspace: session.workspace, name: values.name });
      setProjectId(project.id);
      router.push("/template");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your first project</CardTitle>
        <CardDescription>Projects keep related workflows organized</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" placeholder="Marketing" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-error" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <Badge
                key={suggestion}
                variant="secondary"
                className="cursor-pointer hover:bg-accent"
                onClick={() => setValue("name", suggestion, { shouldValidate: true })}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setValue("name", suggestion, { shouldValidate: true });
                  }
                }}
              >
                {suggestion}
              </Badge>
            ))}
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
