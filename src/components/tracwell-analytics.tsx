"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

import { syncTracwellIdentity } from "@/lib/tracwell";

export function TracwellAnalytics() {
  const { isLoaded, user } = useUser();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (isLoaded) syncTracwellIdentity(userId);
  }, [isLoaded, userId]);

  return null;
}
