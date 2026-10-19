import React, { useState } from "react";
import { Lock, Unlock, KeyRound, AlertCircle, X, ShieldCheck } from "lucide-react";
import { verifyParentPin } from "../services/api";

interface PinProtectionModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinProtectionModal: React.FC<PinProtectionModalProps> = ({
  isOpen,
  title = "Parent Master PIN Required",
  subtitle = "Enter your 4-digit security PIN to proceed (Default: 1234)",
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const handleVerify = async () => {
    if (pin.length < 4) {
      setError("Please enter at least 4 digits");
      return;
    }
    setIsVerifying(true);
    const valid = await verifyParentPin(pin);
    setIsVerifying(false);
    if (valid) {
      setPin("");
      setError(null);
      onSuccess();
    } else {
      setError("Incorrect PIN. Default is 1234.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xs w-full p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? "bg-blue-600 border-blue-600 scale-110"
                  : "border-slate-300 dark:border-slate-700 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-xs text-rose-500 font-semibold flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-base rounded-2xl active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 font-medium text-xs rounded-2xl active:scale-95 transition-all"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-base rounded-2xl active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 font-medium text-xs rounded-2xl active:scale-95 transition-all"
          >
            ⌫
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onCancel}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={isVerifying || pin.length < 4}
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
          >
            Verify PIN
          </button>
        </div>
      </div>
    </div>
  );
};
