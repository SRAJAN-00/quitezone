export type AuthUser = {
  id: string;
  email: string;
  role: "user" | "admin";
};

export type Zone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  targetMode: "silent" | "vibrate";
  isActive: boolean;
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
  lat: number;
  lng: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminEvent = EventItem & {
  userId: string | null;
  userEmail: string | null;
};
