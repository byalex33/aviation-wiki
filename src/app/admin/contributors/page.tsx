import { notFound, redirect } from "next/navigation";

import { getStaffUser } from "@/lib/wiki-auth";

export default async function AdminContributorsPage() {
  if ((await getStaffUser())?.role !== "admin") notFound();
  redirect("/admin/users?view=contributors");
}
