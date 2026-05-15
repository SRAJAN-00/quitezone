import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietLoadingCard,
  QuietPrimaryButton,
  QuietScreen,
  QuietSectionHeader,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiRequest, getUserFacingError } from "@/lib/api";
import { FeedbackItem } from "@/lib/quietzone-types";

const REFRESH_TTL_MS = 10000;

export default function FeedbackScreen() {
  const theme = getTheme(useColorScheme());
  const { accessToken } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const lastLoadedAtRef = useRef(0);

  const loadFeedback = useCallback(async (force = false) => {
    if (!accessToken) {
      return;
    }

    if (!force && feedbackItems.length > 0 && Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ feedback: FeedbackItem[] }>("/api/feedback", {
        token: accessToken,
      });
      setFeedbackItems(res.feedback);
      lastLoadedAtRef.current = Date.now();
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, feedbackItems.length]);

  useFocusEffect(
    useCallback(() => {
      void loadFeedback();
    }, [loadFeedback])
  );

  async function submitFeedback() {
    if (!accessToken) {
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length < 5) {
      setError("Please write at least 5 characters in feedback.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await apiRequest("/api/feedback", {
        method: "POST",
        token: accessToken,
        body: { rating, comment: trimmed },
      });
      setComment("");
      setRating(5);
      setSuccessMessage("Thanks! Your feedback has been submitted.");
      await loadFeedback(true);
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setSubmitting(false);
    }
  }

  function renderStars(selected: number, onPick: (value: number) => void) {
    const isDark = theme.page !== "#F5F5F7";
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => onPick(value)}
            style={[
              styles.starPill,
              {
                backgroundColor: value <= selected ? (isDark ? "#F8F8FA" : "#1C1C1E") : theme.surfaceStrong,
                borderColor: value <= selected ? (isDark ? "#F8F8FA" : "#1C1C1E") : theme.border,
              },
            ]}
          >
            <Text style={{ color: value <= selected ? (isDark ? "#111113" : "#FFFFFF") : theme.mutedStrong, fontWeight: "700" }}>{value} {value === 1 ? "star" : "stars"}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <QuietScreen theme={theme}>
      <View style={styles.section}>
        <QuietSectionHeader
          subtitle="Share your app experience and suggestions."
          theme={theme}
          title="Feedback"
        />

        <QuietCard theme={theme}>
          <Text style={[styles.inputLabel, { color: theme.mutedStrong }]}>Rating</Text>
          {renderStars(rating, setRating)}

          <Text style={[styles.inputLabel, { color: theme.mutedStrong }]}>Review</Text>
          <TextInput
            multiline
            numberOfLines={5}
            onChangeText={setComment}
            placeholder="Tell us what works well and what should be improved."
            placeholderTextColor={theme.placeholder}
            style={[styles.commentInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
            textAlignVertical="top"
            value={comment}
          />

          <QuietPrimaryButton
            busy={submitting}
            disabled={submitting || comment.trim().length < 5}
            label="Submit feedback"
            onPress={() => void submitFeedback()}
            theme={theme}
          />
        </QuietCard>

        {successMessage ? <QuietBanner theme={theme} tone="success">{successMessage}</QuietBanner> : null}
        {error ? <QuietBanner theme={theme} tone="danger">{error}</QuietBanner> : null}
      </View>

      <View style={styles.section}>
        <QuietSectionHeader
          subtitle="Your latest submitted reviews."
          theme={theme}
          title="History"
        />

        {loading ? (
          <QuietLoadingCard label="Loading feedback..." theme={theme} />
        ) : feedbackItems.length === 0 ? (
          <QuietStateCard
            description="You have not submitted any feedback yet."
            theme={theme}
            title="No feedback yet"
          />
        ) : (
          feedbackItems.map((item) => (
            <QuietCard key={item.id} theme={theme}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{item.rating} / 5</Text>
              <Text style={[styles.itemComment, { color: theme.mutedStrong }]}>{item.comment}</Text>
              <Text style={[styles.itemMeta, { color: theme.muted }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </QuietCard>
          ))
        )}
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  starRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  starPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 12,
  },
});

