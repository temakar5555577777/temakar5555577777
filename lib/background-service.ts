/**
 * Background Listening Service with Wake Word Detection
 *
 * Features:
 * - Wake word "Jarvis" detection (also "Джарвис" in Russian)
 * - Persistent notification to keep service alive on Android
 * - Continuous speech recognition with auto-restart
 * - Exponential backoff on errors
 *
 * On Android, this works with:
 * - FOREGROUND_SERVICE permission for persistent notification
 * - WAKE_LOCK to keep CPU active
 * - expo-speech-recognition continuous mode
 * - expo-notifications for persistent notification
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BG_SERVICE_KEY = "@jarvis_bg_service_enabled";
const WAKE_WORD_KEY = "@jarvis_wake_word_enabled";

// Wake words that trigger command mode
export const WAKE_WORDS = [
  "jarvis",
  "джарвис",
  "жарвис",
  "jarvis,",
  "hey jarvis",
  "хей джарвис",
  "окей джарвис",
  "ok jarvis",
];

export interface BackgroundServiceState {
  isEnabled: boolean;
  isRunning: boolean;
  isWakeWordMode: boolean;
  isCommandMode: boolean;
  lastActivity: number;
  errorCount: number;
}

let serviceState: BackgroundServiceState = {
  isEnabled: false,
  isRunning: false,
  isWakeWordMode: false,
  isCommandMode: false,
  lastActivity: Date.now(),
  errorCount: 0,
};

// Notification module (loaded dynamically to avoid web issues)
let Notifications: any = null;
try {
  if (Platform.OS !== "web") {
    Notifications = require("expo-notifications");
  }
} catch {
  // Not available
}

/**
 * Check if a transcript contains the wake word
 */
export function containsWakeWord(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return WAKE_WORDS.some((word) => lower.includes(word));
}

/**
 * Extract the command after the wake word
 * e.g., "Jarvis open YouTube" -> "open YouTube"
 */
export function extractCommandAfterWakeWord(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();

  for (const word of WAKE_WORDS) {
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      const afterWord = transcript.substring(idx + word.length).trim();
      // Remove leading comma or period
      const cleaned = afterWord.replace(/^[,.\s]+/, "").trim();
      return cleaned.length > 0 ? cleaned : null;
    }
  }
  return null;
}

/**
 * Check if background service is enabled
 */
export async function isBackgroundServiceEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(BG_SERVICE_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

/**
 * Enable/disable background listening
 */
export async function setBackgroundServiceEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(BG_SERVICE_KEY, enabled ? "true" : "false");
  serviceState.isEnabled = enabled;

  if (enabled) {
    await showPersistentNotification();
  } else {
    await dismissPersistentNotification();
  }
}

/**
 * Check if wake word mode is enabled
 */
export async function isWakeWordEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(WAKE_WORD_KEY);
    return value !== "false"; // Default to true
  } catch {
    return true;
  }
}

/**
 * Enable/disable wake word detection
 */
export async function setWakeWordEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(WAKE_WORD_KEY, enabled ? "true" : "false");
  serviceState.isWakeWordMode = enabled;
}

/**
 * Get current service state
 */
export function getServiceState(): BackgroundServiceState {
  return { ...serviceState };
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  serviceState.lastActivity = Date.now();
  serviceState.errorCount = 0;
}

/**
 * Enter command mode (wake word detected, now listening for actual command)
 */
export function enterCommandMode(): void {
  serviceState.isCommandMode = true;
  serviceState.lastActivity = Date.now();
}

/**
 * Exit command mode (command processed or timeout)
 */
export function exitCommandMode(): void {
  serviceState.isCommandMode = false;
}

/**
 * Show persistent notification to keep service alive
 */
export async function showPersistentNotification(): Promise<void> {
  if (Platform.OS === "web" || !Notifications) return;

  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    // Set notification channel for Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("jarvis-service", {
        name: "J.A.R.V.I.S. Service",
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0],
        lightColor: "#00D4FF",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: null,
      });
    }

    // Schedule an ongoing notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "J.A.R.V.I.S. Active",
        body: 'Listening for wake word "Jarvis"...',
        data: { type: "background-service" },
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        ...(Platform.OS === "android" && {
          channelId: "jarvis-service",
        }),
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.warn("Failed to show persistent notification:", error);
  }
}

/**
 * Update persistent notification text
 */
export async function updatePersistentNotification(
  body: string,
): Promise<void> {
  if (Platform.OS === "web" || !Notifications) return;

  try {
    // Dismiss and re-show with new text
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "J.A.R.V.I.S. Active",
        body,
        data: { type: "background-service" },
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        ...(Platform.OS === "android" && {
          channelId: "jarvis-service",
        }),
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("Failed to update notification:", error);
  }
}

/**
 * Dismiss persistent notification
 */
export async function dismissPersistentNotification(): Promise<void> {
  if (Platform.OS === "web" || !Notifications) return;

  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Ignore
  }
}

/**
 * Start background listening mode with wake word detection
 */
export async function startBackgroundListening(
  speechModule: any,
  options: {
    language: string;
    onWakeWord: () => void;
    onCommand: (transcript: string) => void;
    onError: (error: string) => void;
  },
): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  if (!speechModule) {
    return false;
  }

  try {
    const result = await speechModule.requestPermissionsAsync();
    if (!result.granted) {
      options.onError("Microphone permission not granted");
      return false;
    }

    serviceState.isRunning = true;
    serviceState.isWakeWordMode = true;
    serviceState.lastActivity = Date.now();

    // Show persistent notification
    await showPersistentNotification();

    // Start continuous recognition
    speechModule.start({
      lang: options.language,
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: false,
    });

    return true;
  } catch (error) {
    serviceState.isRunning = false;
    options.onError(`Failed to start: ${error}`);
    return false;
  }
}

/**
 * Stop background listening
 */
export async function stopBackgroundListening(
  speechModule: any,
): Promise<void> {
  if (speechModule && serviceState.isRunning) {
    try {
      speechModule.stop();
    } catch {
      // Ignore errors on stop
    }
  }
  serviceState.isRunning = false;
  serviceState.isWakeWordMode = false;
  serviceState.isCommandMode = false;
  await dismissPersistentNotification();
}

/**
 * Auto-restart logic for continuous listening
 */
export function shouldAutoRestart(): boolean {
  if (!serviceState.isEnabled) return false;

  // Don't restart if last activity was very recent (avoid loops)
  const timeSinceLastActivity = Date.now() - serviceState.lastActivity;
  if (timeSinceLastActivity < 500) return false;

  return true;
}

/**
 * Get restart delay based on error count
 */
export function getRestartDelay(): number {
  const delay = Math.min(1000 * Math.pow(2, serviceState.errorCount), 10000);
  serviceState.errorCount++;
  return delay;
}

/**
 * Reset error count (call on successful recognition)
 */
export function resetErrorCount(): void {
  serviceState.errorCount = 0;
}
