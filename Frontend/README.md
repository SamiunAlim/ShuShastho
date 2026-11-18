# ShuShastho Frontend

ShuShastho (সুস্বাস্থ্য) is a Bangla-first healthcare coordination app built with Expo, React Native, TypeScript, and Expo Router. It supports Bangla and English and is designed to work as a frontend demo without a backend.

## Quick start

From this `Frontend` folder, install dependencies and start the web app:

```bash
npm install
npm run web
```

Or start Expo and choose a target from the terminal:

```bash
npm start
```

## Commands

| Purpose | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Start Expo | `npm start` |
| Run on web | `npm run web` or `npx expo start --web` |
| Run on Android | `npm run android` |
| Run on iOS | `npm run ios` |
| Lint | `npm run lint` |
| Type-check | `npx tsc --noEmit` |
| Check Expo configuration and dependencies | `npx expo-doctor` |

Running on Android or iOS requires the corresponding device/emulator setup. To use the app on a physical device, start Expo with `npm start` and scan its QR code.

## What the app does

- **Patient experience:** home dashboard, doctor directory, appointment booking, live queue, records, prescription and medicine information, lab-report summary, and recovery check-in.
- **AI symptom guidance:** scripted demo responses for the symptom flow, with risk guidance and safety messaging. It does not diagnose or prescribe.
- **Emergency support:** emergency screen with a direct call action for Bangladesh's 999 service.
- **Healthcare staff demos:** doctor queue and consultation, receptionist front desk and walk-in flow, pharmacist requests, and hospital/super-admin dashboards.
- **Language and account flow:** splash screen with Bangla/English selection, mock phone/OTP sign-in, and a hidden demo role switcher (long-press the logo).

## Demo mode

No backend is required for the frontend demo. When `EXPO_PUBLIC_API_URL` is not set, the app uses fictional local data and mock AI/booking behavior from `src/services/mock.ts`.

The shared demo scenario features patient Rahim Uddin, Dr. Farhana Ahmed, Dhaka Medicare Hospital in Dhanmondi, serial #17, now serving #12, and a consultation fee of ৳800. Mock sign-in accepts any phone number and any six-digit OTP.

The API client for future backend integration is in `src/services/api.ts`.

## Project structure

- `src/app/` — Expo Router screens and route layouts
- `src/components/` — shared UI components
- `src/context/` — authentication, language, queue, and journey state
- `src/constants/` — colors, translations, and role definitions
- `src/services/` — API client and fictional demo data
- `src/utils/` — shared utilities
- `assets/fonts/` — app fonts

## Notes

- Keep route screens in `src/app/`; put reusable components and utilities outside that directory.
- This is a frontend demo. Availability, queue details, prices, and other demo content come from local mock data.
- AI symptom guidance is not a substitute for professional medical advice. Red-flag symptoms should show the emergency call action without delay.
