import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";

export default function PresentationOverviewScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Overview</Text>
        <Text style={styles.title}>AI Amana Project Summary</Text>
        <Text style={styles.body}>
          This page exists for the presentation and gives you a quick speaking guide before you jump into logs and costs.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Demo Flow</Text>
        <Text style={styles.line}>1. Open Logs to show real matching activity and traceability.</Text>
        <Text style={styles.line}>2. Open Costs to show model-vs-volume projections.</Text>
        <Text style={styles.line}>3. Explain how this supports production scaling decisions.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Technical Highlights</Text>
        <Text style={styles.line}>1. Embedding retrieval for fast candidate search.</Text>
        <Text style={styles.line}>2. LLM rerank for better final match quality.</Text>
        <Text style={styles.line}>3. Run-level cost metrics with high-cost detection.</Text>
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
    fontSize: 30,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 17,
  },
  line: {
    color: colors.ink,
    lineHeight: 21,
  },
});
