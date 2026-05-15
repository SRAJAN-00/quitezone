import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietInput,
  QuietPrimaryButton,
  QuietScreen,
  QuietSecondaryButton,
  QuietHero,
} from "@/components/ui/quietzone-ui";
import { getTheme, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function LoginScreen() {
  const theme = getTheme(useColorScheme());
  const { authBusy, clearError, error, login } = useAuth();
  const [email, setEmail] = useState("user1@example.com");
  const [password, setPassword] = useState("password123");

  async function submit() {
    clearError();
    const success = await login(email.trim(), password);
    if (success) {
      router.replace("/(tabs)");
    }
  }

  return (
    <QuietScreen theme={theme}>
      <QuietHero
        theme={theme}
        title="Welcome back"
        subtitle="Sign in to manage your zones, track transitions, and keep automation ready."
        eyebrow="Access QuietZone"
      />

      <View style={styles.form}>
        <QuietCard theme={theme} style={styles.card}>
          <QuietInput
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            theme={theme}
            value={email}
          />
          <QuietInput
            label="Password"
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            theme={theme}
            value={password}
          />

          {error ? <QuietBanner theme={theme} tone="danger" style={styles.banner}>{error}</QuietBanner> : null}

          <QuietPrimaryButton
            busy={authBusy}
            disabled={!email.trim() || !password.trim()}
            label="Sign in"
            onPress={() => void submit()}
            theme={theme}
            style={styles.btn}
          />
          <QuietSecondaryButton
            label="Need an account? Register"
            onPress={() => router.replace("/(auth)/register")}
            theme={theme}
          />
        </QuietCard>

        <Text style={[styles.meta, { color: theme.muted }]}>
          Use <Text style={{ color: theme.text, fontWeight: "700" }}>user1@example.com</Text> / <Text style={{ color: theme.text, fontWeight: "700" }}>password123</Text> for test login.
        </Text>
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  banner: {
    marginVertical: 4,
  },
  btn: {
    marginTop: 8,
  },
  meta: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontWeight: "500",
    paddingHorizontal: 20,
  },
});


