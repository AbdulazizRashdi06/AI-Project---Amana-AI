import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "gold" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || disabled) && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? "#fff" : colors.primary} /> : icon}
      <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    cursor: "pointer",
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: colors.outline,
    borderWidth: 2,
  },
  gold: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.68,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryText: {
    color: "#fff",
  },
  secondaryText: {
    color: colors.primary,
  },
  goldText: {
    color: colors.secondary,
  },
  dangerText: {
    color: colors.danger,
  },
  ghostText: {
    color: colors.ink,
  },
});
