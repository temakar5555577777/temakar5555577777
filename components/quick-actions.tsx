/**
 * JARVIS-Style Quick Action Buttons
 * Neon-bordered action buttons with glow effects.
 * Two rows: communication + hardware control.
 */

import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface QuickAction {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  command: string;
}

const ACTIONS_ROW1: QuickAction[] = [
  { icon: "phone", label: "Звонок", command: "позвони маме" },
  { icon: "message", label: "SMS", command: "отправь смс маме привет" },
  { icon: "language", label: "Поиск", command: "найди в интернете погода москва" },
  { icon: "apps", label: "Запуск", command: "открой ютуб" },
];

const ACTIONS_ROW2: QuickAction[] = [
  { icon: "volume-up", label: "Громче", command: "громче" },
  { icon: "volume-down", label: "Тише", command: "тише" },
  { icon: "flashlight-on", label: "Фонарь", command: "включи фонарик" },
  { icon: "wifi", label: "Wi-Fi", command: "включи вай фай" },
  { icon: "bluetooth", label: "BT", command: "включи блютуз" },
  { icon: "camera-alt", label: "Камера", command: "открой камеру" },
];

interface QuickActionsProps {
  onAction: (command: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const handlePress = (action: QuickAction) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onAction(action.command);
  };

  return (
    <View style={styles.container}>
      {/* Row 1: Communication */}
      <View style={styles.row}>
        {ACTIONS_ROW1.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => handlePress(action)}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] },
            ]}
          >
            <View style={styles.iconWrapper}>
              <MaterialIcons name={action.icon} size={20} color="#00D4FF" />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Row 2: Hardware Control */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {ACTIONS_ROW2.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => handlePress(action)}
            style={({ pressed }) => [
              styles.smallButton,
              pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] },
            ]}
          >
            <MaterialIcons name={action.icon} size={16} color="#00D4FF" />
            <Text style={styles.smallLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 8,
  },
  scrollRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    backgroundColor: "#111827",
    gap: 4,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#00D4FF30",
    backgroundColor: "#00D4FF10",
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A90A4",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    backgroundColor: "#111827",
    gap: 6,
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A90A4",
    letterSpacing: 0.5,
  },
});
