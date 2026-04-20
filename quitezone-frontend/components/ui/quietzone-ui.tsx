import { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { QuietTheme, Radius, Spacing } from "@/constants/theme";

type ButtonProps = {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  theme: QuietTheme;
};

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  theme: QuietTheme;
  contentStyle?: ViewStyle;
}>;

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  theme: QuietTheme;
};

type InputProps = TextInputProps & {
  label: string;
  message?: string;
  theme: QuietTheme;
};

type StateCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  theme: QuietTheme;
};

export function QuietScreen({ children, contentStyle, scroll = true, theme }: ScreenProps) {
  const content = (
    <View style={[styles.screenContent, { backgroundColor: theme.page }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.page }]} edges={["top", "left", "right"]}>
      {scroll ? <ScrollView showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function QuietHero({
  title,
  subtitle,
  eyebrow,
  theme,
  children,
}: PropsWithChildren<{ title: string; subtitle: string; eyebrow: string; theme: QuietTheme }>) {
  return (
    <View style={styles.hero}>
      <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
      <Text style={[styles.heroTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.heroSubtitle, { color: theme.mutedStrong }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

export function QuietCard({
  children,
  style,
  theme,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; theme: QuietTheme }>) {
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

export function QuietSectionHeader({ action, subtitle, theme, title }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function QuietPrimaryButton({ busy, disabled, label, onPress, theme }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: theme.accent,
          opacity: disabled ? 0.55 : pressed || busy ? 0.85 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={theme.accentTextOn} /> : <Text style={[styles.primaryButtonText, { color: theme.accentTextOn }]}>{label}</Text>}
    </Pressable>
  );
}

export function QuietSecondaryButton({ busy, disabled, label, onPress, theme }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          borderColor: theme.borderStrong,
          opacity: disabled ? 0.55 : pressed || busy ? 0.85 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={theme.text} /> : <Text style={[styles.secondaryButtonText, { color: theme.text }]}>{label}</Text>}
    </Pressable>
  );
}

export function QuietInput({ label, message, theme, ...props }: InputProps) {
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: theme.mutedStrong }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.placeholder}
        style={[
          styles.input,
          {
            backgroundColor: theme.input,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        {...props}
      />
      {message ? <Text style={[styles.inputMessage, { color: theme.muted }]}>{message}</Text> : null}
    </View>
  );
}

export function QuietBanner({
  children,
  tone = "neutral",
  theme,
}: PropsWithChildren<{ tone?: "neutral" | "danger" | "success"; theme: QuietTheme }>) {
  const color =
    tone === "danger" ? theme.danger : tone === "success" ? theme.success : theme.mutedStrong;

  return (
    <View style={[styles.banner, { backgroundColor: theme.accentSoft, borderColor: color }]}>
      <Text style={[styles.bannerText, { color: theme.text }]}>{children}</Text>
    </View>
  );
}

export function QuietStateCard({ action, description, theme, title }: StateCardProps) {
  return (
    <QuietCard theme={theme}>
      <Text style={[styles.stateTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.stateDescription, { color: theme.muted }]}>{description}</Text>
      {action}
    </QuietCard>
  );
}

export function QuietLoadingCard({ label, theme }: { label: string; theme: QuietTheme }) {
  return (
    <QuietCard theme={theme} style={styles.loadingCard}>
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.loadingLabel, { color: theme.muted }]}>{label}</Text>
    </QuietCard>
  );
}

export function QuietPill({
  label,
  muted = false,
  theme,
}: {
  label: string;
  muted?: boolean;
  theme: QuietTheme;
}) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: muted ? theme.surfaceStrong : theme.accentSoft, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.pillLabel, { color: muted ? theme.mutedStrong : theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: Spacing.sm,
    maxWidth: 620,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputWrap: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: Spacing.md,
  },
  inputMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  banner: {
    borderLeftWidth: 4,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  stateDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  loadingLabel: {
    fontSize: 14,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
});
