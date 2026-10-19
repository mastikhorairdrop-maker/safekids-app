import React, { useState, useEffect, useRef } from "react";
import { MonitorSmartphone, Wifi, WifiOff, Battery, Eye, Activity } from "lucide-react";
import { ChildDevice } from "../types/safekids";

interface LiveActivityCardProps {
  child: ChildDevice;
}

interface LiveEvent {
  id: number;
  app: string;
  action: string;
  emoji: string;
  color: string;
}

const LIVE_ACTIVITIES: Array<Omit<LiveEvent, "id">> = [
  { app: "Instagram", action: "Scrolling Reels feed", emoji: "📸", color: "from-pink-500 to-rose-500" },
  { app: "TikTok", action: "Watching short videos", emoji: "🎵", color: "from-slate-800 to-slate-600" },
  { app: "Roblox", action: "Playing Adopt Me! server", emoji: "🎮", color: "from-red-500 to-orange-500" },
  { app: "YouTube", action: "Watching Minecraft tutorial", emoji: "▶️", color: "from-red-600 to-red-500" },
  { app: "WhatsApp", action: "Chatting in class group", emoji: "💬", color: "from-emerald-500 to-green-600" },
  { app: "Chrome", action: "Browsing homework help site", emoji: "🌐", color: "from-blue-500 to-cyan-500" },
  { app: "Spotify", action: "Listening to playlist", emoji: "🎧", color: "from-green-500 to-emerald-600" },
  { app: "Homework App", action: "Solving math exercises", emoji: "📚", color: "from-indigo-500 to-violet-500" },
];

export const LiveActivityCard: React.FC<LiveActivityCardProps> = ({ child }) => {
  const [current, setCurrent] = useState<LiveEvent>(() => ({ id: 0, ...LIVE_ACTIVITIES[0]! }));
  const [feed, setFeed] = useState<LiveEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const counterRef = useRef(1);

  // Simulate a live activity stream that updates dynamically
  useEffect(() => {
    const tick = () => {
      const next = LIVE_ACTIVITIES[Math.floor(Math.random() * LIVE_ACTIVITIES.length)]!;
      const event: LiveEvent = { id: counterRef.current++, ...next };
      setCurrent(event);
      setFeed((prev) => [event, ...prev].slice(0, 5));
      setElapsed(0);
    };
    tick();
    const activityInterval = setInterval(tick, 7000);
    const secondInterval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(activityInterval);
      clearInterval(secondInterval);
    };
  }, [child.id]);

  const lockedRule = child.screenTime.appRules.find(
    (r) => r.appName.toLowerCase() === current.app.toLowerCase() && r.status === "locked",
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Live Screen View
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time activity from {child.name}&apos;s phone
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span
            className={`flex items-center gap-1 ${child.isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
          >
            {child.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {child.isOnline ? "Online" : "Offline"}
          </span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Battery className="w-3.5 h-3.5" /> {child.batteryLevel}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mock live phone screen preview */}
        <div className="mx-auto w-full max-w-[220px]">
          <div className="rounded-[2rem] border-4 border-slate-800 dark:border-slate-700 bg-slate-950 overflow-hidden shadow-xl">
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-1.5 text-[9px] text-slate-400 bg-slate-900">
              <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="w-12 h-3.5 bg-slate-800 rounded-full" />
              <span>{child.batteryLevel}%</span>
            </div>
            {/* Screen content */}
            <div className={`h-64 bg-gradient-to-br ${current.color} p-4 flex flex-col justify-between transition-all duration-700`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{current.emoji}</span>
                <span className="text-white font-black text-sm drop-shadow">{current.app}</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-white/30 w-4/5 animate-pulse" />
                <div className="h-2 rounded-full bg-white/25 w-3/5 animate-pulse" />
                <div className="h-2 rounded-full bg-white/20 w-2/3 animate-pulse" />
              </div>
              <div className="bg-black/40 backdrop-blur rounded-lg px-2.5 py-1.5 text-[10px] text-white font-semibold">
                {current.action}
              </div>
            </div>
            {/* Home bar */}
            <div className="bg-slate-900 py-1.5 flex justify-center">
              <span className="w-16 h-1 rounded-full bg-slate-600" />
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" /> Live preview • updates every few seconds
          </p>
        </div>

        {/* Activity feed */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-violet-500" /> Current Activity
            </span>
            <span className="text-[10px] text-slate-400">for {elapsed}s</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">{current.emoji}</span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{current.app}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{current.action}</p>
              </div>
            </div>
            {lockedRule && (
              <p className="mt-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-2 py-1">
                ⚠️ This app is locked by your rules — it will be blocked on the device.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Recent activity timeline
            </span>
            {feed.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-slate-800"
              >
                <span>{e.emoji}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{e.app}</span>
                <span className="truncate">{e.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
