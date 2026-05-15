import * as ImagePicker from "expo-image-picker";
import { Camera, Check, CheckCircle, Plus, SearchX, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
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
  const compactDesktop = true;
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
    <Screen scroll={!compactDesktop}>
      <View style={[styles.topBar, compactDesktop && styles.topBarCompact]}>
        <Text style={styles.brand}>GUtech Finder</Text>
        <Text style={styles.topMeta}>AI Amana</Text>
      </View>
      <View style={[styles.header, compactDesktop && styles.headerCompact]}>
        <Text style={styles.kicker}>Dashboard</Text>
        <Text style={[styles.title, compactDesktop && styles.titleCompact]}>Report Center</Text>
        <Text style={[styles.body, compactDesktop && styles.bodyCompact]}>File a secure lost or found report. AI Amana will compare item details, location, date, and photos.</Text>
      </View>
      <View style={[styles.actionGrid, compactDesktop && styles.actionGridCompact]}>
        <Pressable
          onPress={() => setType("lost")}
          style={[styles.actionCard, compactDesktop && styles.actionCardCompact, type === "lost" ? styles.selectedLostCard : styles.unselectedLostCard]}
        >
          {type === "lost" ? (
            <View style={[styles.selectedBadge, styles.selectedBadgeLost]}>
              <Check size={14} color="#fff" />
              <Text style={styles.selectedBadgeText}>Lost Item Selected</Text>
            </View>
          ) : null}
          <View style={[styles.actionIconLost, type !== "lost" && styles.actionIconLostUnselected]}>
            <SearchX color={type === "lost" ? "#fff" : colors.primary} size={26} />
          </View>
          <View>
            <Text style={[styles.lostTitle, type !== "lost" && styles.unselectedLostTitle]}>Report Lost Item</Text>
            <Text style={[styles.lostBody, type !== "lost" && styles.unselectedLostBody]}>File a secure report for an item misplaced on campus.</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setType("found")}
          style={[styles.actionCard, compactDesktop && styles.actionCardCompact, type === "found" ? styles.selectedFoundCard : styles.unselectedFoundCard]}
        >
          {type === "found" ? (
            <View style={[styles.selectedBadge, styles.selectedBadgeFound]}>
              <Check size={14} color={colors.secondary} />
              <Text style={[styles.selectedBadgeText, styles.selectedBadgeTextFound]}>Found Item Selected</Text>
            </View>
          ) : null}
          <View style={[styles.actionIconFound, type !== "found" && styles.actionIconFoundUnselected]}>
            <CheckCircle color={colors.secondary} size={26} />
          </View>
          <View>
            <Text style={[styles.foundTitle, type !== "found" && styles.unselectedFoundTitle]}>Report Found Item</Text>
            <Text style={[styles.foundBody, type !== "found" && styles.unselectedFoundBody]}>Help the community by logging a found item.</Text>
          </View>
        </Pressable>
      </View>
      <View style={[styles.formGrid, compactDesktop && styles.formGridCompact]}>
        <View style={[styles.formCard, compactDesktop && styles.formCardCompact]}>
          <Text style={styles.sectionLabel}>Item Details</Text>
          <TextField label="Item title" value={title} onChangeText={setTitle} placeholder="Blue Dell XPS 15 laptop" />
          <TextField label={type === "lost" ? "Last seen location" : "Found location"} value={locationText} onChangeText={setLocationText} placeholder="Main Library, second floor" />
          <TextField
            label="Detailed description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={compactDesktop ? 3 : 5}
            placeholder="Describe brand, color, contents, unique marks, and any useful context..."
          />
          <View style={[styles.mediaCard, compactDesktop && styles.mediaCardCompact]}>
            <Text style={styles.sectionLabel}>Visual Evidence</Text>
            <Pressable accessibilityRole="button" style={[styles.dropzone, compactDesktop && styles.dropzoneCompact]} onPress={addPhoto}>
              <Camera color={colors.outline} size={compactDesktop ? 22 : 34} />
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
            <Button title="Add Photo" variant="gold" onPress={addPhoto} icon={<Camera color={colors.secondary} size={18} />} />
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
        <View style={[styles.infoCard, compactDesktop && styles.infoCardCompact]}>
          <Text style={styles.infoText}>Reports are cross-referenced against opposite item reports. Mention unique marks, contents, brand, or scratches.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 64,
    borderBottomWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topBarCompact: {
    minHeight: 52,
    marginTop: -18,
  },
  brand: {
    color: colors.primary,
    fontSize: 22,
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
    gap: 8,
  },
  headerCompact: {
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
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 720,
  },
  bodyCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  actionGridCompact: {
    gap: 12,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 150,
    borderRadius: 12,
    padding: 20,
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "transparent",
  },
  actionCardCompact: {
    minHeight: 118,
    padding: 14,
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
    right: 12,
    top: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    height: 48,
    width: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconLostUnselected: {
    backgroundColor: "rgba(0,30,64,0.12)",
  },
  actionIconFound: {
    height: 48,
    width: 48,
    borderRadius: 999,
    backgroundColor: "rgba(37,26,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconFoundUnselected: {
    backgroundColor: "rgba(118,91,0,0.14)",
  },
  lostTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  unselectedLostTitle: {
    color: colors.primary,
  },
  lostBody: {
    color: colors.primarySoft,
    lineHeight: 20,
    marginTop: 6,
  },
  unselectedLostBody: {
    color: colors.primary,
    opacity: 0.85,
  },
  foundTitle: {
    color: colors.secondary,
    fontSize: 20,
    fontWeight: "900",
  },
  unselectedFoundTitle: {
    color: colors.secondary,
  },
  foundBody: {
    color: colors.secondary,
    lineHeight: 20,
    marginTop: 6,
  },
  unselectedFoundBody: {
    color: colors.secondary,
    opacity: 0.85,
  },
  formGrid: {
    flexDirection: "column",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-start",
  },
  formGridCompact: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  formCard: {
    flexGrow: 2,
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    gap: 20,
  },
  formCardCompact: {
    flex: 2,
    padding: 14,
    gap: 12,
  },
  mediaCard: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  mediaCardCompact: {
    padding: 12,
    gap: 10,
  },
  sectionLabel: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.1,
  },
  dropzone: {
    minHeight: 150,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  dropzoneCompact: {
    minHeight: 92,
    padding: 12,
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
    borderRadius: 12,
    padding: 18,
  },
  infoCardCompact: {
    flex: 1,
    padding: 14,
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
    width: 76,
    height: 76,
  },
  photo: {
    width: 76,
    height: 76,
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
});
