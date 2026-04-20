import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

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
        eyebrow="Set up your space"
        subtitle="Create a QuietZone account to manage zones, keep sessions across launches, and start building your automation layout."
        theme={theme}
        title="Create your QuietZone account."
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
          message="Use at least 8 characters."
          onChangeText={setPassword}
          placeholder="Choose a secure password"
          secureTextEntry
          theme={theme}
          value={password}
        />

        {error ? <QuietBanner theme={theme} tone="danger">{error}</QuietBanner> : null}

        <QuietPrimaryButton
          busy={authBusy}
          disabled={!email.trim() || password.length < 8}
          label="Create account"
          onPress={() => void submit()}
          theme={theme}
        />
        <QuietSecondaryButton
          label="Already have an account? Sign in"
          onPress={() => router.replace("/(auth)/login")}
          theme={theme}
        />
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
});
