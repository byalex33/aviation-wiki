This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Contribution workflow

Authenticated contributors work in `/contribute`. Drafts and submitted revisions are stored separately from the live revision, so contributor actions cannot publish content. Submitted revisions move through `verifying` and `pending_review`; moderators can approve, edit and approve, request changes, or reject from `/moderation`.

Moderator access is granted through Clerk user public metadata:

```json
{ "role": "moderator" }
```

Gemini verification is advisory and requires the server-only `GEMINI_API_KEY` variable. It stores claim/source checks for moderators but has no publishing authority. Copy `.env.example` for the complete environment contract.

Public article and search data use Neon Postgres through the server-only `DATABASE_URL` variable. Local SQLite remains available for the legacy moderation test harness while those authenticated write paths are migrated.
