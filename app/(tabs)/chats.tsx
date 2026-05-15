import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthContext";
import { useUserChats } from "@/features/chats/hooks";
import { formatDateTime } from "@/lib/dates";
import { colors } from "@/theme/colors";

export default function ChatsScreen() {
  const { user } = useAuth();
  const { chats, error } = useUserChats(user?.uid);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Masked chats</Text>
        <Text style={styles.body}>Coordinate possible matches without exposing campus email or phone numbers.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {chats.length === 0 ? <EmptyState title="No chats yet" body="Start a chat from a suggested match when you are ready to compare details." /> : null}
      {chats.map((chat) => (
        <Pressable key={chat.id} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: chat.id } })} style={styles.chatCard}>
          <Text style={styles.chatTitle}>Match chat #{chat.matchId.slice(0, 8)}</Text>
          <Text style={styles.meta}>{chat.status} - {formatDateTime(chat.updatedAt)}</Text>
          <Text style={styles.meta}>Lost #{chat.lostReportId.slice(0, 6)} - Found #{chat.foundReportId.slice(0, 6)}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
  },
  chatCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 6,
  },
  chatTitle: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: 17,
  },
  meta: {
    color: colors.muted,
  },
});
