import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

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

export default function RegisterScreen() {
  const theme = getTheme(useColorScheme());
  const { authBusy, clearError, error, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    clearError();
    const success = await register(email.trim(), password);
    if (success) {
      router.replace("/(tabs)");
    }
  }

  return (
    <QuietScreen theme={theme}>
      <QuietHero
        theme={theme}
        title="Get started"
        subtitle="Create your account to start building quiet zones and managing automation."
        eyebrow="Join QuietZone"
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
            message="Use at least 8 characters."
            onChangeText={setPassword}
            placeholder="Choose a secure password"
            secureTextEntry
            theme={theme}
            value={password}
          />

          {error ? <QuietBanner theme={theme} tone="danger" style={styles.banner}>{error}</QuietBanner> : null}

          <QuietPrimaryButton
            busy={authBusy}
            disabled={!email.trim() || password.length < 8}
            label="Create account"
            onPress={() => void submit()}
            theme={theme}
            style={styles.btn}
          />
          <QuietSecondaryButton
            label="Already have an account? Sign in"
            onPress={() => router.replace("/(auth)/login")}
            theme={theme}
          />
        </QuietCard>
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
});
