import React, { useState } from "react";
import { QrCode, ArrowLeft, Link2, Loader2 } from "lucide-react";
import { claimPairingCode } from "@/services/api";

interface Props {
  onPaired: (childId: string, childName: string) => void;
  onBack: () => void;
}

function detectDevice() {
  if (typeof navigator === "undefined") return { model: "Android Device", os: "Android" };
  const ua = navigator.userAgent;
  const model = /Android/i.test(ua)
    ? (ua.match(/Android[^;]*;\s*([^)]+?)\s*(?:Build|\))/i)?.[1] ?? "Android Device")
    : /iPhone|iPad/i.test(ua)
      ? "Apple Device"
      : "Web Browser Device";
  const os = /Android\s([\d.]+)/i.exec(ua)?.[0] ?? "Android";
  return { model, os };
}

export const ChildPairingScreen: React.FC<Props> = ({ onPaired, onBack }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError("Enter the 6-digit code shown on the parent phone");
      return;
    }
    setBusy(true);
    const { model, os } = detectDevice();
    const res = await claimPairingCode(code, model, os);
    setBusy(false);
    if (res.success && res.childId) {
      onPaired(res.childId, res.childName || "Child");
    } else {
      setError(res.error || "Invalid or expired pairing code");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-5">
      <form
        onSubmit={handleLink}
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl"
      >
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Link with Parent
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scan the QR code or type the 6-digit pairing code from the parent dashboard.
          </p>
        </div>

        <input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          placeholder="000000"
          className="w-full text-center font-mono text-3xl tracking-[0.4em] py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
        />

        {error && <p className="text-xs text-rose-500 font-semibold text-center">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          {busy ? "Linking device…" : "Link this device"}
        </button>

        <p className="text-center text-[11px] text-slate-400">
          After linking, GPS, app usage and screen activity sync securely to the parent.
        </p>
      </form>
    </div>
  );
};
