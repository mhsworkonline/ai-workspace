import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps): JSX.Element {
  return <OnboardingShell>{children}</OnboardingShell>;
}
