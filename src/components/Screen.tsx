import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appUpdateNumber } from "@/lib/build";
import { colors } from "@/theme/colors";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = true }: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.updateTag}>Update {appUpdateNumber}</Text>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.updateTag}>Update {appUpdateNumber}</Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 96,
  },
  container: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    gap: 24,
  },
  updateTag: {
    alignSelf: "flex-end",
    color: colors.outline,
    fontSize: 11,
    fontWeight: "700",
  },
});
