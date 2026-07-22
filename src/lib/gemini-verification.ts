import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { RevisionContent, VerificationClaim, VerificationResult } from "@/lib/wiki-types";
import { parseArticleMarkdown } from "@/lib/article-markdown";

const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const verificationSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          assessment: { type: "string", enum: ["supported", "partially_supported", "unsupported", "unclear"] },
          sourceUrl: { type: ["string", "null"] },
          notes: { type: "string" },
        },
        required: ["claim", "assessment", "sourceUrl", "notes"],
      },
    },
  },
  required: ["summary", "claims"],
};

function validClaims(value: unknown): VerificationClaim[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((claim) => {
    if (!claim || typeof claim !== "object") return [];
    const item = claim as Record<string, unknown>;
    const assessments = ["supported", "partially_supported", "unsupported", "unclear"];
    if (typeof item.claim !== "string" || typeof item.notes !== "string" || !assessments.includes(String(item.assessment))) return [];
    return [{ claim: item.claim, assessment: item.assessment as VerificationClaim["assessment"], sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : null, notes: item.notes }];
  });
}

export async function verifyRevision(content: RevisionContent): Promise<VerificationResult> {
  const checkedAt = new Date().toISOString();
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return { status: "unavailable", model: null, summary: "Gemini verification is not configured. A moderator must review the claims and sources manually.", claims: [], checkedAt, advisoryOnly: true };
  }

  try {
    const client = new GoogleGenAI({});
    const inlineCitationUrls = parseArticleMarkdown(content.markdown).citations.map((citation) => citation.url);
    const sourceUrls = [...new Set([...inlineCitationUrls, ...content.sources.map((source) => source.url)])].join("\n");
    const interaction = await client.interactions.create({
      model,
      input: `You are an advisory fact-checker for an aviation encyclopedia. Check the proposed article only against the supplied inline citation URLs and source metadata. Identify material factual claims, whether each source supports them, and any source-quality or contradiction concerns. Review every structured relationship in ARTICLE JSON as a claim, using its citationIdentifiers to locate supporting inline citations. Do not infer missing relationships. Do not approve, reject, edit, or publish the article.\n\nARTICLE JSON:\n${JSON.stringify(content)}\n\nINLINE CITATION URLS:\n${sourceUrls}`,
      tools: [{ type: "url_context" }],
      response_format: { type: "text", mime_type: "application/json", schema: verificationSchema },
    });
    const parsed = JSON.parse(interaction.output_text || "{}");
    return { status: "completed", model, summary: typeof parsed.summary === "string" ? parsed.summary : "Verification completed without a summary.", claims: validClaims(parsed.claims), checkedAt, advisoryOnly: true };
  } catch (error) {
    void error;
    return { status: "error", model, summary: "Gemini verification could not complete. A moderator must check the article and sources manually.", claims: [], checkedAt, advisoryOnly: true };
  }
}
