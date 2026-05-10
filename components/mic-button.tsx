/**
 * JARVIS-Style Animated Microphone Button
 * Concentric rotating rings, glow effects, and pulse animations.
 */

import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import type { VoiceStatus } from "@/lib/voice-engine";

interface MicButtonProps {
  status: VoiceStatus;
  onPress: () => void;
}

const CYAN = "#00D4FF";
const CYAN_DIM = "#00D4FF40";
const RED = "#FF3366";
const GREEN = "#00FF88";
const AMBER = "#FFB800";

export function MicButton({ status, onPress }: MicButtonProps) {
  const isListening = status === "listening";
  const isWakeWordListening = status === "wake_word_listening";
  const isProcessing = status === "processing";
  const isSpeaking = status === "speaking";
  const isActive = isListening || isProcessing || isSpeaking || isWakeWordListening;

  // Animation values
  const ring1Rotation = useSharedValue(0);
  const ring2Rotation = useSharedValue(0);
  const ring3Rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Rings always rotate slowly
    ring1Rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
    ring2Rotation.value = withRepeat(
      withTiming(-360, { duration: 12000, easing: Easing.linear }),
      -1,
      false,
    );
    ring3Rotation.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(glowOpacity);
      pulseScale.value = withTiming(1, { duration: 300 });
      glowOpacity.value = withTiming(0.3, { duration: 300 });
    }
  }, [isActive]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring1Rotation.value}deg` }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring2Rotation.value}deg` }],
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring3Rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: glowOpacity.value,
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    buttonScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withTiming(1, { duration: 200 }),
    );
    onPress();
  };

  const getIconName = (): keyof typeof MaterialIcons.glyphMap => {
    if (isListening) return "mic";
    if (isWakeWordListening) return "hearing";
    if (isProcessing) return "hourglass-top";
    if (isSpeaking) return "volume-up";
    return "mic-none";
  };

  const getActiveColor = (): string => {
    if (isListening) return RED;
    if (isWakeWordListening) return CYAN;
    if (isProcessing) return AMBER;
    if (isSpeaking) return GREEN;
    return CYAN;
  };

  return (
    <View style={styles.container}>
      {/* Glow background */}
      <Animated.View
        style={[
          styles.glow,
          pulseStyle,
          { backgroundColor: getActiveColor() },
        ]}
      />

      {/* Ring 1 - outermost, dashed */}
      <Animated.View style={[styles.ring1, ring1Style]}>
        <View style={[styles.ringSegment, styles.ring1Segment, { borderColor: getActiveColor() + "40" }]} />
      </Animated.View>

      {/* Ring 2 - middle */}
      <Animated.View style={[styles.ring2, ring2Style]}>
        <View style={[styles.ringSegment, styles.ring2Segment, { borderColor: getActiveColor() + "60" }]} />
      </Animated.View>

      {/* Ring 3 - inner */}
      <Animated.View style={[styles.ring3, ring3Style]}>
        <View style={[styles.ringSegment, styles.ring3Segment, { borderColor: getActiveColor() + "80" }]} />
      </Animated.View>

      {/* Main button */}
      <Animated.View style={buttonAnimStyle}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: "#0A0E1A",
              borderColor: getActiveColor(),
              shadowColor: getActiveColor(),
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <MaterialIcons name={getIconName()} size={44} color={getActiveColor()} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const BUTTON_SIZE = 100;
const RING1_SIZE = 180;
const RING2_SIZE = 150;
const RING3_SIZE = 125;

const styles = StyleSheet.create({
  container: {
    width: RING1_SIZE + 20,
    height: RING1_SIZE + 20,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    borderRadius: (BUTTON_SIZE + 40) / 2,
    opacity: 0.15,
  },
  ring1: {
    position: "absolute",
    width: RING1_SIZE,
    height: RING1_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring2: {
    position: "absolute",
    width: RING2_SIZE,
    height: RING2_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring3: {
    position: "absolute",
    width: RING3_SIZE,
    height: RING3_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringSegment: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  ring1Segment: {
    width: RING1_SIZE,
    height: RING1_SIZE,
    borderRadius: RING1_SIZE / 2,
  },
  ring2Segment: {
    width: RING2_SIZE,
    height: RING2_SIZE,
    borderRadius: RING2_SIZE / 2,
  },
  ring3Segment: {
    width: RING3_SIZE,
    height: RING3_SIZE,
    borderRadius: RING3_SIZE / 2,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    elevation: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
});
