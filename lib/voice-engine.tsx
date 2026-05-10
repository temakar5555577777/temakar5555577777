/**
 * Voice Engine - Central voice control state management
 * Manages speech recognition, TTS, command history, settings,
 * wake word detection ("Jarvis"), and background listening.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from "react";
import * as Speech from "expo-speech";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  parseCommand,
  getCommandDescription,
  type ParsedCommand,
  type CommandType,
} from "./command-parser";
import { executeCommand, type ExecutionResult } from "./command-executor";
import {
  containsWakeWord,
  extractCommandAfterWakeWord,
  showPersistentNotification,
  dismissPersistentNotification,
  updatePersistentNotification,
} from "./background-service";

// ---- Types ----

export type VoiceStatus =
  | "idle"
  | "listening"
  | "wake_word_listening"
  | "processing"
  | "speaking"
  | "error";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  transcript: string;
  commandType: CommandType;
  response: string;
  success: boolean;
}

export interface VoiceSettings {
  language: string;
  speechRate: number;
  speechPitch: number;
  keepAwake: boolean;
  continuousListening: boolean;
  backgroundListening: boolean;
  wakeWordEnabled: boolean;
}

interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  interimTranscript: string;
  response: string;
  history: HistoryEntry[];
  settings: VoiceSettings;
  errorMessage: string;
  permissionsGranted: boolean;
  wakeWordDetected: boolean;
}

type VoiceAction =
  | { type: "SET_STATUS"; status: VoiceStatus }
  | { type: "SET_TRANSCRIPT"; transcript: string }
  | { type: "SET_INTERIM_TRANSCRIPT"; transcript: string }
  | { type: "SET_RESPONSE"; response: string }
  | { type: "ADD_HISTORY"; entry: HistoryEntry }
  | { type: "CLEAR_HISTORY" }
  | { type: "SET_HISTORY"; history: HistoryEntry[] }
  | { type: "SET_SETTINGS"; settings: Partial<VoiceSettings> }
  | { type: "SET_ERROR"; message: string }
  | { type: "SET_PERMISSIONS"; granted: boolean }
  | { type: "SET_WAKE_WORD_DETECTED"; detected: boolean }
  | { type: "RESET" };

const DEFAULT_SETTINGS: VoiceSettings = {
  language: "ru-RU",
  speechRate: 1.0,
  speechPitch: 1.0,
  keepAwake: true,
  continuousListening: false,
  backgroundListening: false,
  wakeWordEnabled: true,
};

const initialState: VoiceState = {
  status: "idle",
  transcript: "",
  interimTranscript: "",
  response: 'Скажите "Джарвис" или нажмите на микрофон',
  history: [],
  settings: DEFAULT_SETTINGS,
  errorMessage: "",
  permissionsGranted: false,
  wakeWordDetected: false,
};

function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.status, errorMessage: "" };
    case "SET_TRANSCRIPT":
      return { ...state, transcript: action.transcript };
    case "SET_INTERIM_TRANSCRIPT":
      return { ...state, interimTranscript: action.transcript };
    case "SET_RESPONSE":
      return { ...state, response: action.response };
    case "ADD_HISTORY":
      return { ...state, history: [action.entry, ...state.history].slice(0, 100) };
    case "CLEAR_HISTORY":
      return { ...state, history: [] };
    case "SET_HISTORY":
      return { ...state, history: action.history };
    case "SET_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      };
    case "SET_ERROR":
      return { ...state, status: "error", errorMessage: action.message };
    case "SET_PERMISSIONS":
      return { ...state, permissionsGranted: action.granted };
    case "SET_WAKE_WORD_DETECTED":
      return { ...state, wakeWordDetected: action.detected };
    case "RESET":
      return {
        ...state,
        status: "idle",
        transcript: "",
        interimTranscript: "",
        response: 'Скажите "Джарвис" или нажмите на микрофон',
        errorMessage: "",
        wakeWordDetected: false,
      };
    default:
      return state;
  }
}

// ---- Context ----

interface VoiceContextType {
  state: VoiceState;
  startListening: () => Promise<void>;
  stopListening: () => void;
  startWakeWordListening: () => Promise<void>;
  stopWakeWordListening: () => void;
  processTranscript: (text: string) => Promise<void>;
  handleWakeWordTranscript: (text: string) => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  reset: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

// ---- Storage Keys ----
const HISTORY_KEY = "@voice_control_history";
const SETTINGS_KEY = "@voice_control_settings";

// ---- Provider ----

export function VoiceEngineProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(voiceReducer, initialState);
  const isProcessingRef = useRef(false);
  const wakeWordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  // Save history when it changes
  useEffect(() => {
    if (state.history.length > 0) {
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(state.history)).catch(
        console.error,
      );
    }
  }, [state.history]);

  // Save settings when they change
  useEffect(() => {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)).catch(
      console.error,
    );
  }, [state.settings]);

  // Handle background listening notification
  useEffect(() => {
    if (state.settings.backgroundListening && Platform.OS !== "web") {
      showPersistentNotification();
    } else if (!state.settings.backgroundListening && Platform.OS !== "web") {
      dismissPersistentNotification();
    }
  }, [state.settings.backgroundListening]);

  async function loadSavedData() {
    try {
      const [historyStr, settingsStr] = await Promise.all([
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
      ]);

      if (historyStr) {
        const history = JSON.parse(historyStr) as HistoryEntry[];
        dispatch({ type: "SET_HISTORY", history });
      }

      if (settingsStr) {
        const settings = JSON.parse(settingsStr) as Partial<VoiceSettings>;
        dispatch({ type: "SET_SETTINGS", settings });
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  }

  const speak = useCallback(
    (text: string) => {
      dispatch({ type: "SET_STATUS", status: "speaking" });
      Speech.speak(text, {
        language: state.settings.language,
        rate: state.settings.speechRate,
        pitch: state.settings.speechPitch,
        onDone: () => {
          // After speaking, return to wake word listening if enabled
          if (state.settings.wakeWordEnabled || state.settings.backgroundListening) {
            dispatch({ type: "SET_STATUS", status: "wake_word_listening" });
            dispatch({
              type: "SET_RESPONSE",
              response: 'Готов. Скажите "Джарвис" для новой команды',
            });
          } else {
            dispatch({ type: "SET_STATUS", status: "idle" });
          }
        },
        onError: () => {
          dispatch({ type: "SET_STATUS", status: "idle" });
        },
      });
    },
    [state.settings.language, state.settings.speechRate, state.settings.speechPitch, state.settings.wakeWordEnabled, state.settings.backgroundListening],
  );

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    dispatch({ type: "SET_STATUS", status: "idle" });
  }, []);

  const processTranscript = useCallback(
    async (text: string) => {
      if (isProcessingRef.current || !text.trim()) return;
      isProcessingRef.current = true;

      dispatch({ type: "SET_STATUS", status: "processing" });
      dispatch({ type: "SET_TRANSCRIPT", transcript: text });
      dispatch({ type: "SET_WAKE_WORD_DETECTED", detected: false });

      // Update notification
      if (Platform.OS !== "web") {
        updatePersistentNotification(`Выполняю: ${text}`);
      }

      try {
        const command: ParsedCommand = parseCommand(text);
        const description = getCommandDescription(command);

        dispatch({ type: "SET_RESPONSE", response: description });

        const result: ExecutionResult = await executeCommand(command);

        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          transcript: text,
          commandType: command.type,
          response: result.message,
          success: result.success,
        };

        dispatch({ type: "ADD_HISTORY", entry });
        dispatch({ type: "SET_RESPONSE", response: result.message });

        // Update notification back to listening
        if (Platform.OS !== "web") {
          updatePersistentNotification('Слушаю... Скажите "Джарвис"');
        }

        speak(result.message);
      } catch (error) {
        const errorMsg = "Произошла ошибка при выполнении команды";
        dispatch({ type: "SET_ERROR", message: errorMsg });
        speak(errorMsg);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [speak],
  );

  /**
   * Handle transcript in wake word mode
   * Checks if "Jarvis" was said, then either:
   * - Extracts command after wake word and processes it
   * - Or switches to active listening mode for the next phrase
   */
  const handleWakeWordTranscript = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      if (containsWakeWord(text)) {
        // Wake word detected!
        dispatch({ type: "SET_WAKE_WORD_DETECTED", detected: true });

        // Check if there's a command after the wake word
        const commandAfter = extractCommandAfterWakeWord(text);

        if (commandAfter) {
          // Process the command immediately
          processTranscript(commandAfter);
        } else {
          // Switch to active listening mode - waiting for command
          dispatch({ type: "SET_STATUS", status: "listening" });
          dispatch({
            type: "SET_RESPONSE",
            response: "Слушаю вашу команду...",
          });

          // Play a confirmation sound/speak
          Speech.speak("Да?", {
            language: state.settings.language,
            rate: 1.2,
            pitch: 1.1,
          });

          // Set timeout to go back to wake word mode if no command
          if (wakeWordTimeoutRef.current) {
            clearTimeout(wakeWordTimeoutRef.current);
          }
          wakeWordTimeoutRef.current = setTimeout(() => {
            dispatch({ type: "SET_STATUS", status: "wake_word_listening" });
            dispatch({
              type: "SET_RESPONSE",
              response: 'Скажите "Джарвис" для активации',
            });
            dispatch({ type: "SET_WAKE_WORD_DETECTED", detected: false });
          }, 10000); // 10 second timeout
        }
      }
    },
    [processTranscript, state.settings.language],
  );

  const startListening = useCallback(async () => {
    // Cancel wake word timeout if active
    if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current);
      wakeWordTimeoutRef.current = null;
    }

    dispatch({ type: "SET_STATUS", status: "listening" });
    dispatch({ type: "SET_TRANSCRIPT", transcript: "" });
    dispatch({ type: "SET_INTERIM_TRANSCRIPT", transcript: "" });
    dispatch({
      type: "SET_RESPONSE",
      response: "Слушаю... Скажите команду",
    });
  }, []);

  const stopListening = useCallback(() => {
    if (state.settings.wakeWordEnabled || state.settings.backgroundListening) {
      dispatch({ type: "SET_STATUS", status: "wake_word_listening" });
      dispatch({
        type: "SET_RESPONSE",
        response: 'Скажите "Джарвис" для активации',
      });
    } else {
      dispatch({ type: "SET_STATUS", status: "idle" });
    }
  }, [state.settings.wakeWordEnabled, state.settings.backgroundListening]);

  const startWakeWordListening = useCallback(async () => {
    dispatch({ type: "SET_STATUS", status: "wake_word_listening" });
    dispatch({
      type: "SET_RESPONSE",
      response: 'Ожидаю команду... Скажите "Джарвис"',
    });

    if (Platform.OS !== "web") {
      await showPersistentNotification();
    }
  }, []);

  const stopWakeWordListening = useCallback(() => {
    if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current);
      wakeWordTimeoutRef.current = null;
    }
    dispatch({ type: "SET_STATUS", status: "idle" });
    dispatch({ type: "SET_WAKE_WORD_DETECTED", detected: false });

    if (Platform.OS !== "web") {
      dismissPersistentNotification();
    }
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: "CLEAR_HISTORY" });
    AsyncStorage.removeItem(HISTORY_KEY).catch(console.error);
  }, []);

  const updateSettings = useCallback((settings: Partial<VoiceSettings>) => {
    dispatch({ type: "SET_SETTINGS", settings });
  }, []);

  const reset = useCallback(() => {
    stopSpeaking();
    if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current);
      wakeWordTimeoutRef.current = null;
    }
    dispatch({ type: "RESET" });
  }, [stopSpeaking]);

  const contextValue: VoiceContextType = {
    state,
    startListening,
    stopListening,
    startWakeWordListening,
    stopWakeWordListening,
    processTranscript,
    handleWakeWordTranscript,
    speak,
    stopSpeaking,
    clearHistory,
    updateSettings,
    reset,
  };

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceEngine(): VoiceContextType {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoiceEngine must be used within VoiceEngineProvider");
  }
  return context;
}
