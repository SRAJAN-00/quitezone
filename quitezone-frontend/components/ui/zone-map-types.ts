import { QuietTheme } from "@/constants/theme";

export type ZoneCoordinate = {
  latitude: number;
  longitude: number;
};

export type ZoneRegion = ZoneCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type ZoneMapProps = {
  coordinate: ZoneCoordinate;
  radiusMeters: number;
  region: ZoneRegion;
  onChangeCoordinate: (coordinate: ZoneCoordinate) => void;
  theme?: QuietTheme;
};
