# ShuShastho (সুস্বাস্থ্য) — React Native app

Bangla-first healthcare coordination app (the buildable core of "HealthSphere").
Also read AGENTS.md (Expo rules: use `npx expo install`, check versioned docs, run lint + typecheck).

## DEADLINE: competition Friday 20 Nov — FRONTEND ONLY
- No backend for the demo. When `EXPO_PUBLIC_API_URL` is not set, use **demo mode** with mock data from `src/services/mock.ts`. Keep the real API code in `src/services/api.ts` for later.
- One consistent demo story everywhere (same as Figma): patient **Rahim Uddin**, doctor **Dr. Farhana Ahmed** (Medicine), **Dhaka Medicare Hospital, Dhanmondi**, serial **#17**, now serving **#12**, fee **৳800**.
- AI chat in demo mode = scripted replies (fever 3 days + rash → asks temperature → Medium risk, consider dengue/viral fever, CBC + NS1, Medicine specialist, source DGHS dengue guideline).
- Live queue = `setInterval` that advances "now serving" every ~8 s until it reaches the patient's serial.
- Hidden **demo role switcher** (long-press the logo) to jump between Patient / Receptionist / Doctor without logging in again.
- Priority is the demo flow working smoothly in Bangla AND English. No extra libraries unless needed. Skip: profile setup, pharmacy, walk-in, admin web.

## Existing project (keep this structure — don't recreate)
- Expo SDK from package.json, **Expo Router**, routes in `src/app/`, TypeScript strict.
- `src/app/_layout.tsx` (Stack + LanguageProvider + font), `src/app/(tabs)/` (index=Home, doctors, serials, records, profile), `src/app/assistant.tsx`, `booking.tsx`, `emergency.tsx`.
- `src/components/ui.tsx` (AppScreen, AppText, Card, ActionButton, BrandHeader, PageTitle, SectionTitle, DemoNotice, Field).
- `src/context/LanguageContext.tsx` (language, toggleLanguage, t) + `src/constants/i18n.ts` (messages.en / messages.bn — keep keys in both).
- `src/constants/colors.ts`, `src/services/api.ts`, font `assets/fonts/PurnoPran-Regular.ttf`.

## Known bugs to fix FIRST
1. AI assistant and booking fail without a backend → add demo mode (above).
2. Unicode symbol icons (⌂ ✚ ▤ ▣ ◉ › ‹ ★ ✓ ● ⓘ ◷ ✦ ⌖ ♧ ＋ •) are NOT in the PurnoPran font → replace with `@expo/vector-icons` (Ionicons/MaterialCommunityIcons; ships with Expo).
3. Emergency screen must call `tel:999` immediately — remove the Alert confirm (it delays the call and does nothing on web).
4. Booking dates are hard-coded 17–19 Nov → compute today / tomorrow / day after from `new Date()`.
5. Default language should be **Bangla** (`bn`), and remember the choice (expo-secure-store or AsyncStorage via `npx expo install`).
6. Hard-coded English strings (e.g. "Find verified care near you", "doctors · Dhaka", "consultation", "YOUR SERIAL", "SHUSHASTHO AI", "Language", "Medicine Specialist · Dhaka Medical Centre") → move to i18n.
7. PurnoPran has only Regular weight → don't rely on fontWeight for Bangla; consider switching to **Hind Siliguri** (`npx expo install @expo-google-fonts/hind-siliguri`, open licence) — PurnoPran says "All Rights Reserved", check its licence.
8. AI welcome message doesn't update when language changes → derive it from `t()` at render.
9. Booking success should navigate to the live queue (serials) instead of staying on the page.
10. Live queue is static and marks "Waiting" as done → animate with the timer, correct step states.

## Demo screens still to build (in this order)
1. Prescription & medicine (Rx list + 3 pharmacies with stock & price + Reserve) — Figma 11:447
2. Health timeline (the whole journey in one list: AI check → visit → Rx → medicine → report → check-in → follow-up) — Figma 29:616 (put in Records tab)
3. Report & AI summary (simple-language summary, results table Low/Normal, compare with last report, Share with doctor) — Figma 29:859
4. Recovery check-in (Better/Same/Worse, temperature, symptom checklist, red-flag → alert card with "Book today" + 999) — Figma 29:1027
5. Splash & language choice — Figma 5:158 · Login + OTP (mock, any 6 digits) — Figma 5:255, 5:521
6. Receptionist front desk (scan QR mock, check-in list, no-show/restore) — Figma 2:1084
7. Doctor today (queue, AI pre-visit summary, Call next) — Figma 2:907 · Consultation & e-Rx — Figma 11:266

## Design tokens (from Figma)
```
green #006A4E · green2 #2E9A74 · mint #F0F9F4 · mint2 #DDF1E7 · mint3 #C3E6D4
red #E63946 · redSoft #FDE7EA · yellow #FFF3D1 · yellowText #8A5A00
blue #E4EEFA · blueText #1F4E8C · pink #FBE4EE · pinkText #8C2F5A
grey #EEF1F0 · ink #1E2B27 · muted #61706B · line #DCE8E2 · bg #F7FCF9 · white #FFFFFF
radius: card 16, button 12, chip 20, header bottom corners 24 · screen padding 16 · gap 10–12
```
- Pastel + white, Bangladeshi feel: header in mint2 with rounded bottom corners and a faint **alpana** motif (concentric circles + 8 petals + dots, green, ~12% opacity, react-native-svg); faint big alpana behind screen background (~5%).
- **Kantha card**: white card with dashed green2 border (1.5px) for the main highlighted card (AI card, live queue card, AI summary).
- Logo: green rounded square + red circle (flag) + white plus; wordmark "সুস্বাস্থ্য" / "ShuShastho".
- Bangla mode: Bangla main line + small grey English line under key labels; English mode: English only. Bangla digits (০-৯) in Bangla mode via a `formatNum()` helper.

## Safety rules (keep)
- AI never prescribes or confirms a diagnosis: "possible conditions to consider".
- Every AI answer shows "এটি ডাক্তারের পরামর্শের বিকল্প নয় · Not a substitute for a doctor".
- Red-flag symptoms → show the 999 button immediately; nothing may delay calling 999.
- Doctors, availability, stock and prices come from mock/API data, never from AI text.

## Figma
File https://www.figma.com/design/8lvY9YpQyVmrZyfG9XeMNP (fileKey `8lvY9YpQyVmrZyfG9XeMNP`).
Free plan with a small monthly limit — only call Figma for a NEW screen, one call per screen, never re-fetch. Otherwise use the tokens above or screenshots the user provides.
Other node IDs: Home 2:50 · AI 2:262 · Doctors 2:401 · Booking 2:605 · Live queue 2:758 · SOS 11:604 · Staff login 5:383. English versions are in the "English mode" section.

## Working rules
- Plan first, then change. Small steps, one screen at a time.
- After each task: `npx tsc --noEmit` and `npx expo lint`, fix errors.
- Fictional demo data only.
