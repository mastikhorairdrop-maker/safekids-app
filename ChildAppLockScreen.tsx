import React, { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { verifyParentPin } from "@/services/api";

const LOCK_KEY = "safekids_child_lock_pin";

export function getChildLockPin(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LOCK_KEY);
}

export function setChildLockPin(pin: string) {
  localStorage.setItem(LOCK_KEY, pin);
}

interface Props {
  mode: "create" | "unlock";
  onUnlocked: () => void;
}

export const ChildAppLockScreen: React.FC<Props> = ({ mode, onUnlocked }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const press = (d: string) => {
    if (pin.length < 6) {
      setPin(pin + d);
      setError(null);
    }
  };

  const submit = async () => {
    if (pin.length < 4) {
      setError("Enter at least 4 digits");
      return;
    }
    if (mode === "create") {
      setChildLockPin(pin);
      onUnlocked();
      return;
    }
    if (pin === getChildLockPin()) {
      onUnlocked();
      return;
    }
    // Parent Master PIN always overrides the child app lock
    setBusy(true);
    const ok = await verifyParentPin(pin);
    setBusy(false);
    if (ok) {
      onUnlocked();
    } else {
      setPin("");
      setError("Wrong app lock PIN");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center">
          {mode === "create" ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
        </div>
        <div>
          <h1 className="font-bold text-slate-900 dark:text-slate-100">
            {mode === "create" ? "Create App Lock PIN" : "SafeKids App Lock"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === "create"
              ? "This PIN will be required every time SafeKids is opened on this device."
              : "Enter the app lock PIN to continue (parent Master PIN also works)."}
          </p>
        </div>

        <div className="flex justify-center gap-3 py-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > i
                  ? "bg-blue-600 border-blue-600 scale-110"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => {
              setPin("");
              setError(null);
            }}
            className="py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-medium text-slate-500"
          >
            Clear
          </button>
          <button
            onClick={() => press("0")}
            className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-medium text-slate-500"
          >
            ⌫
          </button>
        </div>

        <button
          onClick={submit}
          disabled={busy || pin.length < 4}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
        >
          {mode === "create" ? "Set App Lock PIN" : "Unlock"}
        </button>
      </div>
    </div>
  );
};
