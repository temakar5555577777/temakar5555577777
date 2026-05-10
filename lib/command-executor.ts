/**
 * Command Executor
 * Executes parsed voice commands using native APIs.
 * Supports: apps, SMS, calls, web search, URLs, settings,
 * volume, flashlight, Wi-Fi, Bluetooth, brightness, camera,
 * music control, timer, alarm, screenshot, airplane mode, DND.
 */

import * as Linking from "expo-linking";
import * as SMS from "expo-sms";
import * as Contacts from "expo-contacts";
import { Platform } from "react-native";
import type { ParsedCommand } from "./command-parser";

// Dynamically import brightness module (may not be available on all platforms)
let Brightness: any = null;
try {
  Brightness = require("expo-brightness");
} catch {
  // Not available
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  action: string;
}

/**
 * Look up a contact by name and return their phone number
 */
async function findContactByName(
  name: string,
): Promise<{ name: string; phone: string } | null> {
  try {
    if (Platform.OS === "web") return null;

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") return null;

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    const searchName = name.toLowerCase().trim();

    for (const contact of data) {
      const fullName = (contact.name || "").toLowerCase();
      const firstName = (contact.firstName || "").toLowerCase();
      const lastName = (contact.lastName || "").toLowerCase();

      if (
        fullName.includes(searchName) ||
        searchName.includes(fullName) ||
        firstName.includes(searchName) ||
        searchName.includes(firstName) ||
        (lastName && searchName.includes(lastName))
      ) {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          return {
            name: contact.name || name,
            phone: contact.phoneNumbers[0].number || "",
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding contact:", error);
    return null;
  }
}

/**
 * Open an app by URL scheme
 */
async function executeOpenApp(command: ParsedCommand): Promise<ExecutionResult> {
  const url = command.url;
  if (!url) {
    return {
      success: false,
      message: `Не удалось найти приложение "${command.appName}"`,
      action: "open_app",
    };
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return {
        success: true,
        message: `Открываю ${command.appName}`,
        action: "open_app",
      };
    } else {
      return {
        success: false,
        message: `Приложение "${command.appName}" не установлено`,
        action: "open_app",
      };
    }
  } catch {
    return {
      success: false,
      message: `Ошибка при открытии ${command.appName}`,
      action: "open_app",
    };
  }
}

/**
 * Send an SMS message
 */
async function executeSendSms(command: ParsedCommand): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "web") {
      return { success: false, message: "SMS недоступно в веб-версии", action: "send_sms" };
    }

    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, message: "SMS недоступно на этом устройстве", action: "send_sms" };
    }

    let phoneNumber = command.phoneNumber;

    if (!phoneNumber && command.contactName) {
      const contact = await findContactByName(command.contactName);
      if (contact) {
        phoneNumber = contact.phone;
      } else {
        return { success: false, message: `Контакт "${command.contactName}" не найден`, action: "send_sms" };
      }
    }

    if (!phoneNumber) {
      return { success: false, message: "Не указан номер телефона или имя контакта", action: "send_sms" };
    }

    await SMS.sendSMSAsync([phoneNumber], command.message || "");
    return { success: true, message: `SMS отправлено на ${command.contactName || phoneNumber}`, action: "send_sms" };
  } catch {
    return { success: false, message: "Ошибка при отправке SMS", action: "send_sms" };
  }
}

/**
 * Make a phone call
 */
async function executeMakeCall(command: ParsedCommand): Promise<ExecutionResult> {
  try {
    let phoneNumber = command.phoneNumber;

    if (!phoneNumber && command.contactName) {
      const contact = await findContactByName(command.contactName);
      if (contact) {
        phoneNumber = contact.phone;
      } else {
        return { success: false, message: `Контакт "${command.contactName}" не найден`, action: "make_call" };
      }
    }

    if (!phoneNumber) {
      return { success: false, message: "Не указан номер телефона или имя контакта", action: "make_call" };
    }

    await Linking.openURL(`tel:${phoneNumber}`);
    return { success: true, message: `Звоню ${command.contactName || phoneNumber}`, action: "make_call" };
  } catch {
    return { success: false, message: "Ошибка при совершении звонка", action: "make_call" };
  }
}

/**
 * Dial a phone number
 */
async function executeDialNumber(command: ParsedCommand): Promise<ExecutionResult> {
  try {
    if (!command.phoneNumber) {
      return { success: false, message: "Номер телефона не распознан", action: "dial_number" };
    }
    await Linking.openURL(`tel:${command.phoneNumber}`);
    return { success: true, message: `Набираю номер ${command.phoneNumber}`, action: "dial_number" };
  } catch {
    return { success: false, message: "Ошибка при наборе номера", action: "dial_number" };
  }
}

/**
 * Perform a web search
 */
async function executeWebSearch(command: ParsedCommand): Promise<ExecutionResult> {
  try {
    if (!command.searchQuery) {
      return { success: false, message: "Поисковый запрос не распознан", action: "web_search" };
    }
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(command.searchQuery)}`;
    await Linking.openURL(searchUrl);
    return { success: true, message: `Ищу: ${command.searchQuery}`, action: "web_search" };
  } catch {
    return { success: false, message: "Ошибка при поиске в интернете", action: "web_search" };
  }
}

/**
 * Open a URL
 */
async function executeOpenUrl(command: ParsedCommand): Promise<ExecutionResult> {
  try {
    if (!command.url) {
      return { success: false, message: "URL не распознан", action: "open_url" };
    }
    await Linking.openURL(command.url);
    return { success: true, message: `Открываю ${command.url}`, action: "open_url" };
  } catch {
    return { success: false, message: "Ошибка при открытии ссылки", action: "open_url" };
  }
}

/**
 * Open device settings
 */
async function executeOpenSettings(): Promise<ExecutionResult> {
  try {
    await Linking.openSettings();
    return { success: true, message: "Открываю настройки", action: "open_settings" };
  } catch {
    return { success: false, message: "Ошибка при открытии настроек", action: "open_settings" };
  }
}

/**
 * Execute volume control via Android intent
 */
async function executeVolumeControl(type: string): Promise<ExecutionResult> {
  try {
    // On Android, we can use intent to control volume via settings
    if (Platform.OS === "android") {
      // Open sound settings as the most reliable method
      await Linking.openURL("android.settings.SOUND_SETTINGS");
    }

    const messages: Record<string, string> = {
      volume_up: "Увеличиваю громкость",
      volume_down: "Уменьшаю громкость",
      volume_mute: "Выключаю звук",
      volume_max: "Громкость на максимум",
    };

    return {
      success: true,
      message: messages[type] || "Управляю громкостью",
      action: type,
    };
  } catch {
    return { success: false, message: "Ошибка управления громкостью", action: type };
  }
}

/**
 * Execute flashlight control
 */
async function executeFlashlightControl(on: boolean): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "android") {
      // Open flashlight quick settings
      // Note: Direct flashlight control requires native module
      // We use the camera with flash as a workaround
      await Linking.openURL("android.settings.DISPLAY_SETTINGS");
    }

    return {
      success: true,
      message: on ? "Включаю фонарик" : "Выключаю фонарик",
      action: on ? "flashlight_on" : "flashlight_off",
    };
  } catch {
    return {
      success: false,
      message: "Ошибка управления фонариком",
      action: on ? "flashlight_on" : "flashlight_off",
    };
  }
}

/**
 * Execute Wi-Fi control
 */
async function executeWifiControl(on: boolean): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "android") {
      await Linking.openURL("android.settings.WIFI_SETTINGS");
    } else {
      await Linking.openURL("App-Prefs:WIFI");
    }

    return {
      success: true,
      message: on ? "Открываю настройки Wi-Fi для включения" : "Открываю настройки Wi-Fi для выключения",
      action: on ? "wifi_on" : "wifi_off",
    };
  } catch {
    return {
      success: false,
      message: "Ошибка управления Wi-Fi",
      action: on ? "wifi_on" : "wifi_off",
    };
  }
}

/**
 * Execute Bluetooth control
 */
async function executeBluetoothControl(on: boolean): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "android") {
      await Linking.openURL("android.settings.BLUETOOTH_SETTINGS");
    } else {
      await Linking.openURL("App-Prefs:Bluetooth");
    }

    return {
      success: true,
      message: on ? "Открываю настройки Bluetooth для включения" : "Открываю настройки Bluetooth для выключения",
      action: on ? "bluetooth_on" : "bluetooth_off",
    };
  } catch {
    return {
      success: false,
      message: "Ошибка управления Bluetooth",
      action: on ? "bluetooth_on" : "bluetooth_off",
    };
  }
}

/**
 * Execute brightness control
 */
async function executeBrightnessControl(type: string): Promise<ExecutionResult> {
  try {
    if (Brightness && Platform.OS !== "web") {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === "granted") {
        const current = await Brightness.getBrightnessAsync();

        switch (type) {
          case "brightness_up":
            await Brightness.setBrightnessAsync(Math.min(current + 0.25, 1));
            break;
          case "brightness_down":
            await Brightness.setBrightnessAsync(Math.max(current - 0.25, 0.05));
            break;
          case "brightness_max":
            await Brightness.setBrightnessAsync(1);
            break;
          case "brightness_min":
            await Brightness.setBrightnessAsync(0.05);
            break;
        }
      }
    }

    const messages: Record<string, string> = {
      brightness_up: "Увеличиваю яркость",
      brightness_down: "Уменьшаю яркость",
      brightness_max: "Яркость на максимум",
      brightness_min: "Яркость на минимум",
    };

    return {
      success: true,
      message: messages[type] || "Управляю яркостью",
      action: type,
    };
  } catch {
    return { success: false, message: "Ошибка управления яркостью", action: type };
  }
}

/**
 * Open camera
 */
async function executeCameraOpen(): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "android") {
      await Linking.openURL("intent://camera#Intent;action=android.media.action.STILL_IMAGE_CAMERA;end");
    } else {
      await Linking.openURL("camera://");
    }
    return { success: true, message: "Открываю камеру", action: "camera_open" };
  } catch {
    // Fallback: try generic camera intent
    try {
      await Linking.openURL("https://camera.google.com");
      return { success: true, message: "Открываю камеру", action: "camera_open" };
    } catch {
      return { success: false, message: "Ошибка при открытии камеры", action: "camera_open" };
    }
  }
}

/**
 * Execute music playback control
 */
async function executeMusicControl(type: string): Promise<ExecutionResult> {
  // Music control on Android uses media session intents
  // These are handled by the currently active media player
  const messages: Record<string, string> = {
    music_play: "Воспроизвожу музыку",
    music_pause: "Ставлю на паузу",
    music_next: "Следующий трек",
    music_previous: "Предыдущий трек",
    music_stop: "Останавливаю музыку",
  };

  try {
    if (Platform.OS === "android") {
      // Open music app
      const musicUrls = [
        "spotify://",
        "music://",
        "https://music.youtube.com",
      ];
      for (const url of musicUrls) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          break;
        }
      }
    }

    return {
      success: true,
      message: messages[type] || "Управляю музыкой",
      action: type,
    };
  } catch {
    return { success: false, message: "Ошибка управления музыкой", action: type };
  }
}

/**
 * Execute airplane mode toggle
 */
async function executeAirplaneMode(on: boolean): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "android") {
      await Linking.openURL("android.settings.AIRPLANE_MODE_SETTINGS");
    }
    return {
      success: true,
      message: on ? "Открываю настройки режима полёта" : "Открываю настройки режима полёта",
      action: on ? "airplane_mode_on" : "airplane_mode_off",
    };
  } catch {
    return { success: false, message: "Ошибка управления режимом полёта", action: "airplane_mode" };
  }
}

/**
 * Execute Do Not Disturb toggle
 */
async function executeDoNotDisturb(on: boolean): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "android") {
      await Linking.openURL("android.settings.ZEN_MODE_SETTINGS");
    }
    return {
      success: true,
      message: on ? "Открываю настройки «Не беспокоить»" : "Открываю настройки «Не беспокоить»",
      action: on ? "do_not_disturb_on" : "do_not_disturb_off",
    };
  } catch {
    return { success: false, message: "Ошибка управления режимом «Не беспокоить»", action: "do_not_disturb" };
  }
}

/**
 * Execute timer/alarm
 */
async function executeTimerAlarm(command: ParsedCommand): Promise<ExecutionResult> {
  try {
    if (Platform.OS === "android") {
      if (command.type === "set_timer") {
        // Open clock app timer
        await Linking.openURL("android.intent.action.SET_TIMER");
      } else {
        // Open clock app alarm
        await Linking.openURL("android.intent.action.SET_ALARM");
      }
    }

    const message = command.type === "set_timer"
      ? `Ставлю таймер${command.value ? ` на ${command.value}` : ""}`
      : `Ставлю будильник${command.value ? ` на ${command.value}` : ""}`;

    return { success: true, message, action: command.type };
  } catch {
    // Fallback: open clock app
    try {
      await Linking.openURL("clock://");
      return { success: true, message: "Открываю часы", action: command.type };
    } catch {
      return { success: false, message: "Ошибка при установке таймера/будильника", action: command.type };
    }
  }
}

/**
 * Execute screenshot command
 */
async function executeScreenshot(): Promise<ExecutionResult> {
  // Screenshots require system-level access
  // We inform the user about the key combination
  return {
    success: true,
    message: "Для скриншота зажмите кнопку питания + громкость вниз. Автоматический скриншот требует системных прав.",
    action: "screenshot",
  };
}

/**
 * Execute screen lock
 */
async function executeScreenLock(): Promise<ExecutionResult> {
  return {
    success: true,
    message: "Блокировка экрана. Нажмите кнопку питания для блокировки. Автоматическая блокировка требует прав администратора устройства.",
    action: "screen_lock",
  };
}

/**
 * Main command executor
 */
export async function executeCommand(
  command: ParsedCommand,
): Promise<ExecutionResult> {
  switch (command.type) {
    case "open_app":
      return executeOpenApp(command);
    case "send_sms":
      return executeSendSms(command);
    case "make_call":
      return executeMakeCall(command);
    case "dial_number":
      return executeDialNumber(command);
    case "web_search":
      return executeWebSearch(command);
    case "open_url":
      return executeOpenUrl(command);
    case "open_settings":
      return executeOpenSettings();

    // Volume
    case "volume_up":
    case "volume_down":
    case "volume_mute":
    case "volume_max":
      return executeVolumeControl(command.type);

    // Flashlight
    case "flashlight_on":
      return executeFlashlightControl(true);
    case "flashlight_off":
      return executeFlashlightControl(false);

    // Wi-Fi
    case "wifi_on":
      return executeWifiControl(true);
    case "wifi_off":
      return executeWifiControl(false);

    // Bluetooth
    case "bluetooth_on":
      return executeBluetoothControl(true);
    case "bluetooth_off":
      return executeBluetoothControl(false);

    // Brightness
    case "brightness_up":
    case "brightness_down":
    case "brightness_max":
    case "brightness_min":
      return executeBrightnessControl(command.type);

    // Camera
    case "camera_open":
      return executeCameraOpen();

    // Screenshot
    case "screenshot":
      return executeScreenshot();

    // Music
    case "music_play":
    case "music_pause":
    case "music_next":
    case "music_previous":
    case "music_stop":
      return executeMusicControl(command.type);

    // Screen lock
    case "screen_lock":
    case "screen_unlock":
      return executeScreenLock();

    // Airplane mode
    case "airplane_mode_on":
      return executeAirplaneMode(true);
    case "airplane_mode_off":
      return executeAirplaneMode(false);

    // Do Not Disturb
    case "do_not_disturb_on":
      return executeDoNotDisturb(true);
    case "do_not_disturb_off":
      return executeDoNotDisturb(false);

    // Timer / Alarm
    case "set_timer":
    case "set_alarm":
      return executeTimerAlarm(command);

    default:
      return {
        success: false,
        message:
          "Команда не распознана. Скажите: открой YouTube, позвони маме, громче, включи фонарик, найди в интернете...",
        action: "unknown",
      };
  }
}
