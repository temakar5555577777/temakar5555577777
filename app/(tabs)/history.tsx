/**
 * Command History Screen - JARVIS Style
 * Dark futuristic log of past voice commands.
 */

import React, { useCallback } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useVoiceEngine, type HistoryEntry } from "@/lib/voice-engine";
import { getCommandIcon } from "@/lib/command-parser";

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (isToday) {
    return time;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Вчера ${time}`;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryItem({ item, index }: { item: HistoryEntry; index: number }) {
  const iconName = getCommandIcon(item.commandType) as keyof typeof MaterialIcons.glyphMap;
  const statusColor = item.success ? "#00FF88" : "#FF3366";

  return (
    <View style={styles.historyItem}>
      {/* Left timeline */}
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, { backgroundColor: statusColor }]} />
        {index > 0 && <View style={styles.timelineLine} />}
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <View style={styles.itemIconRow}>
            <MaterialIcons name={iconName} size={14} color="#00D4FF" />
            <Text style={styles.itemType}>
              {item.commandType.replace("_", " ").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
        </View>

        <Text style={styles.itemTranscript} numberOfLines={2}>
          &gt; {item.transcript}
        </Text>

        <View style={styles.itemResponseRow}>
          <MaterialIcons
            name={item.success ? "check-circle" : "error"}
            size={12}
            color={statusColor}
          />
          <Text style={[styles.itemResponse, { color: statusColor + "CC" }]} numberOfLines={1}>
            {item.response}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { state, clearHistory } = useVoiceEngine();

  const handleClear = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    clearHistory();
  }, [clearHistory]);

  const renderItem = useCallback(
    ({ item, index }: { item: HistoryEntry; index: number }) => (
      <HistoryItem item={item} index={index} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: HistoryEntry) => item.id, []);

  return (
    <ScreenContainer containerClassName="bg-[#0A0E1A]">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>COMMAND LOG</Text>
            <Text style={styles.count}>
              [{state.history.length} ENTRIES]
            </Text>
          </View>
          {state.history.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <MaterialIcons name="delete-outline" size={16} color="#FF3366" />
              <Text style={styles.clearText}>CLEAR</Text>
            </Pressable>
          )}
        </View>

        {/* Divider */}
        <View style={styles.headerDivider} />

        {/* History List */}
        {state.history.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="terminal" size={48} color="#1E3A5F" />
            </View>
            <Text style={styles.emptyTitle}>NO ENTRIES</Text>
            <Text style={styles.emptySubtitle}>
              Command history will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={state.history}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E0F7FF",
    letterSpacing: 2,
  },
  count: {
    fontSize: 11,
    color: "#4A90A4",
    fontWeight: "500",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FF336630",
    gap: 4,
  },
  clearText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF3366",
    letterSpacing: 1,
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#1E3A5F50",
    marginHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  historyItem: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  timeline: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: "#1E3A5F40",
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
    paddingLeft: 8,
    gap: 4,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemType: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00D4FF",
    letterSpacing: 1,
  },
  itemTime: {
    fontSize: 10,
    color: "#4A90A4",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  itemTranscript: {
    fontSize: 14,
    color: "#E0F7FF",
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  itemResponseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemResponse: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4A90A4",
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#1E3A5F",
  },
});
