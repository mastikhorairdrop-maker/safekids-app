import React, { useState, useEffect, useRef } from "react";
import { DBState, ChildDevice } from "@/types/safekids";
import { fetchState, updateParentPin } from "@/services/api";
import { ParentDashboard } from "@/components/ParentDashboard";
import { ChildModeView } from "@/components/ChildModeView";
import { PinProtectionModal } from "@/components/PinProtectionModal";
import { playNotificationChime, playSOSSiren } from "@/utils/audio";
import { INITIAL_DEFAULT_STATE } from "@/utils/initialState";
import { RoleSelectionScreen } from "@/components/RoleSelectionScreen";
import { ParentLoginScreen } from "@/components/ParentLoginScreen";
import { ChildPairingScreen } from "@/components/ChildPairingScreen";
import { ChildAppLockScreen, getChildLockPin } from "@/components/ChildAppLockScreen";

const ROLE_KEY = "safekids_role";
const PAIRED_CHILD_KEY = "safekids_paired_child_id";

export default function App() {
  const [state, setState] = useState<DBState>(INITIAL_DEFAULT_STATE);
  const [currentMode, setCurrentMode] = useState<"parent" | "child">("parent");
  const [activeChildIdForChildMode, setActiveChildIdForChildMode] = useState<string>("");

  // Onboarding / role state
  const [role, setRole] = useState<"parent" | "child" | null>(null);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [pairedChildId, setPairedChildId] = useState<string>("");
  const [childUnlocked, setChildUnlocked] = useState(false);
  const [bootReady, setBootReady] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("safekids_theme");
    return saved ? saved === "dark" : false;
  });

  // PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState<"exit_child" | "change_pin">("exit_child");
  const [showChangePinForm, setShowChangePinForm] = useState(false);
  const [newPinValue, setNewPinValue] = useState("");
  const [pinChangeMsg, setPinChangeMsg] = useState("");

  // Audio alert tracking
  const previousAlertCountRef = useRef(0);

  // Sync state function
  const refreshData = async () => {
    const data = await fetchState();
    if (data) {
      // Check if new alert appeared
      if (data.alerts.length > previousAlertCountRef.current && previousAlertCountRef.current > 0) {
        const latest = data.alerts[0];
        if (latest && latest.type === "sos") {
          playSOSSiren(4);
        } else {
          playNotificationChime();
        }
      }
      previousAlertCountRef.current = data.alerts.length;
      setState(data);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Restore saved role / pairing on launch
  useEffect(() => {
    const savedRole = localStorage.getItem(ROLE_KEY) as "parent" | "child" | null;
    const savedChild = localStorage.getItem(PAIRED_CHILD_KEY) || "";
    if (savedRole) setRole(savedRole);
    if (savedChild) {
      setPairedChildId(savedChild);
      setActiveChildIdForChildMode(savedChild);
    }
    if (savedRole === "child") setCurrentMode("child");
    setBootReady(true);
  }, []);

  const handleSelectRole = (selected: "parent" | "child") => {
    localStorage.setItem(ROLE_KEY, selected);
    setRole(selected);
    setCurrentMode(selected === "child" ? "child" : "parent");
  };

  const handleResetRole = () => {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(PAIRED_CHILD_KEY);
    setRole(null);
    setPairedChildId("");
    setParentUnlocked(false);
    setChildUnlocked(false);
    setCurrentMode("parent");
  };

  const handleDevicePaired = (childId: string) => {
    localStorage.setItem(PAIRED_CHILD_KEY, childId);
    setPairedChildId(childId);
    setActiveChildIdForChildMode(childId);
    refreshData();
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("safekids_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("safekids_theme", "light");
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleSwitchToChildMode = (childId: string) => {
    setActiveChildIdForChildMode(childId);
    setCurrentMode("child");
  };

  const handleExitChildModeRequest = () => {
    setPinAction("exit_child");
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    if (pinAction === "exit_child") {
      setCurrentMode("parent");
    } else if (pinAction === "change_pin") {
      setShowChangePinForm(true);
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || newPinValue.length < 4) return;
    const res = await updateParentPin(state.parentPin, newPinValue);
    if (res.success) {
      setPinChangeMsg("Master PIN updated successfully!");
      setTimeout(() => {
        setShowChangePinForm(false);
        setPinChangeMsg("");
        setNewPinValue("");
      }, 1500);
      refreshData();
    } else {
      setPinChangeMsg(res.error || "Failed to update PIN");
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 animate-pulse flex items-center justify-center mb-4">
          🛡️
        </div>
        <h2 className="text-lg font-bold">Initializing SafeKids...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting free parental security engine</p>
      </div>
    );
  }

  // ---- Onboarding gates (role → auth → app) ----
  if (!bootReady) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;
  }

  if (!role) {
    return <RoleSelectionScreen onSelect={handleSelectRole} />;
  }

  if (role === "parent" && !parentUnlocked) {
    return (
      <ParentLoginScreen onSuccess={() => setParentUnlocked(true)} onBack={handleResetRole} />
    );
  }

  if (role === "child") {
    if (!pairedChildId) {
      return <ChildPairingScreen onPaired={handleDevicePaired} onBack={handleResetRole} />;
    }
    if (!childUnlocked) {
      return (
        <ChildAppLockScreen
          mode={getChildLockPin() ? "unlock" : "create"}
          onUnlocked={() => setChildUnlocked(true)}
        />
      );
    }
  }

  const childForChildMode =
    state.children.find((c) => c.id === activeChildIdForChildMode) || state.children[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {currentMode === "parent" || !childForChildMode ? (
        <ParentDashboard
          state={state}
          onRefresh={refreshData}
          onSwitchToChildMode={handleSwitchToChildMode}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onChangePinRequested={() => {
            setPinAction("change_pin");
            setShowPinModal(true);
          }}
          onLogout={handleResetRole}
        />
      ) : (
        <ChildModeView
          child={childForChildMode!}
          onExitChildMode={handleExitChildModeRequest}
          onRefresh={refreshData}
        />
      )}

      {/* PIN Verification Modal */}
      <PinProtectionModal
        isOpen={showPinModal}
        title={
          pinAction === "exit_child"
            ? "Parent PIN Required to Exit Child Mode"
            : "Enter Current PIN to Modify Security Settings"
        }
        subtitle="Default Parent PIN is 1234"
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPinModal(false)}
      />

      {/* Change PIN Dialog */}
      {showChangePinForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xs w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 text-center">
              Set New Master Parent PIN
            </h3>
            <p className="text-xs text-slate-500 text-center">
              Used to exit child mode, change limits, and pair devices.
            </p>

            <form onSubmit={handleSaveNewPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPinValue}
                onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-6 digits"
                className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />

              {pinChangeMsg && (
                <p className="text-xs text-center font-semibold text-emerald-600 dark:text-emerald-400">
                  {pinChangeMsg}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePinForm(false)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newPinValue.length < 4}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Save PIN
                </button>
              </div>

              {/* Developer Attribution */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">
                  SafeKids Settings • Developed by{" "}
                  <strong className="text-slate-700 dark:text-slate-300">Rajan Vishwakarma</strong>
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
