export type AuthUser = {
  id: string;
  email: string;
  role: string;
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
