import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import type { PaymentInfo, PaymentMethod } from '../services/api';
import { formatTaka, toAsciiDigits } from '../utils/format';
import { clockTime, demoTransactionId, METHOD_ICON, METHOD_NAME_KEY } from '../utils/payment';
import { ActionButton, AppText, BiText, FONT_FAMILIES } from './ui';

const PROCESSING_MS = 1500;

type Props = {
  visible: boolean;
  method: Exclude<PaymentMethod, 'cash_at_chamber'>;
  amount: number;
  onClose: () => void;
  /** Called after the success screen's button is pressed. */
  onPaid: (payment: PaymentInfo) => void;
};

/**
 * Mount it only while open so the form starts fresh each time.
 * ShuShastho's own demo payment sheet for bKash / Nagad / card. It never asks for a PIN, OTP or CVV, and the
 * wallet number / card number stay in this component's state only (never saved or sent anywhere).
 */
export function PaymentSheet({ visible, method, amount, onClose, onPaid }: Props) {
  const { t, nf, L } = useLanguage();
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<'form' | 'processing' | 'success'>('form');
  const [result, setResult] = useState<PaymentInfo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCard = method === 'card';
  const digits = value.replace(/\D/g, '');
  const valid = isCard ? digits.length === 16 : /^01\d{9}$/.test(digits);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function pay() {
    setTouched(true);
    if (!valid || phase !== 'form') return;
    setPhase('processing');
    timer.current = setTimeout(() => {
      setResult({
        method,
        status: 'paid',
        transactionId: demoTransactionId(method),
        amount,
        paidAt: new Date().toISOString(),
      });
      setPhase('success');
    }, PROCESSING_MS);
  }

  const name = t(METHOD_NAME_KEY[method]);
  const amountText = nf(formatTaka(amount));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={phase === 'processing' ? undefined : onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={phase === 'form' ? onClose : undefined} accessibilityLabel={t('payClose')} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <View style={styles.demoBanner}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.yellowText} />
              <View style={styles.flex}>
                <BiText text={L('payDemoBanner')} style={styles.demoText} subStyle={styles.demoSub} />
              </View>
            </View>

            {phase === 'success' && result ? (
              <View style={styles.success}>
                <View style={styles.successIcon}><Ionicons name="checkmark" size={32} color={colors.surface} /></View>
                <AppText style={styles.successTitle}>{t('paySuccess')}</AppText>
                <AppText style={styles.bigAmount}>{amountText}</AppText>
                <View style={styles.receipt}>
                  <ReceiptRow label={t('payTxn')} value={result.transactionId ?? ''} />
                  <ReceiptRow label={t('payTime')} value={nf(clockTime(result.paidAt ?? new Date().toISOString()))} />
                  <ReceiptRow label={t('payment')} value={name} />
                </View>
                <View style={styles.fullWidth}>
                  <ActionButton label={t('payContinue')} onPress={() => onPaid(result)} />
                </View>
              </View>
            ) : phase === 'processing' ? (
              <View style={styles.success}>
                <ActivityIndicator size="large" color={colors.brand} />
                <AppText style={styles.successTitle}>{t('payProcessing')}</AppText>
              </View>
            ) : (
              <>
                <View style={styles.titleRow}>
                  <View style={styles.methodIcon}><Ionicons name={METHOD_ICON[method]} size={22} color={colors.brand} /></View>
                  <View style={styles.flex}>
                    <AppText style={styles.title}>{name}</AppText>
                    <BiText text={L('payAmount')} style={styles.meta} />
                  </View>
                  <AppText style={styles.amount}>{amountText}</AppText>
                </View>

                <View style={styles.field}>
                  <AppText style={styles.label}>{t(isCard ? 'payCardNumber' : 'payWalletPhone')}</AppText>
                  <TextInput
                    accessibilityLabel={t(isCard ? 'payCardNumber' : 'payWalletPhone')}
                    value={isCard ? value : nf(value)}
                    onChangeText={(text) => setValue(toAsciiDigits(text).replace(/\D/g, '').slice(0, isCard ? 16 : 11))}
                    keyboardType="number-pad"
                    // Card numbers are masked as they are typed; a real card/CVV/PIN is never needed.
                    secureTextEntry={isCard}
                    maxLength={isCard ? 16 : 11}
                    placeholder={isCard ? '•••• •••• •••• ••••' : nf('01XXXXXXXXX')}
                    placeholderTextColor={colors.muted}
                    autoComplete="off"
                    style={[styles.input, touched && !valid && styles.inputError]}
                  />
                  {touched && !valid ? <AppText style={styles.error}>{t(isCard ? 'payCardInvalid' : 'payPhoneInvalid')}</AppText> : null}
                </View>

                <AppText style={styles.noPin}>{t('payNoPin')}</AppText>
                <ActionButton label={t('payButton').replace('{amount}', amountText)} onPress={pay} />
                <ActionButton label={t('payClose')} onPress={onClose} variant="secondary" />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.receiptRow}>
      <AppText style={styles.meta}>{label}</AppText>
      <AppText style={styles.receiptValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,43,39,0.45)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%',
    width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 12,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 10 },
  body: { padding: 16, gap: 14 },
  demoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.yellow, borderRadius: 12, padding: 12 },
  demoText: { color: colors.yellowText, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  demoSub: { color: colors.yellowText, fontSize: 11, lineHeight: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  amount: { color: colors.brand, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  input: {
    minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 14, color: colors.text, fontSize: 17, letterSpacing: 1, fontFamily: FONT_FAMILIES.regular,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  noPin: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  success: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  bigAmount: { color: colors.brand, fontSize: 28, lineHeight: 38, fontWeight: '700' },
  receipt: { alignSelf: 'stretch', backgroundColor: colors.mint, borderRadius: 14, padding: 14, gap: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  receiptValue: { color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
