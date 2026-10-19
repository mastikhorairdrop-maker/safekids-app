import React, { useState, useEffect } from "react";
import { QrCode, Smartphone, Sparkles, Check, Copy, X, Clock, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { generatePairingCode } from "../services/api";

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicePaired?: () => void;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  isOpen,
  onClose,
  onDevicePaired,
}) => {
  const [childName, setChildName] = useState("Noah");
  const [childAge, setChildAge] = useState(9);
  const [deviceModel, setDeviceModel] = useState("Samsung Galaxy A15");
  const [pairingData, setPairingData] = useState<{ code: string; expiresAt: number } | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!pairingData) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pairingData.expiresAt - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingData]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const data = await generatePairingCode(childName, childAge, deviceModel);
    if (data) {
      setPairingData({ code: data.code, expiresAt: data.expiresAt });
      setTimeLeftSeconds(Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)));
    }
    setIsGenerating(false);
  };

  const handleCopyCode = () => {
    if (pairingData) {
      navigator.clipboard.writeText(pairingData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Pair Child Android Device
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure, expiring 6-digit handshake code
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

        {/* Child Details Input */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Child Name
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Child Age
            </label>
            <input
              type="number"
              value={childAge}
              onChange={(e) => setChildAge(parseInt(e.target.value) || 8)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Pairing Code Box */}
        {pairingData && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border-2 border-blue-200 dark:border-blue-900 rounded-2xl p-5 text-center space-y-3">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Scan QR or Enter on Child Device
            </span>

            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                <QRCodeSVG
                  value={`safekids://pair?code=${pairingData.code}`}
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-4xl font-black tracking-widest text-slate-900 dark:text-white selection:bg-blue-300">
                {pairingData.code}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600"
                title="Copy Code"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Code expires in:{" "}
                <strong>
                  {Math.floor(timeLeftSeconds / 60)}:
                  {(timeLeftSeconds % 60).toString().padStart(2, "0")}
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* Steps Guide */}
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">
            Instructions on Child Phone / Tablet:
          </span>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Open SafeKids on the child&apos;s phone (or select Child Mode).</li>
            <li>
              Tap <strong>&quot;Link with Parent Code&quot;</strong>.
            </li>
            <li>Type in the 6-digit code shown above.</li>
            <li>Permissions (GPS Location & Accessibility) will be registered immediately.</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Generate New Code
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
