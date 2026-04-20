import { StyleSheet, Text, View } from "react-native";

import { QuietTheme } from "@/constants/theme";
import { ZoneMapProps } from "@/components/ui/zone-map-types";

type ZoneMapWebProps = ZoneMapProps & {
  theme?: QuietTheme;
};

export function ZoneMap({ coordinate, radiusMeters, theme }: ZoneMapWebProps) {
  return (
    <View
      style={[
        styles.fallback,
        {
          backgroundColor: theme?.pageAlt ?? "#e9e1d5",
          borderColor: theme?.border ?? "#d8cebf",
        },
      ]}
    >
      <Text style={[styles.title, { color: theme?.text ?? "#18241d" }]}>Map preview is mobile-only on web.</Text>
      <Text style={[styles.body, { color: theme?.muted ?? "#667067" }]}>
        The native app supports full map placement with drag-and-drop editing. For web preview, the
        selected center stays at:
      </Text>
      <Text style={[styles.coords, { color: theme?.text ?? "#18241d" }]}>
        {coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}
      </Text>
      <Text style={[styles.body, { color: theme?.muted ?? "#667067" }]}>
        Radius: {radiusMeters}m
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    minHeight: 180,
    padding: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  coords: {
    fontSize: 14,
    fontWeight: "700",
  },
});
