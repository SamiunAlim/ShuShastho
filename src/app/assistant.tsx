import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, Card, DemoNotice, Field, ScreenHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { useVoiceInput } from '../hooks/useVoiceInput';
import colors from '../constants/colors';
import { ApiError, isBackendConfigured, RiskLevel, sendSymptomMessage } from '../services/api';
import { setOffline, useOffline } from '../services/connection';
import { delay, matchDepartment, mockAssistantReply } from '../services/mock';
import { TranslationKey } from '../constants/i18n';
import { call999 } from '../utils/emergency';
import { goBack } from '../utils/navigation';

// Assistant messages hold translation keys (demo) or literal text (backend), so a language
// switch re-translates scripted replies instead of leaving stale text.
type Message = {
  id: string;
  role: 'assistant' | 'user';
  text?: string;
  textKey?: TranslationKey;
  risk?: RiskLevel;
  requiresUrgentCare?: boolean;
  specialty?: string;
  specialtyKey?: TranslationKey;
  sources?: { title?: string; titleKey?: TranslationKey; url?: string }[];
};

const RISK_KEYS: Record<RiskLevel, TranslationKey> = {
  low: 'riskLow',
  moderate: 'riskModerate',
  high: 'riskHigh',
  emergency: 'riskEmergency',
};

export default function AssistantScreen() {
  const { language, t, L } = useLanguage();
  const reactId = useId();
  const [conversationId, setConversationId] = useState(`triage-${reactId}`);
  const [input, setInput] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offline = useOffline();
  const connected = isBackendConfigured() && !offline;
  // In demo mode nothing leaves the device, so consent is only needed with a real backend.
  const consentOk = !connected || consentGiven;
  const onVoiceText = useCallback((text: string) => setInput((current) => (current ? `${current} ${text}` : text)), []);
  const voice = useVoiceInput(language, onVoiceText);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, sending, error]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || sending || !consentOk) return;
    const userMessageCount = messages.filter((item) => item.role === 'user').length + 1;
    setInput('');
    setError('');
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', text: message }]);
    setSending(true);

    try {
      let live: Awaited<ReturnType<typeof sendSymptomMessage>> | null = null;
      if (connected) {
        try {
          live = await sendSymptomMessage({ conversationId, message, language });
          setOffline(false);
        } catch {
          // Backend failed: fall back to the scripted demo reply.
          setOffline(true);
        }
      }
      if (!live) {
        await delay(900);
        const reply = mockAssistantReply(message, userMessageCount);
        setMessages((current) => [
          ...current,
          {
            id: `${Date.now()}-assistant`,
            role: 'assistant',
            textKey: reply.textKey,
            risk: reply.risk,
            requiresUrgentCare: reply.requiresUrgentCare,
            specialtyKey: reply.specialtyKey,
            sources: reply.sourceKeys?.map((titleKey) => ({ titleKey })),
          },
        ]);
        return;
      }

      const reply = live;
      setConversationId(reply.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: reply.reply,
          risk: reply.riskLevel,
          requiresUrgentCare: reply.requiresUrgentCare,
          specialty: reply.suggestedSpecialty,
          sources: reply.sources,
        },
      ]);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : t('connectionError'));
    } finally {
      setSending(false);
    }
  }

  return (
    <AppScreen
      scroll={false}
      header={
        <ScreenHeader title={L('assistantTitle')} onBack={() => goBack('/(tabs)')}>
          <BiText text={L('assistantDescription')} style={styles.headerSubtitle} />
        </ScreenHeader>
      }
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <View style={styles.titleWrap}>
          <Card style={styles.disclaimer}>
            <View style={styles.disclaimerRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.yellowText} />
              <AppText style={styles.disclaimerText}>{t('aiDisclaimer')}</AppText>
            </View>
          </Card>
          {!connected && <DemoNotice compact />}
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        >
          {/* Derived from t() at render so it follows the selected language. */}
          <ChatBubble message={{ id: 'welcome', role: 'assistant', textKey: 'assistantWelcome' }} />
          {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
          {sending && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.brand} />
              <AppText style={styles.loadingText}>{t('secureResponse')}</AppText>
            </View>
          )}
          {error ? <Card style={styles.errorCard}><AppText style={styles.errorText}>{error}</AppText></Card> : null}
        </ScrollView>
        <View style={styles.composer}>
          {voice.state !== 'idle' && (
            <View style={styles.voiceStatus}>
              <PulseDot />
              {voice.state === 'listening'
                ? <BiText text={L('listening')} style={styles.voiceStatusText} />
                : <AppText style={styles.voiceStatusText}>{t('transcribing')}</AppText>}
            </View>
          )}
          {voice.error ? (
            voice.error === 'permission'
              ? <AppText style={styles.voiceError}>{t('micPermission')}</AppText>
              : <BiText text={L('micRetry')} style={styles.voiceError} />
          ) : null}
          <View style={styles.inputRow}>
            <View style={styles.inputFlex}>
              <Field value={input} onChangeText={setInput} placeholder={t('messagePlaceholder')} />
            </View>
            {voice.supported && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={voice.state === 'listening' ? t('micStop') : t('micStart')}
                onPress={() => { void voice.toggle(); }}
                disabled={voice.state === 'transcribing'}
                style={[styles.micButton, voice.state === 'listening' && styles.micButtonActive]}
              >
                <Ionicons
                  name={voice.state === 'listening' ? 'stop' : 'mic'}
                  size={22}
                  color={voice.state === 'listening' ? colors.surface : colors.brand}
                />
              </Pressable>
            )}
          </View>
          {connected && (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentGiven }}
              onPress={() => setConsentGiven((current) => !current)}
              style={styles.consentRow}
            >
              <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
                {consentGiven ? <Ionicons name="checkmark" size={13} color={colors.surface} /> : null}
              </View>
              <AppText style={styles.consentText}>{t('aiConsent')}</AppText>
            </Pressable>
          )}
          <ActionButton label={sending ? '…' : t('send')} onPress={sendMessage} disabled={sending || !input.trim() || !consentOk} />
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

function PulseDot() {
  const [pulse] = useState(() => new Animated.Value(0.3));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />;
}

function SpeakButton({ text }: { text: string }) {
  const { language, t } = useLanguage();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { Speech.stop(); }, []);

  function toggle() {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      language: language === 'bn' ? 'bn-BD' : 'en-US',
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={speaking ? t('stopSpeaking') : t('speakReply')}
      onPress={toggle}
      style={styles.speakButton}
    >
      <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-high-outline'} size={18} color={colors.brand} />
      <AppText style={styles.speakText}>{speaking ? t('stopSpeaking') : t('speakReply')}</AppText>
    </Pressable>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const { t } = useLanguage();
  const isAssistant = message.role === 'assistant';
  const text = message.textKey ? t(message.textKey) : message.text;
  const isEmergency = message.risk === 'emergency' || message.requiresUrgentCare;
  const specialty = message.specialtyKey ? t(message.specialtyKey) : message.specialty;
  const showBooking = Boolean(message.specialtyKey) && !isEmergency;

  return (
    <View style={[styles.messageRow, !isAssistant && styles.userRow]}>
      <View style={[styles.bubble, isAssistant ? styles.assistantBubble : styles.userBubble]}>
        {!isAssistant && <AppText style={styles.youLabel}>{t('you')}</AppText>}
        {message.risk ? (
          <AppText style={[styles.riskLabel, isEmergency && styles.riskEmergency]}>{t(RISK_KEYS[message.risk])}</AppText>
        ) : null}
        <AppText style={[styles.messageText, !isAssistant && styles.userMessageText]}>{text}</AppText>
        {isEmergency || message.risk === 'high' ? (
          <View style={styles.urgentBox}><AppText style={styles.urgentText}>{t('urgentGuidance')}</AppText></View>
        ) : null}
        {isEmergency ? (
          // Shown straight away on a red flag; the press dials with no confirmation step.
          <ActionButton label={t('call999')} onPress={() => call999()} variant="danger" />
        ) : null}
        {specialty ? <AppText style={styles.specialty}>{t('specialistRecommendation')}: {specialty}</AppText> : null}
        {message.sources?.length ? (
          <View style={styles.sources}>
            <AppText style={styles.sourcesTitle}>{t('sources')}</AppText>
            {message.sources.map((source, index) => (
              <AppText key={`${source.titleKey ?? source.title}-${index}`} style={styles.source}>
                {source.titleKey ? t(source.titleKey) : source.title}
              </AppText>
            ))}
          </View>
        ) : null}
        {showBooking ? (
          <ActionButton
            label={t('bookSpecialist')}
            onPress={() => router.push({ pathname: '/booking', params: { department: matchDepartment(specialty) ?? '' } })}
            variant="secondary"
          />
        ) : null}
        {isAssistant && text ? <SpeakButton text={text} /> : null}
        {isAssistant && message.id !== 'welcome' ? (
          <AppText style={styles.notSubstitute}>{t('notSubstitute')}</AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  headerSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  titleWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 12, paddingBottom: 12 },
  disclaimer: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.yellow, borderColor: colors.yellow },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclaimerText: { color: colors.yellowText, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  chat: { flex: 1, paddingHorizontal: 16 },
  messageList: { gap: 14, paddingVertical: 8 },
  messageRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '90%', borderRadius: 16, padding: 14, gap: 8 },
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 5 },
  userBubble: { backgroundColor: colors.brand, borderTopRightRadius: 5 },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 23 },
  userMessageText: { color: colors.surface },
  youLabel: { color: '#C6E8D9', fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  riskLabel: { color: colors.yellowText, backgroundColor: colors.yellow, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  riskEmergency: { color: colors.danger, backgroundColor: colors.redSoft },
  urgentBox: { backgroundColor: colors.redSoft, borderRadius: 10, padding: 10 },
  urgentText: { color: '#A73D47', fontSize: 12, lineHeight: 19, fontWeight: '600' },
  sources: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 4 },
  sourcesTitle: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  source: { color: colors.brand, fontSize: 12, lineHeight: 18 },
  specialty: { color: colors.brand, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  notSubstitute: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  loadingText: { color: colors.muted, fontSize: 12 },
  errorCard: { backgroundColor: colors.yellow, borderColor: colors.yellow, padding: 11 },
  errorText: { color: colors.yellowText, fontSize: 12, lineHeight: 18 },
  composer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: colors.canvas },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputFlex: { flex: 1 },
  micButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  micButtonActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  voiceStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceStatusText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  voiceError: { color: colors.yellowText, fontSize: 12, lineHeight: 18 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  speakButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 2 },
  speakText: { color: colors.brand, fontSize: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  consentText: { color: colors.muted, fontSize: 11, lineHeight: 16, flex: 1 },
});
