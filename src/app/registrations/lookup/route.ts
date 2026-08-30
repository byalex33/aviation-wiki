import { redirect } from "next/navigation";

export function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("registration")?.trim().toLowerCase();
  redirect(value ? `/registrations/${encodeURIComponent(value)}` : "/registrations");
}
