import MapView, { Circle, Marker, UrlTile } from "react-native-maps";

import { ZoneMapProps } from "@/components/ui/zone-map-types";

// OpenStreetMap tiles — completely free, no API key required.
// Attribution to © OpenStreetMap contributors is required by the OSM tile usage policy.
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function ZoneMap({
  coordinate,
  onChangeCoordinate,
  radiusMeters,
  region,
}: ZoneMapProps) {
  return (
    <MapView
      initialRegion={region}
      // Disable the default Google base layer so OSM tiles show cleanly.
      mapType="none"
      onPress={(event) => {
        onChangeCoordinate(event.nativeEvent.coordinate);
      }}
      region={region}
      style={{ height: 300, width: "100%" }}
    >
      {/* Free OpenStreetMap raster tiles */}
      <UrlTile
        maximumZ={19}
        tileSize={256}
        urlTemplate={OSM_TILE_URL}
        zIndex={-1}
      />
      <Circle
        center={coordinate}
        fillColor="rgba(31,106,80,0.18)"
        radius={radiusMeters}
        strokeColor="rgba(31,106,80,0.65)"
        strokeWidth={2}
      />
      <Marker
        coordinate={coordinate}
        draggable
        onDragEnd={(event) => onChangeCoordinate(event.nativeEvent.coordinate)}
      />
    </MapView>
  );
}
