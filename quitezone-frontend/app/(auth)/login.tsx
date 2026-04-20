import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietBanner,
  QuietHero,
  QuietInput,
  QuietPrimaryButton,
  QuietScreen,
  QuietSecondaryButton,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
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
        eyebrow="Welcome back"
        subtitle="Sign in to view your active quiet zones, review event activity, and keep your place-based automations in sync."
        theme={theme}
        title="Return to your QuietZone workspace."
      />

      <View style={styles.form}>
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
          placeholder="password123"
          secureTextEntry
          theme={theme}
          value={password}
        />

        {error ? <QuietBanner theme={theme} tone="danger">{error}</QuietBanner> : null}

        <QuietPrimaryButton
          busy={authBusy}
          disabled={!email.trim() || !password.trim()}
          label="Sign in"
          onPress={() => void submit()}
          theme={theme}
        />
        <QuietSecondaryButton
          label="Need an account? Register"
          onPress={() => router.replace("/(auth)/register")}
          theme={theme}
        />

        <Text style={[styles.meta, { color: theme.muted }]}>Use `user1@example.com` / `password123` for the seeded test account.</Text>
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  meta: {
    fontSize: 13,
    lineHeight: 19,
  },
});
