export type AuthUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  notificationDefaults: NotificationDefaults;
};

export type ZoneSchedule = {
  enabled: boolean;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
};

export type ZoneNotificationSettings = {
  enabled: boolean;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
  onlyOnFailure: boolean;
};

export type NotificationDefaults = ZoneNotificationSettings;

export type Zone = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  targetMode: "silent" | "vibrate";
  isActive: boolean;
  schedule?: ZoneSchedule;
  notifications?: ZoneNotificationSettings;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EventItem = {
  id: string;
  transition: "enter" | "exit";
  zoneId: string | null;
  zoneName: string;
  modeApplied: string;
  previousMode: string;
  triggeredAt: string;
  metadata?: {
    source?: string;
    ringerApplied?: boolean;
    blocked?: boolean;
    reason?: string | null;
    push?: {
      sent: number;
      failed: number;
      reason?: string;
    };
    [key: string]: unknown;
  };
  createdAt?: string;
};

export type AdminUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  createdAt?: string;
  updatedAt?: string;
};

export type AdminZone = {
  id: string;
  name: string;
  address?: string;
  ownerId: string;
  ownerEmail: string | null;
  radiusMeters: number;
  targetMode: "silent" | "vibrate";
  isActive: boolean;
  schedule?: ZoneSchedule;
  notifications?: ZoneNotificationSettings;
  lat: number;
  lng: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminEvent = EventItem & {
  userId: string | null;
  userEmail: string | null;
};

export type AdminDailyActivity = {
  date: string;
  label: string;
  users: number;
  zones: number;
  events: number;
};

export type AdminAnalytics = {
  roleBreakdown: {
    admin: number;
    user: number;
  };
  zoneStatus: {
    active: number;
    paused: number;
  };
  eventTransitions: {
    enter: number;
    exit: number;
  };
  recentDailyActivity: AdminDailyActivity[];
};

export type FeedbackItem = {
  id: string;
  userId: string;
  userEmail?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
};
