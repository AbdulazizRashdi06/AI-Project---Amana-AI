import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";

type StoryLog = {
  title: string;
  whatHappened: string;
  rootCause: string;
  fix: string;
  result: string;
};

const logs: StoryLog[] = [
  {
    title: "1) Report Submission Flow",
    whatHappened: "Users can submit lost or found reports with details and photos.",
    rootCause: "Early demos needed one reliable form flow before AI steps.",
    fix: "Added validation, image upload, and Firestore write with status tracking.",
    result: "Reports are saved consistently and ready for matching.",
  },
  {
    title: "2) AI Matching Pipeline",
    whatHappened: "Every new/updated report is analyzed to find opposite-type candidates.",
    rootCause: "Manual matching is slow when report volume grows.",
    fix: "Added Cloud Function pipeline: normalize, embed, score, rerank, and log.",
    result: "Potential matches appear faster with clear reasoning and scores.",
  },
  {
    title: "3) Hosted Web Chat Did Not Open",
    whatHappened: "Clicking Chat on GitHub Pages did nothing for some users.",
    rootCause: "Callable endpoint returned 404/CORS and ad blockers blocked requests.",
    fix: "Web now uses Firestore-first chat creation and better fallback handling.",
    result: "Chat can open on hosted web without depending on callable endpoint success.",
  },
  {
    title: "4) Permissions Error on Chat Start",
    whatHappened: "Users saw 'Missing or insufficient permissions'.",
    rootCause: "Fallback path tried reading chat doc before creation, blocked by rules.",
    fix: "Removed pre-read and switched to direct merge-write on chat document.",
    result: "Rules now allow chat creation path for valid match participants.",
  },
  {
    title: "5) UX Polish for Demo",
    whatHappened: "Chat page had no obvious way to return.",
    rootCause: "Header back button was not visible in this route flow.",
    fix: "Added explicit Back button in the chat screen.",
    result: "Presentation flow is smoother and easier to navigate live.",
  },
];

export default function PresentationLogScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Presentation Notes</Text>
        <Text style={styles.title}>Project Story Log</Text>
        <Text style={styles.body}>A simple explanation of what happened, why it happened, what we changed, and what improved.</Text>
      </View>
      {logs.map((entry) => (
        <View key={entry.title} style={styles.card}>
          <Text style={styles.cardTitle}>{entry.title}</Text>
          <Text style={styles.line}><Text style={styles.label}>What happened:</Text> {entry.whatHappened}</Text>
          <Text style={styles.line}><Text style={styles.label}>Root cause:</Text> {entry.rootCause}</Text>
          <Text style={styles.line}><Text style={styles.label}>Fix:</Text> {entry.fix}</Text>
          <Text style={styles.line}><Text style={styles.label}>Result:</Text> {entry.result}</Text>
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
    fontSize: 12,
  },
  title: {
    color: colors.ink,
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
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 18,
  },
  line: {
    color: colors.ink,
    lineHeight: 21,
  },
  label: {
    color: colors.muted,
    fontWeight: "800",
  },
});

