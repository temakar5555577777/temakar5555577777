# Voice Control App - Design Document

## App Concept
A hands-free voice control assistant for Android that listens for voice commands and executes phone actions: opening apps, sending SMS, making/answering calls, browsing the web, dialing numbers, and more. The app features a futuristic, always-listening interface with visual audio feedback.

---

## Screen List

### 1. Home Screen (Main Voice Assistant)
The primary and most important screen. Shows a large animated microphone button at center, a real-time voice waveform/pulse animation, the recognized transcript text, and the assistant's response. This is where all voice interaction happens.

### 2. Command History Screen
A scrollable log of past voice commands and their results. Each entry shows the command text, the action taken, timestamp, and success/failure status.

### 3. Settings Screen
Configuration options: language selection (Russian/English), speech rate, voice pitch, wake word toggle, keep-screen-awake toggle, and permissions status overview.

---

## Primary Content and Functionality

### Home Screen
- **Microphone Button**: Large circular button (center) that pulses when listening. Tap to start/stop listening.
- **Status Indicator**: Text showing current state — "Ready", "Listening...", "Processing...", "Done"
- **Transcript Display**: Shows what the user said in real-time (interim results)
- **Response Area**: Shows the assistant's text response and action confirmation
- **Quick Action Bar**: Bottom row of 4 icon buttons for manual quick actions (Call, SMS, Browser, Apps)

### Command History Screen
- FlatList of command entries
- Each entry: icon (action type), command text, result text, timestamp
- Pull-to-refresh, clear history button

### Settings Screen
- Language picker (Russian, English)
- Speech rate slider (0.5x - 2.0x)
- Voice pitch slider
- Toggle: Keep screen awake while listening
- Toggle: Continuous listening mode
- Permissions status cards (Microphone, Speech Recognition, Contacts, SMS)

---

## Key User Flows

### Flow 1: Voice Command Execution
1. User opens app → Home screen with "Tap to start" state
2. User taps microphone button → Listening state activates, pulse animation starts
3. User speaks command (e.g., "Позвони маме") → Transcript appears in real-time
4. Recognition ends → App parses command → Executes action (opens dialer with mom's number)
5. TTS confirms: "Звоню маме" → Status returns to Ready

### Flow 2: Send SMS by Voice
1. User says "Отправь SMS Ивану, текст: буду через 10 минут"
2. App parses: recipient = "Иван", message = "буду через 10 минут"
3. App looks up "Иван" in contacts → finds phone number
4. Opens SMS composer with pre-filled number and message
5. TTS confirms: "Открываю SMS для Ивана"

### Flow 3: Open App by Voice
1. User says "Открой YouTube"
2. App matches "YouTube" to known app schemes
3. Opens YouTube via Linking.openURL
4. TTS confirms: "Открываю YouTube"

### Flow 4: Web Search by Voice
1. User says "Найди в интернете рецепт борща"
2. App extracts search query: "рецепт борща"
3. Opens browser with Google search URL
4. TTS confirms: "Ищу в интернете: рецепт борща"

### Flow 5: Dial Phone Number
1. User says "Набери номер 8 900 123 45 67"
2. App extracts digits from speech
3. Opens phone dialer with the number
4. TTS confirms: "Набираю номер"

---

## Color Choices

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| primary | #6C5CE7 | #A29BFE | Main accent — purple, futuristic feel |
| background | #F8F9FA | #0D1117 | Screen backgrounds |
| surface | #FFFFFF | #161B22 | Cards and elevated surfaces |
| foreground | #1A1A2E | #E6EDF3 | Primary text |
| muted | #6B7280 | #8B949E | Secondary text |
| border | #E5E7EB | #30363D | Dividers |
| success | #10B981 | #34D399 | Success states, confirmed actions |
| warning | #F59E0B | #FBBF24 | Warnings |
| error | #EF4444 | #F87171 | Errors, failed commands |
| accent | #00D2FF | #00D2FF | Microphone glow, listening state |

---

## Typography
- Title: 28px bold
- Subtitle: 18px semibold
- Body: 16px regular
- Caption: 13px regular, muted color

## Interaction Patterns
- Microphone button: Scale 0.95 on press + haptic feedback (Medium)
- Listening state: Pulsing glow animation around mic button
- Command cards: Opacity 0.7 on press
- Quick action buttons: Scale 0.97 + haptic (Light)
