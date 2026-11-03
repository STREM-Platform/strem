/** A bottom sheet (centered panel on wide screens) for focused tasks. */

import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, useLayout } from "@/components/ui/kit";
import { C, R, disp } from "@/constants/theme";

export function Sheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  return (
    <Modal visible={visible} transparent animationType={wide ? "fade" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, wide && styles.rootWide]}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={[styles.panel, wide ? styles.panelWide : { paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[disp(24, 800), { color: C.text, flex: 1 }]} numberOfLines={2}>
              {title}
            </Text>
            <IconButton icon="x" label="Close" onPress={onClose} tone="surface" size={40} />
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  rootWide: { justifyContent: "center", alignItems: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  panel: { maxHeight: "92%", backgroundColor: C.night, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderWidth: 1, borderColor: C.lineStrong },
  panelWide: { width: 620, maxWidth: "94%", borderRadius: R.xl, maxHeight: "88%" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 10, borderTopWidth: 1, borderTopColor: C.line },
});
