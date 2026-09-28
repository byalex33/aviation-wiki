export default function LoadingUsers() {
  return (
    <div role="status" aria-label="Loading users" className="space-y-6">
      <span className="sr-only">Loading users</span>
      <div aria-hidden="true" className="h-9 w-40 bg-muted" />
      {[0, 1, 2, 3].map((row) => (
        <div key={row} aria-hidden="true" className="flex gap-4 border-t py-5">
          <div className="size-11 bg-muted" />
          <div className="space-y-3"><div className="h-4 w-40 bg-muted" /><div className="h-3 w-64 max-w-full bg-muted" /></div>
        </div>
      ))}
    </div>
  );
}
