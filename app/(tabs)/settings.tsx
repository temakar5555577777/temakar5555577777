/**
 * Settings Screen - JARVIS Style
 * Dark futuristic configuration panel with wake word and background mode settings.
 */

import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { ScreenContainer } from "@/components/screen-container";
import { useVoiceEngine } from "@/lib/voice-engine";

interface SettingItem {
  id: string;
  type: "toggle" | "select" | "action" | "header";
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  value?: any;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const { state, updateSettings, speak } = useVoiceEngine();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const languages = [
    { label: "Русский", value: "ru-RU" },
    { label: "English", value: "en-US" },
    { label: "Deutsch", value: "de-DE" },
    { label: "Français", value: "fr-FR" },
    { label: "Español", value: "es-ES" },
    { label: "Українська", value: "uk-UA" },
  ];

  const currentLanguageLabel =
    languages.find((l) => l.value === state.settings.language)?.label ||
    "Русский";

  const handleLanguageSelect = useCallback(
    (langValue: string) => {
      updateSettings({ language: langValue });
      setShowLanguagePicker(false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [updateSettings],
  );

  const handleTestVoice = useCallback(() => {
    speak("Система J.A.R.V.I.S. активна. Все модули работают в штатном режиме. Голосовое управление готово.");
  }, [speak]);

  const handleOpenPermissions = useCallback(() => {
    Linking.openSettings();
  }, []);

  const settingsData: SettingItem[] = [
    { id: "header_wake", type: "header", title: "WAKE WORD" },
    {
      id: "wake_word",
      type: "toggle",
      title: 'Wake Word "Jarvis"',
      subtitle: 'Say "Jarvis" or "Джарвис" to activate',
      icon: "record-voice-over",
      value: state.settings.wakeWordEnabled,
      onToggle: (value) => updateSettings({ wakeWordEnabled: value }),
    },
    {
      id: "background_listening",
      type: "toggle",
      title: "Background Listening",
      subtitle: "Keep listening when app is in background",
      icon: "hearing",
      value: state.settings.backgroundListening,
      onToggle: (value) => updateSettings({ backgroundListening: value }),
    },
    { id: "header_voice", type: "header", title: "VOICE MODULE" },
    {
      id: "language",
      type: "select",
      title: "Recognition Language",
      subtitle: currentLanguageLabel,
      icon: "language",
      onPress: () => setShowLanguagePicker(!showLanguagePicker),
    },
    {
      id: "speech_rate",
      type: "action",
      title: "Speech Rate",
      subtitle: `${state.settings.speechRate.toFixed(1)}x`,
      icon: "speed",
      onPress: () => {
        const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIdx = rates.indexOf(state.settings.speechRate);
        const nextIdx = (currentIdx + 1) % rates.length;
        updateSettings({ speechRate: rates[nextIdx] });
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    },
    {
      id: "speech_pitch",
      type: "action",
      title: "Voice Pitch",
      subtitle: `${state.settings.speechPitch.toFixed(1)}`,
      icon: "graphic-eq",
      onPress: () => {
        const pitches = [0.5, 0.75, 1.0, 1.25, 1.5];
        const currentIdx = pitches.indexOf(state.settings.speechPitch);
        const nextIdx = (currentIdx + 1) % pitches.length;
        updateSettings({ speechPitch: pitches[nextIdx] });
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    },
    {
      id: "test_voice",
      type: "action",
      title: "System Check",
      subtitle: "Run voice diagnostics",
      icon: "play-circle-outline",
      onPress: handleTestVoice,
    },
    { id: "header_behavior", type: "header", title: "BEHAVIOR" },
    {
      id: "keep_awake",
      type: "toggle",
      title: "Keep Display Active",
      subtitle: "Prevent screen timeout during operation",
      icon: "visibility",
      value: state.settings.keepAwake,
      onToggle: (value) => updateSettings({ keepAwake: value }),
    },
    {
      id: "continuous",
      type: "toggle",
      title: "Continuous Listening",
      subtitle: "Auto-restart after each command",
      icon: "loop",
      value: state.settings.continuousListening,
      onToggle: (value) => updateSettings({ continuousListening: value }),
    },
    { id: "header_system", type: "header", title: "SYSTEM" },
    {
      id: "permissions",
      type: "action",
      title: "Permissions",
      subtitle: "Microphone, Contacts, SMS, Phone, Notifications",
      icon: "security",
      onPress: handleOpenPermissions,
    },
    {
      id: "commands_info",
      type: "action",
      title: "Available Commands",
      subtitle: "Volume, Flashlight, Wi-Fi, Bluetooth, Brightness, Camera...",
      icon: "list",
      onPress: () => {
        speak(
          "Доступные команды: открой приложение, позвони, отправь SMS, найди в интернете, " +
          "громче, тише, включи фонарик, выключи фонарик, включи вай-фай, выключи вай-фай, " +
          "включи блютуз, ярче, темнее, камера, скриншот, следующий трек, пауза, " +
          "режим полёта, не беспокоить, таймер, будильник."
        );
      },
    },
    {
      id: "about",
      type: "action",
      title: "System Info",
      subtitle: "J.A.R.V.I.S. Voice Control v3.0",
      icon: "info-outline",
    },
  ];

  const renderItem = useCallback(
    ({ item }: { item: SettingItem }) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionHeader}>{item.title}</Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        );
      }

      return (
        <Pressable
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.settingRow,
            pressed && item.onPress && { opacity: 0.6 },
          ]}
        >
          {item.icon && (
            <View style={styles.settingIcon}>
              <MaterialIcons name={item.icon} size={18} color="#00D4FF" />
            </View>
          )}
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
          {item.type === "toggle" && (
            <Switch
              value={item.value}
              onValueChange={(value) => {
                item.onToggle?.(value);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              trackColor={{ false: "#1E3A5F", true: "#00D4FF40" }}
              thumbColor={item.value ? "#00D4FF" : "#4A90A4"}
            />
          )}
          {(item.type === "select" || item.type === "action") && item.onPress && (
            <MaterialIcons name="chevron-right" size={20} color="#1E3A5F" />
          )}
        </Pressable>
      );
    },
    [state.settings],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  return (
    <ScreenContainer containerClassName="bg-[#0A0E1A]">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SETTINGS</Text>
          <Text style={styles.headerSub}>CONFIGURATION PANEL</Text>
        </View>

        {/* Language Picker */}
        {showLanguagePicker && (
          <View style={styles.languagePicker}>
            {languages.map((lang) => (
              <Pressable
                key={lang.value}
                onPress={() => handleLanguageSelect(lang.value)}
                style={({ pressed }) => [
                  styles.languageOption,
                  pressed && { backgroundColor: "#00D4FF10" },
                  lang.value === state.settings.language && {
                    backgroundColor: "#00D4FF15",
                    borderLeftColor: "#00D4FF",
                    borderLeftWidth: 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.languageLabel,
                    lang.value === state.settings.language && {
                      color: "#00D4FF",
                    },
                  ]}
                >
                  {lang.label}
                </Text>
                {lang.value === state.settings.language && (
                  <MaterialIcons name="check" size={16} color="#00D4FF" />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Settings List */}
        <FlatList
          data={settingsData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
        />
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E0F7FF",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 10,
    color: "#1E3A5F",
    letterSpacing: 2,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E3A5F40",
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00D4FF",
    letterSpacing: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E3A5F40",
    backgroundColor: "#111827",
    gap: 12,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#00D4FF20",
    backgroundColor: "#00D4FF08",
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E0F7FF",
  },
  settingSubtitle: {
    fontSize: 12,
    color: "#4A90A4",
  },
  languagePicker: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A5F30",
  },
  languageLabel: {
    fontSize: 14,
    color: "#E0F7FF",
  },
});
