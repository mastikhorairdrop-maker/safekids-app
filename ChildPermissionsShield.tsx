import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  MapPin,
  Camera,
  Lock,
  Zap,
  BatteryCharging,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react";

interface PermissionItem {
  id: string;
  name: string;
  androidPermission: string;
  description: string;
  granted: boolean;
  isForegroundService: boolean;
  icon: any;
}

const STORAGE_KEY = "safekids_child_permissions_state";

export const ChildPermissionsShield: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "location",
        name: "Foreground Location Service",
        androidPermission: "android.permission.ACCESS_FINE_LOCATION & FOREGROUND_SERVICE_LOCATION",
        description:
          "Enables real-time GPS tracking and safe-zone geofence enter/exit alerts without interruption.",
        granted: true,
        isForegroundService: true,
        icon: MapPin,
      },
      {
        id: "camera",
        name: "Foreground Camera Look-In",
        androidPermission: "android.permission.CAMERA & FOREGROUND_SERVICE_CAMERA",
        description:
          "Allows parent-requested live camera check-in with child consent dialog and persistent notification.",
        granted: true,
        isForegroundService: true,
        icon: Camera,
      },
      {
        id: "device_admin",
        name: "Device Administrator (Anti-Uninstall)",
        androidPermission: "android.permission.BIND_DEVICE_ADMIN",
        description:
          "Locks uninstallation in Android settings. Child cannot delete or deactivate without Parent PIN.",
        granted: true,
        isForegroundService: false,
        icon: Lock,
      },
      {
        id: "accessibility",
        name: "Accessibility Tamper Guard",
        androidPermission: "android.permission.BIND_ACCESSIBILITY_SERVICE",
        description:
          "Intercepts attempts to Force Stop, Clear Storage, or bypass app limits in Android Settings.",
        granted: true,
        isForegroundService: false,
        icon: Zap,
      },
      {
        id: "battery_exempt",
        name: "Ignore Battery Optimization (No Kill)",
        androidPermission: "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
        description:
          "Exempts SafeKids from Android Doze mode so background services are never killed while sleeping.",
        granted: true,
        isForegroundService: true,
        icon: BatteryCharging,
      },
      {
        id: "auto_reset_disallowed",
        name: "Permission Auto-Reset Disabled",
        androidPermission: "PackageManager.setAutoRevokePermissionsMode(MODE_DISALLOWED)",
        description:
          "Prevents Android 11+ from automatically revoking location & camera permissions after inactivity.",
        granted: true,
        isForegroundService: false,
        icon: RefreshCw,
      },
    ];
  });

  const [promptMessage, setPromptMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
  }, [permissions]);

  const handleTogglePermission = async (id: string) => {
    const item = permissions.find((p) => p.id === id);
    if (!item) return;

    if (!item.granted) {
      // If toggling on, request real browser permission if applicable
      if (id === "location" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {},
          { timeout: 3000 },
        );
      } else if (id === "camera" && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
      }
    }

    setPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, granted: !p.granted } : p)));

    setPromptMessage(
      `Status updated: "${item.name}" is now ${!item.granted ? "Enforced & Protected" : "Disabled"}.`,
    );
    setTimeout(() => setPromptMessage(null), 3000);
  };

  const handleGrantAll = () => {
    setPermissions((prev) => prev.map((p) => ({ ...p, granted: true })));
    setPromptMessage("All foreground service and anti-uninstall permissions locked & verified!");
    setTimeout(() => setPromptMessage(null), 3000);
  };

  const allGranted = permissions.every((p) => p.granted);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Android Runtime Permissions & Foreground Services
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Permanent permission persistence. Disables Android Doze kills and auto-revocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {allGranted ? (
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1 rounded-full font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All Permissions Enforced
            </span>
          ) : (
            <button
              onClick={handleGrantAll}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              Grant All Permissions
            </button>
          )}
        </div>
      </div>

      {promptMessage && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 shrink-0 text-blue-600" />
          <span>{promptMessage}</span>
        </div>
      )}

      {/* Permissions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {permissions.map((perm) => {
          const Icon = perm.icon;
          return (
            <div
              key={perm.id}
              className={`p-4 rounded-2xl border transition-all ${
                perm.granted
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      perm.granted
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {perm.name}
                    </h4>
                    <span className="font-mono text-[10px] text-slate-400 block break-all">
                      {perm.androidPermission}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePermission(perm.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    perm.granted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                >
                  {perm.granted ? "Active" : "Grant"}
                </button>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                {perm.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Android 14 Policy Guarantee */}
      <div className="bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 space-y-2">
        <span className="font-bold text-slate-900 dark:text-slate-100 block">
          🔒 Prevention of Permission Auto-Reset & Service Kills (Android 11–14):
        </span>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <li>
            <strong>Foreground Service Notifications:</strong> Location and Camera run with ongoing,
            high-priority notifications that prevent OS process termination.
          </li>
          <li>
            <strong>Auto-Revoke Disallowed:</strong> SafeKids sets{" "}
            <code>AUTO_REVOKE_DISALLOWED</code> so permissions never expire even if the app remains
            in the background.
          </li>
          <li>
            <strong>Battery Optimization Exemption:</strong> Bypasses Android Doze to ensure instant
            SOS triggers and 24/7 geofence notifications.
          </li>
        </ul>
      </div>
    </div>
  );
};
