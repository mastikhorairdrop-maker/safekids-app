import { DBState, ChildDevice, AlertItem, MessageItem, SafeZone } from "../types/safekids";

const STORAGE_KEY = "safekids_state_backup";

export async function fetchState(): Promise<DBState | null> {
  try {
    const res = await fetch("/api/state");
    if (res.ok) {
      const data: DBState = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn("Network error fetching /api/state, loading from local backup", err);
  }

  // Fallback to local storage if offline
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return null;
}

export async function verifyParentPin(pin: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    // If backend unreachable, verify against cached default or local pin
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const state = JSON.parse(cached);
      return state.parentPin === pin;
    }
    return pin === "1234";
  }
}

export async function updateParentPin(
  currentPin: string,
  newPin: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/update-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin, newPin }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "Network error updating PIN" };
  }
}

export async function generatePairingCode(
  childName: string,
  age: number,
  deviceModel: string,
): Promise<{ code: string; childId: string; expiresAt: number } | null> {
  try {
    const res = await fetch("/api/pair/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childName, age, deviceModel }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

export async function claimPairingCode(
  code: string,
  deviceModel: string,
  osVersion: string,
): Promise<{ success: boolean; childId?: string; childName?: string; error?: string }> {
  try {
    const res = await fetch("/api/pair/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, deviceModel, osVersion }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "Network connection failed" };
  }
}

export async function sendChildHeartbeat(
  childId: string,
  payload: {
    batteryLevel?: number;
    isCharging?: boolean;
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number | null;
      address?: string;
    };
    screenTimeDeltaMinutes?: number;
  },
): Promise<any> {
  try {
    const res = await fetch(`/api/child/${childId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // ignore in background
  }
  return null;
}

export async function triggerSOS(
  childId: string,
  latitude: number,
  longitude: number,
): Promise<{ success: boolean; alert?: AlertItem }> {
  try {
    const res = await fetch(`/api/child/${childId}/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error(e);
  }
  return { success: false };
}

export async function requestCameraLookIn(
  childId: string,
  facingMode: "user" | "environment",
  reason?: string,
): Promise<{ success: boolean; session?: any }> {
  try {
    const res = await fetch(`/api/child/${childId}/camera-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facingMode, reason }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function respondCameraRequest(
  childId: string,
  status: "accepted" | "denied" | "ended",
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/child/${childId}/camera-respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function requestScreenShare(
  childId: string,
  reason?: string,
): Promise<{ success: boolean; session?: any }> {
  try {
    const res = await fetch(`/api/child/${childId}/screen-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function respondScreenRequest(
  childId: string,
  status: "accepted" | "denied" | "ended",
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/child/${childId}/screen-respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function requestTimeExtension(
  childId: string,
  minutes: number,
  reason: string,
): Promise<{ success: boolean; request?: any }> {
  try {
    const res = await fetch(`/api/child/${childId}/time-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes, reason }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function respondTimeExtension(
  childId: string,
  status: "approved" | "denied",
  grantedMinutes?: number,
): Promise<{ success: boolean; dailyLimitMinutes?: number }> {
  try {
    const res = await fetch(`/api/child/${childId}/time-respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, grantedMinutes }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function updateScreenLimits(
  childId: string,
  payload: {
    dailyLimitMinutes?: number;
    bedtimeStart?: string;
    bedtimeEnd?: string;
    bedtimeEnforced?: boolean;
  },
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/child/${childId}/screen-limits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function updateAppRule(
  childId: string,
  packageName: string,
  status: "allowed" | "locked" | "limited",
  dailyLimitMinutes?: number,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/child/${childId}/app-rule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageName, status, dailyLimitMinutes }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function updateWebFilter(
  childId: string,
  payload: {
    safeSearchEnabled?: boolean;
    blockedCategories?: string[];
    blockedDomains?: string[];
    allowedDomains?: string[];
  },
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/child/${childId}/web-filter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function updateSafeZones(
  childId: string,
  safeZones: SafeZone[],
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/child/${childId}/safe-zones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safeZones }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function sendMessage(
  childId: string,
  sender: "parent" | "child",
  text: string,
): Promise<{ success: boolean; message?: MessageItem }> {
  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, sender, text }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function markAlertsAsRead(id?: string, all?: boolean): Promise<{ success: boolean }> {
  try {
    const res = await fetch("/api/alerts/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, all }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function createNewChild(payload: {
  name: string;
  age: number;
  avatar: string;
  deviceModel: string;
}): Promise<{ success: boolean; child?: ChildDevice }> {
  try {
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function updateAntiUninstallSettings(
  childId: string,
  payload: {
    deviceAdminEnabled?: boolean;
    accessibilityLockEnabled?: boolean;
    preventSettingsTamper?: boolean;
  },
): Promise<{ success: boolean; antiUninstall?: any }> {
  try {
    const res = await fetch(`/api/child/${childId}/anti-uninstall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}

export async function reportTamperAttempt(
  childId: string,
  attemptedAction: string,
  component?: string,
): Promise<{ success: boolean; alert?: any }> {
  try {
    const res = await fetch(`/api/child/${childId}/report-tamper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptedAction, component }),
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}
