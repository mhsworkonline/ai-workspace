const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/** Replaces {{key}} tokens. Unknown keys are left in place (warned, not errored). */
export function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(VARIABLE_PATTERN, (match, key: string) => {
    const value = variables[key];
    return value === undefined ? match : value;
  });
}

export function findUndefinedVariables(
  template: string,
  variables: Record<string, string>
): string[] {
  const missing = new Set<string>();
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const key = match[1];
    if (variables[key] === undefined) {
      missing.add(key);
    }
  }
  return Array.from(missing);
}

export function extractVariableKeys(template: string): string[] {
  const keys = new Set<string>();
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

export interface SystemVariableContext {
  userName: string;
  workspaceName: string;
  runNumber: number;
  timezone?: string;
}

export function buildSystemVariables(ctx: SystemVariableContext): Record<string, string> {
  const now = new Date();
  const locale = "en-US";
  const tz = ctx.timezone ?? "Asia/Kolkata";
  const dateStr = now.toLocaleDateString(locale, {
    timeZone: tz,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    current_date: dateStr,
    current_time: timeStr,
    current_datetime: `${dateStr} ${timeStr}`,
    user_name: ctx.userName,
    workspace_name: ctx.workspaceName,
    run_number: String(ctx.runNumber),
  };
}
