import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";

export default function PresentationHubScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Presentation</Text>
        <Text style={styles.title}>AI Amana Presentation Hub</Text>
        <Text style={styles.body}>
          This page exists for the presentation. It is a navigation hub, not a slide deck, so you can move freely between sections during your demo.
        </Text>
      </View>

      <View style={styles.optionsCard}>
        <Text style={styles.sectionTitle}>Options</Text>
        <Text style={styles.sectionBody}>Use these three options during your presentation flow.</Text>
        <View style={styles.actions}>
          <Button title="Overview" variant="secondary" onPress={() => router.push("/presentation-overview")} />
          <Button title="Logs" variant="ghost" onPress={() => router.push("/logs")} />
          <Button title="Costs" variant="primary" onPress={() => router.push("/cost-table")} />
        </View>
      </View>
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
    fontSize: 32,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
    maxWidth: 840,
  },
  optionsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 18,
  },
  sectionBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
});
