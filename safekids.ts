export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  icon: string;
  enabled: boolean;
}

export interface AppRule {
  packageName: string;
  appName: string;
  category: "social" | "games" | "video" | "browsing" | "education" | "other";
  status: "allowed" | "locked" | "limited";
  dailyLimitMinutes?: number;
  usedTodayMinutes: number;
  iconName: string;
}

export interface ChildDevice {
  id: string;
  name: string;
  age: number;
  avatar: string;
  deviceModel: string;
  osVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  isOnline: boolean;
  lastSeen: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
    timestamp: string;
    address: string;
  };
  locationHistory: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    address: string;
  }>;
  screenTime: {
    todayUsageMinutes: number;
    dailyLimitMinutes: number;
    bedtimeStart: string; // e.g. "21:00"
    bedtimeEnd: string; // e.g. "07:00"
    bedtimeEnforced: boolean;
    appRules: AppRule[];
  };
  webFilter: {
    safeSearchEnabled: boolean;
    blockedCategories: string[];
    blockedDomains: string[];
    allowedDomains: string[];
  };
  antiUninstall: {
    deviceAdminEnabled: boolean;
    accessibilityLockEnabled: boolean;
    preventSettingsTamper: boolean;
    uninstallAttemptsCount: number;
    lastTamperAttempt?: string;
  };
  safeZones: SafeZone[];
  activeSessions: {
    cameraRequest?: {
      id: string;
      requestedAt: string;
      status: "pending" | "accepted" | "denied" | "ended";
      facingMode: "user" | "environment";
      reason?: string;
    };
    screenRequest?: {
      id: string;
      requestedAt: string;
      status: "pending" | "accepted" | "denied" | "ended";
      reason?: string;
    };
  };
  timeExtensionRequest?: {
    id: string;
    minutes: number;
    reason: string;
    requestedAt: string;
    status: "pending" | "approved" | "denied";
  };
}

export interface AlertItem {
  id: string;
  childId: string;
  childName: string;
  type:
    | "sos"
    | "geofence_enter"
    | "geofence_exit"
    | "low_battery"
    | "screen_limit"
    | "blocked_site"
    | "time_request"
    | "tamper_attempt";
  title: string;
  message: string;
  timestamp: string;
  severity: "critical" | "warning" | "info";
  read: boolean;
  coordinates?: { latitude: number; longitude: number };
}

export interface MessageItem {
  id: string;
  childId: string;
  sender: "parent" | "child";
  text: string;
  timestamp: string;
}

export interface PairingCode {
  code: string;
  childId: string;
  expiresAt: number;
}

export interface DBState {
  parentPin: string;
  parentEmail: string;
  children: ChildDevice[];
  alerts: AlertItem[];
  messages: MessageItem[];
  pairingCodes: PairingCode[];
}

export type LocationPoint = ChildDevice["location"];
