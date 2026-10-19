import React, { useState, useEffect } from "react";
import {
  Shield,
  MapPin,
  Clock,
  Smartphone,
  Globe,
  Camera,
  MessageSquare,
  AlertTriangle,
  Code2,
  Plus,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  CheckCircle2,
  Moon,
  Sun,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  ChevronRight,
  Trash2,
  Send,
  Eye,
  Check,
  X,
  Volume2,
  Share2,
  Gamepad2,
  Youtube,
  BookOpen,
  GraduationCap,
  Compass,
  Download,
  FileArchive,
  ShieldCheck,
  ShieldAlert,
  Info,
  Settings,
  LogOut,
  UserCircle,
} from "lucide-react";
import { LiveActivityCard } from "./LiveActivityCard";
import { DBState, ChildDevice, SafeZone, AppRule } from "../types/safekids";
import { downloadProjectAsZip } from "../utils/exportProjectZip";
import { SafeKidsMap } from "./SafeKidsMap";
import { CameraScreenSession } from "./CameraScreenSession";
import { AndroidNativeKit } from "./AndroidNativeKit";
import { DevicePairingModal } from "./DevicePairingModal";
import { SafeZonesModal } from "./SafeZonesModal";
import { AboutModal } from "./AboutModal";
import { ChildPermissionsShield } from "./ChildPermissionsShield";
import {
  updateScreenLimits,
  updateAppRule,
  updateWebFilter,
  respondTimeExtension,
  sendMessage,
  markAlertsAsRead,
  sendChildHeartbeat,
  updateAntiUninstallSettings,
  reportTamperAttempt,
} from "../services/api";
import { FILTER_CATEGORIES, checkUrlAllowed } from "../utils/webfilter";
import { reverseGeocode } from "../utils/geofence";

interface ParentDashboardProps {
  state: DBState;
  onRefresh: () => void;
  onSwitchToChildMode: (childId: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onChangePinRequested: () => void;
  onLogout: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  state,
  onRefresh,
  onSwitchToChildMode,
  darkMode,
  onToggleDarkMode,
  onChangePinRequested,
  onLogout,
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>(state.children[0]?.id || "");
  const [activeTab, setActiveTab] = useState<
    | "location"
    | "screentime"
    | "apps"
    | "webfilter"
    | "camera"
    | "messages"
    | "alerts"
    | "antiuninstall"
    | "androidkit"
    | "settings"
  >("location");

  // Modals
  const [showPairModal, setShowPairModal] = useState(false);
  const [showSafeZonesModal, setShowSafeZonesModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Anti-Uninstall Test Simulator Modal
  const [showTestUninstallModal, setShowTestUninstallModal] = useState(false);
  const [simulatedPin, setSimulatedPin] = useState("");
  const [simulatedError, setSimulatedError] = useState<string | null>(null);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  // Quick message input
  const [messageInput, setMessageInput] = useState("");

  // Web filter live tester
  const [testUrlInput, setTestUrlInput] = useState("discord.com");
  const [testResult, setTestResult] = useState<any>(null);

  // New domain inputs
  const [newBlockedDomain, setNewBlockedDomain] = useState("");
  const [newAllowedDomain, setNewAllowedDomain] = useState("");

  // Selected child object
  const activeChild = state.children.find((c) => c.id === selectedChildId) || state.children[0];

  // Active SOS alert if any
  const activeSOS = state.alerts.find(
    (a) => a.type === "sos" && Date.now() - new Date(a.timestamp).getTime() < 30 * 60000,
  );

  // Handle live URL test
  const handleTestUrl = () => {
    if (!activeChild || !testUrlInput.trim()) return;
    const res = checkUrlAllowed(
      testUrlInput,
      activeChild.webFilter.blockedCategories,
      activeChild.webFilter.blockedDomains,
      activeChild.webFilter.allowedDomains,
    );
    setTestResult(res);
  };

  // Quick simulation slider: Move child GPS to test geofencing
  const handleSimulateGPS = async (targetLat: number, targetLng: number, addressDesc: string) => {
    if (!activeChild) return;
    const address = await reverseGeocode(targetLat, targetLng);
    await sendChildHeartbeat(activeChild.id, {
      location: {
        latitude: targetLat,
        longitude: targetLng,
        accuracy: 8,
        speed: 1.1,
        address: addressDesc || address,
      },
    });
    onRefresh();
  };

  // Toggle Category Filter
  const handleToggleCategory = async (categoryId: string) => {
    if (!activeChild) return;
    const current = activeChild.webFilter.blockedCategories;
    const updated = current.includes(categoryId)
      ? current.filter((c) => c !== categoryId)
      : [...current, categoryId];

    await updateWebFilter(activeChild.id, { blockedCategories: updated });
    onRefresh();
  };

  // Add Blocked Domain
  const handleAddBlockedDomain = async () => {
    if (!activeChild || !newBlockedDomain.trim()) return;
    const clean = newBlockedDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "");
    const updated = [...activeChild.webFilter.blockedDomains, clean];
    await updateWebFilter(activeChild.id, { blockedDomains: updated });
    setNewBlockedDomain("");
    onRefresh();
  };

  // Remove Blocked Domain
  const handleRemoveBlockedDomain = async (domain: string) => {
    if (!activeChild) return;
    const updated = activeChild.webFilter.blockedDomains.filter((d) => d !== domain);
    await updateWebFilter(activeChild.id, { blockedDomains: updated });
    onRefresh();
  };

  // Add Allowed Domain
  const handleAddAllowedDomain = async () => {
    if (!activeChild || !newAllowedDomain.trim()) return;
    const clean = newAllowedDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "");
    const updated = [...activeChild.webFilter.allowedDomains, clean];
    await updateWebFilter(activeChild.id, { allowedDomains: updated });
    setNewAllowedDomain("");
    onRefresh();
  };

  // Remove Allowed Domain
  const handleRemoveAllowedDomain = async (domain: string) => {
    if (!activeChild) return;
    const updated = activeChild.webFilter.allowedDomains.filter((d) => d !== domain);
    await updateWebFilter(activeChild.id, { allowedDomains: updated });
    onRefresh();
  };

  // Send message from parent
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild || !messageInput.trim()) return;
    await sendMessage(activeChild.id, "parent", messageInput.trim());
    setMessageInput("");
    onRefresh();
  };

  // Child messages
  const childMessages = state.messages.filter((m) => m.childId === activeChild?.id);

  if (!activeChild) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">No Paired Child Devices</h2>
        <button
          onClick={() => setShowPairModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl"
        >
          Pair First Child Device
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* High-Priority SOS Alert Banner */}
      {activeSOS && (
        <div className="bg-rose-600 text-white px-4 py-3 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-300" />
            </span>
            <div>
              <span className="font-black text-sm uppercase tracking-wide">{activeSOS.title}</span>
              <p className="text-xs text-rose-100">{activeSOS.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => markAlertsAsRead(activeSOS.id)}
              className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors"
            >
              Acknowledge Alert
            </button>
          </div>
        </div>
      )}

      {/* Main Parent Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo & Free Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
                  SafeKids
                </h1>
                <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-300 dark:border-emerald-800">
                  100% FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Open-Source Parental Control & Child Safety
              </p>
            </div>
          </div>

          {/* Child Device Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {state.children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                  c.id === activeChild.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{c.avatar}</span>
                <span>{c.name}</span>
                <span className="text-[10px] opacity-80">({c.batteryLevel}%)</span>
              </button>
            ))}

            <button
              onClick={() => setShowPairModal(true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1 shrink-0 border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" /> Pair Device
            </button>
          </div>

          {/* Top Actions: Dark Mode, Switch to Child Mode, Settings */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onSwitchToChildMode(activeChild.id)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" /> View Child Phone
            </button>

            <button
              onClick={onChangePinRequested}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Parent PIN Settings"
            >
              <Lock className="w-4 h-4 text-blue-500" />
            </button>

            <button
              onClick={() => setShowAboutModal(true)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="About SafeKids & Developer (Rajan Vishwakarma)"
            >
              <Info className="w-4 h-4 text-indigo-500" />
            </button>
          </div>
        </div>

        {/* Selected Child Sub-Bar */}
        <div className="bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-800/60 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {activeChild.name}&apos;s Device:
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {activeChild.deviceModel} ({activeChild.osVersion})
              </span>
              <span className="flex items-center gap-1">
                {activeChild.isCharging ? (
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Battery className="w-3.5 h-3.5 text-slate-400" />
                )}
                {activeChild.batteryLevel}%
              </span>
              <span className="flex items-center gap-1">
                {activeChild.isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Offline
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
              <span className="truncate max-w-xs">📍 {activeChild.location.address}</span>
              <button
                onClick={onRefresh}
                className="hover:text-blue-600 flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" /> Sync
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2 py-2">
            {[
              { id: "location", label: "Live Location & Safe Zones", icon: MapPin },
              { id: "screentime", label: "Screen Time & Limits", icon: Clock },
              { id: "apps", label: "App Controls", icon: Smartphone },
              { id: "webfilter", label: "Web Filter & SafeSearch", icon: Globe },
              { id: "camera", label: "Remote Look-In", icon: Camera },
              { id: "messages", label: "Intercom", icon: MessageSquare },
              { id: "antiuninstall", label: "Anti-Uninstall & Admin Lock", icon: ShieldCheck },
              {
                id: "alerts",
                label: "Alerts Center",
                icon: AlertTriangle,
                badge: state.alerts.filter((a) => !a.read).length,
              },
              { id: "androidkit", label: "Android Play Store Kit", icon: Code2 },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge ? (
                    <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* TAB 1: LOCATION & SAFE ZONES */}
        {activeTab === "location" && (
          <div className="space-y-6">
            {/* Live Screen View / Activity */}
            <LiveActivityCard child={activeChild} />

            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Live GPS Tracking & Geofences
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real GPS coordinates with OpenStreetMap high-accuracy telemetry
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSafeZonesModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5" /> Manage Safe Zones (
                  {activeChild.safeZones.length})
                </button>
              </div>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="relative">
              <SafeKidsMap
                location={activeChild.location}
                safeZones={activeChild.safeZones}
                locationHistory={activeChild.locationHistory}
                childName={activeChild.name}
                isOnline={activeChild.isOnline}
                batteryLevel={activeChild.batteryLevel}
                className="h-[440px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800"
              />

              {/* Floating Map Legend */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 border border-white"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeChild.name}&apos;s Live Pin
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-600"></span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Safe Zones ({activeChild.safeZones.filter((z) => z.enabled).length} Active)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-indigo-500 rounded"></span>
                  <span className="text-slate-600 dark:text-slate-400">Travel Path History</span>
                </div>
              </div>
            </div>

            {/* Simulation Quick Bar (Allows testing safe-zone triggers without walking) */}
            <div className="bg-blue-50/70 dark:bg-slate-900 p-4 rounded-2xl border border-blue-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Test Location Simulation (Parent Demo Mode)
                </span>
                <span className="text-[11px] text-slate-500">
                  Simulate child moving between coordinates
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleSimulateGPS(37.7749, -122.4194, "Home (Safe Zone)")}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  🏡 Teleport to Home
                </button>
                <button
                  onClick={() =>
                    handleSimulateGPS(37.778, -122.415, "Lincoln Middle School (Safe Zone)")
                  }
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  🏫 Move to School
                </button>
                <button
                  onClick={() =>
                    handleSimulateGPS(37.785, -122.402, "Yerba Buena Park (Safe Zone)")
                  }
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  🌳 Move to Park
                </button>
                <button
                  onClick={() =>
                    handleSimulateGPS(37.79, -122.39, "Embarcadero Pier 14 (Outside Safe Zone)")
                  }
                  className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-medium border border-amber-300 dark:border-amber-800"
                >
                  ⚠️ Walk Outside Safe Zones
                </button>
              </div>
            </div>

            {/* Location History Log */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Recent Location Breadcrumbs
              </h3>
              <div className="space-y-2">
                {activeChild.locationHistory.slice(0, 5).map((point, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {point.address}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {point.latitude.toFixed(4)}°, {point.longitude.toFixed(4)}°
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(point.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCREEN TIME & SCHEDULES */}
        {activeTab === "screentime" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Daily Allowance Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Daily Screen Allowance
                  </span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {Math.floor(activeChild.screenTime.dailyLimitMinutes / 60)}h{" "}
                    {activeChild.screenTime.dailyLimitMinutes % 60}m
                  </div>
                  <p className="text-xs text-slate-500">
                    Today&apos;s usage: {activeChild.screenTime.todayUsageMinutes} mins (
                    {Math.max(
                      0,
                      activeChild.screenTime.dailyLimitMinutes -
                        activeChild.screenTime.todayUsageMinutes,
                    )}{" "}
                    mins left)
                  </p>
                </div>

                {/* Adjust Stepper */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() =>
                      updateScreenLimits(activeChild.id, {
                        dailyLimitMinutes: Math.max(
                          30,
                          activeChild.screenTime.dailyLimitMinutes - 15,
                        ),
                      }).then(onRefresh)
                    }
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold"
                  >
                    -15 mins
                  </button>
                  <button
                    onClick={() =>
                      updateScreenLimits(activeChild.id, {
                        dailyLimitMinutes: activeChild.screenTime.dailyLimitMinutes + 30,
                      }).then(onRefresh)
                    }
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    +30 mins
                  </button>
                </div>
              </div>

              {/* Bedtime Lock Schedule */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Bedtime Downtime
                  </span>
                  <Moon className="w-4 h-4 text-indigo-500" />
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      Lock device at night:
                    </span>
                    <input
                      type="checkbox"
                      checked={activeChild.screenTime.bedtimeEnforced}
                      onChange={(e) =>
                        updateScreenLimits(activeChild.id, {
                          bedtimeEnforced: e.target.checked,
                        }).then(onRefresh)
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Bedtime Starts
                      </label>
                      <input
                        type="time"
                        value={activeChild.screenTime.bedtimeStart}
                        onChange={(e) =>
                          updateScreenLimits(activeChild.id, {
                            bedtimeStart: e.target.value,
                          }).then(onRefresh)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Bedtime Ends</label>
                      <input
                        type="time"
                        value={activeChild.screenTime.bedtimeEnd}
                        onChange={(e) =>
                          updateScreenLimits(activeChild.id, {
                            bedtimeEnd: e.target.value,
                          }).then(onRefresh)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Time Request */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
                  Time Extension Requests
                </span>

                {activeChild.timeExtensionRequest &&
                activeChild.timeExtensionRequest.status === "pending" ? (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 space-y-2">
                    <span className="font-bold text-xs text-amber-800 dark:text-amber-200 block">
                      +{activeChild.timeExtensionRequest.minutes} Minutes Requested
                    </span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Reason: &quot;{activeChild.timeExtensionRequest.reason}&quot;
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() =>
                          respondTimeExtension(
                            activeChild.id,
                            "approved",
                            activeChild.timeExtensionRequest?.minutes,
                          ).then(onRefresh)
                        }
                        className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          respondTimeExtension(activeChild.id, "denied").then(onRefresh)
                        }
                        className="flex-1 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No active time extension requests from {activeChild.name}.
                  </p>
                )}
              </div>
            </div>

            {/* App Usage Distribution */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Today&apos;s Category Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  { category: "Video & Streaming", minutes: 30, color: "bg-red-500" },
                  { category: "Education & Study", minutes: 35, color: "bg-emerald-500" },
                  { category: "Games & Play", minutes: 20, color: "bg-indigo-500" },
                  { category: "Browsing & Reading", minutes: 0, color: "bg-blue-500" },
                ].map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{item.category}</span>
                      <span>{item.minutes} mins</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full`}
                        style={{
                          width: `${(item.minutes / Math.max(1, activeChild.screenTime.dailyLimitMinutes)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: APP CONTROLS & BLOCKING */}
        {activeTab === "apps" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Android App Controls & Lock Rules
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enforce daily quotas or completely lock distraction apps via Android Accessibility
                  Service.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    activeChild.screenTime.appRules.forEach((rule) => {
                      if (rule.category === "games" || rule.category === "social") {
                        updateAppRule(activeChild.id, rule.packageName, "locked");
                      }
                    });
                    setTimeout(onRefresh, 300);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                >
                  🚫 Instant Lock Games & Social
                </button>
              </div>
            </div>

            {/* Apps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeChild.screenTime.appRules.map((app) => (
                <div
                  key={app.packageName}
                  className={`p-4 rounded-2xl border transition-all ${
                    app.status === "locked"
                      ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {app.appName}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                        {app.packageName}
                      </span>
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {app.category}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        app.status === "locked"
                          ? "bg-rose-600 text-white"
                          : app.status === "limited"
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Used today: {app.usedTodayMinutes}m
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          updateAppRule(
                            activeChild.id,
                            app.packageName,
                            app.status === "locked" ? "allowed" : "locked",
                          ).then(onRefresh)
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          app.status === "locked"
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 hover:bg-rose-200"
                        }`}
                      >
                        {app.status === "locked" ? "Unlock App" : "Lock App"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WEB FILTER & SAFESEARCH */}
        {activeTab === "webfilter" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Content Category Blockers
                  </h3>
                  <p className="text-xs text-slate-500">
                    Websites matching checked categories are blocked in real-time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    SafeSearch:
                  </span>
                  <input
                    type="checkbox"
                    checked={activeChild.webFilter.safeSearchEnabled}
                    onChange={(e) =>
                      updateWebFilter(activeChild.id, {
                        safeSearchEnabled: e.target.checked,
                      }).then(onRefresh)
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FILTER_CATEGORIES.map((cat) => {
                  const isBlocked = activeChild.webFilter.blockedCategories.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleToggleCategory(cat.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isBlocked
                          ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{cat.name}</span>
                        <input
                          type="checkbox"
                          checked={isBlocked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-rose-600 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {cat.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Whitelist & Blacklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Blacklist */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Custom Blocked Domains (Blacklist)
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlockedDomain}
                    onChange={(e) => setNewBlockedDomain(e.target.value)}
                    placeholder="e.g. omegle.com, twitch.tv..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <button
                    onClick={handleAddBlockedDomain}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Block
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeChild.webFilter.blockedDomains.map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-mono text-rose-600 dark:text-rose-400">{d}</span>
                      <button
                        onClick={() => handleRemoveBlockedDomain(d)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Whitelist */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Always Allowed Domains (Whitelist)
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllowedDomain}
                    onChange={(e) => setNewAllowedDomain(e.target.value)}
                    placeholder="e.g. schoolportal.edu..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <button
                    onClick={handleAddAllowedDomain}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Allow
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeChild.webFilter.allowedDomains.map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{d}</span>
                      <button
                        onClick={() => handleRemoveAllowedDomain(d)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Filter Tester */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="font-bold text-xs uppercase tracking-wider text-blue-400 block">
                Live URL Checker & Policy Inspector
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testUrlInput}
                  onChange={(e) => setTestUrlInput(e.target.value)}
                  placeholder="Enter any domain or URL to test..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleTestUrl}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Inspect URL
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs border font-mono ${
                    testResult.allowed
                      ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                      : "bg-rose-950/60 border-rose-700 text-rose-300"
                  }`}
                >
                  <span className="font-bold">
                    {testResult.allowed ? "✓ ALLOWED" : "🛑 BLOCKED"}
                  </span>
                  {testResult.blockedReason && (
                    <span className="block mt-1">{testResult.blockedReason}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: REMOTE LOOK-IN CAMERA & SCREEN SHARE */}
        {activeTab === "camera" && (
          <CameraScreenSession child={activeChild} isParentView={true} onRefresh={onRefresh} />
        )}

        {/* TAB 6: INTERCOM & CHAT */}
        {activeTab === "messages" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Direct Intercom with {activeChild.name}
            </h3>

            {/* Chat Thread */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 h-80 overflow-y-auto space-y-3 border border-slate-200 dark:border-slate-800">
              {childMessages.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-10">
                  No messages yet. Send a quick check-in note to {activeChild.name}!
                </p>
              ) : (
                childMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "parent" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs sm:max-w-md px-3.5 py-2 rounded-2xl text-xs shadow-2xs ${
                        msg.sender === "parent"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {msg.sender === "parent" ? "You" : activeChild.name} •{" "}
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick replies for parent */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {[
                "Dinner is ready! 🍽️",
                "Time to head home 🚲",
                "Please call mom/dad 📞",
                "Great job on homework ⭐",
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={async () => {
                    await sendMessage(activeChild.id, "parent", preset);
                    onRefresh();
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg whitespace-nowrap"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message ${activeChild.name}...`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        )}

        {/* TAB 7: ALERTS CENTER */}
        {activeTab === "alerts" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Safety Alerts & Notifications
                </h3>
                <p className="text-xs text-slate-500">
                  SOS pings, geofence enter/exit, low battery, and filter triggers
                </p>
              </div>
              <button
                onClick={() => markAlertsAsRead(undefined, true).then(onRefresh)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
              >
                Mark All Read
              </button>
            </div>

            <div className="space-y-2.5">
              {state.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    alert.severity === "critical"
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900"
                      : alert.severity === "warning"
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      {alert.title}
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {!alert.read && (
                    <button
                      onClick={() => markAlertsAsRead(alert.id).then(onRefresh)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border rounded text-[11px] font-medium shrink-0"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7b: ANTI-UNINSTALL & DEVICE ADMIN PROTECTION */}
        {activeTab === "antiuninstall" && (
          <div className="space-y-6">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl border border-indigo-900/60 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-6 h-6" />
                    </span>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">
                        Strict Anti-Uninstall & Device Protection
                      </h2>
                      <span className="text-xs text-indigo-200">
                        Device Admin • Settings Interceptor • Parent Master PIN Enforced
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Children cannot delete or bypass SafeKids. If uninstallation, app deactivation,
                    or cache wiping is attempted in Android Settings, SafeKids immediately redirects
                    to the Master PIN verification screen.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Protection Enforced
                  </span>
                </div>
              </div>

              {/* Status Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-indigo-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Device Admin Status
                  </span>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Active & Bound
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    SafeKidsDeviceAdmin
                  </span>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-indigo-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Accessibility Intercept
                  </span>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Guarding Settings
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    com.android.settings
                  </span>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-indigo-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Parent Master PIN
                  </span>
                  <div className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> 4-Digit Security
                  </div>
                  <span className="text-[11px] text-slate-400 block">Required for Removal</span>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-indigo-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tamper Attempts Blocked
                  </span>
                  <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />{" "}
                    {activeChild.antiUninstall?.uninstallAttemptsCount || 0} Attempts
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    {activeChild.antiUninstall?.lastTamperAttempt
                      ? `Last: ${new Date(activeChild.antiUninstall.lastTamperAttempt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Zero unauthorized attempts"}
                  </span>
                </div>
              </div>
            </div>

            {/* Test Simulation Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    Live Anti-Uninstall Simulator (Test Protection)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Experience what happens when a child attempts to uninstall SafeKids or
                    deactivate Device Admin.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSimulatedPin("");
                    setSimulatedError(null);
                    setSimulatedSuccess(false);
                    setShowTestUninstallModal(true);
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                >
                  <AlertTriangle className="w-4 h-4 text-yellow-300" />
                  Simulate Child Uninstall Attempt
                </button>
              </div>

              {/* Protection Architecture Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                      1
                    </span>
                    Android Device Administration
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    SafeKids registers as an active Device Administrator. The native Android OS
                    grays out the &quot;Uninstall&quot; button in standard app settings and warns
                    that the device administrator must be deactivated first.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    Accessibility Window Interceptor
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    If the child attempts to open Device Admin settings, SafeKids App Info, or the
                    Package Uninstaller, <code>SafeKidsAccessibilityService</code> intercepts the
                    window change, executes <code>GLOBAL_ACTION_BACK</code>, and pops up the Master
                    PIN overlay.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                      3
                    </span>
                    Device Owner (Kernel Level)
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    When activated via ADB or Knox enterprise enrollment,{" "}
                    <code>dpm.setUninstallBlocked(admin, packageName, true)</code> is enforced,
                    rendering uninstallation 100% impossible at the Android kernel level.
                  </p>
                </div>
              </div>
            </div>

            {/* Android Setup & ADB Guide */}
            <div className="bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" /> Permanent Uninstall Blocking (Device Owner Mode)
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                  Optional / For Advanced Parents
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                To make SafeKids completely impossible to uninstall even if the child boots into
                Safe Mode, run this one-time command from your computer via USB debugging:
              </p>
              <div className="bg-black/80 p-3 rounded-xl font-mono text-emerald-400 text-xs overflow-x-auto select-all">
                adb shell dpm set-device-owner
                com.safekids.parentalcontrol/.receiver.SafeKidsDeviceAdminReceiver
              </div>
              <p className="text-[11px] text-slate-400">
                This locks uninstallation directly in the Android OS framework until the parent
                enters their credentials.
              </p>
            </div>

            {/* Child Device Runtime Permissions & Foreground Services Shield */}
            <ChildPermissionsShield />
          </div>
        )}

        {/* TAB 8: ANDROID PLAY STORE & NATIVE KIT */}
        {activeTab === "androidkit" && <AndroidNativeKit />}

      {/* Simulated Child Uninstall Attempt Intercept Modal */}
      {showTestUninstallModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/30 text-rose-400 mx-auto flex items-center justify-center animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-950/60 border border-rose-800 px-2.5 py-0.5 rounded-full">
                DEVICE ADMIN INTERCEPT ACTIVE
              </span>
              <h3 className="text-base font-bold text-white mt-2">Uninstallation Blocked!</h3>
              <p className="text-xs text-slate-300 mt-1">
                SafeKids is protected by Android Device Administrator policies. Enter Master Parent
                PIN to authorize deactivation.
              </p>
            </div>

            {simulatedSuccess ? (
              <div className="bg-emerald-950/60 border border-emerald-600 p-4 rounded-2xl text-emerald-300 text-xs font-semibold space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400" />
                <p>Parent PIN Verified!</p>
                <p className="text-[11px] text-slate-300">
                  Authorized uninstallation window open for 60 seconds.
                </p>
                <button
                  onClick={() => setShowTestUninstallModal(false)}
                  className="mt-2 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={simulatedPin}
                  onChange={(e) => {
                    setSimulatedPin(e.target.value.replace(/\D/g, ""));
                    setSimulatedError(null);
                  }}
                  placeholder="Enter 4-Digit Parent PIN"
                  className="w-full text-center tracking-widest text-lg font-mono px-3 py-2.5 border rounded-xl border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-rose-500"
                />

                {simulatedError && (
                  <p className="text-xs text-rose-400 font-semibold">{simulatedError}</p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={async () => {
                      // Log tamper alert to backend
                      await reportTamperAttempt(
                        activeChild.id,
                        "Child attempted to uninstall SafeKids via Settings",
                      );
                      onRefresh();
                      setShowTestUninstallModal(false);
                    }}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel (Keep Protected)
                  </button>
                  <button
                    onClick={async () => {
                      if (simulatedPin === state.parentPin) {
                        setSimulatedSuccess(true);
                      } else {
                        setSimulatedError("Incorrect PIN. Tampering attempt reported to parents!");
                        await reportTamperAttempt(
                          activeChild.id,
                          "Failed PIN attempt while trying to uninstall SafeKids",
                        );
                        onRefresh();
                      }
                    }}
                    className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                  >
                    Verify PIN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* TAB: SETTINGS (PIN-protected area) */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-3xl mx-auto w-full p-4 sm:p-6">
            {/* Account Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-blue-600" /> Account Settings
              </h3>
              <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Parent Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {state.parentEmail || "Not set (PIN-only login)"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={onChangePinRequested}
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" /> Update Master PIN / Password
                </button>
                <button
                  onClick={onLogout}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log Out
                </button>
              </div>
            </div>

            {/* Child Device Management */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" /> Child Device Management (
                {state.children.length}/4)
              </h3>
              <div className="space-y-2">
                {state.children.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm ${
                      c.id === activeChild.id
                        ? "border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30"
                        : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                    }`}
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>{c.avatar}</span> {c.name}
                      <span className="text-[11px] font-normal text-slate-500">
                        {c.deviceModel}
                      </span>
                    </span>
                    {c.id !== activeChild.id ? (
                      <button
                        onClick={() => setSelectedChildId(c.id)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Switch to this child
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">
                        Active
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowPairModal(true)}
                disabled={state.children.length >= 4}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Child Device (QR + 6-digit code)
              </button>
              {state.children.length >= 4 && (
                <p className="text-[11px] text-amber-600 text-center font-semibold">
                  Maximum of 4 child devices reached.
                </p>
              )}
            </div>

            {/* App & Web Security Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" /> App & Web Security Controls
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveTab("screentime")}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" /> Screen Time Limits
                </button>
                <button
                  onClick={() => setActiveTab("apps")}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Block / Unblock Apps
                </button>
                <button
                  onClick={() => setActiveTab("webfilter")}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" /> Web Filters
                </button>
              </div>
            </div>

            {/* Uninstall & PIN Protection */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" /> Uninstall & PIN Protection
              </h3>
              {(
                [
                  ["deviceAdminEnabled", "Anti-Uninstall (Device Admin)"],
                  ["accessibilityLockEnabled", "Accessibility Lock"],
                  ["preventSettingsTamper", "Block Settings Tampering"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800 cursor-pointer"
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(activeChild.antiUninstall?.[key])}
                    onChange={async (e) => {
                      await updateAntiUninstallSettings(activeChild.id, {
                        [key]: e.target.checked,
                      });
                      onRefresh();
                    }}
                    className="w-5 h-5 accent-rose-600"
                  />
                </label>
              ))}
              <p className="text-[11px] text-slate-400">
                Exiting Child Mode or changing these protections always requires the Parent Master
                PIN.
              </p>
            </div>

            {/* App Info & Credits */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                SafeKids — Free Parental Control
              </p>
              <p className="text-xs text-slate-500">Version 1.0.0</p>
              <p className="text-xs text-slate-500">
                Developed by{" "}
                <strong className="text-slate-800 dark:text-slate-200">Rajan Vishwakarma</strong>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <DevicePairingModal
        isOpen={showPairModal}
        onClose={() => setShowPairModal(false)}
        onDevicePaired={onRefresh}
      />

      <SafeZonesModal
        isOpen={showSafeZonesModal}
        childId={activeChild.id}
        currentZones={activeChild.safeZones}
        currentLatitude={activeChild.location.latitude}
        currentLongitude={activeChild.location.longitude}
        onClose={() => setShowSafeZonesModal(false)}
        onSaved={onRefresh}
      />

      {/* Download Source Code Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    SafeKids Source Code (प्रोजेक्ट ज़िप डाउनलोड)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    100% Free & Open-Source Full Application
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 space-y-3">
              <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 block">
                📦 Instant Download Options:
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="/api/download-zip"
                  download="SafeKids-Complete-Project.zip"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" /> Server Direct ZIP
                </a>
                <button
                  type="button"
                  disabled={isDownloadingZip}
                  onClick={async () => {
                    setIsDownloadingZip(true);
                    try {
                      await downloadProjectAsZip();
                    } finally {
                      setIsDownloadingZip(false);
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />{" "}
                  {isDownloadingZip ? "Zipping..." : "Client Browser ZIP"}
                </button>
              </div>
            </div>

            {/* Included in the Zip */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                ज़िप फाइल में क्या-क्या शामिल है (Included in ZIP):
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                <li>
                  <strong>React 19 + TypeScript + Vite:</strong> Complete parent & child dashboard
                  with responsive design & dark mode.
                </li>
                <li>
                  <strong>Express Full-Stack Server:</strong> Pairing code generator, live sync,
                  geofencing & alerts.
                </li>
                <li>
                  <strong>OpenStreetMap (Leaflet):</strong> Real GPS tracking with safe zones
                  geofencing.
                </li>
                <li>
                  <strong>Native Android Kotlin Sources:</strong> Accessibility Service, Device
                  Admin, Location Foreground Service, MediaProjection screen sharing.
                </li>
                <li>
                  <strong>Google Play Store Kit:</strong> AndroidManifest.xml, build.gradle.kts,
                  Data Safety answers, COPPA Privacy Policy.
                </li>
              </ul>
            </div>

            {/* Run instructions */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 space-y-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold block text-[11px]">
                अपने कंप्यूटर पर चलाने का तरीका (How to run locally):
              </span>
              <div className="bg-black/60 p-2.5 rounded-lg text-[11px] space-y-1 text-slate-300 overflow-x-auto">
                <p># 1. Unzip the downloaded file</p>
                <p># 2. Open terminal inside the folder and run:</p>
                <p className="text-yellow-300 font-bold">npm install</p>
                <p className="text-yellow-300 font-bold">npm run dev</p>
                <p># 3. Open http://localhost:3000 in your browser</p>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About & Developer Attribution Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        parentPin={state.parentPin}
      />

      {/* Developer Branding Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              SafeKids Free Parental Control
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Open-Source & 100% Free
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <span>Developed by</span>
            <strong className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              Rajan Vishwakarma
            </strong>
            <span>•</span>
            <button
              onClick={() => setShowAboutModal(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              About & Specs
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
