import { router } from 'expo-router';
import React, { useId, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActionButton, AppScreen, AppText, BrandHeader, Card, DemoNotice, Field, PageTitle } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';
import { ApiError, isBackendConfigured, RiskLevel, sendSymptomMessage } from '../services/api';
import { TranslationKey } from '../constants/i18n';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  risk?: RiskLevel;
  requiresUrgentCare?: boolean;
  suggestedSpecialty?: string;
  sources?: { title: string; url?: string }[];
};

export default function AssistantScreen() {
  const { language, t } = useLanguage();
  const reactId = useId();
  const [conversationId, setConversationId] = useState(`triage-${reactId}`);
  const [input, setInput] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: t('assistantWelcome') },
  ]);
  const connected = isBackendConfigured();

  async function sendMessage() {
    const message = input.trim();
    if (!message || sending || !consentGiven) return;
    setInput('');
    setError('');
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', text: message }]);
    if (!connected) {
      setError(t('backendUnavailable'));
      return;
    }

    setSending(true);
    try {
      const reply = await sendSymptomMessage({ conversationId, message, language });
      setConversationId(reply.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: reply.reply,
          risk: reply.riskLevel,
          requiresUrgentCare: reply.requiresUrgentCare,
          suggestedSpecialty: reply.suggestedSpecialty,
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
    <AppScreen scroll={false}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
            <AppText style={styles.backText}>‹</AppText>
          </Pressable>
          <View style={{ flex: 1 }}><BrandHeader showLanguage /></View>
        </View>
        <View style={styles.titleWrap}>
          <PageTitle title={t('assistantTitle')} subtitle={t('assistantDescription')} />
          <Card style={styles.disclaimer}><AppText style={styles.disclaimerText}>ⓘ  {t('aiDisclaimer')}</AppText></Card>
          {!connected && <DemoNotice compact />}
        </View>
        <ScrollView
          style={styles.chat}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => <ChatBubble key={message.id} message={message} t={t} />)}
          {sending && (
            <View style={styles.loadingRow}>            <ActivityIndicator color={colors.brand} /><AppText style={styles.loadingText}>{t('secureResponse')}</AppText></View>
          )}
          {error ? <Card style={styles.errorCard}><AppText style={styles.errorText}>{error}</AppText></Card> : null}
        </ScrollView>
        <View style={styles.composer}>
          <Field value={input} onChangeText={setInput} placeholder={t('messagePlaceholder')} />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consentGiven }}
            onPress={() => setConsentGiven((current) => !current)}
            style={styles.consentRow}
          >
            <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
              {consentGiven ? <AppText style={styles.checkmark}>✓</AppText> : null}
            </View>
            <AppText style={styles.consentText}>{t('aiConsent')}</AppText>
          </Pressable>
          <ActionButton label={sending ? '…' : t('send')} onPress={sendMessage} disabled={sending || !input.trim() || !consentGiven} />
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

function ChatBubble({ message, t }: { message: Message; t: (key: TranslationKey) => string }) {
  const isAssistant = message.role === 'assistant';
  return (
    <View style={[styles.messageRow, !isAssistant && styles.userRow]}>
      <View style={[styles.bubble, isAssistant ? styles.assistantBubble : styles.userBubble]}>
        {!isAssistant && <AppText style={styles.youLabel}>{t('you')}</AppText>}
        {message.risk ? <AppText style={styles.riskLabel}>{t(`risk${message.risk[0].toUpperCase()}${message.risk.slice(1)}` as TranslationKey)}</AppText> : null}
        <AppText style={[styles.messageText, !isAssistant && styles.userMessageText]}>{message.text}</AppText>
        {message.requiresUrgentCare || message.risk === 'high' || message.risk === 'emergency' ? (
          <View style={styles.urgentBox}><AppText style={styles.urgentText}>{t('urgentGuidance')}</AppText></View>
        ) : null}
        {message.suggestedSpecialty ? (
          <AppText style={styles.specialty}>{t('specialistRecommendation')}: {message.suggestedSpecialty}</AppText>
        ) : null}
        {message.sources?.length ? (
          <View style={styles.sources}>
            <AppText style={styles.sourcesTitle}>{t('sources')}</AppText>
            {message.sources.map((source, index) => <AppText key={`${source.title}-${index}`} style={styles.source}>{source.title}</AppText>)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  backButton: { width: 34, height: 42, justifyContent: 'center' },
  backText: { color: colors.brand, fontSize: 33, lineHeight: 38 },
  titleWrap: { paddingHorizontal: 20, gap: 12, paddingBottom: 12 },
  disclaimer: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#FFF7E7', borderColor: '#F4E6C7' },
  disclaimerText: { color: '#765718', fontSize: 11, lineHeight: 16 },
  chat: { flex: 1, paddingHorizontal: 20 },
  messageList: { gap: 14, paddingVertical: 8 },
  messageRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '88%', borderRadius: 17, padding: 14, gap: 7 },
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 5 },
  userBubble: { backgroundColor: colors.brand, borderTopRightRadius: 5 },
  messageText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  userMessageText: { color: colors.surface },
  youLabel: { color: '#C6E8D9', fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  riskLabel: { color: colors.brand, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  urgentBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 10, marginTop: 3 },
  urgentText: { color: '#A73D47', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  sources: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 7, gap: 4 },
  sourcesTitle: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  source: { color: colors.brand, fontSize: 10 },
  specialty: { color: colors.brand, fontSize: 11, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  loadingText: { color: colors.muted, fontSize: 11 },
  errorCard: { backgroundColor: '#FFF7E7', borderColor: '#F4E6C7', padding: 11 },
  errorText: { color: '#765718', fontSize: 11, lineHeight: 16 },
  composer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: colors.canvas },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkmark: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  consentText: { color: colors.muted, fontSize: 10, lineHeight: 15, flex: 1 },
});
