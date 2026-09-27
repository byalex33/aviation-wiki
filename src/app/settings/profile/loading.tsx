import { AuthShell, AuthSkeleton } from "@/components/auth/auth-shell";
export default function Loading() {
  return <AuthShell title="Your account." description="Choose how you appear to other contributors and manage your sign-in details."><AuthSkeleton/></AuthShell>;
}
