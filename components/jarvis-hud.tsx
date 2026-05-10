/**
 * JARVIS HUD Elements
 * Futuristic heads-up display components for status indicators.
 */

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import type { VoiceStatus } from "@/lib/voice-engine";

interface JarvisHudProps {
  status: VoiceStatus;
  transcript: string;
  response: string;
}

export function JarvisHud({ status, transcript, response }: JarvisHudProps) {
  const scanLineY = useSharedValue(0);
  const blinkOpacity = useSharedValue(1);

  useEffect(() => {
    // Scanning line animation
    scanLineY.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      true,
    );
    // Blinking cursor
    blinkOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      false,
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLineY.value * 100}%` as any,
    opacity: (status === "listening" || status === "wake_word_listening") ? 0.6 : 0,
  }));

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: (status === "listening" || status === "wake_word_listening") ? blinkOpacity.value : 0,
  }));

  const getStatusLabel = (): string => {
    switch (status) {
      case "listening":
        return "LISTENING";
      case "wake_word_listening":
        return "AWAITING WAKE WORD";
      case "processing":
        return "PROCESSING";
      case "speaking":
        return "RESPONDING";
      case "error":
        return "ERROR";
      default:
        return "STANDBY";
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case "listening":
        return "#FF3366";
      case "wake_word_listening":
        return "#00D4FF";
      case "processing":
        return "#FFB800";
      case "speaking":
        return "#00FF88";
      case "error":
        return "#FF3366";
      default:
        return "#00D4FF";
    }
  };

  return (
    <View style={styles.container}>
      {/* Status header */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
          {getStatusLabel()}
        </Text>
        <View style={styles.statusLine} />
        <Text style={styles.systemLabel}>J.A.R.V.I.S.</Text>
      </View>

      {/* Main display area */}
      <View style={styles.displayArea}>
        {/* Scan line */}
        <Animated.View style={[styles.scanLine, scanLineStyle]} />

        {/* Response text */}
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>// OUTPUT</Text>
          <Text style={styles.responseText}>{response}</Text>
        </View>

        {/* Transcript */}
        {transcript ? (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>// INPUT</Text>
            <View style={styles.transcriptRow}>
              <Text style={styles.transcriptText}>"{transcript}"</Text>
              <Animated.Text style={[styles.cursor, cursorStyle]}>▌</Animated.Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Bottom decorative line */}
      <View style={styles.bottomLine}>
        <View style={styles.lineSegment} />
        <View style={styles.lineDot} />
        <View style={styles.lineSegment} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    borderRadius: 8,
    backgroundColor: "#0D1117",
    overflow: "hidden",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  statusLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E3A5F",
  },
  systemLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4A90A4",
    letterSpacing: 1,
  },
  displayArea: {
    minHeight: 80,
    position: "relative",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#00D4FF",
  },
  responseContainer: {
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#1E3A5F",
    letterSpacing: 1,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#E0F7FF",
    lineHeight: 24,
  },
  transcriptContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E3A5F50",
  },
  transcriptLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#1E3A5F",
    letterSpacing: 1,
    marginBottom: 4,
  },
  transcriptRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  transcriptText: {
    fontSize: 14,
    color: "#4A90A4",
    fontStyle: "italic",
  },
  cursor: {
    fontSize: 14,
    color: "#00D4FF",
    marginLeft: 2,
  },
  bottomLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  lineSegment: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E3A5F50",
  },
  lineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00D4FF40",
  },
});
