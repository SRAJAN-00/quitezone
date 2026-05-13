import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { ZoneMapProps } from "@/components/ui/zone-map-types";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type IFrameData =
  | { type: "coordinate"; coordinate: { latitude: number; longitude: number } }
  | { type: "interaction-start" }
  | { type: "interaction-end" };

function buildSrcDoc(
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
        const tileUrl = ${JSON.stringify(OSM_TILE_URL)};
        const initialState = ${initialState};
        const map = L.map("map", { zoomControl: true, attributionControl: true });
        let marker = null;
        let circle = null;
        let latestState = initialState;

        function postMessageToParent(payload) {
          window.parent.postMessage(payload, "*");
        }

        function zoomFromLatitudeDelta(latitudeDelta) {
          const safeDelta = Math.max(latitudeDelta || 0.01, 0.0005);
          const zoom = Math.round(Math.log2(360 / safeDelta));
          return Math.min(19, Math.max(3, zoom));
        }

        function syncView(nextState, animate) {
          latestState = nextState;
          const center = [nextState.coordinate.latitude, nextState.coordinate.longitude];
          const zoom = zoomFromLatitudeDelta(nextState.latitudeDelta);
          if (marker) marker.setLatLng(center);
          if (circle) {
            circle.setLatLng(center);
            circle.setRadius(nextState.radiusMeters);
          }
          map.setView(center, zoom, { animate: Boolean(animate) });
        }

        function notifyCoordinate(coordinate) {
          postMessageToParent({ type: "coordinate", coordinate });
        }

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
          postMessageToParent({ type: "interaction-start" });
          const nextCoordinate = { latitude: event.latlng.lat, longitude: event.latlng.lng };
          syncView({ ...latestState, coordinate: nextCoordinate }, false);
          notifyCoordinate(nextCoordinate);
          postMessageToParent({ type: "interaction-end" });
        });

        marker.on("dragstart", function () {
          postMessageToParent({ type: "interaction-start" });
        });

        marker.on("dragend", function (event) {
          const position = event.target.getLatLng();
          const nextCoordinate = { latitude: position.lat, longitude: position.lng };
          syncView({ ...latestState, coordinate: nextCoordinate }, false);
          notifyCoordinate(nextCoordinate);
          postMessageToParent({ type: "interaction-end" });
        });

        window.addEventListener("message", function (event) {
          const data = event.data;
          if (!data || data.type !== "update" || !data.payload) return;
          syncView(data.payload, true);
        });
      })();
    </script>
  </body>
</html>`;
}

export function ZoneMap({
  coordinate,
  onChangeCoordinate,
  radiusMeters,
  region,
  height = 300,
  onInteractionStart,
  onInteractionEnd,
}: ZoneMapProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const srcDoc = useRef(buildSrcDoc(coordinate, radiusMeters, region.latitudeDelta)).current;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const data = event.data as IFrameData;
      if (!data || typeof data !== "object" || !("type" in data)) {
        return;
      }

      if (data.type === "coordinate" && data.coordinate) {
        onChangeCoordinate(data.coordinate);
      }
      if (data.type === "interaction-start") {
        onInteractionStart?.();
      }
      if (data.type === "interaction-end") {
        onInteractionEnd?.();
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [onChangeCoordinate, onInteractionEnd, onInteractionStart]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "update",
        payload: {
          coordinate,
          radiusMeters,
          latitudeDelta: region.latitudeDelta,
        },
      },
      "*"
    );
  }, [coordinate, radiusMeters, region.latitudeDelta]);

  const IFrame = "iframe" as any;

  return (
    <View style={[styles.frameWrap, { height }]}>
      <IFrame
        ref={(node: unknown) => {
          iframeRef.current = node as HTMLIFrameElement | null;
        }}
        srcDoc={srcDoc}
        style={{ border: "none", width: "100%", height: "100%" }}
        title="QuietZone map"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frameWrap: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 16,
  },
});
