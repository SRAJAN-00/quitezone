import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import MapView, { Circle, Marker, UrlTile } from "react-native-maps";
import { WebView } from "react-native-webview";

import { ZoneMapProps } from "@/components/ui/zone-map-types";

// OpenStreetMap tiles — completely free, no API key required.
// Attribution to © OpenStreetMap contributors is required by the OSM tile usage policy.
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

export function ZoneMap({
  coordinate,
  onChangeCoordinate,
  radiusMeters,
  region,
  height = 300,
  onInteractionStart,
  onInteractionEnd,
}: ZoneMapProps) {
  const mapRef = useRef<MapView>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      },
      250
    );
  }, [
    coordinate.latitude,
    coordinate.longitude,
    region.latitudeDelta,
    region.longitudeDelta,
  ]);

  if (Platform.OS === "android" && !GOOGLE_MAPS_API_KEY) {
    return (
      <OpenStreetMapWebView
        coordinate={coordinate}
        onChangeCoordinate={onChangeCoordinate}
        height={height}
        onInteractionEnd={onInteractionEnd}
        onInteractionStart={onInteractionStart}
        radiusMeters={radiusMeters}
        region={region}
      />
    );
  }

  return (
    <MapView
      ref={mapRef}
      initialRegion={region}
      // Disable the default Google base layer so OSM tiles show cleanly.
      mapType="none"
      onLongPress={(event) => {
        onChangeCoordinate(event.nativeEvent.coordinate);
      }}
      onPress={(event) => {
        onChangeCoordinate(event.nativeEvent.coordinate);
      }}
      onTouchEnd={onInteractionEnd}
      onTouchStart={onInteractionStart}
      showsMyLocationButton
      showsUserLocation
      style={{ height, width: "100%" }}
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

type OpenStreetMapWebViewProps = ZoneMapProps;

function OpenStreetMapWebView({
  coordinate,
  onChangeCoordinate,
  height = 300,
  onInteractionEnd,
  onInteractionStart,
  radiusMeters,
  region,
}: OpenStreetMapWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  const html = useRef(buildHtml(coordinate, radiusMeters, region.latitudeDelta)).current;

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.updateQuietZone?.(${JSON.stringify({ coordinate, radiusMeters, region })}); true;`
    );
  }, [coordinate, radiusMeters, region]);

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data) as {
            type?: string;
            coordinate?: { latitude: number; longitude: number };
          };

          if (message.type === "coordinate" && message.coordinate) {
            onChangeCoordinate(message.coordinate);
          }
          if (message.type === "interaction-start") {
            onInteractionStart?.();
          }
          if (message.type === "interaction-end") {
            onInteractionEnd?.();
          }
        } catch {
          // Ignore malformed map messages.
        }
      }}
      onLoadEnd={() => {
        webViewRef.current?.injectJavaScript(
          `window.updateQuietZone?.(${JSON.stringify({ coordinate, radiusMeters, region })}); true;`
        );
      }}
      source={{ html }}
      style={{ height, width: "100%" }}
    />
  );
}

function buildHtml(
  coordinate: ZoneMapProps["coordinate"],
  radiusMeters: number,
  latitudeDelta: number
) {
  const initialState = JSON.stringify({ coordinate, radiusMeters, latitudeDelta });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: #f5efe6;
      }
      .leaflet-container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        const initialState = ${initialState};
        const tileUrl = ${JSON.stringify(OSM_TILE_URL)};
        const map = L.map("map", { zoomControl: true, attributionControl: true });
        let marker = null;
        let circle = null;
        let latestState = initialState;

        function zoomFromLatitudeDelta(latitudeDelta) {
          const safeDelta = Math.max(latitudeDelta || 0.01, 0.0005);
          const zoom = Math.round(Math.log2(360 / safeDelta));
          return Math.min(19, Math.max(3, zoom));
        }

        function postCoordinate(nextCoordinate) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "coordinate",
              coordinate: nextCoordinate,
            }));
          }
        }

        function postInteraction(type) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
          }
        }

        function syncView(nextState, animate) {
          latestState = nextState;
          const center = [nextState.coordinate.latitude, nextState.coordinate.longitude];
          const zoom = zoomFromLatitudeDelta(nextState.latitudeDelta);

          if (marker) {
            marker.setLatLng(center);
          }

          if (circle) {
            circle.setLatLng(center);
            circle.setRadius(nextState.radiusMeters);
          }

          map.setView(center, zoom, { animate: Boolean(animate) });
        }

        window.updateQuietZone = function (nextState) {
          if (!nextState || !nextState.coordinate) {
            return;
          }

          syncView(nextState, true);
        };

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const center = [initialState.coordinate.latitude, initialState.coordinate.longitude];
        map.setView(center, zoomFromLatitudeDelta(initialState.latitudeDelta));

        circle = L.circle(center, {
          radius: initialState.radiusMeters,
          color: "#1f6a50",
          fillColor: "#1f6a50",
          fillOpacity: 0.18,
          weight: 2,
        }).addTo(map);

        marker = L.marker(center, { draggable: true }).addTo(map);

        map.on("click", function (event) {
          postInteraction("interaction-start");
          const nextCoordinate = {
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          };
          syncView({ ...latestState, coordinate: nextCoordinate }, false);
          postCoordinate(nextCoordinate);
          postInteraction("interaction-end");
        });

        marker.on("dragstart", function () {
          postInteraction("interaction-start");
        });
        marker.on("dragend", function (event) {
          const position = event.target.getLatLng();
          const nextCoordinate = {
            latitude: position.lat,
            longitude: position.lng,
          };
          syncView({ ...latestState, coordinate: nextCoordinate }, false);
          postCoordinate(nextCoordinate);
          postInteraction("interaction-end");
        });
      })();
    </script>
  </body>
</html>`;
}
