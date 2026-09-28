import "server-only";
import { loadAviationFeedEvents } from "@/lib/aviation-feed";

import {
  fieldValue,
  parseExactEventDate,
  sortByAnniversary,
  type DatedAviationEvent,
} from "@/lib/on-this-day-data";
import {
  listPublicEventSourceData,
  listPublicSearchDocuments,
} from "@/lib/wiki-public-db";

export async function loadDatedAviationEvents() {
  const [sources, documents, feedEvents] = await Promise.all([
    listPublicEventSourceData(),
    listPublicSearchDocuments(),
    loadAviationFeedEvents(),
  ]);
  const documentsById = new Map(documents.map((document) => [document.id, document]));

  return sortByAnniversary(
    sources.flatMap<DatedAviationEvent>((source) => {
      const eventDate = fieldValue(
        source.fields,
        "Event date",
        "Date",
        "Date of event",
      );
      const parsed = parseExactEventDate(eventDate);
      const document = documentsById.get(source.id);
      if (!eventDate || !parsed || !document) return [];
      return [{
        id: source.id,
        title: source.title,
        href: document.href,
        description: document.description,
        eventDate,
        ...parsed,
        location: fieldValue(source.fields, "Location", "Place"),
        eventType: fieldValue(source.fields, "Event type", "Type"),
        sources: source.sources,
      }];
    }).concat(feedEvents),
  );
}
