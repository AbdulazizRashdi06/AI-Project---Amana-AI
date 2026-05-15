import { router } from "expo-router";
import { MessageCircle, Sparkles, XCircle } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { MatchCard } from "@/components/MatchCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthContext";
import { dismissMatch, startChatForMatch } from "@/features/matches/api";
import { useUserMatches } from "@/features/matches/hooks";
import { colors } from "@/theme/colors";

export default function MatchesScreen() {
  const { user } = useAuth();
  const { matches, loading, error } = useUserMatches(user?.uid);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function openChat(matchId: string) {
    setActionMessage(null);
    try {
      const chatId = await startChatForMatch(matchId, user?.uid);
      router.push(`/chat/${chatId}`);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Please try again.";
      setActionMessage(`Could not start chat: ${message}`);
      if (Platform.OS === "web") {
        window.alert(`Could not start chat: ${message}`);
      } else {
        Alert.alert("Could not start chat", message);
      }
    }
  }

  async function handleDismiss(matchId: string) {
    try {
      await dismissMatch(matchId);
    } catch (nextError) {
      Alert.alert("Could not dismiss match", nextError instanceof Error ? nextError.message : "Please try again.");
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>AI Match Analysis</Text>
        <Text style={styles.title}>Suggested matches</Text>
        <Text style={styles.body}>Review potential matches based on item descriptions, locations, dates, and photos.</Text>
      </View>
      <View style={styles.filterBar}>
        <View style={styles.activeFilter}>
          <Sparkles color="#fff" size={16} />
          <Text style={styles.activeFilterText}>Strong Matches</Text>
        </View>
        <View style={styles.filterPill}>
          <Text style={styles.filterText}>Possible Matches</Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {actionMessage ? <Text style={styles.error}>{actionMessage}</Text> : null}
      {!loading && matches.length === 0 ? (
        <EmptyState title="No matches yet" body="New reports trigger AI matching automatically. Strong and possible matches will appear here." />
      ) : null}
      {matches.map((match) => (
        <View key={match.id} style={styles.matchWrap}>
          <MatchCard match={match} />
          <View style={styles.actions}>
            <Button title="Chat" variant="secondary" onPress={() => openChat(match.id)} icon={<MessageCircle color={colors.primaryDark} size={18} />} style={styles.actionButton} />
            <Button title="Dismiss" variant="ghost" onPress={() => handleDismiss(match.id)} icon={<XCircle color={colors.ink} size={18} />} style={styles.actionButton} />
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  kicker: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    letterSpacing: 1.1,
    fontSize: 12,
  },
  title: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  filterBar: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: 4,
    gap: 4,
  },
  activeFilter: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    color: colors.muted,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderColor: "#f8b4ae",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
  },
  matchWrap: {
    gap: 8,
    maxWidth: 760,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});
