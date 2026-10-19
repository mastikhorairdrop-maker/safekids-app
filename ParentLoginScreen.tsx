import React, { useState } from "react";
import { Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { verifyParentPin } from "@/services/api";

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

export const ParentLoginScreen: React.FC<Props> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError("Enter your 4-6 digit Master PIN");
      return;
    }
    setBusy(true);
    const ok = await verifyParentPin(pin);
    setBusy(false);
    if (ok) {
      setError(null);
      onSuccess();
    } else {
      setError("Incorrect Master PIN. Default is 1234.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-5">
      <form
        onSubmit={handleSubmit}
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
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">Parent Login</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Secure access to the family dashboard
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Parent Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Master PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                placeholder="••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 tracking-widest font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 font-semibold text-center">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {busy ? "Verifying…" : "Unlock Dashboard"}
        </button>

        <p className="text-center text-[11px] text-slate-400">Default Master PIN: 1234</p>
      </form>
    </div>
  );
};
