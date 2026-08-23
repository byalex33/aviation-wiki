"use server";

import { revalidatePath } from "next/cache";

import { createApiKey, revokeApiKey, regenerateApiKey } from "@/lib/api-keys";
import { requireContributor } from "@/lib/wiki-auth";
import { UserFacingError } from "@/lib/user-facing-error";

export type CreateKeyState = {
  error: string | null;
  rawToken?: string;
  keyName?: string;
};

export type KeyActionState = {
  error: string | null;
  rawToken?: string;
};

export async function createApiKeyAction(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  try {
    const contributor = await requireContributor();
    const name = String(formData.get("name") ?? "").trim().slice(0, 100);
    if (!name) return { error: "A key name is required." };
    const { rawToken, key } = await createApiKey({
      name,
      userId: contributor.userId,
      userName: contributor.name,
      scopes: ["articles:draft"],
    });
    revalidatePath("/settings/api-keys");
    return { error: null, rawToken, keyName: key.name };
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    throw error;
  }
}

export async function revokeApiKeyAction(
  _prev: KeyActionState,
  formData: FormData,
): Promise<KeyActionState> {
  try {
    const contributor = await requireContributor();
    const keyId = String(formData.get("keyId") ?? "").trim();
    if (!keyId) return { error: "Key ID is required." };
    const revoked = await revokeApiKey(keyId, contributor.userId);
    if (!revoked) return { error: "Key not found or already revoked." };
    revalidatePath("/settings/api-keys");
    return { error: null };
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    throw error;
  }
}

export async function regenerateApiKeyAction(
  _prev: KeyActionState,
  formData: FormData,
): Promise<KeyActionState> {
  try {
    const contributor = await requireContributor();
    const keyId = String(formData.get("keyId") ?? "").trim();
    if (!keyId) return { error: "Key ID is required." };
    const result = await regenerateApiKey(keyId, contributor.userId);
    if (!result) return { error: "Key not found or already revoked." };
    revalidatePath("/settings/api-keys");
    return { error: null, rawToken: result.rawToken };
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    throw error;
  }
}
