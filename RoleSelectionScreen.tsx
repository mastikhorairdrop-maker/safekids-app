import React from "react";
import { ShieldCheck, UserCog, Baby } from "lucide-react";

interface Props {
  onSelect: (role: "parent" | "child") => void;
}

export const RoleSelectionScreen: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md space-y-7">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">SafeKids</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Who is using this device?
          </p>
        </div>

        <div className="grid gap-3">
          <button
            onClick={() => onSelect("parent")}
            className="w-full text-left p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 shadow-sm active:scale-[0.99] transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">I am a Parent</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure login, manage up to 4 child devices
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect("child")}
            className="w-full text-left p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 shadow-sm active:scale-[0.99] transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">I am a Child</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Link this device with a parent pairing code
              </p>
            </div>
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Developed by <strong className="text-slate-600 dark:text-slate-300">राजन विश्वकर्मा</strong>
        </p>
      </div>
    </div>
  );
};
