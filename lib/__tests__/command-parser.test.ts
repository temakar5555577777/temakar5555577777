import { describe, it, expect } from "vitest";
import { parseCommand, getCommandDescription, getCommandIcon } from "../command-parser";

describe("parseCommand", () => {
  // Open App commands
  describe("open_app commands", () => {
    it("should parse Russian 'открой YouTube'", () => {
      const result = parseCommand("открой ютуб");
      expect(result.type).toBe("open_app");
      expect(result.appName).toBe("YouTube");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should parse 'открой Телеграм'", () => {
      const result = parseCommand("открой телеграм");
      expect(result.type).toBe("open_app");
      expect(result.appName).toBe("Telegram");
    });

    it("should parse 'запусти WhatsApp'", () => {
      const result = parseCommand("запусти ватсап");
      expect(result.type).toBe("open_app");
      expect(result.appName).toBe("WhatsApp");
    });

    it("should parse English 'open Instagram'", () => {
      const result = parseCommand("open instagram");
      expect(result.type).toBe("open_app");
      expect(result.appName).toBe("Instagram");
    });

    it("should parse 'открой настройки' as open_settings", () => {
      const result = parseCommand("открой настройки");
      expect(result.type).toBe("open_settings");
    });
  });

  // SMS commands
  describe("send_sms commands", () => {
    it("should parse 'отправь SMS Ивану'", () => {
      const result = parseCommand("отправь смс Ивану текст буду через 10 минут");
      expect(result.type).toBe("send_sms");
      expect(result.contactName).toBeTruthy();
      expect(result.message).toBeTruthy();
    });

    it("should parse 'send sms'", () => {
      const result = parseCommand("send sms to John message hello");
      expect(result.type).toBe("send_sms");
    });
  });

  // Call commands
  describe("make_call commands", () => {
    it("should parse 'позвони маме'", () => {
      const result = parseCommand("позвони маме");
      expect(result.type).toBe("make_call");
      expect(result.contactName).toBe("маме");
    });

    it("should parse 'call with phone number'", () => {
      const result = parseCommand("позвони 89001234567");
      expect(result.type).toBe("make_call");
      expect(result.phoneNumber).toBe("89001234567");
    });

    it("should parse English 'call John'", () => {
      const result = parseCommand("call John");
      expect(result.type).toBe("make_call");
      expect(result.contactName).toBe("john");
    });
  });

  // Dial commands
  describe("dial_number commands", () => {
    it("should parse 'набери номер'", () => {
      const result = parseCommand("набери номер 8 900 123 45 67");
      expect(result.type).toBe("dial_number");
      expect(result.phoneNumber).toBe("89001234567");
    });
  });

  // Web search commands
  describe("web_search commands", () => {
    it("should parse 'найди в интернете'", () => {
      const result = parseCommand("найди в интернете рецепт борща");
      expect(result.type).toBe("web_search");
      expect(result.searchQuery).toContain("рецепт борща");
    });

    it("should parse 'погугли'", () => {
      const result = parseCommand("погугли погоду в Москве");
      expect(result.type).toBe("web_search");
      expect(result.searchQuery).toContain("погоду в Москве");
    });

    it("should parse English 'search for'", () => {
      const result = parseCommand("search best restaurants nearby");
      expect(result.type).toBe("web_search");
      expect(result.searchQuery).toBeTruthy();
    });
  });

  // Volume commands
  describe("volume commands", () => {
    it("should parse 'громче'", () => {
      const result = parseCommand("громче");
      expect(result.type).toBe("volume_up");
    });

    it("should parse 'тише'", () => {
      const result = parseCommand("тише");
      expect(result.type).toBe("volume_down");
    });

    it("should parse 'увеличь громкость'", () => {
      const result = parseCommand("увеличь громкость");
      expect(result.type).toBe("volume_up");
    });

    it("should parse 'уменьши громкость'", () => {
      const result = parseCommand("уменьши громкость");
      expect(result.type).toBe("volume_down");
    });

    it("should parse 'volume up'", () => {
      const result = parseCommand("volume up");
      expect(result.type).toBe("volume_up");
    });

    it("should parse 'без звука'", () => {
      const result = parseCommand("без звука");
      expect(result.type).toBe("volume_mute");
    });
  });

  // Flashlight commands
  describe("flashlight commands", () => {
    it("should parse 'включи фонарик'", () => {
      const result = parseCommand("включи фонарик");
      expect(result.type).toBe("flashlight_on");
    });

    it("should parse 'выключи фонарик'", () => {
      const result = parseCommand("выключи фонарик");
      expect(result.type).toBe("flashlight_off");
    });

    it("should parse 'flashlight on'", () => {
      const result = parseCommand("flashlight on");
      expect(result.type).toBe("flashlight_on");
    });
  });

  // Wi-Fi commands
  describe("wifi commands", () => {
    it("should parse 'включи вай фай'", () => {
      const result = parseCommand("включи вай фай");
      expect(result.type).toBe("wifi_on");
    });

    it("should parse 'выключи wifi'", () => {
      const result = parseCommand("выключи wifi");
      expect(result.type).toBe("wifi_off");
    });
  });

  // Bluetooth commands
  describe("bluetooth commands", () => {
    it("should parse 'включи блютуз'", () => {
      const result = parseCommand("включи блютуз");
      expect(result.type).toBe("bluetooth_on");
    });

    it("should parse 'выключи bluetooth'", () => {
      const result = parseCommand("выключи bluetooth");
      expect(result.type).toBe("bluetooth_off");
    });
  });

  // Brightness commands
  describe("brightness commands", () => {
    it("should parse 'ярче'", () => {
      const result = parseCommand("ярче");
      expect(result.type).toBe("brightness_up");
    });

    it("should parse 'темнее'", () => {
      const result = parseCommand("темнее");
      expect(result.type).toBe("brightness_down");
    });

    it("should parse 'увеличь яркость'", () => {
      const result = parseCommand("увеличь яркость");
      expect(result.type).toBe("brightness_up");
    });
  });

  // Camera
  describe("camera commands", () => {
    it("should parse 'открой камеру'", () => {
      const result = parseCommand("открой камеру");
      expect(result.type).toBe("camera_open");
    });

    it("should parse 'сфоткай'", () => {
      const result = parseCommand("сфоткай");
      expect(result.type).toBe("camera_open");
    });
  });

  // Screenshot
  describe("screenshot commands", () => {
    it("should parse 'сделай скриншот'", () => {
      const result = parseCommand("сделай скриншот");
      expect(result.type).toBe("screenshot");
    });
  });

  // Media control
  describe("media commands", () => {
    it("should parse 'следующий трек'", () => {
      const result = parseCommand("следующий трек");
      expect(result.type).toBe("music_next");
    });

    it("should parse 'предыдущий трек'", () => {
      const result = parseCommand("предыдущий трек");
      expect(result.type).toBe("music_previous");
    });

    it("should parse 'пауза'", () => {
      const result = parseCommand("пауза");
      expect(result.type).toBe("music_pause");
    });

    it("should parse 'воспроизведи'", () => {
      const result = parseCommand("воспроизведи");
      expect(result.type).toBe("music_play");
    });
  });

  // Airplane mode
  describe("airplane mode commands", () => {
    it("should parse 'включи режим полёта'", () => {
      const result = parseCommand("включи режим полёта");
      expect(result.type).toBe("airplane_mode_on");
    });

    it("should parse 'выключи авиарежим'", () => {
      const result = parseCommand("выключи авиарежим");
      expect(result.type).toBe("airplane_mode_off");
    });
  });

  // Do not disturb
  describe("dnd commands", () => {
    it("should parse 'не беспокоить'", () => {
      const result = parseCommand("не беспокоить");
      expect(result.type).toBe("do_not_disturb_on");
    });

    it("should parse 'включи не беспокоить'", () => {
      const result = parseCommand("включи не беспокоить");
      expect(result.type).toBe("do_not_disturb_on");
    });
  });

  // Timer
  describe("timer commands", () => {
    it("should parse 'поставь таймер на 5 минут'", () => {
      const result = parseCommand("поставь таймер на 5 минут");
      expect(result.type).toBe("set_timer");
      expect(result.value).toContain("5");
    });

    it("should parse 'таймер на 10 минут'", () => {
      const result = parseCommand("таймер на 10 минут");
      expect(result.type).toBe("set_timer");
      expect(result.value).toContain("10");
    });
  });

  // Alarm
  describe("alarm commands", () => {
    it("should parse 'поставь будильник на 7 утра'", () => {
      const result = parseCommand("поставь будильник на 7 утра");
      expect(result.type).toBe("set_alarm");
      expect(result.value).toBeTruthy();
    });
  });

  // Settings
  describe("settings commands", () => {
    it("should parse 'открой настройки'", () => {
      const result = parseCommand("открой настройки");
      expect(result.type).toBe("open_settings");
    });
  });

  // Unknown commands
  describe("unknown commands", () => {
    it("should return unknown for unrecognized text", () => {
      const result = parseCommand("привет как дела");
      expect(result.type).toBe("unknown");
      expect(result.confidence).toBe(0);
    });
  });
});

describe("getCommandDescription", () => {
  it("should return description for open_app", () => {
    const desc = getCommandDescription({
      type: "open_app",
      appName: "YouTube",
      rawText: "открой ютуб",
      confidence: 0.9,
    });
    expect(desc).toContain("YouTube");
  });

  it("should return description for unknown", () => {
    const desc = getCommandDescription({
      type: "unknown",
      rawText: "test",
      confidence: 0,
    });
    expect(desc).toContain("не распознана");
  });
});

describe("getCommandIcon", () => {
  it("should return correct icons for command types", () => {
    expect(getCommandIcon("open_app")).toBe("apps");
    expect(getCommandIcon("send_sms")).toBe("message");
    expect(getCommandIcon("make_call")).toBe("phone");
    expect(getCommandIcon("web_search")).toBe("search");
    expect(getCommandIcon("volume_up")).toBe("volume-up");
    expect(getCommandIcon("flashlight_on")).toBe("flashlight-on");
    expect(getCommandIcon("bluetooth_on")).toBe("bluetooth");
    expect(getCommandIcon("unknown")).toBe("help-outline");
  });
});
