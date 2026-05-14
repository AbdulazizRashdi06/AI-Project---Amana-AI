import * as ImagePicker from "expo-image-picker";
import { Camera, CheckCircle, Plus, SearchX, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/features/auth/AuthContext";
import { createReport } from "@/features/reports/api";
import { defaultSettings, maxPhotosPerReport } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { colors } from "@/theme/colors";
import type { ReportType } from "@/types/domain";

export default function ReportScreen() {
  const { user } = useAuth();
  const [type, setType] = useState<ReportType>("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultSettings.categories[0]);
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
        category,
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
    <Screen>
      <View style={styles.topBar}>
        <Text style={styles.brand}>GUtech Finder</Text>
        <Text style={styles.topMeta}>AI Amana</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.kicker}>Dashboard</Text>
        <Text style={styles.title}>Report Center</Text>
        <Text style={styles.body}>File a secure lost or found report. AI Amana will compare item details, location, date, and photos.</Text>
      </View>
      <View style={styles.actionGrid}>
        <Pressable onPress={() => setType("lost")} style={[styles.actionCard, styles.lostCard, type === "lost" && styles.selectedCard]}>
          <View style={styles.actionIconLost}>
            <SearchX color="#fff" size={26} />
          </View>
          <View>
            <Text style={styles.lostTitle}>Report Lost Item</Text>
            <Text style={styles.lostBody}>File a secure report for an item misplaced on campus.</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setType("found")} style={[styles.actionCard, styles.foundCard, type === "found" && styles.selectedCard]}>
          <View style={styles.actionIconFound}>
            <CheckCircle color={colors.secondary} size={26} />
          </View>
          <View>
            <Text style={styles.foundTitle}>Report Found Item</Text>
            <Text style={styles.foundBody}>Help the community by logging a found item.</Text>
          </View>
        </Pressable>
      </View>
      <View style={styles.formGrid}>
        <View style={styles.mediaColumn}>
          <View style={styles.mediaCard}>
            <Text style={styles.sectionLabel}>Visual Evidence</Text>
            <Pressable accessibilityRole="button" style={styles.dropzone} onPress={addPhoto}>
              <Camera color={colors.outline} size={34} />
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
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Reports are cross-referenced against opposite item reports. Mention unique marks, contents, brand, or scratches.</Text>
          </View>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Item Details</Text>
          <TextField label="Item title" value={title} onChangeText={setTitle} placeholder="Blue Dell XPS 15 laptop" />
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {defaultSettings.categories.map((item) => (
                <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipSelected]}>
                  <Text style={[styles.chipText, category === item && styles.chipTextSelected]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <TextField label={type === "lost" ? "Last seen location" : "Found location"} value={locationText} onChangeText={setLocationText} placeholder="Main Library, second floor" />
          <TextField
            label="Detailed description"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Describe brand, color, contents, unique marks, and any useful context..."
          />
          {message ? <Text style={styles.errorMessage}>{message}</Text> : null}
          {success ? <Text style={styles.successMessage}>{success}</Text> : null}
          <Button title={type === "lost" ? "Submit Lost Report" : "Submit Found Report"} loading={loading} onPress={submitReport} icon={<Plus color="#fff" size={20} />} />
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
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 720,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
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
  selectedCard: {
    borderColor: colors.primaryMuted,
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
  actionIconFound: {
    height: 48,
    width: 48,
    borderRadius: 999,
    backgroundColor: "rgba(37,26,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  lostTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  lostBody: {
    color: colors.primarySoft,
    lineHeight: 20,
    marginTop: 6,
  },
  foundTitle: {
    color: colors.secondary,
    fontSize: 20,
    fontWeight: "900",
  },
  foundBody: {
    color: colors.secondary,
    lineHeight: 20,
    marginTop: 6,
  },
  formGrid: {
    flexDirection: "column",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-start",
  },
  mediaColumn: {
    flexGrow: 1,
    width: "100%",
    gap: 16,
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
  mediaCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  sectionLabel: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.1,
  },
  dropzone: {
    aspectRatio: 1,
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
  infoText: {
    color: colors.muted,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontWeight: "800",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.ink,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: "#fff",
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
