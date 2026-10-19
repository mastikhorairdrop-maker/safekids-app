// Ported from the original Express server. State is persisted in Lovable Cloud.
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck -- verbatim port of the original Express handlers (implicit-return style)
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

export const DEFAULT_STATE: DBState = {
  parentPin: "1234",
  parentEmail: "parent@safekids.local",
  children: [
    {
      id: "child-leo",
      name: "Leo",
      age: 10,
      avatar: "👦",
      deviceModel: "Pixel 8a (Android 14)",
      osVersion: "Android 14 (API 34)",
      batteryLevel: 78,
      isCharging: false,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 12,
        speed: 1.2,
        timestamp: new Date().toISOString(),
        address: "Market St & 4th, San Francisco, CA",
      },
      locationHistory: [
        {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          address: "Market St & 4th, San Francisco, CA",
        },
        {
          latitude: 37.7758,
          longitude: -122.4182,
          timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
          address: "Mission St & 3rd, San Francisco, CA",
        },
        {
          latitude: 37.7765,
          longitude: -122.417,
          timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
          address: "Howard St & 3rd, San Francisco, CA",
        },
      ],
      screenTime: {
        todayUsageMinutes: 85,
        dailyLimitMinutes: 120,
        bedtimeStart: "20:30",
        bedtimeEnd: "07:00",
        bedtimeEnforced: true,
        appRules: [
          {
            packageName: "com.google.android.youtube",
            appName: "YouTube",
            category: "video",
            status: "limited",
            dailyLimitMinutes: 45,
            usedTodayMinutes: 30,
            iconName: "Youtube",
          },
          {
            packageName: "com.roblox.client",
            appName: "Roblox",
            category: "games",
            status: "locked",
            dailyLimitMinutes: 30,
            usedTodayMinutes: 20,
            iconName: "Gamepad2",
          },
          {
            packageName: "com.zhiliaoapp.musically",
            appName: "TikTok",
            category: "social",
            status: "locked",
            dailyLimitMinutes: 0,
            usedTodayMinutes: 0,
            iconName: "Share2",
          },
          {
            packageName: "com.duolingo",
            appName: "Duolingo",
            category: "education",
            status: "allowed",
            dailyLimitMinutes: 60,
            usedTodayMinutes: 15,
            iconName: "BookOpen",
          },
          {
            packageName: "org.khanacademy.android",
            appName: "Khan Academy",
            category: "education",
            status: "allowed",
            dailyLimitMinutes: 120,
            usedTodayMinutes: 20,
            iconName: "GraduationCap",
          },
          {
            packageName: "com.android.chrome",
            appName: "Safe Chrome",
            category: "browsing",
            status: "allowed",
            dailyLimitMinutes: 60,
            usedTodayMinutes: 0,
            iconName: "Compass",
          },
        ],
      },
      webFilter: {
        safeSearchEnabled: true,
        blockedCategories: ["adult", "gambling", "violence", "weapons", "dating"],
        blockedDomains: ["tiktok.com", "omegle.com", "discord.com", "chatroulette.com"],
        allowedDomains: [
          "wikipedia.org",
          "khanacademy.org",
          "nationalgeographic.com",
          "scratch.mit.edu",
          "nasa.gov",
        ],
      },
      antiUninstall: {
        deviceAdminEnabled: true,
        accessibilityLockEnabled: true,
        preventSettingsTamper: true,
        uninstallAttemptsCount: 0,
      },
      safeZones: [
        {
          id: "zone-home",
          name: "Home",
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 200,
          icon: "Home",
          enabled: true,
        },
        {
          id: "zone-school",
          name: "Lincoln Middle School",
          latitude: 37.778,
          longitude: -122.415,
          radiusMeters: 300,
          icon: "School",
          enabled: true,
        },
        {
          id: "zone-park",
          name: "Yerba Buena Park",
          latitude: 37.785,
          longitude: -122.402,
          radiusMeters: 250,
          icon: "Trees",
          enabled: true,
        },
      ],
      activeSessions: {},
    },
    {
      id: "child-maya",
      name: "Maya",
      age: 7,
      avatar: "👧",
      deviceModel: "Samsung Galaxy Tab A9",
      osVersion: "Android 13 (One UI 5.1)",
      batteryLevel: 42,
      isCharging: true,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8,
        speed: 0,
        timestamp: new Date().toISOString(),
        address: "Home (Safe Zone)",
      },
      locationHistory: [
        {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
          address: "Home (Safe Zone)",
        },
      ],
      screenTime: {
        todayUsageMinutes: 45,
        dailyLimitMinutes: 60,
        bedtimeStart: "19:45",
        bedtimeEnd: "07:30",
        bedtimeEnforced: true,
        appRules: [
          {
            packageName: "com.google.android.apps.youtube.kids",
            appName: "YouTube Kids",
            category: "video",
            status: "limited",
            dailyLimitMinutes: 30,
            usedTodayMinutes: 25,
            iconName: "Youtube",
          },
          {
            packageName: "com.tocaboca.tocalifeworld",
            appName: "Toca Life World",
            category: "games",
            status: "allowed",
            dailyLimitMinutes: 30,
            usedTodayMinutes: 15,
            iconName: "Gamepad2",
          },
          {
            packageName: "com.duolingo.kids",
            appName: "Duolingo ABC",
            category: "education",
            status: "allowed",
            dailyLimitMinutes: 60,
            usedTodayMinutes: 5,
            iconName: "BookOpen",
          },
        ],
      },
      webFilter: {
        safeSearchEnabled: true,
        blockedCategories: ["adult", "gambling", "violence", "social", "gaming"],
        blockedDomains: ["youtube.com", "roblox.com"],
        allowedDomains: ["pbskids.org", "starfall.com", "natgeokids.com"],
      },
      antiUninstall: {
        deviceAdminEnabled: true,
        accessibilityLockEnabled: true,
        preventSettingsTamper: true,
        uninstallAttemptsCount: 0,
      },
      safeZones: [
        {
          id: "zone-home",
          name: "Home",
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 200,
          icon: "Home",
          enabled: true,
        },
      ],
      activeSessions: {},
    },
  ],
  alerts: [
    {
      id: "alert-1",
      childId: "child-leo",
      childName: "Leo",
      type: "geofence_enter",
      title: "Entered Safe Zone: Home",
      message: "Leo arrived safely inside Home safe zone.",
      timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
      severity: "info",
      read: true,
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
    },
    {
      id: "alert-2",
      childId: "child-leo",
      childName: "Leo",
      type: "blocked_site",
      title: "Blocked Website Attempt",
      message: "Leo attempted to open discord.com, blocked by Web Filter.",
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      severity: "warning",
      read: false,
    },
  ],
  messages: [
    {
      id: "msg-1",
      childId: "child-leo",
      sender: "parent",
      text: "Remember soccer practice at 4:30 PM today!",
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    },
    {
      id: "msg-2",
      childId: "child-leo",
      sender: "child",
      text: "Got it Dad! Have my cleats packed.",
      timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
    },
  ],
  pairingCodes: [],
};

type Req = { body: any; params: Record<string, string> };
type Res = { status: (c: number) => Res; json: (b: any) => Res };
type Handler = (req: Req, res: Res) => any;
type RouteDef = { method: string; pattern: string; handler: Handler };

let db: DBState = DEFAULT_STATE;
let dirty = false;
function saveDB(_s: DBState) {
  dirty = true;
}

const routes: RouteDef[] = [];
const app = {
  get: (pattern: string, handler: Handler) => routes.push({ method: "GET", pattern, handler }),
  post: (pattern: string, handler: Handler) => routes.push({ method: "POST", pattern, handler }),
};

app.get("/api/state", (_req, res) => res.json(db));

// 2. Verify or update Parent PIN
app.post("/api/auth/verify-pin", (req, res) => {
  const { pin } = req.body;
  if (pin === db.parentPin) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: "Incorrect PIN" });
});

app.post("/api/auth/update-pin", (req, res) => {
  const { currentPin, newPin } = req.body;
  if (currentPin !== db.parentPin) {
    return res.status(401).json({ success: false, error: "Current PIN is invalid" });
  }
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ success: false, error: "New PIN must be at least 4 digits" });
  }
  db.parentPin = newPin;
  saveDB(db);
  res.json({ success: true, message: "PIN updated successfully" });
});

// 3. Child Pairing Endpoints
app.post("/api/pair/generate", (req, res) => {
  const { childName, age, deviceModel } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

  // create or find child
  let childId = `child-${Date.now().toString(36)}`;
  const newChild: ChildDevice = {
    id: childId,
    name: childName || "New Child",
    age: age || 8,
    avatar: "🧒",
    deviceModel: deviceModel || "Android Phone",
    osVersion: "Android 14 (API 34)",
    batteryLevel: 90,
    isCharging: false,
    isOnline: false,
    lastSeen: new Date().toISOString(),
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      speed: 0,
      timestamp: new Date().toISOString(),
      address: "Standby / Waiting for GPS",
    },
    locationHistory: [],
    screenTime: {
      todayUsageMinutes: 0,
      dailyLimitMinutes: 120,
      bedtimeStart: "21:00",
      bedtimeEnd: "07:00",
      bedtimeEnforced: true,
      appRules: [
        {
          packageName: "com.google.android.youtube",
          appName: "YouTube",
          category: "video",
          status: "limited",
          dailyLimitMinutes: 45,
          usedTodayMinutes: 0,
          iconName: "Youtube",
        },
        {
          packageName: "com.roblox.client",
          appName: "Roblox",
          category: "games",
          status: "locked",
          dailyLimitMinutes: 30,
          usedTodayMinutes: 0,
          iconName: "Gamepad2",
        },
        {
          packageName: "com.duolingo",
          appName: "Duolingo",
          category: "education",
          status: "allowed",
          dailyLimitMinutes: 60,
          usedTodayMinutes: 0,
          iconName: "BookOpen",
        },
      ],
    },
    webFilter: {
      safeSearchEnabled: true,
      blockedCategories: ["adult", "gambling", "violence"],
      blockedDomains: [],
      allowedDomains: [],
    },
    antiUninstall: {
      deviceAdminEnabled: true,
      accessibilityLockEnabled: true,
      preventSettingsTamper: true,
      uninstallAttemptsCount: 0,
    },
    safeZones: [
      {
        id: "zone-home",
        name: "Home",
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 200,
        icon: "Home",
        enabled: true,
      },
    ],
    activeSessions: {},
  };

  db.children.push(newChild);
  db.pairingCodes.push({ code, childId, expiresAt });
  saveDB(db);

  res.json({ code, childId, expiresAt });
});

app.post("/api/pair/claim", (req, res) => {
  const { code, deviceModel, osVersion } = req.body;
  const now = Date.now();
  const entryIndex = db.pairingCodes.findIndex((p) => p.code === code && p.expiresAt > now);

  if (entryIndex === -1) {
    return res.status(400).json({ success: false, error: "Invalid or expired pairing code" });
  }

  const { childId } = db.pairingCodes[entryIndex]!;
  const child = db.children.find((c) => c.id === childId);

  if (!child) {
    return res.status(404).json({ success: false, error: "Child record not found" });
  }

  child.isOnline = true;
  child.lastSeen = new Date().toISOString();
  if (deviceModel) child.deviceModel = deviceModel;
  if (osVersion) child.osVersion = osVersion;

  // remove claimed code
  db.pairingCodes.splice(entryIndex, 1);
  saveDB(db);

  res.json({ success: true, childId, childName: child.name });
});

// 4. Update child device status & GPS location
app.post("/api/child/:id/heartbeat", (req, res) => {
  const { id } = req.params;
  const { batteryLevel, isCharging, location, screenTimeDeltaMinutes } = req.body;

  const child = db.children.find((c) => c.id === id);
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  child.isOnline = true;
  child.lastSeen = new Date().toISOString();
  if (batteryLevel !== undefined) child.batteryLevel = batteryLevel;
  if (isCharging !== undefined) child.isCharging = isCharging;

  if (screenTimeDeltaMinutes) {
    child.screenTime.todayUsageMinutes += screenTimeDeltaMinutes;
  }

  if (location && location.latitude && location.longitude) {
    child.location = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy || 10,
      speed: location.speed ?? null,
      timestamp: new Date().toISOString(),
      address:
        location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
    };

    // Add to location history (keep last 50)
    child.locationHistory.unshift({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: child.location.timestamp,
      address: child.location.address,
    });
    if (child.locationHistory.length > 50) {
      child.locationHistory.pop();
    }

    // Check geofence status
    child.safeZones.forEach((zone) => {
      if (!zone.enabled) return;
      const dist = haversineDistance(
        location.latitude,
        location.longitude,
        zone.latitude,
        zone.longitude,
      );
      const isInside = dist <= zone.radiusMeters;
      // In full flow we check transitions, here we can log if enter/exit
    });
  }

  // Low battery alert check
  if (child.batteryLevel <= 15 && !child.isCharging) {
    const recentBatteryAlert = db.alerts.find(
      (a) =>
        a.childId === child.id &&
        a.type === "low_battery" &&
        Date.now() - new Date(a.timestamp).getTime() < 30 * 60000,
    );
    if (!recentBatteryAlert) {
      db.alerts.unshift({
        id: `alert-${Date.now()}`,
        childId: child.id,
        childName: child.name,
        type: "low_battery",
        title: `Low Battery: ${child.name}'s Device (${child.batteryLevel}%)`,
        message: `${child.name}'s device is at ${child.batteryLevel}%. Please prompt them to charge their device.`,
        timestamp: new Date().toISOString(),
        severity: "warning",
        read: false,
      });
    }
  }

  saveDB(db);
  res.json({
    success: true,
    child,
    commands: {
      activeCameraSession: child.activeSessions.cameraRequest,
      activeScreenSession: child.activeSessions.screenRequest,
      timeExtension: child.timeExtensionRequest,
      appRules: child.screenTime.appRules,
      dailyLimitMinutes: child.screenTime.dailyLimitMinutes,
      bedtimeStart: child.screenTime.bedtimeStart,
      bedtimeEnd: child.screenTime.bedtimeEnd,
      bedtimeEnforced: child.screenTime.bedtimeEnforced,
      webFilter: child.webFilter,
    },
  });
});

// 5. Trigger SOS from child
app.post("/api/child/:id/sos", (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, audioSnippet } = req.body;
  const child = db.children.find((c) => c.id === id);

  const childName = child ? child.name : "Child";
  const alert: AlertItem = {
    id: `sos-${Date.now()}`,
    childId: id,
    childName,
    type: "sos",
    title: `🚨 EMERGENCY SOS ACTIVATED BY ${childName.toUpperCase()}`,
    message: `${childName} pressed the emergency SOS button! Immediate attention required.`,
    timestamp: new Date().toISOString(),
    severity: "critical",
    read: false,
    coordinates: latitude && longitude ? { latitude, longitude } : child?.location,
  };

  db.alerts.unshift(alert);
  saveDB(db);

  res.json({ success: true, alert });
});

// 6. Camera Request Endpoints (Consent-based)
app.post("/api/child/:id/camera-request", (req, res) => {
  const { id } = req.params;
  const { facingMode, reason } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  child.activeSessions.cameraRequest = {
    id: `cam-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    status: "pending",
    facingMode: facingMode || "user",
    reason: reason || "Parent check-in",
  };

  saveDB(db);
  res.json({ success: true, session: child.activeSessions.cameraRequest });
});

app.post("/api/child/:id/camera-respond", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'accepted' | 'denied' | 'ended'
  const child = db.children.find((c) => c.id === id);
  if (!child || !child.activeSessions.cameraRequest) {
    return res.status(404).json({ error: "Session not found" });
  }

  child.activeSessions.cameraRequest.status = status;
  if (status === "ended") {
    delete child.activeSessions.cameraRequest;
  }

  saveDB(db);
  res.json({ success: true });
});

// 7. Screen Sharing Request Endpoints (Consent-based)
app.post("/api/child/:id/screen-request", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  child.activeSessions.screenRequest = {
    id: `screen-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    status: "pending",
    reason: reason || "Parent live screen review",
  };

  saveDB(db);
  res.json({ success: true, session: child.activeSessions.screenRequest });
});

app.post("/api/child/:id/screen-respond", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'accepted' | 'denied' | 'ended'
  const child = db.children.find((c) => c.id === id);
  if (!child || !child.activeSessions.screenRequest) {
    return res.status(404).json({ error: "Session not found" });
  }

  child.activeSessions.screenRequest.status = status;
  if (status === "ended") {
    delete child.activeSessions.screenRequest;
  }

  saveDB(db);
  res.json({ success: true });
});

// 8. Time extension request
app.post("/api/child/:id/time-request", (req, res) => {
  const { id } = req.params;
  const { minutes, reason } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  child.timeExtensionRequest = {
    id: `req-${Date.now()}`,
    minutes: minutes || 30,
    reason: reason || "Homework / Finishing project",
    requestedAt: new Date().toISOString(),
    status: "pending",
  };

  db.alerts.unshift({
    id: `alert-time-${Date.now()}`,
    childId: child.id,
    childName: child.name,
    type: "time_request",
    title: `Screen Time Extension Request: ${child.name}`,
    message: `${child.name} is requesting ${minutes || 30} extra minutes. Reason: "${reason || "Schoolwork"}"`,
    timestamp: new Date().toISOString(),
    severity: "info",
    read: false,
  });

  saveDB(db);
  res.json({ success: true, request: child.timeExtensionRequest });
});

app.post("/api/child/:id/time-respond", (req, res) => {
  const { id } = req.params;
  const { status, grantedMinutes } = req.body; // 'approved' | 'denied'
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  if (child.timeExtensionRequest) {
    child.timeExtensionRequest.status = status;
    if (status === "approved" && grantedMinutes) {
      child.screenTime.dailyLimitMinutes += grantedMinutes;
    }
  }

  saveDB(db);
  res.json({ success: true, dailyLimitMinutes: child.screenTime.dailyLimitMinutes });
});

// 9. Update Screen Time Limits & Bedtime
app.post("/api/child/:id/screen-limits", (req, res) => {
  const { id } = req.params;
  const { dailyLimitMinutes, bedtimeStart, bedtimeEnd, bedtimeEnforced } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  if (dailyLimitMinutes !== undefined) child.screenTime.dailyLimitMinutes = dailyLimitMinutes;
  if (bedtimeStart !== undefined) child.screenTime.bedtimeStart = bedtimeStart;
  if (bedtimeEnd !== undefined) child.screenTime.bedtimeEnd = bedtimeEnd;
  if (bedtimeEnforced !== undefined) child.screenTime.bedtimeEnforced = bedtimeEnforced;

  saveDB(db);
  res.json({ success: true, screenTime: child.screenTime });
});

// 10. Update App Rule
app.post("/api/child/:id/app-rule", (req, res) => {
  const { id } = req.params;
  const { packageName, status, dailyLimitMinutes } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  const rule = child.screenTime.appRules.find((r) => r.packageName === packageName);
  if (rule) {
    if (status) rule.status = status;
    if (dailyLimitMinutes !== undefined) rule.dailyLimitMinutes = dailyLimitMinutes;
  }

  saveDB(db);
  res.json({ success: true, appRules: child.screenTime.appRules });
});

// 11. Update Web Filter Settings
app.post("/api/child/:id/web-filter", (req, res) => {
  const { id } = req.params;
  const { safeSearchEnabled, blockedCategories, blockedDomains, allowedDomains } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  if (safeSearchEnabled !== undefined) child.webFilter.safeSearchEnabled = safeSearchEnabled;
  if (blockedCategories) child.webFilter.blockedCategories = blockedCategories;
  if (blockedDomains) child.webFilter.blockedDomains = blockedDomains;
  if (allowedDomains) child.webFilter.allowedDomains = allowedDomains;

  saveDB(db);
  res.json({ success: true, webFilter: child.webFilter });
});

// 12. Safe Zones Management
app.post("/api/child/:id/safe-zones", (req, res) => {
  const { id } = req.params;
  const { safeZones } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  child.safeZones = safeZones;
  saveDB(db);
  res.json({ success: true, safeZones: child.safeZones });
});

// 12b. Anti-Uninstall and Device Admin Settings
app.post("/api/child/:id/anti-uninstall", (req, res) => {
  const { id } = req.params;
  const { deviceAdminEnabled, accessibilityLockEnabled, preventSettingsTamper } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  if (!child.antiUninstall) {
    child.antiUninstall = {
      deviceAdminEnabled: true,
      accessibilityLockEnabled: true,
      preventSettingsTamper: true,
      uninstallAttemptsCount: 0,
    };
  }

  if (deviceAdminEnabled !== undefined) child.antiUninstall.deviceAdminEnabled = deviceAdminEnabled;
  if (accessibilityLockEnabled !== undefined)
    child.antiUninstall.accessibilityLockEnabled = accessibilityLockEnabled;
  if (preventSettingsTamper !== undefined)
    child.antiUninstall.preventSettingsTamper = preventSettingsTamper;

  saveDB(db);
  res.json({ success: true, antiUninstall: child.antiUninstall });
});

// 12c. Report Tamper / Uninstall Attempt from Child Device
app.post("/api/child/:id/report-tamper", (req, res) => {
  const { id } = req.params;
  const { attemptedAction, component } = req.body;
  const child = db.children.find((c) => c.id === id);
  if (!child) return res.status(404).json({ error: "Child not found" });

  if (!child.antiUninstall) {
    child.antiUninstall = {
      deviceAdminEnabled: true,
      accessibilityLockEnabled: true,
      preventSettingsTamper: true,
      uninstallAttemptsCount: 0,
    };
  }

  child.antiUninstall.uninstallAttemptsCount += 1;
  child.antiUninstall.lastTamperAttempt = new Date().toISOString();

  const alert: AlertItem = {
    id: `tamper-${Date.now()}`,
    childId: child.id,
    childName: child.name,
    type: "tamper_attempt",
    title: `🚨 ANTI-UNINSTALL LOCK TRIGGERED: ${child.name}'s Device`,
    message: `An unauthorized attempt to ${attemptedAction || "uninstall SafeKids or revoke Device Admin"} was intercepted on ${child.deviceModel}. System was protected with Parent PIN lock.`,
    timestamp: new Date().toISOString(),
    severity: "critical",
    read: false,
  };

  db.alerts.unshift(alert);
  saveDB(db);
  res.json({
    success: true,
    alert,
    uninstallAttemptsCount: child.antiUninstall.uninstallAttemptsCount,
  });
});

// 13. Messages
app.post("/api/messages", (req, res) => {
  const { childId, sender, text } = req.body;
  if (!childId || !text) return res.status(400).json({ error: "Missing parameters" });

  const msg: MessageItem = {
    id: `msg-${Date.now()}`,
    childId,
    sender,
    text,
    timestamp: new Date().toISOString(),
  };

  db.messages.push(msg);
  saveDB(db);
  res.json({ success: true, message: msg });
});

// 14. Mark alerts as read
app.post("/api/alerts/mark-read", (req, res) => {
  const { id, all } = req.body;
  if (all) {
    db.alerts.forEach((a) => (a.read = true));
  } else if (id) {
    const alert = db.alerts.find((a) => a.id === id);
    if (alert) alert.read = true;
  }
  saveDB(db);
  res.json({ success: true });
});

// 15. Create new child profile
app.post("/api/children", (req, res) => {
  const { name, age, avatar, deviceModel } = req.body;
  const newChild: ChildDevice = {
    id: `child-${Date.now()}`,
    name: name || "Child",
    age: age || 8,
    avatar: avatar || "🧒",
    deviceModel: deviceModel || "Android Phone",
    osVersion: "Android 14",
    batteryLevel: 100,
    isCharging: false,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      speed: 0,
      timestamp: new Date().toISOString(),
      address: "San Francisco, CA",
    },
    locationHistory: [],
    screenTime: {
      todayUsageMinutes: 0,
      dailyLimitMinutes: 120,
      bedtimeStart: "21:00",
      bedtimeEnd: "07:00",
      bedtimeEnforced: true,
      appRules: [
        {
          packageName: "com.google.android.youtube",
          appName: "YouTube",
          category: "video",
          status: "limited",
          dailyLimitMinutes: 45,
          usedTodayMinutes: 0,
          iconName: "Youtube",
        },
        {
          packageName: "com.roblox.client",
          appName: "Roblox",
          category: "games",
          status: "locked",
          dailyLimitMinutes: 30,
          usedTodayMinutes: 0,
          iconName: "Gamepad2",
        },
        {
          packageName: "com.duolingo",
          appName: "Duolingo",
          category: "education",
          status: "allowed",
          dailyLimitMinutes: 60,
          usedTodayMinutes: 0,
          iconName: "BookOpen",
        },
      ],
    },
    webFilter: {
      safeSearchEnabled: true,
      blockedCategories: ["adult", "gambling", "violence"],
      blockedDomains: [],
      allowedDomains: [],
    },
    antiUninstall: {
      deviceAdminEnabled: true,
      accessibilityLockEnabled: true,
      preventSettingsTamper: true,
      uninstallAttemptsCount: 0,
    },
    safeZones: [
      {
        id: "zone-home",
        name: "Home",
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 200,
        icon: "Home",
        enabled: true,
      },
    ],
    activeSessions: {},
  };

  db.children.push(newChild);
  saveDB(db);
  res.json({ success: true, child: newChild });
});

// Haversine distance formula helper
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i]!;
    const val = s[i]!;
    if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(val);
    else if (seg !== val) return null;
  }
  return params;
}

export async function handleApiRequest(
  request: Request,
  load: () => Promise<DBState | null>,
  save: (s: DBState) => Promise<void>,
): Promise<Response> {
  const url = new URL(request.url);
  for (const r of routes) {
    if (r.method !== request.method) continue;
    const params = matchRoute(r.pattern, url.pathname);
    if (!params) continue;
    let body: any = {};
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }
    const loaded = await load();
    db = loaded ?? structuredClone(DEFAULT_STATE);
    db.children.forEach((c) => {
      if (!c.antiUninstall)
        c.antiUninstall = {
          deviceAdminEnabled: true,
          accessibilityLockEnabled: true,
          preventSettingsTamper: true,
          uninstallAttemptsCount: 0,
        };
    });
    dirty = !loaded;
    let status = 200;
    let payload: any = null;
    const res: Res = {
      status(c) {
        status = c;
        return res;
      },
      json(b) {
        payload = b;
        return res;
      },
    };
    await r.handler({ body, params }, res);
    if (dirty) await save(db);
    return Response.json(payload ?? {}, { status });
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}
