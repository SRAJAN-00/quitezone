export type AuthUser = {
  id: string;
  email: string;
  role: "user" | "admin";
};

export type ZoneSchedule = {
  enabled: boolean;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
};

export type Zone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  targetMode: "silent" | "vibrate";
  isActive: boolean;
  schedule?: ZoneSchedule;
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
  ownerId: string;
  ownerEmail: string | null;
  radiusMeters: number;
  targetMode: "silent" | "vibrate";
  isActive: boolean;
  schedule?: ZoneSchedule;
  lat: number;
  lng: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminEvent = EventItem & {
  userId: string | null;
  userEmail: string | null;
};
