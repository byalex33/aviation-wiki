import Image from "next/image";

export function ArticleCardBackdrop({
  imageUrl,
  sizes = "(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw",
}: {
  imageUrl?: string;
  sizes?: string;
}) {
  if (!imageUrl) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <Image
        src={imageUrl}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className="object-cover opacity-55 saturate-75 transition duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-card/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/35" />
    </div>
  );
}
