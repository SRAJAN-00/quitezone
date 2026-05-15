import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietLoadingCard,
  QuietPrimaryButton,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme, Spacing, Radius } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiRequest, getUserFacingError } from "@/lib/api";
import { FeedbackItem } from "@/lib/quietzone-types";

const REFRESH_TTL_MS = 10000;

export function FeedbackContent() {
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

  const loadFeedback = useCallback(
    async (force = false) => {
      if (!accessToken) return;
      if (!force && feedbackItems.length > 0 && Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS) return;

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
    },
    [accessToken, feedbackItems.length]
  );

  useFocusEffect(
    useCallback(() => {
      void loadFeedback();
    }, [loadFeedback])
  );

  async function submitFeedback() {
    if (!accessToken) return;
    const trimmed = comment.trim();
    if (trimmed.length < 5) {
      setError("Please write at least 5 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await apiRequest("/api/feedback", {
        method: "POST",
        token: accessToken,
        body: {
          rating,
          comment: trimmed,
        },
      });

      setComment("");
      setRating(5);
      setSuccessMessage("Thanks. Your feedback has been submitted.");
      await loadFeedback(true);
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      style={[styles.container, { backgroundColor: theme.page }]}
    >
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Feedback</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Share your experience and what we should improve.</Text>
        </View>

        {error ? <QuietBanner theme={theme} tone="danger">{error}</QuietBanner> : null}
        {successMessage ? <QuietBanner theme={theme} tone="success">{successMessage}</QuietBanner> : null}

        <QuietCard theme={theme} style={styles.formCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Rate your experience</Text>

          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                  <MaterialIcons 
                    color={active ? theme.warning : theme.borderStrong} 
                    name={active ? "star" : "star-outline"} 
                    size={38} 
                  />
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.ratingValue, { color: theme.muted }]}>
            {rating} out of 5
          </Text>

          <View style={styles.commentSection}>
            <Text style={[styles.commentLabel, { color: theme.text }]}>Comments (optional)</Text>
            <TextInput
              editable={!submitting}
              maxLength={500}
              multiline
              numberOfLines={4}
              onChangeText={setComment}
              placeholder="Tell us what is working and what can be better."
              placeholderTextColor={theme.placeholder}
              style={[
                styles.commentInput,
                {
                  backgroundColor: theme.surfaceStrong,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              textAlignVertical="top"
              value={comment}
            />
            <Text style={[styles.charCount, { color: theme.muted }]}>{comment.length}/500</Text>
          </View>

          <QuietPrimaryButton busy={submitting} label="Submit feedback" onPress={() => void submitFeedback()} theme={theme} style={styles.submitBtn} />
        </QuietCard>

        {loading ? (
          <QuietLoadingCard label="Loading history..." theme={theme} />
        ) : feedbackItems.length === 0 ? (
          <QuietStateCard
            description="You have not submitted feedback yet."
            theme={theme}
            title="No feedback yet"
          />
        ) : (
          <>
            <Text style={[styles.historyTitle, { color: theme.text }]}>Submitted feedback ({feedbackItems.length})</Text>
            <View style={styles.feedbackList}>
              {feedbackItems.map((item) => (
                <QuietCard key={item.id} theme={theme} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.ratingRow}>
                      <MaterialIcons name="star" size={16} color={theme.warning} />
                      <Text style={[styles.feedbackRating, { color: theme.text }]}>
                        {item.rating} / 5
                      </Text>
                    </View>
                    <Text style={[styles.feedbackDate, { color: theme.muted }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {item.comment ? <Text style={[styles.feedbackComment, { color: theme.text }]}>{item.comment}</Text> : null}
                </QuietCard>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

export default FeedbackContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  formCard: {
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  ratingStars: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  starButton: {
    paddingHorizontal: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  commentSection: {
    gap: 8,
    marginTop: 16,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  commentInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: "500",
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  charCount: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  submitBtn: {
    marginTop: 12,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 8,
    marginLeft: 4,
  },
  feedbackList: {
    gap: Spacing.md,
  },
  feedbackCard: {
    padding: Spacing.md,
    gap: 8,
  },
  feedbackHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  feedbackRating: {
    fontSize: 14,
    fontWeight: "700",
  },
  feedbackDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  feedbackComment: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
});

