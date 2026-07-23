"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getImportProvider } from "@/lib/import-providers";
import { requireAdmin } from "@/lib/wiki-auth";
import { contentTypes, type ContentType } from "@/lib/wiki-types";

const adminDatabase = () =>
  process.env.DATABASE_URL
    ? import("@/lib/wiki-public-db")
    : import("@/lib/admin-db");

const wikiDatabase = () =>
  process.env.DATABASE_URL
    ? import("@/lib/wiki-public-db")
    : import("@/lib/wiki-db");

function selected(formData: FormData, key: string) { return [...new Set(formData.getAll(key).map(String).filter(Boolean))].slice(0, 100); }

type ImportActionState = { status: "error"; message: string } | null;

function error(message: string): ImportActionState { return { status: "error", message }; }

export async function importAviationDataAction(_previousState: ImportActionState, formData: FormData) {
  const [adminDb, wikiDb] = await Promise.all([adminDatabase(), wikiDatabase()]);
  const actor = await requireAdmin();
  const providerId = String(formData.get("provider") || "");
  const sourceId = String(formData.get("sourceId") || "").slice(0, 40);
  const contentType = String(formData.get("contentType") || "") as ContentType;
  if (!contentTypes.includes(contentType)) return error("Invalid content type.");
  const provider = getImportProvider(providerId);
  const preview = await provider.preview(sourceId, contentType);
  const fieldIds = selected(formData, "fieldId");
  const imageIds = selected(formData, "imageId");
  const fields = preview.fields.filter((field) => fieldIds.includes(field.id));
  const images = preview.images.filter((image) => imageIds.includes(image.id));
  if (fields.length !== fieldIds.length || images.length !== imageIds.length) return error("The provider data changed. Review a fresh preview before importing.");
  if (!fields.length && !images.length) return error("Select at least one verified field or compatible image.");
  if (fields.some((field) => !field.verified)) return error("Unverified fields cannot be imported.");
  if (images.some((image) => !image.compatible)) return error("Images without complete compatible reuse terms cannot be imported.");
  const targetArticleId = String(formData.get("targetArticleId") || "").slice(0, 100) || undefined;
  const assessment = await adminDb.assessImportPreview(preview);
  const candidates = [...assessment.titleMatches, ...assessment.aliasMatches];
  if (!targetArticleId && (candidates.length || assessment.externalMapping || assessment.identifierCollisions.length)) return error("A potential existing entity or identifier collision must be resolved by selecting the matching article.");
  if (targetArticleId) {
    const target = await wikiDb.getArticleById(targetArticleId);
    if (!target) return error("Selected target article not found.");
    await adminDb.assertArticleEditable(targetArticleId, actor.role);
    if (assessment.externalMapping && String(assessment.externalMapping.article_id) !== targetArticleId) return error("This source entity is linked to another article.");
    if (assessment.identifierCollisions.some((collision) => String(collision.id) !== targetArticleId)) return error("An imported identifier belongs to another article.");
  }
  const revision = await wikiDb.createImportedDraft({ provider: preview.provider, sourceIdentifier: preview.sourceId, title: preview.title, contentType, targetArticleId, fields, images, actorId: actor.userId, actorName: actor.name });
  await adminDb.recordAdminAudit({ actorId: actor.userId, actorName: actor.name, action: "import.draft_created", entityType: "import", entityId: `${preview.provider}:${preview.sourceId}`, articleId: revision.articleId, revisionId: revision.id, after: { provider: preview.provider, sourceIdentifier: preview.sourceId, selectedFields: fields.map((field) => field.id), selectedImages: images.map((image) => image.fileName), status: revision.status } });
  revalidatePath("/admin/import");
  revalidatePath("/contribute");
  redirect(`/contribute/${revision.articleSlug}?saved=1`);
}
