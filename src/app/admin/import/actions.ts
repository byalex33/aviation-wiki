"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assessImportPreview, assertArticleEditable, recordAdminAudit } from "@/lib/admin-db";
import { getImportProvider } from "@/lib/import-providers";
import { createImportedDraft, getArticleById } from "@/lib/wiki-db";
import { requireAdmin } from "@/lib/wiki-auth";
import { contentTypes, type ContentType } from "@/lib/wiki-types";

function selected(formData: FormData, key: string) { return [...new Set(formData.getAll(key).map(String).filter(Boolean))].slice(0, 100); }

export async function importAviationDataAction(formData: FormData) {
  const actor = await requireAdmin();
  const providerId = String(formData.get("provider") || "");
  const sourceId = String(formData.get("sourceId") || "").slice(0, 40);
  const contentType = String(formData.get("contentType") || "") as ContentType;
  if (!contentTypes.includes(contentType)) throw new Error("Invalid content type.");
  const provider = getImportProvider(providerId);
  const preview = await provider.preview(sourceId, contentType);
  const fieldIds = selected(formData, "fieldId");
  const imageIds = selected(formData, "imageId");
  const fields = preview.fields.filter((field) => fieldIds.includes(field.id));
  const images = preview.images.filter((image) => imageIds.includes(image.id));
  if (fields.length !== fieldIds.length || images.length !== imageIds.length) throw new Error("The provider data changed. Review a fresh preview before importing.");
  if (!fields.length && !images.length) throw new Error("Select at least one verified field or compatible image.");
  if (fields.some((field) => !field.verified)) throw new Error("Unverified fields cannot be imported.");
  if (images.some((image) => !image.compatible)) throw new Error("Images without complete compatible reuse terms cannot be imported.");
  const targetArticleId = String(formData.get("targetArticleId") || "").slice(0, 100) || undefined;
  const assessment = assessImportPreview(preview);
  const candidates = [...assessment.titleMatches, ...assessment.aliasMatches];
  if (!targetArticleId && (candidates.length || assessment.externalMapping || assessment.identifierCollisions.length)) throw new Error("A potential existing entity or identifier collision must be resolved by selecting the matching article.");
  if (targetArticleId) {
    const target = getArticleById(targetArticleId);
    if (!target) throw new Error("Selected target article not found.");
    assertArticleEditable(targetArticleId, actor.role);
    if (assessment.externalMapping && String(assessment.externalMapping.article_id) !== targetArticleId) throw new Error("This source entity is linked to another article.");
    if (assessment.identifierCollisions.some((collision) => String(collision.id) !== targetArticleId)) throw new Error("An imported identifier belongs to another article.");
  }
  const revision = createImportedDraft({ provider: preview.provider, sourceIdentifier: preview.sourceId, title: preview.title, contentType, targetArticleId, fields, images, actorId: actor.userId, actorName: actor.name });
  recordAdminAudit({ actorId: actor.userId, actorName: actor.name, action: "import.draft_created", entityType: "import", entityId: `${preview.provider}:${preview.sourceId}`, articleId: revision.articleId, revisionId: revision.id, after: { provider: preview.provider, sourceIdentifier: preview.sourceId, selectedFields: fields.map((field) => field.id), selectedImages: images.map((image) => image.fileName), status: revision.status } });
  revalidatePath("/admin/import");
  revalidatePath("/contribute");
  redirect(`/contribute/${revision.articleSlug}?saved=1`);
}
