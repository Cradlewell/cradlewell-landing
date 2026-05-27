"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default icon paths in webpack/Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeIcon(color, label) {
  return L.divIcon({
    className: "",
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    html: `
      <div style="position:relative;width:32px;height:42px">
        <svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 11.63 14.4 24.92 15.07 25.52a1.32 1.32 0 0 0 1.86 0C17.6 40.92 32 27.63 32 16 32 7.16 24.84 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="16" r="8" fill="#fff" opacity="0.9"/>
        </svg>
        <span style="position:absolute;top:10px;left:0;width:32px;text-align:center;font-size:9px;font-weight:700;color:${color};line-height:1">${label}</span>
      </div>`,
  });
}

const customerIcon = makeIcon("#ef4444", "YOU");

function staffIcon(color, initials) {
  return makeIcon(color, initials);
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function OpsMap({ customer, allStaff }) {
  const hasCustomer = customer.homeLat != null && customer.homeLng != null;
  const staffWithCoords = allStaff.filter(s => s.home_lat != null && s.home_lng != null);

  const points = [
    ...(hasCustomer ? [[customer.homeLat, customer.homeLng]] : []),
    ...staffWithCoords.map(s => [s.home_lat, s.home_lng]),
  ];

  const center = hasCustomer
    ? [customer.homeLat, customer.homeLng]
    : staffWithCoords.length > 0
    ? [staffWithCoords[0].home_lat, staffWithCoords[0].home_lng]
    : [12.9716, 77.5946]; // Bangalore fallback

  if (points.length === 0) {
    return (
      <div style={{ height: 320, borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", color: "#94a3b8", fontSize: 13 }}>
        No GPS data available yet
      </div>
    );
  }

  return (
    <MapContainer center={center} zoom={12} style={{ height: 320, borderRadius: 12, border: "1px solid #e2e8f0", zIndex: 0 }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {hasCustomer && (
        <Marker position={[customer.homeLat, customer.homeLng]} icon={customerIcon}>
          <Popup>
            <strong>{customer.name}</strong><br />
            {customer.area}
          </Popup>
        </Marker>
      )}
      {staffWithCoords.map(s => (
        <Marker key={s.id} position={[s.home_lat, s.home_lng]} icon={staffIcon(s.color ?? "#5F47FF", s.initials ?? "?")}>
          <Popup>
            <strong>{s.name}</strong><br />
            {s.role}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
