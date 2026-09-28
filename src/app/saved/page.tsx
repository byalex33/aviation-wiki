import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { articlePath } from "@/lib/article-routes";
import { hasPro } from "@/lib/pro";
import { row } from "@/lib/postgres";
import { listSavedArticles, type SavedArticle } from "@/lib/saved-articles";
import { SavedForm } from "./saved-form";

export const metadata = { title: "Saved articles", robots: { index: false, follow: false } };

export default async function SavedArticlesPage({ searchParams }: { searchParams: Promise<{ article?: string }> }) {
  const { article: articleId } = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/saved${articleId ? `?article=${encodeURIComponent(articleId)}` : ""}`)}`);
  const pro = hasPro(user.publicMetadata);
  const { watches, collections } = await listSavedArticles(user.id);
  const selected = articleId ? await row<SavedArticle>("SELECT id,title,slug,content_type FROM articles WHERE id=$1 AND live_revision_id IS NOT NULL AND archived_at IS NULL", [articleId]) : undefined;
  const choices = selected && !watches.some(a => a.id === selected.id) ? [selected, ...watches] : watches;
  const inputClass = "min-h-10 max-w-full rounded-lg border bg-background px-3 text-sm";

  return <main className="mx-auto max-w-[1000px] px-5 py-10 sm:px-6">
    <h1 className="text-3xl font-bold tracking-tight">Saved articles</h1>
    <p className="mt-3 text-muted-foreground">Watch as many articles as you like. Pro adds private collections and alerts for individual articles.</p>
    <Link href="/notifications" className="mt-3 inline-block text-sm text-primary underline">Notifications and email preferences</Link>
    {!pro && <p className="mt-6 rounded-xl border p-5 text-sm"><Link href="/pro" className="text-primary underline">Pro</Link> lets you organise articles into collections and choose which changes to follow.</p>}

    <section aria-labelledby="collections-title" className="mt-10">
      <h2 id="collections-title" className="mb-4 text-xl font-semibold">Collections</h2>
      {pro && <div className="space-y-5 rounded-xl border bg-card p-5">
        <SavedForm operation="create" label="Create collection">
          <label className="flex flex-wrap items-center gap-2 text-sm">Collection name <input name="name" required maxLength={80} className={inputClass} /></label>
        </SavedForm>
        {!!collections.length && !!choices.length && <SavedForm operation="add" label="Save article">
          <label className="flex flex-wrap items-center gap-2 text-sm">Article <select name="articleId" defaultValue={selected?.id} className={inputClass}>{choices.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
          <label className="flex flex-wrap items-center gap-2 text-sm">Collection <select name="collectionId" className={inputClass}>{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </SavedForm>}
        <p className="text-xs text-muted-foreground">Use “Save” on an article, or choose an article from your watchlist.</p>
      </div>}
      {!collections.length && <p className="mt-4 text-sm text-muted-foreground">No saved collections yet.</p>}
      {collections.map(c => <div key={c.id} className="mt-4 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{c.name}</h3>{pro && <SavedForm operation="delete" collectionId={c.id} label={`Delete ${c.name}`} />}</div>
        {!c.articles.length && <p className="mt-3 text-sm text-muted-foreground">This collection is empty.</p>}
        <ul className="divide-y">{c.articles.map(a => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href={articlePath(a.content_type, a.slug)} className="text-primary hover:underline">{a.title}</Link>
          {pro && <SavedForm operation="remove" collectionId={c.id} articleId={a.id} label="Remove" />}
        </li>)}</ul>
      </div>)}
    </section>

    <section aria-labelledby="watchlist-title" className="mt-10">
      <h2 id="watchlist-title" className="text-xl font-semibold">Watchlist</h2>
      <p className="mt-2 text-sm text-muted-foreground">{pro ? "Choose approved edits, sources added or removed, or relationships added or removed. Clear all three to mute an article." : "You receive an alert when a watched article has an approved edit."}</p>
      {!watches.length && <p className="mt-4 text-sm text-muted-foreground">Use “Watch” on an article to follow its updates.</p>}
      {watches.map(a => <div key={a.id} className="mt-4 space-y-4 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><Link href={articlePath(a.content_type, a.slug)} className="font-semibold text-primary hover:underline">{a.title}</Link><SavedForm operation="unwatch" articleId={a.id} label="Unwatch" /></div>
        {pro && <SavedForm operation="alerts" articleId={a.id} label="Save alerts">
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" name="edits" defaultChecked={a.edits} />Approved edits</label>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" name="sources" defaultChecked={a.sources} />Source changes</label>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" name="relationships" defaultChecked={a.relationships} />Relationship changes</label>
        </SavedForm>}
      </div>)}
    </section>
  </main>;
}
