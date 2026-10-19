import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Monitor,
  ShieldCheck,
  Video,
  VideoOff,
  RefreshCw,
  X,
  AlertTriangle,
  Eye,
  Lock,
} from "lucide-react";
import { ChildDevice } from "../types/safekids";
import {
  requestCameraLookIn,
  requestScreenShare,
  respondCameraRequest,
  respondScreenRequest,
} from "../services/api";

interface CameraScreenSessionProps {
  child: ChildDevice;
  isParentView: boolean;
  onRefresh?: () => void;
}

export const CameraScreenSession: React.FC<CameraScreenSessionProps> = ({
  child,
  isParentView,
  onRefresh,
}) => {
  const [selectedFacingMode, setSelectedFacingMode] = useState<"user" | "environment">("user");
  const [requestReason, setRequestReason] = useState("Safety & Location Check");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Real Local Media Stream (when running camera/screen)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamType, setStreamType] = useState<"camera" | "screen" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stop all active tracks
  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setIsStreaming(false);
    setStreamType(null);
  };

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalStream();
    };
  }, []);

  const handleStartParentCameraRequest = async () => {
    setIsLoading(true);
    setSessionError(null);
    try {
      const res = await requestCameraLookIn(child.id, selectedFacingMode, requestReason);
      if (!res.success) {
        setSessionError("Could not send camera look-in request. Verify child device is online.");
      } else {
        // Also provide a local camera test view if child device is on this machine
        tryLocalCamera();
      }
      if (onRefresh) onRefresh();
    } catch (e: any) {
      setSessionError(e?.message || "Error initiating camera session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartParentScreenRequest = async () => {
    setIsLoading(true);
    setSessionError(null);
    try {
      const res = await requestScreenShare(child.id, requestReason);
      if (!res.success) {
        setSessionError("Could not send screen share request. Verify child device is online.");
      } else {
        tryLocalScreenShare();
      }
      if (onRefresh) onRefresh();
    } catch (e: any) {
      setSessionError(e?.message || "Error initiating screen share session");
    } finally {
      setIsLoading(false);
    }
  };

  // Real Web Media Capture for Child / Test Device
  const tryLocalCamera = async () => {
    try {
      stopLocalStream();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: selectedFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setIsStreaming(true);
      setStreamType("camera");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access prompt declined or unsupported:", err);
      setSessionError(
        `Camera access status: ${err?.message || "Device camera permission required"}`,
      );
    }
  };

  const tryLocalScreenShare = async () => {
    try {
      stopLocalStream();
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen sharing API is not supported on this browser or environment.");
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      // Handle when child clicks standard browser "Stop Sharing" bar
      const track = stream.getVideoTracks()[0];
      if (track)
        track.onended = () => {
          stopLocalStream();
          respondScreenRequest(child.id, "ended");
        };
      setLocalStream(stream);
      setIsStreaming(true);
      setStreamType("screen");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Screen share prompt cancelled:", err);
      setSessionError(
        `Screen share status: ${err?.message || "Screen capture permission required"}`,
      );
    }
  };

  const handleEndSession = async () => {
    stopLocalStream();
    if (streamType === "camera" || child.activeSessions?.cameraRequest) {
      await respondCameraRequest(child.id, "ended");
    }
    if (streamType === "screen" || child.activeSessions?.screenRequest) {
      await respondScreenRequest(child.id, "ended");
    }
    if (onRefresh) onRefresh();
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `SafeKids-LookIn-${child.name}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      a.click();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
      {/* Header and Compliance Disclosure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
              Live Camera & Screen Check-In
            </h3>
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Google Play Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Privacy-first look-in. Never stealth or spyware: requires child consent prompt and
            visible indicator.
          </p>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Live Feed Active
            </span>
            <button
              onClick={handleEndSession}
              className="ml-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> End Session
            </button>
          </div>
        )}
      </div>

      {sessionError && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{sessionError}</span>
        </div>
      )}

      {/* Main Stream Player */}
      {isStreaming ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[460px] flex items-center justify-center border border-slate-700 shadow-inner group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />

          {/* Persistent Privacy Watermark & Controls Overlay */}
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-white text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {streamType === "camera"
                ? `Camera (${selectedFacingMode === "user" ? "Front" : "Rear"})`
                : "Live Screen"}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">{child.name}&apos;s Device</span>
          </div>

          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={takeSnapshot}
              className="bg-white/90 hover:bg-white text-slate-800 text-xs px-3 py-1.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" /> Save Snapshot
            </button>
            <button
              onClick={handleEndSession}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-1.5"
            >
              <VideoOff className="w-3.5 h-3.5" /> Stop
            </button>
          </div>
        </div>
      ) : (
        /* Action Launcher for Parent */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Live Camera Card */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Live Camera Look-In
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Parent-initiated video check-in with child approval.
                  </p>
                </div>
              </div>

              {/* Camera Facing Selector */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                  Camera Lens
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFacingMode("user")}
                    className={`px-3 py-2 text-xs rounded-lg font-medium border text-center transition-all ${
                      selectedFacingMode === "user"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    🤳 Front (Selfie)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFacingMode("environment")}
                    className={`px-3 py-2 text-xs rounded-lg font-medium border text-center transition-all ${
                      selectedFacingMode === "environment"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    📷 Rear (Environment)
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartParentCameraRequest}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Video className="w-4 h-4" /> Request Camera Feed
            </button>
          </div>

          {/* Live Screen Share Card */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Live Screen Sharing
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official Android MediaProjection screen capture.
                  </p>
                </div>
              </div>

              {/* Reason note */}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                  Request Reason (shown to child)
                </label>
                <input
                  type="text"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Checking homework progress"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <button
              onClick={handleStartParentScreenRequest}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Monitor className="w-4 h-4" /> Request Screen Share
            </button>
          </div>
        </div>
      )}

      {/* Android Play Store Compliance Details Box */}
      <div className="bg-slate-100/70 dark:bg-slate-800/60 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Security & Google Play Policy Assurance:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
          <li>
            <strong>No Covert Surveillance:</strong> SafeKids explicitly complies with Google
            Play&apos;s Stalkerware & Spyware policy.
          </li>
          <li>
            <strong>Explicit Child Prompt:</strong> The paired child Android device rings an audible
            chime and displays a full-screen consent dialog before video or screen sharing begins.
          </li>
          <li>
            <strong>Persistent Notification:</strong> Android requires a continuous Foreground
            Service notification whenever camera or MediaProjection is active.
          </li>
          <li>
            <strong>Zero Recording Storage:</strong> Feeds are encrypted point-to-point and never
            uploaded to public third-party storage.
          </li>
        </ul>
      </div>
    </div>
  );
};
