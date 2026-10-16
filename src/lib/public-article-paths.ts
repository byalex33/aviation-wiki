import { articlePath } from "@/lib/article-routes";
import { ARTICLE_PATH_ALIASES } from "@/lib/article-path-aliases";
import type { ContentType } from "@/lib/wiki-types";

/** Reader href. Alias sources point at the canonical article. Paths come from `articlePath`, so every content type stays addressable. */
export function publicArticlePath(contentType: ContentType, slug: string) {
  const path = articlePath(contentType, slug);
  return ARTICLE_PATH_ALIASES[path] ?? path;
}

export function publicArticleHistoryPath(contentType: ContentType, slug: string) {
  return `${publicArticlePath(contentType, slug)}/history`;
}
