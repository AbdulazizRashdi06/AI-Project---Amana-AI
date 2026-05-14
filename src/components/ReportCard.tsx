import { Image, StyleSheet, Text, View } from "react-native";
import { formatDate } from "@/lib/dates";
import type { ItemReport } from "@/types/domain";
import { colors } from "@/theme/colors";

export function ReportCard({ report }: { report: ItemReport }) {
  return (
    <View style={styles.card}>
      {report.photoUrls?.[0] ? <Image source={{ uri: report.photoUrls[0] }} style={styles.image} /> : <View style={styles.imagePlaceholder} />}
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.pill}>{report.type}</Text>
          <Text style={styles.status}>{report.status.replace("_", " ")}</Text>
        </View>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.meta}>{report.category} - {report.locationText}</Text>
        <Text style={styles.meta}>{formatDate(report.eventDate)}</Text>
        <Text numberOfLines={2} style={styles.description}>{report.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 2.4,
    backgroundColor: colors.surfaceMuted,
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 2.4,
    backgroundColor: colors.surfaceMuted,
  },
  body: {
    padding: 14,
    gap: 7,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: {
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
    fontSize: 12,
  },
  status: {
    color: colors.muted,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  title: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 18,
  },
  meta: {
    color: colors.muted,
  },
  description: {
    color: colors.ink,
    lineHeight: 20,
  },
});
