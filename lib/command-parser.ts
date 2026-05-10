/**
 * Voice Command Parser
 * Parses Russian and English voice commands into structured actions.
 * Supports: apps, SMS, calls, web search, URLs, settings,
 * volume, flashlight, Wi-Fi, Bluetooth, brightness, camera,
 * music control, timer, alarm, screenshot.
 */

export type CommandType =
  | "open_app"
  | "send_sms"
  | "make_call"
  | "dial_number"
  | "web_search"
  | "open_url"
  | "open_settings"
  | "set_alarm"
  | "set_timer"
  | "volume_up"
  | "volume_down"
  | "volume_mute"
  | "volume_max"
  | "flashlight_on"
  | "flashlight_off"
  | "wifi_on"
  | "wifi_off"
  | "bluetooth_on"
  | "bluetooth_off"
  | "brightness_up"
  | "brightness_down"
  | "brightness_max"
  | "brightness_min"
  | "camera_open"
  | "screenshot"
  | "music_play"
  | "music_pause"
  | "music_next"
  | "music_previous"
  | "music_stop"
  | "screen_lock"
  | "screen_unlock"
  | "airplane_mode_on"
  | "airplane_mode_off"
  | "do_not_disturb_on"
  | "do_not_disturb_off"
  | "unknown";

export interface ParsedCommand {
  type: CommandType;
  appName?: string | null;
  phoneNumber?: string | null;
  contactName?: string | null;
  message?: string | null;
  searchQuery?: string | null;
  url?: string | null;
  value?: string | null; // For timer minutes, alarm time, etc.
  rawText: string;
  confidence: number;
}

// Known app name mappings (Russian -> package/scheme)
const APP_MAPPINGS: Record<string, { name: string; schemes: string[] }> = {
  ютуб: { name: "YouTube", schemes: ["vnd.youtube://", "https://youtube.com"] },
  youtube: { name: "YouTube", schemes: ["vnd.youtube://", "https://youtube.com"] },
  телеграм: { name: "Telegram", schemes: ["tg://", "https://t.me"] },
  telegram: { name: "Telegram", schemes: ["tg://", "https://t.me"] },
  телеграмм: { name: "Telegram", schemes: ["tg://", "https://t.me"] },
  ватсап: { name: "WhatsApp", schemes: ["whatsapp://", "https://wa.me"] },
  whatsapp: { name: "WhatsApp", schemes: ["whatsapp://", "https://wa.me"] },
  вотсап: { name: "WhatsApp", schemes: ["whatsapp://", "https://wa.me"] },
  инстаграм: { name: "Instagram", schemes: ["instagram://", "https://instagram.com"] },
  instagram: { name: "Instagram", schemes: ["instagram://", "https://instagram.com"] },
  камера: { name: "Camera", schemes: ["camera://"] },
  camera: { name: "Camera", schemes: ["camera://"] },
  калькулятор: { name: "Calculator", schemes: ["calculator://"] },
  calculator: { name: "Calculator", schemes: ["calculator://"] },
  карты: { name: "Maps", schemes: ["geo:", "https://maps.google.com"] },
  maps: { name: "Maps", schemes: ["geo:", "https://maps.google.com"] },
  гугл: { name: "Google", schemes: ["https://google.com"] },
  google: { name: "Google", schemes: ["https://google.com"] },
  браузер: { name: "Browser", schemes: ["https://google.com"] },
  browser: { name: "Browser", schemes: ["https://google.com"] },
  хром: { name: "Chrome", schemes: ["googlechrome://", "https://google.com"] },
  chrome: { name: "Chrome", schemes: ["googlechrome://", "https://google.com"] },
  музыка: { name: "Music", schemes: ["music://", "https://music.youtube.com"] },
  music: { name: "Music", schemes: ["music://", "https://music.youtube.com"] },
  настройки: { name: "Settings", schemes: ["app-settings:"] },
  settings: { name: "Settings", schemes: ["app-settings:"] },
  почта: { name: "Mail", schemes: ["mailto:"] },
  mail: { name: "Mail", schemes: ["mailto:"] },
  email: { name: "Mail", schemes: ["mailto:"] },
  тикток: { name: "TikTok", schemes: ["snssdk1233://", "https://tiktok.com"] },
  tiktok: { name: "TikTok", schemes: ["snssdk1233://", "https://tiktok.com"] },
  вконтакте: { name: "VK", schemes: ["vk://", "https://vk.com"] },
  вк: { name: "VK", schemes: ["vk://", "https://vk.com"] },
  vk: { name: "VK", schemes: ["vk://", "https://vk.com"] },
  spotify: { name: "Spotify", schemes: ["spotify://", "https://open.spotify.com"] },
  спотифай: { name: "Spotify", schemes: ["spotify://", "https://open.spotify.com"] },
  фейсбук: { name: "Facebook", schemes: ["fb://", "https://facebook.com"] },
  facebook: { name: "Facebook", schemes: ["fb://", "https://facebook.com"] },
  галерея: { name: "Gallery", schemes: ["content://media/"] },
  gallery: { name: "Gallery", schemes: ["content://media/"] },
  фото: { name: "Gallery", schemes: ["content://media/"] },
  photos: { name: "Gallery", schemes: ["content://media/"] },
  файлы: { name: "Files", schemes: ["content://com.android.externalstorage.documents/"] },
  files: { name: "Files", schemes: ["content://com.android.externalstorage.documents/"] },
  часы: { name: "Clock", schemes: ["clock://"] },
  clock: { name: "Clock", schemes: ["clock://"] },
  будильник: { name: "Clock", schemes: ["clock://"] },
  alarm: { name: "Clock", schemes: ["clock://"] },
  контакты: { name: "Contacts", schemes: ["content://contacts/"] },
  contacts: { name: "Contacts", schemes: ["content://contacts/"] },
};

// Russian number words to digits
const RUSSIAN_NUMBERS: Record<string, string> = {
  ноль: "0",
  нуль: "0",
  один: "1",
  одна: "1",
  два: "2",
  две: "2",
  три: "3",
  четыре: "4",
  пять: "5",
  шесть: "6",
  семь: "7",
  восемь: "8",
  девять: "9",
  десять: "10",
  плюс: "+",
};

/**
 * Extract phone number from text (digits, spaces, dashes, plus)
 */
function extractPhoneNumber(text: string): string | null {
  let processed = text.toLowerCase();
  for (const [word, digit] of Object.entries(RUSSIAN_NUMBERS)) {
    processed = processed.replace(new RegExp(word, "gi"), digit);
  }
  const digits = processed.replace(/[^\d+]/g, "");
  if (digits.length >= 7) {
    return digits;
  }
  return null;
}

/**
 * Extract SMS message content
 */
function extractSmsMessage(text: string): {
  contactName: string | null;
  message: string | null;
} {
  const lower = text.toLowerCase();

  const messagePatterns = [
    /(?:текст|сообщение|message|text)[:\s]+(.+)/i,
    /(?:с текстом|с сообщением|with message|with text)[:\s]+(.+)/i,
    /(?:напиши|написать|write)[:\s]+(.+)/i,
  ];

  let message: string | null = null;
  for (const pattern of messagePatterns) {
    const match = text.match(pattern);
    if (match) {
      message = match[1].trim();
      break;
    }
  }

  const contactPrefixes = [
    "отправь смс ",
    "отправить смс ",
    "смс ",
    "sms ",
    "send sms to ",
    "text ",
    "message ",
    "написать ",
    "напиши ",
  ];

  let contactName: string | null = null;
  for (const prefix of contactPrefixes) {
    if (lower.includes(prefix)) {
      const afterPrefix = text
        .substring(lower.indexOf(prefix) + prefix.length)
        .trim();
      const name = afterPrefix.split(
        /[,]|\bтекст\b|\bсообщение\b|\bmessage\b|\btext\b|\bнапиши\b/i,
      )[0].trim();
      if (name.length > 0 && name.length < 50) {
        contactName = name;
        break;
      }
    }
  }

  return { contactName, message };
}

/**
 * Extract search query from voice command
 */
function extractSearchQuery(text: string): string | null {
  const patterns = [
    /(?:найди|найти|поищи|поиск|ищи|искать|search|find|look up|google)\s+(?:в интернете\s+|в сети\s+|в гугле\s+|в браузере\s+|online\s+|on google\s+)?(.+)/i,
    /(?:в интернете|в сети|в гугле|в браузере|online|on google)\s+(?:найди|найти|поищи|поиск|ищи|search|find)\s+(.+)/i,
    /(?:загугли|погугли|google)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Main command parser function
 */
export function parseCommand(transcript: string): ParsedCommand {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  // ===== HARDWARE CONTROL COMMANDS =====

  // Volume control
  if (/(?:громче|прибавь громкость|увеличь громкость|volume up|louder|turn up)/i.test(lower)) {
    return { type: "volume_up", rawText: text, confidence: 0.95 };
  }
  if (/(?:тише|убавь громкость|уменьши громкость|volume down|quieter|turn down)/i.test(lower)) {
    return { type: "volume_down", rawText: text, confidence: 0.95 };
  }
  if (/(?:без звука|выключи звук|mute|звук выключи|тихий режим|silent mode)/i.test(lower)) {
    return { type: "volume_mute", rawText: text, confidence: 0.95 };
  }
  if (/(?:максимальная громкость|громкость на максимум|max volume|full volume)/i.test(lower)) {
    return { type: "volume_max", rawText: text, confidence: 0.95 };
  }

  // Flashlight control
  if (/(?:включи фонарик|фонарик включи|фонарь включи|включи фонарь|flashlight on|turn on flashlight|torch on)/i.test(lower)) {
    return { type: "flashlight_on", rawText: text, confidence: 0.95 };
  }
  if (/(?:выключи фонарик|фонарик выключи|фонарь выключи|выключи фонарь|flashlight off|turn off flashlight|torch off)/i.test(lower)) {
    return { type: "flashlight_off", rawText: text, confidence: 0.95 };
  }

  // Wi-Fi control
  if (/(?:включи (?:вай[- ]?фай|wifi|wi-fi)|wifi on|turn on wifi|вай[- ]?фай включи|enable wifi)/i.test(lower)) {
    return { type: "wifi_on", rawText: text, confidence: 0.95 };
  }
  if (/(?:выключи (?:вай[- ]?фай|wifi|wi-fi)|wifi off|turn off wifi|вай[- ]?фай выключи|disable wifi)/i.test(lower)) {
    return { type: "wifi_off", rawText: text, confidence: 0.95 };
  }

  // Bluetooth control
  if (/(?:включи блютуз|включи bluetooth|bluetooth on|turn on bluetooth|блютуз включи|enable bluetooth)/i.test(lower)) {
    return { type: "bluetooth_on", rawText: text, confidence: 0.95 };
  }
  if (/(?:выключи блютуз|выключи bluetooth|bluetooth off|turn off bluetooth|блютуз выключи|disable bluetooth)/i.test(lower)) {
    return { type: "bluetooth_off", rawText: text, confidence: 0.95 };
  }

  // Brightness control
  if (/(?:ярче|увеличь яркость|прибавь яркость|brightness up|brighter)/i.test(lower)) {
    return { type: "brightness_up", rawText: text, confidence: 0.95 };
  }
  if (/(?:темнее|уменьши яркость|убавь яркость|brightness down|dimmer)/i.test(lower)) {
    return { type: "brightness_down", rawText: text, confidence: 0.95 };
  }
  if (/(?:максимальная яркость|яркость на максимум|max brightness|full brightness)/i.test(lower)) {
    return { type: "brightness_max", rawText: text, confidence: 0.95 };
  }
  if (/(?:минимальная яркость|яркость на минимум|min brightness|lowest brightness)/i.test(lower)) {
    return { type: "brightness_min", rawText: text, confidence: 0.95 };
  }

  // Camera
  if (/(?:открой камеру|камера|сфоткай|сделай фото|take photo|open camera|take a picture|selfie|селфи)/i.test(lower)) {
    return { type: "camera_open", rawText: text, confidence: 0.9 };
  }

  // Screenshot
  if (/(?:скриншот|снимок экрана|screenshot|screen capture|сделай скриншот|take screenshot)/i.test(lower)) {
    return { type: "screenshot", rawText: text, confidence: 0.95 };
  }

  // Music playback control
  if (/(?:играй|воспроизведи|play music|play|resume|продолжи воспроизведение|включи музыку)/i.test(lower) &&
      !lower.includes("открой") && !lower.includes("open")) {
    return { type: "music_play", rawText: text, confidence: 0.85 };
  }
  if (/(?:пауза|поставь на паузу|pause|pause music|останови музыку)/i.test(lower)) {
    return { type: "music_pause", rawText: text, confidence: 0.95 };
  }
  if (/(?:следующий трек|следующая песня|next track|next song|skip|дальше)/i.test(lower)) {
    return { type: "music_next", rawText: text, confidence: 0.95 };
  }
  if (/(?:предыдущий трек|предыдущая песня|previous track|previous song|назад|back)/i.test(lower) &&
      !lower.includes("перейди") && !lower.includes("go")) {
    return { type: "music_previous", rawText: text, confidence: 0.85 };
  }
  if (/(?:стоп|остановить музыку|stop music|stop playing)/i.test(lower)) {
    return { type: "music_stop", rawText: text, confidence: 0.9 };
  }

  // Screen lock
  if (/(?:заблокируй экран|заблокируй телефон|lock screen|lock phone)/i.test(lower)) {
    return { type: "screen_lock", rawText: text, confidence: 0.9 };
  }

  // Airplane mode
  if (/(?:включи режим полёта|включи авиарежим|airplane mode on|flight mode on)/i.test(lower)) {
    return { type: "airplane_mode_on", rawText: text, confidence: 0.9 };
  }
  if (/(?:выключи режим полёта|выключи авиарежим|airplane mode off|flight mode off)/i.test(lower)) {
    return { type: "airplane_mode_off", rawText: text, confidence: 0.9 };
  }

  // Do not disturb
  if (/(?:не беспокоить|включи не беспокоить|do not disturb on|dnd on|тихий час)/i.test(lower)) {
    return { type: "do_not_disturb_on", rawText: text, confidence: 0.9 };
  }
  if (/(?:выключи не беспокоить|do not disturb off|dnd off)/i.test(lower)) {
    return { type: "do_not_disturb_off", rawText: text, confidence: 0.9 };
  }

  // Timer
  if (/(?:поставь таймер|таймер на|set timer|timer for)/i.test(lower)) {
    const timeMatch = lower.match(/(\d+)\s*(?:минут|мин|секунд|сек|minutes?|min|seconds?|sec)/);
    return {
      type: "set_timer",
      value: timeMatch ? timeMatch[0] : null,
      rawText: text,
      confidence: 0.85,
    };
  }

  // Alarm
  if (/(?:поставь будильник|будильник на|set alarm|alarm for|разбуди меня)/i.test(lower)) {
    const timeMatch = lower.match(/(\d{1,2})[:\s]?(\d{2})?/);
    return {
      type: "set_alarm",
      value: timeMatch ? timeMatch[0] : null,
      rawText: text,
      confidence: 0.85,
    };
  }

  // ===== ORIGINAL COMMANDS =====

  // Settings
  if (/(?:открой настройки|настройки|open settings|settings)/i.test(lower)) {
    return { type: "open_settings", rawText: text, confidence: 0.9 };
  }

  // Open App commands
  const openAppPatterns = [
    /(?:открой|открыть|запусти|запустить|включи|включить|open|launch|start)\s+(.+)/i,
  ];

  for (const pattern of openAppPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const appQuery = match[1].trim().toLowerCase();
      for (const [key, app] of Object.entries(APP_MAPPINGS)) {
        if (appQuery.includes(key) || key.includes(appQuery)) {
          return {
            type: "open_app",
            appName: app.name,
            url: app.schemes[0],
            rawText: text,
            confidence: 0.9,
          };
        }
      }
      return {
        type: "open_app",
        appName: match[1].trim(),
        rawText: text,
        confidence: 0.6,
      };
    }
  }

  // SMS commands
  const smsPatterns = [
    /(?:отправь|отправить|пошли|послать|send)\s+(?:смс|sms|сообщение|message|текст|text)/i,
    /(?:смс|sms)\s+/i,
    /(?:напиши|написать|write)\s+(?:смс|sms|сообщение|message)/i,
  ];

  for (const pattern of smsPatterns) {
    if (pattern.test(lower)) {
      const { contactName, message } = extractSmsMessage(text);
      const phoneNumber = extractPhoneNumber(text);
      return {
        type: "send_sms",
        contactName,
        phoneNumber,
        message,
        rawText: text,
        confidence: 0.85,
      };
    }
  }

  // Call commands
  const callPatterns = [
    /(?:позвони|позвонить|звони|звонить|вызови|вызвать|call|ring|phone)\s+(.+)/i,
  ];

  for (const pattern of callPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const target = match[1].trim();
      const phoneNumber = extractPhoneNumber(target);
      if (phoneNumber) {
        return { type: "make_call", phoneNumber, rawText: text, confidence: 0.9 };
      }
      return { type: "make_call", contactName: target, rawText: text, confidence: 0.8 };
    }
  }

  // Dial Number commands
  const dialPatterns = [
    /(?:набери|набрать|dial|набери номер|dial number)\s+(.+)/i,
  ];

  for (const pattern of dialPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const phoneNumber = extractPhoneNumber(match[1]);
      if (phoneNumber) {
        return { type: "dial_number", phoneNumber, rawText: text, confidence: 0.9 };
      }
    }
  }

  // Web Search commands
  const searchQuery = extractSearchQuery(text);
  if (searchQuery) {
    return { type: "web_search", searchQuery, rawText: text, confidence: 0.85 };
  }

  // URL opening
  const urlPatterns = [
    /(?:открой|открыть|перейди|перейти|go to|open|visit)\s+(?:сайт|страницу|ссылку|url|site|page|link)\s+(.+)/i,
    /(?:зайди|зайти|go)\s+(?:на|to)\s+(.+)/i,
  ];

  for (const pattern of urlPatterns) {
    const match = lower.match(pattern);
    if (match) {
      let url = match[1].trim();
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      return { type: "open_url", url, rawText: text, confidence: 0.8 };
    }
  }

  // If there's a phone number in the text, assume dial
  const phoneInText = extractPhoneNumber(text);
  if (phoneInText) {
    return { type: "dial_number", phoneNumber: phoneInText, rawText: text, confidence: 0.6 };
  }

  // Unknown command
  return { type: "unknown", rawText: text, confidence: 0 };
}

/**
 * Get a human-readable description of the command (Russian)
 */
export function getCommandDescription(command: ParsedCommand): string {
  switch (command.type) {
    case "open_app":
      return `Открываю ${command.appName || "приложение"}`;
    case "send_sms":
      return `Отправляю SMS${command.contactName ? ` для ${command.contactName}` : ""}`;
    case "make_call":
      return `Звоню ${command.contactName || command.phoneNumber || ""}`;
    case "dial_number":
      return `Набираю номер ${command.phoneNumber || ""}`;
    case "web_search":
      return `Ищу в интернете: ${command.searchQuery || ""}`;
    case "open_url":
      return `Открываю ${command.url || "ссылку"}`;
    case "open_settings":
      return "Открываю настройки";
    case "volume_up":
      return "Увеличиваю громкость";
    case "volume_down":
      return "Уменьшаю громкость";
    case "volume_mute":
      return "Выключаю звук";
    case "volume_max":
      return "Громкость на максимум";
    case "flashlight_on":
      return "Включаю фонарик";
    case "flashlight_off":
      return "Выключаю фонарик";
    case "wifi_on":
      return "Включаю Wi-Fi";
    case "wifi_off":
      return "Выключаю Wi-Fi";
    case "bluetooth_on":
      return "Включаю Bluetooth";
    case "bluetooth_off":
      return "Выключаю Bluetooth";
    case "brightness_up":
      return "Увеличиваю яркость";
    case "brightness_down":
      return "Уменьшаю яркость";
    case "brightness_max":
      return "Яркость на максимум";
    case "brightness_min":
      return "Яркость на минимум";
    case "camera_open":
      return "Открываю камеру";
    case "screenshot":
      return "Делаю скриншот";
    case "music_play":
      return "Воспроизвожу музыку";
    case "music_pause":
      return "Ставлю на паузу";
    case "music_next":
      return "Следующий трек";
    case "music_previous":
      return "Предыдущий трек";
    case "music_stop":
      return "Останавливаю музыку";
    case "screen_lock":
      return "Блокирую экран";
    case "screen_unlock":
      return "Разблокирую экран";
    case "airplane_mode_on":
      return "Включаю режим полёта";
    case "airplane_mode_off":
      return "Выключаю режим полёта";
    case "do_not_disturb_on":
      return "Включаю режим «Не беспокоить»";
    case "do_not_disturb_off":
      return "Выключаю режим «Не беспокоить»";
    case "set_timer":
      return `Ставлю таймер${command.value ? ` на ${command.value}` : ""}`;
    case "set_alarm":
      return `Ставлю будильник${command.value ? ` на ${command.value}` : ""}`;
    default:
      return "Команда не распознана. Попробуйте ещё раз.";
  }
}

/**
 * Get the icon name for a command type
 */
export function getCommandIcon(type: CommandType): string {
  switch (type) {
    case "open_app":
      return "apps";
    case "send_sms":
      return "message";
    case "make_call":
      return "phone";
    case "dial_number":
      return "dialpad";
    case "web_search":
      return "search";
    case "open_url":
      return "language";
    case "open_settings":
      return "settings";
    case "volume_up":
    case "volume_max":
      return "volume-up";
    case "volume_down":
      return "volume-down";
    case "volume_mute":
      return "volume-off";
    case "flashlight_on":
    case "flashlight_off":
      return "flashlight-on";
    case "wifi_on":
    case "wifi_off":
      return "wifi";
    case "bluetooth_on":
    case "bluetooth_off":
      return "bluetooth";
    case "brightness_up":
    case "brightness_max":
      return "brightness-high";
    case "brightness_down":
    case "brightness_min":
      return "brightness-low";
    case "camera_open":
      return "camera-alt";
    case "screenshot":
      return "screenshot";
    case "music_play":
    case "music_pause":
    case "music_next":
    case "music_previous":
    case "music_stop":
      return "music-note";
    case "screen_lock":
    case "screen_unlock":
      return "lock";
    case "airplane_mode_on":
    case "airplane_mode_off":
      return "airplanemode-active";
    case "do_not_disturb_on":
    case "do_not_disturb_off":
      return "do-not-disturb";
    case "set_timer":
      return "timer";
    case "set_alarm":
      return "alarm";
    default:
      return "help-outline";
  }
}
