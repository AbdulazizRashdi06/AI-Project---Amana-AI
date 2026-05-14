import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors } from "@/theme/colors";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, Boolean(error) && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 12,
  },
  input: {
    minHeight: 48,
    borderBottomWidth: 2,
    borderColor: colors.outline,
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 16,
  },
  multiline: {
    minHeight: 112,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
