"use client";
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// 黑色 pin 樣式
const blackIcon = new L.Icon({
  iconUrl: "/markers/marker-black.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: "grayscale"
});

// 藍色 pin 樣式（當前位置）
const blueIcon = new L.Icon({
  iconUrl: "/markers/marker-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// 計算兩點之間的距離（米）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // 地球半徑（米）
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// 計算方向（度）
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const λ1 = lon1 * Math.PI/180;
  const λ2 = lon2 * Math.PI/180;

  const y = Math.sin(λ2-λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) -
          Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  const θ = Math.atan2(y, x);
  return ((θ * 180/Math.PI) + 360) % 360;
}

// 地圖控制組件
function MapController({ userLocation, nextCheckpoint }: { 
  userLocation: { lat: number, lng: number } | null | undefined,
  nextCheckpoint: { lat: number, lng: number } | null 
}) {
  const map = useMap();
  const [hasFit, setHasFit] = useState(false);

  useEffect(() => {
    if (!hasFit && userLocation && nextCheckpoint) {
      const bounds = L.latLngBounds([userLocation, nextCheckpoint]);
      map.fitBounds(bounds, { padding: [50, 50] });
      setHasFit(true);
    }
  }, [userLocation, nextCheckpoint, map, hasFit]);

  return null;
}

export default function MapView({ checkpoints, startLocation, endLocation, userLocation, members }: {
  checkpoints: { location: { lat: number, lng: number }, name: string, id: string }[],
  startLocation?: { lat: number, lng: number },
  endLocation?: { lat: number, lng: number },
  userLocation?: { lat: number, lng: number } | null,
  members?: Record<string, { lat: number, lng: number, displayName: string, avatarUrl?: string, updatedAt?: any }>
}) {
  const [distance, setDistance] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);
  const [nextCheckpoint, setNextCheckpoint] = useState<{ lat: number, lng: number } | null>(null);

  // 路線座標：起點 + checkpoints + 終點
  const route = [
    ...(startLocation ? [startLocation] : []),
    ...checkpoints.map(cp => cp.location),
    ...(endLocation ? [endLocation] : [])
  ];
  const center = userLocation || (route.length > 0 ? route[0] : { lat: 22.3, lng: 114.2 });

  // 計算距離和方向
  useEffect(() => {
    if (userLocation && route.length > 0) {
      // 找到下一個檢查點
      const currentIndex = route.findIndex(
        point => point.lat === userLocation.lat && point.lng === userLocation.lng
      );
      const nextPoint = route[currentIndex + 1] || route[0];
      setNextCheckpoint(nextPoint);

      // 計算距離
      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        nextPoint.lat,
        nextPoint.lng
      );
      setDistance(dist);

      // 計算方向
      const bear = calculateBearing(
        userLocation.lat,
        userLocation.lng,
        nextPoint.lat,
        nextPoint.lng
      );
      setBearing(bear);
    } else {
      setDistance(null);
      setBearing(null);
      setNextCheckpoint(null);
    }
  }, [userLocation, route]);

  return (
    <div className="space-y-4">
      <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-200 shadow bg-[#f7f7f7]">
        <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="w-full h-full" style={{ background: '#f7f7f7' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {route.map((pos, idx) => (
            <Marker key={idx} position={pos} icon={blackIcon}>
              <Popup>
                {idx === 0 ? "起點" : idx === route.length - 1 ? "終點" : checkpoints[idx - (startLocation ? 1 : 0)]?.name}
              </Popup>
            </Marker>
          ))}
          <Polyline positions={route} color="#2563eb" weight={4} />
          {userLocation && (
            <CircleMarker 
              center={userLocation} 
              radius={10} 
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.7 }}
            >
              <Popup>你的位置</Popup>
            </CircleMarker>
          )}
          {/* 成員 marker */}
          {members && Object.entries(members).map(([uid, m]) => (
            m.lat && m.lng ? (
              <Marker
                key={uid}
                position={{ lat: m.lat, lng: m.lng }}
                icon={L.divIcon({
                  className: 'member-marker',
                  html: m.avatarUrl
                    ? `<img src='${m.avatarUrl}' style="width:32px;height:32px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px #0002;object-fit:cover;" />`
                    : `<div style="width:32px;height:32px;border-radius:50%;background:#222;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;border:2px solid #fff;box-shadow:0 2px 6px #0002;">${m.displayName?.[0] || '?'}</div>`
                })}
              >
                <Popup>
                  <div className="text-black">
                    <div className="font-bold">{m.displayName || uid}</div>
                    <div className="text-xs text-gray-500">({m.lat.toFixed(5)}, {m.lng.toFixed(5)})</div>
                    {userLocation && (uid !== '你') && (
                      <div className="text-xs mt-1">距離你：{Math.round(calculateDistance(userLocation.lat, userLocation.lng, m.lat, m.lng))} 米</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
          <MapController userLocation={userLocation} nextCheckpoint={nextCheckpoint} />
        </MapContainer>
      </div>

      {/* 距離和方向指示器 */}
      {distance !== null && bearing !== null && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-gray-600 text-sm">距離下一個檢查點</div>
              <div className="text-xl font-bold text-black">
                {distance < 1000 
                  ? `${Math.round(distance)} 米` 
                  : `${(distance/1000).toFixed(1)} 公里`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-600 text-sm">方向</div>
              <div className="text-xl font-bold text-black">
                {bearing >= 337.5 || bearing < 22.5 ? "北" :
                 bearing >= 22.5 && bearing < 67.5 ? "東北" :
                 bearing >= 67.5 && bearing < 112.5 ? "東" :
                 bearing >= 112.5 && bearing < 157.5 ? "東南" :
                 bearing >= 157.5 && bearing < 202.5 ? "南" :
                 bearing >= 202.5 && bearing < 247.5 ? "西南" :
                 bearing >= 247.5 && bearing < 292.5 ? "西" :
                 "西北"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 