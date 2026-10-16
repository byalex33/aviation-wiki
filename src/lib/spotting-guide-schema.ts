import { contentTypeSqlList } from "@/lib/wiki-types";

export const SPOTTING_GUIDE_MIGRATION_ID = "20261016_spotting_guide_content_type";

export function spottingGuideContentTypeSql() {
  return `
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_content_type_check;
ALTER TABLE articles ADD CONSTRAINT articles_content_type_check CHECK (content_type IN (${contentTypeSqlList}));
ALTER TABLE revisions DROP CONSTRAINT IF EXISTS revisions_content_type_check;
ALTER TABLE revisions ADD CONSTRAINT revisions_content_type_check CHECK (content_type IN (${contentTypeSqlList}));
`.trim();
}
