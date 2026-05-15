import { Send } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { sendChatMessage } from "@/features/chats/api";
import { useChatMessages } from "@/features/chats/hooks";
import { formatDateTime } from "@/lib/dates";
import { colors } from "@/theme/colors";

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { messages } = useChatMessages(id);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!user || !id || !body.trim()) {
      return;
    }

    setSending(true);
    try {
      await sendChatMessage(id, user.uid, body);
      setBody("");
    } catch (error) {
      Alert.alert("Could not send message", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.safety}>Keep pickup arrangements on campus and avoid sharing sensitive personal information.</Text>}
        renderItem={({ item }) => {
          const mine = item.senderUid === user?.uid;
          return (
            <View style={[styles.message, mine ? styles.mine : styles.theirs, item.system && styles.system]}>
              <Text style={[styles.messageBody, mine && styles.mineText]}>{item.body}</Text>
              <Text style={[styles.time, mine && styles.mineText]}>{formatDateTime(item.createdAt)}</Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Ask about item details or pickup..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Button title="Send" loading={sending} onPress={handleSend} icon={<Send color="#fff" size={18} />} style={styles.sendButton} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  backButton: {
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 38,
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  backText: {
    color: colors.ink,
    fontWeight: "700",
  },
  safety: {
    backgroundColor: colors.amberSoft,
    color: colors.amber,
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
    overflow: "hidden",
  },
  message: {
    maxWidth: "84%",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  system: {
    alignSelf: "center",
    backgroundColor: colors.surfaceMuted,
  },
  messageBody: {
    color: colors.ink,
    lineHeight: 20,
  },
  mineText: {
    color: "#fff",
  },
  time: {
    color: colors.muted,
    fontSize: 12,
  },
  composer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.surface,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
  },
  sendButton: {
    minWidth: 96,
  },
});
