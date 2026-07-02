"use client";

import { Check, KeyRound, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_PROVIDER_LABELS, AIProviderName } from "@/lib/constants";
import { api } from "@/lib/api/http";

export default function ConnectAIStepPage(): JSX.Element {
  const router = useRouter();
  const [mode, setMode] = useState<"platform" | "custom">("platform");
  const [provider, setProvider] = useState<AIProviderName>(AIProviderName.Groq);
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setTested(true);
      toast.success("Connection successful");
    } catch (error) {
      setTested(false);
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setTesting(false);
    }
  }

  async function continueNext(): Promise<void> {
    if (mode === "custom" && apiKey) {
      setSaving(true);
      try {
        await api<{ ok: boolean }>("/api/user/ai-settings", {
          method: "POST",
          body: JSON.stringify({ useCustomProvider: true, provider, apiKey }),
        });
      } catch (error) {
        // Custom keys need Pro — fall back to platform AI without blocking onboarding.
        toast.info(
          error instanceof Error ? error.message : "Using platform AI for now."
        );
      } finally {
        setSaving(false);
      }
    }
    router.push("/first-run");
  }

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Connect your AI</h1>
        <p className="text-muted-foreground">Choose how your workflows will think.</p>
      </div>
      <div className="grid gap-3 text-left sm:grid-cols-2">
        <Card
          className={mode === "platform" ? "border-primary" : "cursor-pointer"}
          onClick={() => setMode("platform")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setMode("platform")}
          aria-pressed={mode === "platform"}
        >
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              <span className="font-medium">Use AI Workspace AI</span>
              {mode === "platform" ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended. Free, no setup needed — powered by Groq.
            </p>
          </CardContent>
        </Card>
        <Card
          className={mode === "custom" ? "border-primary" : "cursor-pointer"}
          onClick={() => setMode("custom")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setMode("custom")}
          aria-pressed={mode === "custom"}
        >
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" aria-hidden />
              <span className="font-medium">Bring your own API key</span>
              {mode === "custom" ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Advanced. Use your own Groq, Anthropic, OpenAI, or Gemini key (Pro plan).
            </p>
          </CardContent>
        </Card>
      </div>
      {mode === "custom" ? (
        <Card className="text-left">
          <CardContent className="space-y-4 p-5">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as AIProviderName)}
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
            <div className="space-y-2">
              <Label htmlFor="apiKey">API key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setTested(false);
                }}
                placeholder="sk-..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void testConnection()}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : tested ? (
                <Check className="mr-2 h-4 w-4 text-success" aria-hidden />
              ) : null}
              Test connection
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <Button size="lg" onClick={() => void continueNext()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        Start Building →
      </Button>
    </div>
  );
}
