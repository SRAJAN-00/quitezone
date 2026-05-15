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
  style?: StyleProp<ViewStyle>;
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
}: PropsWithChildren<{ title: string; subtitle: string; eyebrow?: string; theme: QuietTheme }>) {
  return (
    <View style={styles.hero}>
      {eyebrow && <Text style={[styles.eyebrow, { color: theme.muted }]}>{eyebrow}</Text>}
      <Text style={[styles.heroTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.heroSubtitle, { color: theme.muted }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

export function QuietCard({
  children,
  style,
  theme,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; theme: QuietTheme }>) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: "#000000" },
        style,
      ]}
    >
      {children}
    </View>
  );
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

export function QuietPrimaryButton({ busy, disabled, label, onPress, theme, style }: ButtonProps) {
  const isDark = theme.page !== "#F5F5F7";
  const backgroundColor = isDark ? "#F8F8FA" : "#1C1C1E";
  const textColor = isDark ? "#111113" : "#FFFFFF";

  return (
    <Pressable
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor,
          borderColor: backgroundColor,
          borderWidth: 0,
          opacity: disabled ? 0.55 : pressed || busy ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={textColor} /> : <Text style={[styles.primaryButtonText, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

export function QuietSecondaryButton({ busy, disabled, label, onPress, theme, style }: ButtonProps) {
  const isDark = theme.page !== "#F5F5F7";
  const backgroundColor = isDark ? "#1B1B21" : "#FFFFFF";
  const borderColor = isDark ? "#3B3B47" : "#E5E5E5";
  const textColor = isDark ? "#F8F8FA" : "#1C1C1E";

  return (
    <Pressable
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          borderColor,
          backgroundColor,
          opacity: disabled ? 0.55 : pressed || busy ? 0.85 : 1,
        },
        style
      ]}
    >
      {busy ? <ActivityIndicator color={textColor} /> : <Text style={[styles.secondaryButtonText, { color: textColor }]}>{label}</Text>}
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
  style,
}: PropsWithChildren<{ tone?: "neutral" | "danger" | "success"; theme: QuietTheme; style?: StyleProp<ViewStyle> }>) {
  const color =
    tone === "danger" ? theme.danger : tone === "success" ? theme.success : theme.mutedStrong;
  const backgroundColor =
    tone === "danger"
      ? "rgba(239, 68, 68, 0.12)"
      : tone === "success"
        ? "rgba(16, 185, 129, 0.12)"
        : theme.surfaceStrong;

  return (
    <View style={[styles.banner, { backgroundColor, borderColor: color }, style]}>
      <Text style={[styles.bannerText, { color: theme.text }]}>{children}</Text>
    </View>
  );
}

export function QuietStateCard({ action, description, theme, title }: StateCardProps) {
  return (
    <QuietCard theme={theme} style={styles.stateCard}>
      <View style={styles.stateCardCopy}>
        <Text style={[styles.stateTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.stateDescription, { color: theme.muted }]}>{description}</Text>
      </View>
      {action && <View style={styles.stateCardAction}>{action}</View>}
    </QuietCard>
  );
}

export function QuietLoadingCard({ label, theme }: { label: string; theme: QuietTheme }) {
  return (
    <QuietCard theme={theme} style={styles.loadingCard}>
      <ActivityIndicator color={theme.accent} size="large" />
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
        { backgroundColor: muted ? theme.surfaceStrong : theme.surface, borderColor: theme.border },
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
    paddingBottom: 34,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 620,
    fontWeight: "500",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrap: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.2,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  banner: {
    borderLeftWidth: 4,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bannerText: {
    fontSize: 15,
    lineHeight: 22,
  },
  stateCard: {
    alignItems: "center",
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  stateCardCopy: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  stateDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  stateCardAction: {
    marginTop: Spacing.sm,
    width: "100%",
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    gap: Spacing.lg,
  },
  loadingLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
