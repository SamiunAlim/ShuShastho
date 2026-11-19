// Native (Expo Go): record up to 15 s with expo-audio, then transcribe via the backend.
import {
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio } from '../services/api';
import type { Language } from '../constants/i18n';

export type VoiceState = 'idle' | 'listening' | 'transcribing';
export type VoiceError = 'permission' | 'failed' | null;

const MAX_SECONDS = 15;

function mimeFromUri(uri: string) {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'mp3') return 'audio/mp3';
  if (ext === '3gp') return 'audio/3gpp';
  if (ext === 'webm') return 'audio/webm';
  return 'audio/mp4';
}

async function readBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export function useVoiceInput(language: Language, onText: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<VoiceError>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);

  const finish = useCallback(async () => {
    if (!active.current) return;
    active.current = false;
    if (timer.current) clearTimeout(timer.current);
    setState('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('no audio');
      const { text } = await transcribeAudio({
        audioBase64: await readBase64(uri),
        mimeType: mimeFromUri(uri),
        language,
      });
      if (!text.trim()) throw new Error('empty');
      onText(text.trim());
    } catch {
      setError('failed');
    } finally {
      setState('idle');
    }
  }, [language, onText, recorder]);

  const toggle = useCallback(async () => {
    if (state === 'transcribing') return;
    if (state === 'listening') {
      await finish();
      return;
    }
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('permission');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_SECONDS });
      active.current = true;
      setState('listening');
      timer.current = setTimeout(() => { void finish(); }, MAX_SECONDS * 1000);
    } catch {
      setError('failed');
      setState('idle');
    }
  }, [finish, recorder, state]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { supported: true, state, error, toggle };
}
