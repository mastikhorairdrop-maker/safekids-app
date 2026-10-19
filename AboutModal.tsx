import React from "react";
import {
  Shield,
  Heart,
  Award,
  Code2,
  Globe,
  Github,
  Mail,
  X,
  CheckCircle2,
  Smartphone,
  Lock,
} from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentPin: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, parentPin }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                About SafeKids
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% Free & Open-Source Parental Safety Engine
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

        {/* Developer Attribution Card */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800/80 dark:via-indigo-950/40 dark:to-slate-800/80 border-2 border-blue-200 dark:border-indigo-800/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              RV
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                Lead Architect & Creator
              </span>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                Developed by Rajan Vishwakarma
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Full-Stack & Android Security Specialist
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-blue-200/60 dark:border-indigo-900/40 pt-2.5">
            SafeKids was designed and developed by <strong>Rajan Vishwakarma</strong> with the core
            mission of providing 100% free, uncompromised digital safety for families worldwide —
            with zero paywalls, zero subscriptions, and complete respect for child privacy.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Free for Every Family
            </span>
            <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-500" /> Device Admin & PIN Protected
            </span>
          </div>
        </div>

        {/* Security & System Info */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[10px]">
            Application Specifications
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block">Version</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                v1.0.0 (Release)
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block">Platform</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Android 14 (API 34) Ready
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block">Master PIN</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                •••• (Configured)
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block">License</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Open-Source (Free)
              </span>
            </div>
          </div>
        </div>

        {/* Anti-Uninstall & Permission Compliance Notice */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Strict Anti-Tampering Guarantee</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Protected against Force Stop, Storage Clearing, and Uninstallation via Android Device
            Administrator and Accessibility Service.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
          <span>SafeKids © 2026 • Rajan Vishwakarma</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
