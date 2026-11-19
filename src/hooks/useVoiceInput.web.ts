// Web: browser SpeechRecognition (bn-BD / en-US). The button is hidden when unsupported.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../constants/i18n';
import type { VoiceError, VoiceState } from './useVoiceInput';

type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  const scope = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

export function useVoiceInput(language: Language, onText: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<VoiceError>(null);
  const recognition = useRef<Recognition | null>(null);
  const supported = Boolean(getCtor());

  const toggle = useCallback(async () => {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ').trim();
      if (text) onText(text);
    };
    rec.onerror = (event) => {
      setError(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'permission' : 'failed');
    };
    rec.onend = () => {
      recognition.current = null;
      setState('idle');
    };
    recognition.current = rec;
    try {
      rec.start();
      setState('listening');
    } catch {
      recognition.current = null;
      setError('failed');
    }
  }, [language, onText]);

  useEffect(() => () => recognition.current?.stop(), []);

  return { supported, state, error, toggle };
}
