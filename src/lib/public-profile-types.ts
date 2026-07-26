import type { ContentType } from "@/lib/wiki-types";

export type PublicContribution = {
  id: string;
  articleSlug: string;
  title: string;
  contentType: ContentType;
  editSummary: string;
  contributedAt: string;
};

export type PublicContributorActivity = {
  approvedCount: number;
  articleCount: number;
  firstContributionAt: string | null;
  contributions: PublicContribution[];
};
