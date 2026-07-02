"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api } from "@/lib/api/http";
import { AI_PROVIDER_LABELS, AI_PROVIDER_MODELS, AIProviderName } from "@/lib/constants";

interface ProviderRow {
  name: AIProviderName;
  maskedKey: string | null;
  keySource: "stored" | "env" | "none";
  defaultModel: string;
}

interface AdminAISettings {
  activeProvider: string;
  fallbackProvider: string;
  providers: ProviderRow[];
}

export default function AdminAISettingsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-ai-settings"],
    queryFn: () => api<AdminAISettings>("/api/admin/settings"),
  });

  const [activeProvider, setActiveProvider] = useState<string>("groq");
  const [fallbackProvider, setFallbackProvider] = useState<string>("");
  const [defaultModels, setDefaultModels] = useState<Record<string, string>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setActiveProvider(settings.activeProvider);
      setFallbackProvider(settings.fallbackProvider);
      setDefaultModels(
        Object.fromEntries(settings.providers.map((row) => [row.name, row.defaultModel]))
      );
    }
  }, [settings]);

  async function testProvider(name: AIProviderName): Promise<void> {
    const key = apiKeys[name];
    if (!key) {
      toast.error("Enter a new API key to test (saved keys are already verified).");
      return;
    }
    setTesting(name);
    try {
      await api<{ ok: boolean }>("/api/ai/test-connection", {
        method: "POST",
        body: JSON.stringify({ provider: name, apiKey: key, model: defaultModels[name] || undefined }),
      });
      setTestResults((previous) => ({ ...previous, [name]: true }));
      toast.success(`${AI_PROVIDER_LABELS[name]} connected`);
    } catch (error) {
      setTestResults((previous) => ({ ...previous, [name]: false }));
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setTesting(null);
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await api<{ ok: boolean }>("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ activeProvider, fallbackProvider, defaultModels, apiKeys }),
      });
      setApiKeys({});
      await queryClient.invalidateQueries({ queryKey: ["admin-ai-settings"] });
      toast.success("AI settings saved — changes take effect immediately");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !settings) {
    return <LoadingSkeleton variant="list" count={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Provider Settings"
        description="The active provider powers every platform-AI run."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active provider</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={activeProvider}
            onValueChange={setActiveProvider}
            className="grid gap-2 sm:grid-cols-2"
          >
            {settings.providers.map((row) => (
              <Label
                key={row.name}
                htmlFor={`active-${row.name}`}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
              >
                <RadioGroupItem id={`active-${row.name}`} value={row.name} />
                <span className="flex-1">{AI_PROVIDER_LABELS[row.name]}</span>
                {row.maskedKey ? (
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    ✅ {row.keySource === "env" ? "env key" : "connected"}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-error/10 text-error">
                    ❌ no key
                  </Badge>
                )}
              </Label>
            ))}
          </RadioGroup>
          <div className="mt-4 max-w-xs space-y-1.5">
            <Label>Fallback provider (if primary fails)</Label>
            <Select
              value={fallbackProvider || "none"}
              onValueChange={(value) => setFallbackProvider(value === "none" ? "" : value)}
            >
              <SelectTrigger aria-label="Fallback provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Object.values(AIProviderName).map((name) => (
                  <SelectItem key={name} value={name}>
                    {AI_PROVIDER_LABELS[name]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {settings.providers.map((row) => (
        <Card key={row.name}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {AI_PROVIDER_LABELS[row.name]}
              {testResults[row.name] === true ? (
                <Check className="h-4 w-4 text-success" aria-label="Connected" />
              ) : testResults[row.name] === false ? (
                <X className="h-4 w-4 text-error" aria-label="Connection failed" />
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`key-${row.name}`}>
                API key {row.maskedKey ? `(current: ${row.maskedKey})` : ""}
              </Label>
              <Input
                id={`key-${row.name}`}
                type="password"
                value={apiKeys[row.name] ?? ""}
                onChange={(event) =>
                  setApiKeys((previous) => ({ ...previous, [row.name]: event.target.value }))
                }
                placeholder={row.maskedKey ? "Enter to replace" : "Paste API key"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default model</Label>
              <Select
                value={defaultModels[row.name] || AI_PROVIDER_MODELS[row.name][0].id}
                onValueChange={(value) =>
                  setDefaultModels((previous) => ({ ...previous, [row.name]: value }))
                }
              >
                <SelectTrigger aria-label={`Default model for ${AI_PROVIDER_LABELS[row.name]}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDER_MODELS[row.name].map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.label} — ${model.costPer1kTokensUsd.toFixed(4)}/1K tokens
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => void testProvider(row.name)}
              disabled={testing === row.name}
            >
              {testing === row.name ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Test connection
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        Save Changes
      </Button>
    </div>
  );
}
