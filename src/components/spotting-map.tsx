"use client";

import { useEffect, useState, type ComponentType } from "react";

import type { SpottingLocationsBlock } from "@/lib/spotting-locations";
import type { MappableSpottingLocation } from "@/components/spotting-map-canvas";

function osmLink(location: MappableSpottingLocation) {
  const latitude = location.latitude.toFixed(5);
  const longitude = location.longitude.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

export function SpottingLocationsView({ block }: { block: SpottingLocationsBlock }) {
  const pinned = block.locations.filter(
    (location): location is MappableSpottingLocation => location.latitude !== null && location.longitude !== null,
  );
  const pinKey = pinned.map((location) => `${location.latitude},${location.longitude}`).join("|");
  const [Canvas, setCanvas] = useState<ComponentType<{ locations: MappableSpottingLocation[] }> | null>(null);

  useEffect(() => {
    if (!pinKey) return;
    let cancelled = false;
    void import("@/components/spotting-map-canvas").then((module) => {
      if (!cancelled) setCanvas(() => module.SpottingMapCanvas);
    });
    return () => {
      cancelled = true;
    };
  }, [pinKey]);

  return (
    <section className="my-6" aria-labelledby="spotting-locations-title">
      <p id="spotting-locations-title" className="text-2xl font-bold tracking-tight">
        {block.title}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Pins use OpenStreetMap. A placeholder pin is an unpublished marker, not a place to stand.
      </p>
      {pinned.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-2xl border">
          {Canvas ? <Canvas locations={pinned} /> : (
            <div className="grid h-[360px] place-items-center bg-muted/40 text-sm text-muted-foreground">
              Loading map
            </div>
          )}
        </div>
      )}
      <ol className="mt-4 space-y-3">
        {block.locations.map((location) => (
          <li key={location.name} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{location.name}</h3>
              {location.placeholder && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
                  Placeholder
                </span>
              )}
            </div>
            <p className="mt-2 text-sm">Runways: {location.runways}</p>
            <p className="mt-1 text-sm text-muted-foreground">{location.note}</p>
            {location.latitude !== null && location.longitude !== null ? (
              <a
                href={osmLink({ ...location, latitude: location.latitude, longitude: location.longitude })}
                className="article-link mt-2 inline-flex text-sm"
                target="_blank"
                rel="noreferrer"
              >
                Open this pin in OpenStreetMap
              </a>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No map pin yet.</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
