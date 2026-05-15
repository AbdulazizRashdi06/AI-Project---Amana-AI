import * as ImagePicker from "expo-image-picker";
import { Camera, Check, CheckCircle, Plus, SearchX, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/features/auth/AuthContext";
import { createReport } from "@/features/reports/api";
import { maxPhotosPerReport } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";
import type { ReportType } from "@/types/domain";

export default function ReportScreen() {
  const { width } = useWindowDimensions();
  const compactDesktop = true;
  const narrowLayout = width < 760;
  const phoneLayout = width < 520;
  const { user } = useAuth();
  const [type, setType] = useState<ReportType>("lost");
  const [title, setTitle] = useState("");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function addPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos permission needed", "Allow photo access to add item photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
      selectionLimit: maxPhotosPerReport - photoUris.length,
    });

    if (!result.canceled) {
      setPhotoUris((current) => [...current, ...result.assets.map((asset) => asset.uri)].slice(0, maxPhotosPerReport));
    }
  }

  async function submitReport() {
    setMessage(null);
    setSuccess(null);

    if (!user) {
      setMessage("You need to sign in before submitting a report.");
      return;
    }

    setLoading(true);
    try {
      const reportId = await createReport(user.uid, {
        type,
        title,
        description,
        locationText,
        campusZone: locationText,
        eventDate: new Date(),
        photoUris,
      });
      setTitle("");
      setDescription("");
      setLocationText("");
      setPhotoUris([]);
      setSuccess(`Report saved. Reference: ${reportId.slice(0, 8)}. We will check it against possible matches.`);
    } catch (error) {
      setMessage(friendlyError(error, "Could not submit report. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={phoneLayout}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>GUtech Finder</Text>
        <Text style={styles.topMeta}>AI Amana</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.kicker}>Dashboard</Text>
        <Text style={styles.title}>Report Center</Text>
        <Text style={styles.body}>File a secure lost or found report. AI Amana will compare item details, location, date, and photos.</Text>
      </View>
      <View style={[styles.actionGrid, phoneLayout && styles.actionGridPhone]}>
        <Pressable
          onPress={() => setType("lost")}
          style={[styles.actionCard, phoneLayout && styles.actionCardPhone, type === "lost" ? styles.selectedLostCard : styles.unselectedLostCard]}
        >
          {type === "lost" ? (
            <View style={[styles.selectedBadge, styles.selectedBadgeLost]}>
              <Check size={14} color="#fff" />
              <Text style={styles.selectedBadgeText}>{narrowLayout ? "Selected" : "Lost Item Selected"}</Text>
            </View>
          ) : null}
          <View style={[styles.actionIconLost, narrowLayout && styles.actionIconCompact, type !== "lost" && styles.actionIconLostUnselected]}>
            <SearchX color={type === "lost" ? "#fff" : colors.primary} size={narrowLayout ? 22 : 26} />
          </View>
          <View>
            <Text style={[styles.lostTitle, narrowLayout && styles.actionTitleCompact, type !== "lost" && styles.unselectedLostTitle]}>Report Lost Item</Text>
            {!phoneLayout ? (
              <Text style={[styles.lostBody, narrowLayout && styles.actionBodyCompact, type !== "lost" && styles.unselectedLostBody]}>File a secure report for an item misplaced on campus.</Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={() => setType("found")}
          style={[styles.actionCard, phoneLayout && styles.actionCardPhone, type === "found" ? styles.selectedFoundCard : styles.unselectedFoundCard]}
        >
          {type === "found" ? (
            <View style={[styles.selectedBadge, styles.selectedBadgeFound]}>
              <Check size={14} color={colors.secondary} />
              <Text style={[styles.selectedBadgeText, styles.selectedBadgeTextFound]}>{narrowLayout ? "Selected" : "Found Item Selected"}</Text>
            </View>
          ) : null}
          <View style={[styles.actionIconFound, narrowLayout && styles.actionIconCompact, type !== "found" && styles.actionIconFoundUnselected]}>
            <CheckCircle color={colors.secondary} size={narrowLayout ? 22 : 26} />
          </View>
          <View>
            <Text style={[styles.foundTitle, narrowLayout && styles.actionTitleCompact, type !== "found" && styles.unselectedFoundTitle]}>Report Found Item</Text>
            {!phoneLayout ? (
              <Text style={[styles.foundBody, narrowLayout && styles.actionBodyCompact, type !== "found" && styles.unselectedFoundBody]}>Help the community by logging a found item.</Text>
            ) : null}
          </View>
        </Pressable>
      </View>
      <View style={[styles.formGrid, !narrowLayout && styles.formGridWide]}>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Item Details</Text>
          <TextField label="Item title" value={title} onChangeText={setTitle} placeholder="Blue Dell XPS 15 laptop" />
          <TextField label={type === "lost" ? "Last seen location" : "Found location"} value={locationText} onChangeText={setLocationText} placeholder="Main Library, second floor" />
          <TextField
            label="Detailed description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={narrowLayout ? 2 : 3}
            style={narrowLayout ? styles.descriptionCompact : undefined}
            placeholder="Describe brand, color, contents, unique marks, and any useful context..."
          />
          <View style={styles.mediaCard}>
            <Text style={styles.sectionLabel}>Visual Evidence</Text>
            <Pressable accessibilityRole="button" style={styles.dropzone} onPress={addPhoto}>
              <Camera color={colors.outline} size={22} />
              <Text style={styles.dropzoneText}>Click to upload item photos</Text>
              <Text style={styles.dropzoneSubtext}>Up to {maxPhotosPerReport} images</Text>
            </Pressable>
            <View style={styles.photoGrid}>
              {photoUris.map((uri) => (
                <View key={uri} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <Pressable accessibilityRole="button" onPress={() => setPhotoUris((current) => current.filter((item) => item !== uri))} style={styles.removePhoto}>
                    <X size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
          {message ? <Text style={styles.errorMessage}>{message}</Text> : null}
          {success ? <Text style={styles.successMessage}>{success}</Text> : null}
          <Button
            title={type === "lost" ? "Submit Lost Report" : "Submit Found Report"}
            variant={type === "lost" ? "primary" : "gold"}
            loading={loading}
            onPress={submitReport}
            icon={<Plus color={type === "lost" ? "#fff" : colors.secondary} size={20} />}
          />
        </View>
        {!narrowLayout ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Reports are cross-referenced against opposite item reports. Mention unique marks, contents, brand, or scratches.</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 48,
    borderBottomWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: -20,
    marginTop: -18,
    paddingHorizontal: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  topMeta: {
    color: colors.muted,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  header: {
    gap: 4,
  },
  kicker: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    letterSpacing: 1.2,
    fontSize: 12,
  },
  title: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 720,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionGridPhone: {
    flexWrap: "wrap",
  },
  actionCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 104,
    borderRadius: 10,
    padding: 12,
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "transparent",
  },
  actionCardPhone: {
    flexBasis: 220,
    minHeight: 92,
  },
  selectedLostCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryMuted,
    borderWidth: 3,
  },
  selectedFoundCard: {
    backgroundColor: colors.gold,
    borderColor: colors.secondary,
    borderWidth: 3,
  },
  unselectedLostCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderWidth: 1,
  },
  unselectedFoundCard: {
    backgroundColor: colors.goldSoft,
    borderColor: "#d8bf66",
    borderWidth: 1,
  },
  selectedBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  selectedBadgeLost: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  selectedBadgeFound: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderColor: "rgba(118,91,0,0.35)",
  },
  selectedBadgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  selectedBadgeTextFound: {
    color: colors.secondary,
  },
  lostCard: {
    backgroundColor: colors.primary,
  },
  foundCard: {
    backgroundColor: colors.gold,
  },
  actionIconLost: {
    height: 44,
    width: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconLostUnselected: {
    backgroundColor: "rgba(0,30,64,0.12)",
  },
  actionIconFound: {
    height: 44,
    width: 44,
    borderRadius: 999,
    backgroundColor: "rgba(37,26,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconFoundUnselected: {
    backgroundColor: "rgba(118,91,0,0.14)",
  },
  actionIconCompact: {
    height: 38,
    width: 38,
  },
  lostTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
  },
  actionTitleCompact: {
    fontSize: 17,
  },
  unselectedLostTitle: {
    color: colors.primary,
  },
  lostBody: {
    color: colors.primarySoft,
    lineHeight: 19,
    marginTop: 5,
  },
  actionBodyCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  unselectedLostBody: {
    color: colors.primary,
    opacity: 0.85,
  },
  foundTitle: {
    color: colors.secondary,
    fontSize: 19,
    fontWeight: "900",
  },
  unselectedFoundTitle: {
    color: colors.secondary,
  },
  foundBody: {
    color: colors.secondary,
    lineHeight: 19,
    marginTop: 5,
  },
  unselectedFoundBody: {
    color: colors.secondary,
    opacity: 0.85,
  },
  formGrid: {
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
  },
  formGridWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  formCard: {
    flexGrow: 2,
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  mediaCard: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  sectionLabel: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.1,
  },
  dropzone: {
    minHeight: 72,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 4,
  },
  dropzoneText: {
    color: colors.muted,
    fontWeight: "800",
    textAlign: "center",
  },
  dropzoneSubtext: {
    color: colors.outline,
    fontSize: 12,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceHigh,
    borderRadius: 10,
    flex: 1,
    padding: 12,
  },
  infoText: {
    color: colors.muted,
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoWrap: {
    width: 58,
    height: 58,
  },
  photo: {
    width: 58,
    height: 58,
    borderRadius: 8,
  },
  removePhoto: {
    position: "absolute",
    right: 5,
    top: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    padding: 4,
  },
  errorMessage: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderColor: "#f8b4ae",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
  },
  successMessage: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
    fontWeight: "700",
  },
  descriptionCompact: {
    minHeight: 72,
  },
});
