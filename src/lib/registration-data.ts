import { articlePath } from "@/lib/article-routes";
import type { ContentType, StructuredField } from "@/lib/wiki-types";

export type RegistrationSourceArticle = {
  id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  fields: StructuredField[];
  updatedAt: string;
};

export type RegistrationRecord = {
  id: string;
  registration: string;
  prefix: string;
  sourceField: string;
  articleTitle: string;
  articleHref: string;
  contentType: ContentType;
  updatedAt: string;
};

const registrationFieldPattern = /\b(?:registrations?|tail numbers?|aircraft marks?)\b/i;
const registrationCodePattern = /\b(?:[A-Z0-9]{1,3}-[A-Z0-9]{2,8}|N\d{1,5}[A-Z]{0,2})\b/gi;

export const registrationPrefixCountries: Record<string, string> = {
  "9H": "Malta",
  B: "China",
  C: "Canada",
  D: "Germany",
  EC: "Spain",
  EI: "Ireland",
  F: "France",
  G: "United Kingdom",
  HB: "Switzerland",
  I: "Italy",
  JA: "Japan",
  N: "United States",
  OE: "Austria",
  PH: "Netherlands",
  RA: "Russia",
  VH: "Australia",
  VT: "India",
  ZK: "New Zealand",
  ZS: "South Africa",
};

export function registrationPrefix(registration: string) {
  const normalized = registration.trim().toUpperCase();
  const hyphenated = /^([A-Z0-9]{1,3})-/.exec(normalized);
  if (hyphenated) return hyphenated[1];
  const compact = /^([A-Z]+)(?=\d)/.exec(normalized);
  return compact?.[1] ?? "";
}

export function extractRegistrationRecords(
  articles: RegistrationSourceArticle[],
) {
  const records = articles.flatMap<RegistrationRecord>((article) =>
    article.fields.flatMap((field) => {
      if (!registrationFieldPattern.test(field.key)) return [];
      const registrations = [
        ...new Set(
          [...field.value.toUpperCase().matchAll(registrationCodePattern)].map(
            (match) => match[0],
          ),
        ),
      ];
      return registrations.flatMap((registration) => {
        const prefix = registrationPrefix(registration);
        if (!prefix) return [];
        return [{
          id: `${article.id}:${field.key}:${registration}`,
          registration,
          prefix,
          sourceField: field.key,
          articleTitle: article.title,
          articleHref: articlePath(article.contentType, article.slug),
          contentType: article.contentType,
          updatedAt: article.updatedAt,
        }];
      });
    }),
  );

  return [
    ...new Map(records.map((record) => [record.id, record])).values(),
  ].toSorted(
    (first, second) =>
      first.registration.localeCompare(second.registration) ||
      first.articleTitle.localeCompare(second.articleTitle),
  );
}

export function filterRegistrationRecords(
  records: RegistrationRecord[],
  filters: { prefix?: string; query?: string },
) {
  const prefix = filters.prefix?.trim().toUpperCase();
  const query = filters.query?.trim().toLocaleLowerCase("en");
  return records.filter((record) =>
    (!prefix || record.prefix === prefix) &&
    (!query || `${record.registration} ${record.articleTitle} ${record.sourceField}`.toLocaleLowerCase("en").includes(query)),
  );
}

export function registrationPrefixes(records: RegistrationRecord[]) {
  return [
    ...new Set([
      ...Object.keys(registrationPrefixCountries),
      ...records.map((record) => record.prefix),
    ]),
  ].toSorted((a, b) => a.localeCompare(b));
}
