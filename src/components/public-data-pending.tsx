export function PublicDataPending({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-[1100px] px-5 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        This directory is filled from the published encyclopedia. It appears once the database is configured.
      </p>
    </main>
  );
}
