import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { C, Trail, ui } from "@/constants/theme";

type ButtonKind = "primary" | "ghost";

interface ButtonProps {
  label: string;
  icon?: IconName;
  kind?: ButtonKind;
  onPress?: () => void;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Btn({
  label,
  icon,
  kind = "primary",
  onPress,
  full,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const palette = kind === "primary"
    ? { background: C.white, foreground: C.ink, border: C.white }
    : { background: "transparent", foreground: Trail.text, border: Trail.lineStrong };
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(blocked) }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          width: full ? "100%" : undefined,
          opacity: disabled ? 0.45 : pressed ? 0.84 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.foreground} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={17} color={palette.foreground} sw={2.2} /> : null}
          {label ? <Text style={[styles.buttonText, { color: palette.foreground }]}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

interface PanelProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pad?: number;
}

export function Panel({ children, style, pad = 16 }: PanelProps) {
  return <View style={[styles.panel, { padding: pad }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
  },
  buttonText: {
    ...ui(14, 700),
    letterSpacing: 0.3,
  },
  panel: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: Trail.panel,
    borderWidth: 1,
    borderColor: Trail.line,
  },
});
