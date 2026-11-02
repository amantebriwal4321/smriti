"use client";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { Monument, Item } from "@/lib/types";

import { KIND_COLOR, type Pin } from "./colors";


function Fly({ to }: { to: [number, number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (to) map.flyTo([to[0], to[1]], to[2], { duration: 1.2 }); }, [to, map]);
  return null;
}

export default function MapView({ monuments, pins, showMonuments, onMonument, onPin, flyTo, activeKey }: {
  monuments: Monument[]; pins: Pin[]; showMonuments: boolean; activeKey?: string | null;
  onMonument: (m: Monument) => void; onPin: (p: Pin) => void; flyTo: [number, number, number] | null;
}) {
  return (
    <MapContainer center={[22.5, 79]} zoom={5} minZoom={4} maxBounds={[[0, 55], [40, 105]]} className="h-full w-full" zoomControl={false} preferCanvas>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <Fly to={flyTo} />
      {showMonuments && monuments.map((m) => (
        <CircleMarker key={m.id} center={[m.lat, m.lng]} radius={m.unesco ? 5 : 3.5} eventHandlers={{ click: () => onMonument(m) }}
          pathOptions={{ color: m.unesco ? "#e8a33d" : "#b6a68a", weight: 1, fillColor: m.unesco ? "#e8a33d" : "#7d6c55", fillOpacity: 0.9 }}>
          <Tooltip direction="top" offset={[0, -4]}>{m.name}{m.unesco ? " · UNESCO" : ""}</Tooltip>
        </CircleMarker>
      ))}
      {pins.map((p) => (
        <CircleMarker key={p.key} center={[p.lat, p.lng]} radius={activeKey === p.key ? 13 : 8} eventHandlers={{ click: () => onPin(p) }}
          pathOptions={{ color: "#17120d", weight: 2, fillColor: KIND_COLOR[p.kind], fillOpacity: 0.95 }}>
          <Tooltip direction="top" offset={[0, -8]}>{p.label}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
