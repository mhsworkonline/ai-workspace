"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, KeyRound, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { api, ApiError } from "@/lib/api/http";
import { AI_PROVIDER_LABELS, AI_PROVIDER_MODELS, AIProviderName } from "@/lib/constants";

interface UserAISettingsResponse {
  useCustomProvider: boolean;
  provider: string;
  model: string | null;
  hasKey: boolean;
}

export default function AISettingsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const tier = session?.workspace?.subscription_tier ?? "free";
  const canUseOwnKey = tier === "pro" || tier === "business";

  const { data: settings } = useQuery({
    queryKey: ["user-ai-settings"],
    queryFn: () => api<UserAISettingsResponse>("/api/user/ai-settings"),
  });

  const [mode, setMode] = useState<"platform" | "custom">("platform");
  const [provider, setProvider] = useState<AIProviderName>(AIProviderName.Groq);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>("default");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setMode(settings.useCustomProvider ? "custom" : "platform");
      if (Object.values(AIProviderName).includes(settings.provider as AIProviderName)) {
        setProvider(settings.provider as AIProviderName);
      }
      setModel(settings.model ?? "default");
    }
  }, [settings]);

  async function testConnection(): Promise<void> {
    if (!apiKey) {
      toast.error("Enter an API key first");
      return;
    }
    setTesting(true);
    try {
      await api<{ ok: boolean }>("/api/ai/test-connection", {
        method: "POST",
        body: JSON.stringify({ provider, apiKey }),
      });
      toast.success("Connection successful");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setTesting(false);
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await api<{ ok: boolean }>("/api/user/ai-settings", {
        method: "POST",
        body: JSON.stringify({
          useCustomProvider: mode === "custom",
          provider,
          apiKey: apiKey || undefined,
          model: model === "default" ? undefined : model,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["user-ai-settings"] });
      setApiKey("");
      toast.success("AI settings saved");
    } catch (error) {
      if (error instanceof ApiError && error.upgrade) {
        setUpgradeOpen(true);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card
        className={mode === "platform" ? "border-primary" : "cursor-pointer"}
        onClick={() => setMode("platform")}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => event.key === "Enter" && setMode("platform")}
        aria-pressed={mode === "platform"}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Use Platform AI
            {mode === "platform" ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
          </CardTitle>
          <CardDescription>
            Free and zero-setup. The platform&apos;s configured provider handles your runs.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card
        className={mode === "custom" ? "border-primary" : canUseOwnKey ? "cursor-pointer" : "opacity-70"}
        onClick={() => (canUseOwnKey ? setMode("custom") : setUpgradeOpen(true))}
        role="button"
        tabIndex={0}
        onKeyDown={(event) =>
          event.key === "Enter" && (canUseOwnKey ? setMode("custom") : setUpgradeOpen(true))
        }
        aria-pressed={mode === "custom"}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden /> Use My Own API Key
            {mode === "custom" ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
          </CardTitle>
          <CardDescription>
            {canUseOwnKey
              ? "Bring your own Groq, Anthropic, OpenAI, or Gemini key. Keys are encrypted at rest."
              : "Available on Pro and Business plans."}
          </CardDescription>
        </CardHeader>
        {mode === "custom" && canUseOwnKey ? (
          <CardContent className="space-y-4" onClick={(event) => event.stopPropagation()}>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) => {
                  setProvider(value as AIProviderName);
                  setModel("default");
                }}
              >
                <SelectTrigger aria-label="AI provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AIProviderName).map((name) => (
                    <SelectItem key={name} value={name}>
                      {AI_PROVIDER_LABELS[name]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-api-key">
                API key {settings?.hasKey ? "(saved — enter to replace)" : ""}
              </Label>
              <Input
                id="user-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={settings?.hasKey ? "••••••••" : "sk-…"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger aria-label="Model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Provider default</SelectItem>
                  {AI_PROVIDER_MODELS[provider].map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => void testConnection()} disabled={testing}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Test connection
            </Button>
          </CardContent>
        ) : null}
      </Card>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        Save AI settings
      </Button>

      <UpgradePrompt
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        message="Using your own API key requires the Pro or Business plan."
      />
    </div>
  );
}
