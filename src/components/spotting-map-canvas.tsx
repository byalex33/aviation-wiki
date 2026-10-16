"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { SpottingLocation } from "@/lib/spotting-locations";

export type MappableSpottingLocation = SpottingLocation & {
  latitude: number;
  longitude: number;
};

function FitLocations({ positions }: { positions: Array<[number, number]> }) {
  const map = useMap();
  const key = positions.map((position) => position.join(",")).join("|");
  useEffect(() => {
    const points = key.split("|").map((point) => point.split(",").map(Number) as [number, number]);
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, { padding: [28, 28] });
  }, [map, key]);
  return null;
}

export function SpottingMapCanvas({ locations }: { locations: MappableSpottingLocation[] }) {
  const positions = locations.map((location) => [location.latitude, location.longitude] as [number, number]);
  return (
    <MapContainer
      center={positions[0]}
      zoom={13}
      scrollWheelZoom={false}
      className="spotting-map"
      aria-label="Map of spotting locations"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitLocations positions={positions} />
      {locations.map((location) => (
        <CircleMarker
          key={`${location.name}-${location.latitude}-${location.longitude}`}
          center={[location.latitude, location.longitude]}
          radius={9}
          pathOptions={{
            color: location.placeholder ? "#b45309" : "#1d4ed8",
            fillColor: location.placeholder ? "#f59e0b" : "#2563eb",
            fillOpacity: 0.92,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{location.name}</strong>
            {location.placeholder ? <p>Placeholder. This is not a verified spotting location.</p> : null}
            <p>Runways: {location.runways}</p>
            <p>{location.note}</p>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
