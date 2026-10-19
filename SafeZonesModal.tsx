import React, { useState } from "react";
import { Shield, Plus, Trash2, MapPin, X, Check, AlertCircle } from "lucide-react";
import { SafeZone } from "../types/safekids";
import { updateSafeZones } from "../services/api";

interface SafeZonesModalProps {
  isOpen: boolean;
  childId: string;
  currentZones: SafeZone[];
  currentLatitude: number;
  currentLongitude: number;
  onClose: () => void;
  onSaved: () => void;
}

export const SafeZonesModal: React.FC<SafeZonesModalProps> = ({
  isOpen,
  childId,
  currentZones,
  currentLatitude,
  currentLongitude,
  onClose,
  onSaved,
}) => {
  const [zones, setZones] = useState<SafeZone[]>(currentZones);
  const [newZoneName, setNewZoneName] = useState("");
  const [newRadius, setNewRadius] = useState(250);
  const [newLat, setNewLat] = useState(currentLatitude);
  const [newLng, setNewLng] = useState(currentLongitude);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggleZone = (id: string) => {
    setZones(zones.map((z) => (z.id === id ? { ...z, enabled: !z.enabled } : z)));
  };

  const handleDeleteZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id));
  };

  const handleAddZone = () => {
    if (!newZoneName.trim()) return;
    const newZone: SafeZone = {
      id: `zone-${Date.now()}`,
      name: newZoneName.trim(),
      latitude: newLat,
      longitude: newLng,
      radiusMeters: newRadius,
      icon: "Home",
      enabled: true,
    };
    setZones([...zones, newZone]);
    setNewZoneName("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateSafeZones(childId, zones);
    setIsSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Safe Zones & Geofencing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Get alerted when child enters or leaves these zones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Zones List */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Active Geofences ({zones.length})
          </span>
          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={zone.enabled}
                    onChange={() => handleToggleZone(zone.id)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                      {zone.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Radius: {zone.radiusMeters}m • {zone.latitude.toFixed(4)},{" "}
                      {zone.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteZone(zone.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Delete Zone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Zone */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Add New Safe Zone
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Zone Label
              </label>
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="e.g. Grandma's House, Soccer Field..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Radius (Meters)
              </label>
              <select
                value={newRadius}
                onChange={(e) => setNewRadius(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value={100}>100 meters (Building)</option>
                <option value={200}>200 meters (Block)</option>
                <option value={300}>300 meters (Neighborhood)</option>
                <option value={500}>500 meters (School Campus)</option>
                <option value={1000}>1,000 meters (1 km)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span>
              Using Child&apos;s Current GPS ({newLat.toFixed(4)}, {newLng.toFixed(4)})
            </span>
            <button
              type="button"
              onClick={handleAddZone}
              disabled={!newZoneName.trim()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Zone
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            Save Geofences
          </button>
        </div>
      </div>
    </div>
  );
};
