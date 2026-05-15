import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ClipboardList, FileSearch, FileText, MessageCircle, SearchCheck, ShieldCheck, UserRound } from "lucide-react-native";
import { useAuth } from "@/features/auth/AuthContext";
import { colors } from "@/theme/colors";

export default function TabsLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen name="report" options={{ title: "Report", tabBarIcon: ({ color }) => <ClipboardList color={color} size={20} /> }} />
      <Tabs.Screen name="matches" options={{ title: "Matches", tabBarIcon: ({ color }) => <SearchCheck color={color} size={20} /> }} />
      <Tabs.Screen name="chats" options={{ title: "Chats", tabBarIcon: ({ color }) => <MessageCircle color={color} size={20} /> }} />
      <Tabs.Screen name="ai-logs" options={{ title: "Logs", tabBarIcon: ({ color }) => <FileSearch color={color} size={20} /> }} />
      <Tabs.Screen name="presentation-log" options={{ title: "Story", tabBarIcon: ({ color }) => <FileText color={color} size={20} /> }} />
      <Tabs.Screen name="my-items" options={{ title: "Items", tabBarIcon: ({ color }) => <ShieldCheck color={color} size={20} /> }} />
      <Tabs.Screen name="profile" options={{ title: profile?.role === "admin" ? "Admin" : "Profile", tabBarIcon: ({ color }) => <UserRound color={color} size={20} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  tabBar: {
    minHeight: 58,
    paddingBottom: 4,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  tabIcon: {
    marginTop: 2,
  },
});
