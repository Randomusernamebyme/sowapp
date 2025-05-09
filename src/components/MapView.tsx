"use client";
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 黑色 pin 樣式
const blackIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  shadowSize: [41, 41],
  className: "grayscale"
});

export default function MapView({ checkpoints, startLocation, endLocation, userLocation }: {
  checkpoints: { location: { lat: number, lng: number }, name: string, id: string }[],
  startLocation?: { lat: number, lng: number },
  endLocation?: { lat: number, lng: number },
  userLocation?: { lat: number, lng: number } | null
}) {
  // 路線座標：起點 + checkpoints + 終點
  const route = [
    ...(startLocation ? [startLocation] : []),
    ...checkpoints.map(cp => cp.location),
    ...(endLocation ? [endLocation] : [])
  ];
  const center = userLocation || (route.length > 0 ? route[0] : { lat: 22.3, lng: 114.2 });

  return (
    <div className="w-full h-96 rounded-2xl overflow-hidden border border-gray-200 shadow mb-4">
      <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="w-full h-full grayscale">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route.map((pos, idx) => (
          <Marker key={idx} position={pos} icon={blackIcon}>
            <Popup>{idx === 0 ? "起點" : idx === route.length - 1 ? "終點" : checkpoints[idx - (startLocation ? 1 : 0)]?.name}</Popup>
          </Marker>
        ))}
        <Polyline positions={route} color="#222" weight={4} />
        {userLocation && (
          <CircleMarker center={userLocation} radius={10} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.7 }}>
            <Popup>你的位置</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
} 