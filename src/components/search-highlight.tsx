export function SearchHighlight({ text, query }: { text: string; query: string }) {
  const normalized = query.trim();
  if (!normalized) return <>{text}</>;
  const index = text.toLocaleLowerCase().indexOf(normalized.toLocaleLowerCase());
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark className="rounded-sm bg-primary/15 px-0.5 text-inherit">{text.slice(index, index + normalized.length)}</mark>{text.slice(index + normalized.length)}</>;
}
