import { Workflow } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <Link href="/" className="mb-8 flex items-center gap-2" aria-label="AI Workspace home">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Workflow className="h-5 w-5 text-primary-foreground" aria-hidden />
        </span>
        <span className="text-xl font-bold tracking-tight">AI Workspace</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-xs text-muted-foreground">
        The operating system for AI-powered work
      </p>
    </div>
  );
}
