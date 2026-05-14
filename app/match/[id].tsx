import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <Text style={styles.title}>Match detail</Text>
      <Text style={styles.body}>Match #{id}</Text>
      <Text style={styles.body}>Use the Matches tab to start masked chat. This screen is reserved for expanded item comparison and admin notes.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
});
