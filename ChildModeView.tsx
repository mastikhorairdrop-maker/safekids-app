import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Clock,
  Moon,
  Lock,
  Unlock,
  Globe,
  Compass,
  PhoneCall,
  Send,
  Camera,
  Monitor,
  Volume2,
  CheckCircle2,
  X,
  ExternalLink,
  MessageSquare,
  Sparkles,
  BookOpen,
  GraduationCap,
  Youtube,
  Gamepad2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { ChildDevice, AlertItem } from "../types/safekids";
import {
  triggerSOS,
  requestTimeExtension,
  respondCameraRequest,
  respondScreenRequest,
  sendChildHeartbeat,
  sendMessage,
} from "../services/api";
import { playSOSSiren, playNotificationChime, playRequestIncomingBell } from "../utils/audio";
import { checkUrlAllowed, CURATED_SAFE_SITES } from "../utils/webfilter";
import { reverseGeocode } from "../utils/geofence";

interface ChildModeViewProps {
  child: ChildDevice;
  onExitChildMode: () => void;
  onRefresh: () => void;
}

export const ChildModeView: React.FC<ChildModeViewProps> = ({
  child,
  onExitChildMode,
  onRefresh,
}) => {
  // SOS State
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const sirenStopFnRef = useRef<(() => void) | null>(null);

  // Time Request Modal
  const [showTimeRequestModal, setShowTimeRequestModal] = useState(false);
  const [requestMinutes, setRequestMinutes] = useState(30);
  const [requestReason, setRequestReason] = useState("Finishing school assignment");
  const [timeRequestSent, setTimeRequestSent] = useState(false);

  // Safe Browser State
  const [browserUrl, setBrowserUrl] = useState("");
  const [currentBrowserPage, setCurrentBrowserPage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [blockedAttempt, setBlockedAttempt] = useState<{ url: string; reason?: string } | null>(
    null,
  );

  // Chat message to parent
  const [quickMsg, setQuickMsg] = useState("");
  const [chatSent, setChatSent] = useState(false);

  // Camera / Screen Sharing Stream
  const [isSharingMedia, setIsSharingMedia] = useState(false);
  const [mediaType, setMediaType] = useState<"camera" | "screen" | null>(null);
  const activeMediaStreamRef = useRef<MediaStream | null>(null);
  const childVideoRef = useRef<HTMLVideoElement>(null);

  // Simulated GPS position
  const [currentCoords, setCurrentCoords] = useState({
    lat: child.location.latitude,
    lng: child.location.longitude,
  });

  // Track battery using navigator.getBattery if supported
  const [batteryLevel, setBatteryLevel] = useState(child.batteryLevel);
  const [isCharging, setIsCharging] = useState(child.isCharging);

  useEffect(() => {
    if ("getBattery" in navigator) {
      try {
        (navigator as any)
          .getBattery()
          .then((battery: any) => {
            if (!battery) return;
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
            battery.addEventListener("levelchange", () => {
              setBatteryLevel(Math.round(battery.level * 100));
            });
            battery.addEventListener("chargingchange", () => {
              setIsCharging(battery.charging);
            });
          })
          .catch(() => {
            // battery api restricted in iframe
          });
      } catch {
        // ignore
      }
    }

    // Try real geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          const address = await reverseGeocode(lat, lng);
          sendChildHeartbeat(child.id, {
            batteryLevel,
            isCharging,
            location: {
              latitude: lat,
              longitude: lng,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed,
              address,
            },
          });
        },
        () => {
          // ignore or keep default
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, [child.id]);

  // Periodic heartbeat sync to server
  useEffect(() => {
    const timer = setInterval(() => {
      sendChildHeartbeat(child.id, {
        batteryLevel,
        isCharging,
      });
      onRefresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [child.id, batteryLevel, isCharging, onRefresh]);

  // Check incoming camera / screen requests from parent
  const cameraRequest = child.activeSessions?.cameraRequest;
  const screenRequest = child.activeSessions?.screenRequest;

  useEffect(() => {
    if (cameraRequest && cameraRequest.status === "pending") {
      playRequestIncomingBell();
    }
    if (screenRequest && screenRequest.status === "pending") {
      playRequestIncomingBell();
    }
  }, [cameraRequest?.status, screenRequest?.status]);

  // Trigger Emergency SOS
  const handleTriggerSOS = async () => {
    setSosActive(true);
    const stopFn = playSOSSiren(6);
    sirenStopFnRef.current = stopFn;

    // Send to backend
    await triggerSOS(child.id, currentCoords.lat, currentCoords.lng);
    onRefresh();
  };

  const handleCancelSOS = () => {
    if (sirenStopFnRef.current) {
      sirenStopFnRef.current();
      sirenStopFnRef.current = null;
    }
    setSosActive(false);
  };

  // Safe Browser Navigate
  const handleNavigateBrowser = (urlToOpen: string) => {
    setBlockedAttempt(null);
    let target = urlToOpen.trim();
    if (!target) return;

    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }

    // Filter validation
    const result = checkUrlAllowed(
      target,
      child.webFilter.blockedCategories,
      child.webFilter.blockedDomains,
      child.webFilter.allowedDomains,
    );

    if (!result.allowed) {
      setBlockedAttempt({
        url: target,
        ...(result.blockedReason ? { reason: result.blockedReason } : {}),
      });
      setCurrentBrowserPage(null);
      // Log blocked attempt to parent
      sendChildHeartbeat(child.id, {});
      return;
    }

    // Allowed
    let title = target;
    try {
      title = new URL(target).hostname;
    } catch {}
    setCurrentBrowserPage({ url: target, title });
    setBrowserUrl(target);
  };

  // Handle Parent Camera Request Accept
  const handleAcceptCamera = async () => {
    try {
      const facing = cameraRequest?.facingMode || "user";
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      activeMediaStreamRef.current = stream;
      setIsSharingMedia(true);
      setMediaType("camera");
      if (childVideoRef.current) {
        childVideoRef.current.srcObject = stream;
      }
      await respondCameraRequest(child.id, "accepted");
      onRefresh();
    } catch (e: any) {
      alert("Camera permission denied or camera device not found: " + e.message);
      await respondCameraRequest(child.id, "denied");
    }
  };

  const handleDeclineCamera = async () => {
    await respondCameraRequest(child.id, "denied");
    onRefresh();
  };

  // Handle Parent Screen Share Request Accept
  const handleAcceptScreen = async () => {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        alert("Screen sharing is not supported on this device/browser.");
        await respondScreenRequest(child.id, "denied");
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      if (track)
        track.onended = () => {
          handleStopSharing();
        };
      activeMediaStreamRef.current = stream;
      setIsSharingMedia(true);
      setMediaType("screen");
      if (childVideoRef.current) {
        childVideoRef.current.srcObject = stream;
      }
      await respondScreenRequest(child.id, "accepted");
      onRefresh();
    } catch (e: any) {
      await respondScreenRequest(child.id, "denied");
    }
  };

  const handleDeclineScreen = async () => {
    await respondScreenRequest(child.id, "denied");
    onRefresh();
  };

  const handleStopSharing = async () => {
    if (activeMediaStreamRef.current) {
      activeMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      activeMediaStreamRef.current = null;
    }
    setIsSharingMedia(false);
    if (mediaType === "camera") {
      await respondCameraRequest(child.id, "ended");
    } else {
      await respondScreenRequest(child.id, "ended");
    }
    setMediaType(null);
    onRefresh();
  };

  // Time Extension Submission
  const handleSubmitTimeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestTimeExtension(child.id, requestMinutes, requestReason);
    setTimeRequestSent(true);
    setTimeout(() => {
      setTimeRequestSent(false);
      setShowTimeRequestModal(false);
    }, 2000);
    onRefresh();
  };

  // Send message to parent
  const handleSendChat = async () => {
    if (!quickMsg.trim()) return;
    await sendMessage(child.id, "child", quickMsg.trim());
    setQuickMsg("");
    setChatSent(true);
    setTimeout(() => setChatSent(false), 2000);
    onRefresh();
  };

  const remainingMinutes = Math.max(
    0,
    child.screenTime.dailyLimitMinutes - child.screenTime.todayUsageMinutes,
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between pb-10">
      {/* Top Child Device Status Bar */}
      <header className="bg-slate-950/80 backdrop-blur-md px-4 py-3 border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-lg flex items-center justify-center shadow-md">
            {child.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">{child.name}&apos;s Phone</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono">
                SAFE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{child.deviceModel}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {isCharging ? (
                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Battery className="w-3 h-3 text-slate-300" />
                )}
                {batteryLevel}%
              </span>
            </div>
          </div>
        </div>

        {/* Exit Child Mode (Parent PIN Protected) */}
        <button
          onClick={onExitChildMode}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-blue-400" /> Parent Exit
        </button>
      </header>

      {/* Floating Active Privacy Indicator (When camera or screen sharing is active) */}
      {isSharingMedia && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-lg sticky top-[57px] z-40 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
            <span>
              LIVE {mediaType === "camera" ? "CAMERA" : "SCREEN"} SHARING IS ACTIVE WITH YOUR
              PARENTS
            </span>
          </div>
          <button
            onClick={handleStopSharing}
            className="px-2.5 py-1 bg-white text-emerald-800 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            STOP SHARING
          </button>
        </div>
      )}

      {/* Main Child Interface Content */}
      <main className="max-w-xl mx-auto w-full p-4 space-y-5 flex-1">
        {/* Emergency SOS Banner Card */}
        <section
          className={`rounded-3xl p-5 border transition-all text-center ${
            sosActive
              ? "bg-rose-950/80 border-rose-500 shadow-2xl shadow-rose-900/50 animate-bounce"
              : "bg-gradient-to-b from-rose-900/40 to-slate-900 border-rose-900/60"
          }`}
        >
          {sosActive ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-600 mx-auto flex items-center justify-center animate-ping">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-black text-rose-300 tracking-wider">
                🚨 SOS ALERT TRANSMITTED!
              </h2>
              <p className="text-xs text-rose-200">
                Your parents have been notified with your exact GPS coordinates and high-priority
                siren.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleCancelSOS}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600"
                >
                  I Am Safe (Cancel SOS)
                </button>
                <a
                  href="tel:911"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call Emergency (911)
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-widest">
                <Shield className="w-4 h-4" /> Emergency Protection
              </div>
              <button
                onClick={handleTriggerSOS}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-base shadow-lg shadow-rose-700/40 active:scale-95 transition-all flex items-center justify-center gap-2 tracking-wide"
              >
                <AlertTriangle className="w-5 h-5 text-yellow-300" /> TAP FOR EMERGENCY SOS
              </button>
              <p className="text-[11px] text-slate-400">
                Instantly alerts your parents, shares your GPS, and sounds an audible emergency
                siren.
              </p>
            </div>
          )}
        </section>

        {/* Screen Time Remaining Widget */}
        <section className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Daily Screen Time</h3>
                <p className="text-xs text-slate-400">
                  {remainingMinutes > 0
                    ? `${remainingMinutes} minutes remaining`
                    : "Daily time limit reached!"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowTimeRequestModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Ask for Time
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  remainingMinutes <= 15 ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(100, (child.screenTime.todayUsageMinutes / Math.max(1, child.screenTime.dailyLimitMinutes)) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
              <span>Used: {child.screenTime.todayUsageMinutes}m</span>
              <span>Limit: {child.screenTime.dailyLimitMinutes}m</span>
            </div>
          </div>
        </section>

        {/* Child Safe Browser Sandbox */}
        <section className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Safe Web Explorer</h3>
                <p className="text-[11px] text-slate-400">SafeSearch & Filter Active</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-medium border border-emerald-500/30">
              Filtered
            </span>
          </div>

          {/* URL Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={browserUrl}
              onChange={(e) => setBrowserUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNavigateBrowser(browserUrl)}
              placeholder="Search or enter website (e.g. wikipedia.org)..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleNavigateBrowser(browserUrl)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Go
            </button>
          </div>

          {/* Blocked URL Banner */}
          {blockedAttempt && (
            <div className="bg-rose-950/70 border border-rose-600/70 rounded-xl p-3 text-xs text-rose-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Website Blocked by SafeKids Filter</span>
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                {blockedAttempt.reason || "This site is not permitted under family safety rules."}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    await sendMessage(
                      child.id,
                      "child",
                      `Dad/Mom, can you please unblock "${blockedAttempt.url}"? I need it for research.`,
                    );
                    alert("Request sent to parents!");
                    setBlockedAttempt(null);
                  }}
                  className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold"
                >
                  Ask Parent to Unblock
                </button>
                <button
                  onClick={() => setBlockedAttempt(null)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Active Safe Browser Page Preview */}
          {currentBrowserPage && !blockedAttempt && (
            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-950 px-3 py-2 text-xs flex items-center justify-between border-b border-slate-800">
                <span className="font-mono text-[11px] text-emerald-400 truncate max-w-[240px]">
                  🔒 {currentBrowserPage.url}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={currentBrowserPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setCurrentBrowserPage(null)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-300">
                  Safely navigated to <strong>{currentBrowserPage.title}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Protected with parental content filter & tracking blocker.
                </p>
              </div>
            </div>
          )}

          {/* Curated Kid Safe Bookmarks */}
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block mb-2">
              Verified Kid-Friendly Websites:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CURATED_SAFE_SITES.slice(0, 4).map((site) => (
                <button
                  key={site.name}
                  onClick={() => handleNavigateBrowser(site.url)}
                  className="p-2.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 rounded-xl text-left transition-all group"
                >
                  <span className="text-base block mb-1">{site.icon}</span>
                  <span className="font-medium text-xs text-slate-200 group-hover:text-blue-400 block truncate">
                    {site.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">{site.category}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Intercom to Parents */}
        <section className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Parent Intercom</h3>
                <p className="text-[11px] text-slate-400">Direct instant check-in message</p>
              </div>
            </div>
            {chatSent && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sent!
              </span>
            )}
          </div>

          {/* Quick Reply Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {[
              "I am safe at home 👍",
              "Finished homework 📚",
              "Can I have 15m more?",
              "Please call me 📞",
            ].map((preset) => (
              <button
                key={preset}
                onClick={async () => {
                  await sendMessage(child.id, "child", preset);
                  setChatSent(true);
                  setTimeout(() => setChatSent(false), 2000);
                  onRefresh();
                }}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 rounded-lg whitespace-nowrap transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={quickMsg}
              onChange={(e) => setQuickMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Send message to parents..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSendChat}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Anti-Uninstall & Device Protection Status Bar */}
        <section className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 text-center space-y-1.5 shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Anti-Uninstall & Device Admin Protected</span>
          </div>
          <p className="text-[11px] text-slate-500">
            SafeKids is locked to this device. Deleting or disabling this app requires Parent Master
            PIN authorization.
          </p>
        </section>

        {/* Child Mode Footer with Developer Branding */}
        <footer className="text-center py-2 text-xs text-slate-500 space-y-1">
          <p className="text-[11px]">
            SafeKids Child Shield • Developed by{" "}
            <strong className="text-slate-300 font-bold">Rajan Vishwakarma</strong>
          </p>
        </footer>

        {/* Hidden video element for local stream feedback */}
        <video ref={childVideoRef} autoPlay playsInline muted className="hidden" />
      </main>

      {/* Modal: Parent Incoming Camera Request */}
      {cameraRequest && cameraRequest.status === "pending" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/30 text-blue-400 mx-auto flex items-center justify-center animate-bounce">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Parent Video Check-In</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your parent is requesting a 2-minute live camera look-in.
              </p>
              {cameraRequest.reason && (
                <div className="bg-slate-800 p-2 rounded-xl text-xs text-slate-400 mt-2 italic">
                  &quot;{cameraRequest.reason}&quot;
                </div>
              )}
            </div>

            <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-800 text-[11px] text-blue-200">
              🛡️ SafeKids Notice: You have full control. You can accept or deny. You can stop
              sharing at any second.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDeclineCamera}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptCamera}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30"
              >
                Accept & Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Parent Incoming Screen Share Request */}
      {screenRequest && screenRequest.status === "pending" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 text-indigo-400 mx-auto flex items-center justify-center animate-bounce">
              <Monitor className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Screen Sharing Request</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your parent requested to review your screen via Android MediaProjection.
              </p>
              {screenRequest.reason && (
                <div className="bg-slate-800 p-2 rounded-xl text-xs text-slate-400 mt-2 italic">
                  &quot;{screenRequest.reason}&quot;
                </div>
              )}
            </div>

            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800 text-[11px] text-indigo-200">
              🛡️ SafeKids Notice: Android will display an official permission prompt. You can end
              screen sharing at any time.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDeclineScreen}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptScreen}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Allow Screen Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Time Extension */}
      {showTimeRequestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" /> Ask for Screen Time
              </h3>
              <button
                onClick={() => setShowTimeRequestModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {timeRequestSent ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white">Request Sent to Parents!</h4>
                <p className="text-xs text-slate-400">
                  They will receive a notification to approve your time.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTimeRequest} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    How many minutes do you need?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[15, 30, 45].map((mins) => (
                      <button
                        type="button"
                        key={mins}
                        onClick={() => setRequestMinutes(mins)}
                        className={`py-2 text-xs rounded-xl font-bold border transition-all ${
                          requestMinutes === mins
                            ? "bg-blue-600 text-white border-blue-500"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        +{mins} mins
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    What are you working on?
                  </label>
                  <input
                    type="text"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    required
                    placeholder="e.g. Science project, Reading, Math..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                >
                  Send Request to Parents
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
