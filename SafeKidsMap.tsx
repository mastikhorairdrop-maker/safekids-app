import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { LocationPoint, SafeZone } from "../types/safekids";

interface SafeKidsMapProps {
  location: LocationPoint;
  safeZones: SafeZone[];
  locationHistory?: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    address: string;
  }>;
  childName: string;
  isOnline: boolean;
  batteryLevel: number;
  onZoneClick?: (zone: SafeZone) => void;
  className?: string;
}

export const SafeKidsMap: React.FC<SafeKidsMapProps> = ({
  location,
  safeZones,
  locationHistory = [],
  childName,
  isOnline,
  batteryLevel,
  onZoneClick,
  className = "h-96 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const zonesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const historyPolylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        // Initialize Leaflet map
        const map = L.map(mapContainerRef.current, {
          center: [location.latitude, location.longitude],
          zoom: 15,
          zoomControl: true,
        });

        // Free OpenStreetMap CartoDB Positron / OSM Standard tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        zonesLayerGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Update Child Marker
      const customIcon = L.divIcon({
        className: "custom-child-pin",
        html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="
            background: #2563eb; 
            color: white; 
            font-size: 11px; 
            font-weight: 700; 
            padding: 3px 8px; 
            border-radius: 9999px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); 
            white-space: nowrap; 
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            border: 1px solid rgba(255,255,255,0.4);
          ">
            <span style="width: 7px; height: 7px; border-radius: 9999px; background: ${isOnline ? "#22c55e" : "#94a3b8"};"></span>
            ${childName} (${batteryLevel}%)
          </div>
          <div style="
            width: 38px; 
            height: 38px; 
            border-radius: 9999px; 
            background: #3b82f6; 
            border: 3px solid white; 
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4); 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 18px;
          ">
            👦
          </div>
          <div style="
            width: 0; 
            height: 0; 
            border-left: 6px solid transparent; 
            border-right: 6px solid transparent; 
            border-top: 8px solid #3b82f6;
          "></div>
        </div>
      `,
        iconSize: [0, 0],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([location.latitude, location.longitude]);
        markerRef.current.setIcon(customIcon);
      } else {
        markerRef.current = L.marker([location.latitude, location.longitude], {
          icon: customIcon,
        }).addTo(map);
      }

      // Accuracy Circle
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([location.latitude, location.longitude]);
        accuracyCircleRef.current.setRadius(location.accuracy || 15);
      } else {
        accuracyCircleRef.current = L.circle([location.latitude, location.longitude], {
          radius: location.accuracy || 15,
          color: "#3b82f6",
          fillColor: "#93c5fd",
          fillOpacity: 0.18,
          weight: 1,
        }).addTo(map);
      }

      // Render Safe Zones
      if (zonesLayerGroupRef.current) {
        zonesLayerGroupRef.current.clearLayers();
        safeZones.forEach((zone) => {
          if (!zone.enabled) return;
          const circle = L.circle([zone.latitude, zone.longitude], {
            radius: zone.radiusMeters,
            color: "#10b981",
            fillColor: "#6ee7b7",
            fillOpacity: 0.22,
            dashArray: "4, 6",
            weight: 2,
          });

          circle.bindTooltip(`<b>🛡️ Safe Zone:</b> ${zone.name} (${zone.radiusMeters}m)`, {
            permanent: false,
            direction: "top",
          });

          if (onZoneClick) {
            circle.on("click", () => onZoneClick(zone));
          }

          circle.addTo(zonesLayerGroupRef.current!);
        });
      }

      // Render Location History Breadcrumbs
      if (locationHistory.length > 1) {
        const latlngs: [number, number][] = locationHistory.map((h) => [h.latitude, h.longitude]);
        if (historyPolylineRef.current) {
          historyPolylineRef.current.setLatLngs(latlngs);
        } else {
          historyPolylineRef.current = L.polyline(latlngs, {
            color: "#6366f1",
            weight: 3,
            opacity: 0.7,
            dashArray: "5, 8",
          }).addTo(map);
        }
      }

      map.panTo([location.latitude, location.longitude], { animate: true, duration: 0.5 });
    } catch (err) {
      console.warn("Leaflet map rendering warning:", err);
    }
  }, [location, safeZones, locationHistory, childName, isOnline, batteryLevel]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={mapContainerRef} className={className} />;
};
