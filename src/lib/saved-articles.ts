import "server-only";

import { randomUUID } from "node:crypto";
import { row, rows } from "@/lib/postgres";
import { UserFacingError } from "@/lib/user-facing-error";
import type { ContentType } from "@/lib/wiki-types";

export type SavedArticle = { id: string; title: string; slug: string; content_type: ContentType };
export type SavedCollection = { id: string; name: string; articles: SavedArticle[] };
export type WatchedArticle = SavedArticle & { edits: boolean; sources: boolean; relationships: boolean };

export async function listSavedArticles(userId: string) {
  const [watches, collections, articles] = await Promise.all([
    rows<WatchedArticle>(`SELECT a.id,a.title,a.slug,a.content_type,COALESCE(p.edits,true) edits,
      COALESCE(p.sources,false) sources,COALESCE(p.relationships,false) relationships
      FROM article_watches w JOIN articles a ON a.id=w.article_id
      LEFT JOIN article_watch_alerts p ON p.user_id=w.user_id AND p.article_id=w.article_id
      WHERE w.user_id=$1 AND a.live_revision_id IS NOT NULL AND a.archived_at IS NULL ORDER BY a.title,a.id`, [userId]),
    rows<{id: string; name: string}>("SELECT id,name FROM saved_collections WHERE user_id=$1 ORDER BY created_at,id", [userId]),
    rows<SavedArticle & {collection_id: string}>(`SELECT a.id,a.title,a.slug,a.content_type,i.collection_id
      FROM saved_collection_articles i JOIN saved_collections c ON c.id=i.collection_id JOIN articles a ON a.id=i.article_id
      WHERE c.user_id=$1 AND a.live_revision_id IS NOT NULL AND a.archived_at IS NULL ORDER BY a.title,a.id`, [userId]),
  ]);
  return { watches, collections: collections.map(c => ({ ...c, articles: articles.filter(a => a.collection_id === c.id) })) };
}

export async function createCollection(userId: string, name: string) {
  name = name.trim();
  if (!name || name.length > 80) throw new UserFacingError("Use a collection name between 1 and 80 characters.");
  const collection = await row<{id: string}>(`INSERT INTO saved_collections (id,user_id,name) VALUES ($1,$2,$3)
    ON CONFLICT(user_id,name) DO NOTHING RETURNING id`, [randomUUID(), userId, name]);
  if (!collection) throw new UserFacingError("You already have a collection with that name.");
  return collection.id;
}

export async function deleteCollection(userId: string, collectionId: string) {
  await rows("DELETE FROM saved_collections WHERE id=$1 AND user_id=$2 RETURNING id", [collectionId, userId]);
}

export async function saveCollectionArticle(userId: string, collectionId: string, articleId: string, saved: boolean) {
  if (!saved) {
    await rows(`DELETE FROM saved_collection_articles WHERE collection_id=$1 AND article_id=$2
      AND EXISTS (SELECT 1 FROM saved_collections WHERE id=$1 AND user_id=$3) RETURNING article_id`, [collectionId, articleId, userId]);
    return;
  }
  const result = await row(`INSERT INTO saved_collection_articles (collection_id,article_id)
    SELECT c.id,a.id FROM saved_collections c CROSS JOIN articles a
    WHERE c.id=$1 AND c.user_id=$2 AND a.id=$3 AND a.live_revision_id IS NOT NULL AND a.archived_at IS NULL
    ON CONFLICT(collection_id,article_id) DO UPDATE SET article_id=excluded.article_id RETURNING article_id`, [collectionId,userId,articleId]);
  if (!result) throw new UserFacingError("Choose one of your collections and a published article.");
}

export async function saveWatchAlerts(userId: string, articleId: string, edits: boolean, sources: boolean, relationships: boolean) {
  const result = await row(`INSERT INTO article_watch_alerts (user_id,article_id,edits,sources,relationships)
    SELECT user_id,article_id,$3,$4,$5 FROM article_watches WHERE user_id=$1 AND article_id=$2
    ON CONFLICT(user_id,article_id) DO UPDATE SET edits=excluded.edits,sources=excluded.sources,relationships=excluded.relationships
    RETURNING article_id`, [userId,articleId,edits,sources,relationships]);
  if (!result) throw new UserFacingError("Watch this article before changing its alerts.");
}
