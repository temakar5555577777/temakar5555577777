/**
 * Home Screen - JARVIS Voice Assistant
 * Dark futuristic HUD with animated rings, scan lines, and neon accents.
 * Supports wake word "Jarvis" detection and background listening.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet, Platform } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { ScreenContainer } from "@/components/screen-container";
import { MicButton } from "@/components/mic-button";
import { QuickActions } from "@/components/quick-actions";
import { JarvisHud } from "@/components/jarvis-hud";
import { useVoiceEngine } from "@/lib/voice-engine";
import { containsWakeWord, extractCommandAfterWakeWord } from "@/lib/background-service";

// Conditionally import speech recognition (native only)
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const mod = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Web fallback - speech recognition not available
}

export default function HomeScreen() {
  const {
    state,
    startListening,
    stopListening,
    startWakeWordListening,
    stopWakeWordListening,
    processTranscript,
    handleWakeWordTranscript,
    speak,
    stopSpeaking,
  } = useVoiceEngine();

  const [webRecognition, setWebRecognition] = useState<any>(null);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);

  // Keep screen awake when enabled
  if (state.settings.keepAwake) {
    useKeepAwake();
  }

  // Auto-start wake word listening when enabled
  useEffect(() => {
    if (
      (state.settings.wakeWordEnabled || state.settings.backgroundListening) &&
      state.status === "idle"
    ) {
      startWakeWordMode();
    }
  }, [state.settings.wakeWordEnabled, state.settings.backgroundListening]);

  // Setup native speech recognition event listeners
  if (Platform.OS !== "web" && useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent("result", (event: any) => {
      const transcript = event.results?.[0]?.transcript || "";

      if (state.status === "wake_word_listening") {
        // In wake word mode, check for "Jarvis"
        if (containsWakeWord(transcript)) {
          const commandAfter = extractCommandAfterWakeWord(transcript);
          if (commandAfter && event.isFinal) {
            // Wake word + command in one phrase
            processTranscript(commandAfter);
          } else if (event.isFinal) {
            // Just the wake word, switch to active listening
            handleWakeWordTranscript(transcript);
            startActiveListening();
          }
        } else if (event.isFinal) {
          // Not a wake word, restart wake word listening
          restartWakeWordListening();
        }
      } else if (state.status === "listening") {
        // Active listening mode - process the command
        if (event.isFinal) {
          processTranscript(transcript);
        }
      }
    });

    useSpeechRecognitionEvent("error", (event: any) => {
      console.log("Speech recognition error:", event.error, event.message);
      if (state.settings.wakeWordEnabled || state.settings.backgroundListening) {
        // Restart wake word listening after error
        setTimeout(() => restartWakeWordListening(), 1500);
      } else {
        stopListening();
      }
    });

    useSpeechRecognitionEvent("end", () => {
      if (state.status === "wake_word_listening") {
        // Auto-restart wake word listening
        setTimeout(() => restartWakeWordListening(), 500);
      } else if (state.status === "listening") {
        if (state.settings.continuousListening) {
          setTimeout(() => startActiveListening(), 1000);
        } else if (state.settings.wakeWordEnabled || state.settings.backgroundListening) {
          // Return to wake word mode
          setTimeout(() => startWakeWordMode(), 1000);
        } else {
          stopListening();
        }
      }
    });
  }

  // Web Speech API fallback
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = state.settings.language;

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            if (state.status === "wake_word_listening" || isWakeWordActive) {
              if (containsWakeWord(finalTranscript)) {
                const commandAfter = extractCommandAfterWakeWord(finalTranscript);
                if (commandAfter) {
                  processTranscript(commandAfter);
                } else {
                  handleWakeWordTranscript(finalTranscript);
                  setIsWakeWordActive(false);
                }
              } else if (!isWakeWordActive) {
                // Not wake word, ignore in wake word mode
              } else {
                // Wake word was detected before, this is the command
                processTranscript(finalTranscript);
                setIsWakeWordActive(false);
              }
            } else {
              processTranscript(finalTranscript);
            }
          }
        };

        recognition.onerror = () => {
          if (state.settings.wakeWordEnabled) {
            setTimeout(() => {
              try { recognition.start(); } catch {}
            }, 1500);
          } else {
            stopListening();
          }
        };

        recognition.onend = () => {
          if (state.settings.wakeWordEnabled || state.settings.backgroundListening) {
            setTimeout(() => {
              try { recognition.start(); } catch {}
            }, 500);
          } else if (state.status === "listening") {
            stopListening();
          }
        };

        setWebRecognition(recognition);
      }
    }
  }, [state.settings.language]);

  const startWakeWordMode = useCallback(async () => {
    setIsWakeWordActive(true);
    await startWakeWordListening();

    if (Platform.OS !== "web" && ExpoSpeechRecognitionModule) {
      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) return;

        ExpoSpeechRecognitionModule.start({
          lang: state.settings.language,
          interimResults: true,
          continuous: true,
          requiresOnDeviceRecognition: false,
        });
      } catch (error) {
        console.error("Wake word start error:", error);
      }
    } else if (webRecognition) {
      try {
        webRecognition.lang = state.settings.language;
        webRecognition.start();
      } catch {}
    }
  }, [state.settings.language, webRecognition, startWakeWordListening]);

  const restartWakeWordListening = useCallback(() => {
    if (Platform.OS !== "web" && ExpoSpeechRecognitionModule) {
      try {
        ExpoSpeechRecognitionModule.start({
          lang: state.settings.language,
          interimResults: true,
          continuous: true,
          requiresOnDeviceRecognition: false,
        });
      } catch {}
    }
  }, [state.settings.language]);

  const startActiveListening = useCallback(async () => {
    await startListening();

    if (Platform.OS !== "web" && ExpoSpeechRecognitionModule) {
      try {
        ExpoSpeechRecognitionModule.start({
          lang: state.settings.language,
          interimResults: true,
          continuous: false,
        });
      } catch (error) {
        console.error("Active listening start error:", error);
        stopListening();
      }
    }
  }, [state.settings.language, startListening, stopListening]);

  const handleMicPress = useCallback(async () => {
    if (state.status === "listening" || state.status === "wake_word_listening") {
      // Stop everything
      if (Platform.OS !== "web" && ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.stop();
      } else if (webRecognition) {
        webRecognition.stop();
      }
      setIsWakeWordActive(false);
      stopWakeWordListening();
      stopListening();
      return;
    }

    if (state.status === "speaking") {
      stopSpeaking();
      return;
    }

    // Direct activation (bypass wake word)
    await startListening();

    if (Platform.OS !== "web" && ExpoSpeechRecognitionModule) {
      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          speak("Необходимо разрешение на использование микрофона");
          stopListening();
          return;
        }
        ExpoSpeechRecognitionModule.start({
          lang: state.settings.language,
          interimResults: true,
          continuous: state.settings.continuousListening,
        });
      } catch (error) {
        console.error("Speech recognition start error:", error);
        stopListening();
      }
    } else if (webRecognition) {
      try {
        webRecognition.lang = state.settings.language;
        webRecognition.start();
      } catch (error) {
        console.error("Web speech recognition error:", error);
        stopListening();
      }
    } else {
      speak("Распознавание речи недоступно на этом устройстве");
      stopListening();
    }
  }, [
    state.status,
    state.settings.language,
    state.settings.continuousListening,
    webRecognition,
    startListening,
    stopListening,
    stopWakeWordListening,
    speak,
    stopSpeaking,
  ]);

  const handleQuickAction = useCallback(
    (command: string) => {
      processTranscript(command);
    },
    [processTranscript],
  );

  const getStatusHint = () => {
    switch (state.status) {
      case "wake_word_listening":
        return '[ AWAITING "JARVIS" — TAP FOR DIRECT ]';
      case "listening":
        return "[ RECORDING — TAP TO STOP ]";
      case "speaking":
        return "[ SPEAKING — TAP TO INTERRUPT ]";
      case "processing":
        return "[ ANALYZING... ]";
      default:
        return "[ TAP TO ACTIVATE ]";
    }
  };

  return (
    <ScreenContainer containerClassName="bg-[#0A0E1A]">
      <View style={styles.container}>
        {/* JARVIS Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerDot,
                state.status === "wake_word_listening" && styles.headerDotActive,
              ]}
            />
            <Text style={styles.headerTitle}>J.A.R.V.I.S.</Text>
          </View>
          <View style={styles.headerRight}>
            {(state.settings.wakeWordEnabled || state.settings.backgroundListening) && (
              <View style={styles.wakeWordBadge}>
                <Text style={styles.wakeWordBadgeText}>
                  {state.status === "wake_word_listening" ? "LISTENING" : "STANDBY"}
                </Text>
              </View>
            )}
            <Text style={styles.headerVersion}>v3.0</Text>
          </View>
        </View>

        {/* HUD Display */}
        <JarvisHud
          status={state.status}
          transcript={state.transcript}
          response={state.response}
        />

        {/* Wake Word Indicator */}
        {state.wakeWordDetected && (
          <View style={styles.wakeWordIndicator}>
            <Text style={styles.wakeWordText}>WAKE WORD DETECTED</Text>
          </View>
        )}

        {/* Mic Button Area */}
        <View style={styles.micArea}>
          <MicButton status={state.status} onPress={handleMicPress} />
          <Text style={styles.micHint}>{getStatusHint()}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsArea}>
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>QUICK COMMANDS</Text>
            <View style={styles.dividerLine} />
          </View>
          <QuickActions onAction={handleQuickAction} />
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4A90A4",
  },
  headerDotActive: {
    backgroundColor: "#00FF88",
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E0F7FF",
    letterSpacing: 3,
  },
  headerVersion: {
    fontSize: 11,
    color: "#4A90A4",
    fontWeight: "500",
  },
  wakeWordBadge: {
    backgroundColor: "#00D4FF15",
    borderWidth: 1,
    borderColor: "#00D4FF40",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  wakeWordBadgeText: {
    fontSize: 9,
    color: "#00D4FF",
    fontWeight: "700",
    letterSpacing: 1,
  },
  wakeWordIndicator: {
    alignItems: "center",
    paddingVertical: 6,
  },
  wakeWordText: {
    fontSize: 12,
    color: "#00FF88",
    fontWeight: "700",
    letterSpacing: 2,
    textShadowColor: "#00FF88",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  micArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  micHint: {
    fontSize: 11,
    color: "#4A90A4",
    letterSpacing: 1.5,
    fontWeight: "600",
    marginTop: -5,
  },
  quickActionsArea: {
    paddingBottom: 8,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E3A5F50",
  },
  dividerLabel: {
    fontSize: 9,
    color: "#1E3A5F",
    fontWeight: "700",
    letterSpacing: 2,
  },
});
