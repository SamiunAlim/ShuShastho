import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BiText, DemoNotice, KanthaCard, ScreenHeader } from '../../components/ui';
import { type PharmacyStatus, useJourney } from '../../context/JourneyContext';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';
import type { TranslationKey } from '../../constants/i18n';
import { CHECKIN, DEMO, findDoctor, findPharmacy, type Localized } from '../../services/mock';
import { addDays, MONTHS_SHORT, toBanglaDigits } from '../../utils/format';

type Filter = 'all' | 'visits' | 'reports' | 'medicines';
type Kind = 'visits' | 'reports' | 'medicines';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Tone = 'plain' | 'report' | 'due' | 'upcoming';

type Item = {
  id: string;
  kind: Kind;
  icon: IconName;
  /** Days from today (negative = past). */
  dayOffset: number;
  time?: Localized;
  title: Localized;
  tone: Tone;
  done: boolean;
  tag?: { label: Localized; bg: string; fg: string };
  action?: { label: Localized; icon: IconName };
  onPress?: () => void;
};

const FILTERS: { id: Filter; key: TranslationKey }[] = [
  { id: 'all', key: 'all' },
  { id: 'visits', key: 'visits' },
  { id: 'reports', key: 'reports' },
  { id: 'medicines', key: 'medicines' },
];

const PHARMACY_TAG_STYLE: Record<Exclude<PharmacyStatus, 'none'>, { key: TranslationKey; bg: string; fg: string }> = {
  requested: { key: 'phStatusRequested', bg: colors.yellow, fg: colors.yellowText },
  accepted: { key: 'phStatusAccepted', bg: colors.blue, fg: colors.blueText },
  partial: { key: 'phStatusPartial', bg: colors.yellow, fg: colors.yellowText },
  rejected: { key: 'phStatusRejected', bg: colors.redSoft, fg: colors.danger },
  ready: { key: 'phStatusReady', bg: colors.mint2, fg: colors.brand },
};

function pharmacyTag(status: PharmacyStatus, L: ReturnType<typeof useLanguage>['L']): Item['tag'] {
  if (status === 'none') return undefined;
  const style = PHARMACY_TAG_STYLE[status];
  return { label: L(style.key), bg: style.bg, fg: style.fg };
}

const TIMES = {
  ai: { en: '5:40 PM', bn: 'বিকেল ৫:৪০' },
  visit: { en: '6:40 PM', bn: 'সন্ধ্যা ৬:৪০' },
  rx: { en: '7:05 PM', bn: 'সন্ধ্যা ৭:০৫' },
  medicine: { en: '7:20 PM', bn: 'সন্ধ্যা ৭:২০' },
  report: { en: '10:30 AM', bn: 'সকাল ১০:৩০' },
  followUp: { en: '6:30 PM', bn: 'সন্ধ্যা ৬:৩০' },
} satisfies Record<string, Localized>;

export default function RecordsScreen() {
  const { language, t, L } = useLanguage();
  const journey = useJourney();
  const [filter, setFilter] = useState<Filter>('all');
  const doctor = findDoctor(DEMO.doctorId);
  const today = useMemo(() => new Date(), []);

  const items = useMemo<Item[]>(() => {
    const pharmacy = findPharmacy(journey.reservedPharmacyId);
    const reserved = pharmacy !== undefined;
    return [
      { id: 'ai', kind: 'visits', icon: 'creation', dayOffset: -2, time: TIMES.ai, title: L('tlAi'), tone: 'plain', done: true },
      { id: 'visit', kind: 'visits', icon: 'stethoscope', dayOffset: -2, time: TIMES.visit, title: L('tlVisit', { doctor: doctor.name }), tone: 'plain', done: true },
      {
        id: 'rx', kind: 'medicines', icon: 'file-document-outline', dayOffset: -2, time: TIMES.rx,
        title: L('tlRx', { n: journey.rx.medicines.length }), tone: 'plain', done: true,
        onPress: () => router.push('/prescription'),
      },
      {
        id: 'medicine', kind: 'medicines', icon: 'pill', dayOffset: -2, time: TIMES.medicine,
        title: reserved ? L('tlMedReserved', { pharmacy: pharmacy.name }) : L('tlMedPending'),
        tone: reserved ? 'plain' : 'upcoming', done: reserved,
        tag: reserved ? pharmacyTag(journey.pharmacyStatus, L) : undefined,
        onPress: () => router.push('/prescription'),
      },
      {
        id: 'report', kind: 'reports', icon: 'flask-outline', dayOffset: -1, time: TIMES.report,
        title: L('tlReport'), tone: 'report', done: true,
        tag: journey.reportViewed ? undefined : { label: L('tagNew'), bg: colors.blue, fg: colors.blueText },
        action: { label: L('tlReportAction'), icon: 'creation' },
        onPress: () => router.push('/report'),
      },
      {
        id: 'checkin', kind: 'visits', icon: 'heart-outline', dayOffset: 0,
        title: L('tlCheckin', { n: CHECKIN.day }),
        tone: journey.checkInDone ? 'plain' : 'due', done: journey.checkInDone,
        tag: journey.checkInDone
          ? { label: L('tagDone'), bg: colors.mint2, fg: colors.brand }
          : { label: L('tagDue'), bg: colors.yellow, fg: colors.yellowText },
        action: journey.checkInDone ? undefined : { label: L('startNow'), icon: 'heart-outline' },
        onPress: () => router.push('/checkin'),
      },
      { id: 'followup', kind: 'visits', icon: 'calendar-clock-outline', dayOffset: 1, time: TIMES.followUp, title: L('tlFollowup'), tone: 'upcoming', done: false },
    ];
  }, [L, doctor.name, journey.rx.medicines.length, journey.reservedPharmacyId, journey.pharmacyStatus, journey.reportViewed, journey.checkInDone]);

  const visible = items.filter((item) => filter === 'all' || item.kind === filter);
  const doneCount = items.filter((item) => item.done).length;

  function dateOf(offset: number) {
    const date = addDays(today, offset);
    const day = language === 'bn' ? toBanglaDigits(date.getDate()) : date.getDate();
    return `${day} ${MONTHS_SHORT[language][date.getMonth()]}`;
  }

  const monthYear = `${MONTHS_SHORT.en[today.getMonth()]} ${today.getFullYear()}`;
  const monthYearBn = `${MONTHS_SHORT.bn[today.getMonth()]} ${toBanglaDigits(today.getFullYear())}`;
  const caseTitle = L('caseDengue');

  return (
    <AppScreen
      contentStyle={styles.content}
      header={
        <ScreenHeader title={L('timelineTitle')} extra="Records">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map(({ id, key }) => {
              const active = filter === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(id)}
                  style={[styles.filter, active && styles.filterActive]}
                >
                  <AppText style={[styles.filterText, active && styles.filterTextActive]}>{t(key)}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </ScreenHeader>
      }
    >
      <DemoNotice compact />

      <KanthaCard style={styles.caseCard}>
        <View style={styles.caseTop}>
          <View style={styles.flex}>
            <AppText style={styles.caseTitle}>
              {caseTitle[language]} · {language === 'bn' ? monthYearBn : monthYear}
            </AppText>
            {language === 'bn' ? <AppText style={styles.caseSub}>{caseTitle.en} · {monthYear}</AppText> : null}
          </View>
          <View style={styles.ongoing}><AppText style={styles.ongoingText}>{L('ongoing')[language]}</AppText></View>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(doneCount / items.length) * 100}%` }]} />
          </View>
        </View>
        <AppText style={styles.caseSub}>
          {L('stepsProgress', { done: doneCount, total: items.length })[language]}
        </AppText>
      </KanthaCard>

      {visible.length === 0 ? <AppText style={styles.empty}>{t('timelineEmpty')}</AppText> : null}

      <View>
        {visible.map((item, index) => (
          <TimelineRow
            key={item.id}
            item={item}
            date={dateOf(item.dayOffset)}
            isToday={item.dayOffset === 0}
            last={index === visible.length - 1}
          />
        ))}
      </View>
      <AppText style={styles.privacy}>{t('privacyNote')}</AppText>
    </AppScreen>
  );
}

function TimelineRow({ item, date, isToday, last }: { item: Item; date: string; isToday: boolean; last: boolean }) {
  const { language, t } = useLanguage();
  const muted = item.tone === 'upcoming';
  const cardStyle = [
    styles.card,
    item.tone === 'report' && { borderColor: colors.blueText, borderWidth: 1.5 },
    item.tone === 'due' && { borderColor: colors.yellowText, borderWidth: 1.5 },
    muted && { backgroundColor: colors.mint },
  ];
  const content = (
    <>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <BiText text={item.title} style={[styles.cardTitle, muted && { color: colors.muted }]} />
        </View>
        {item.tag ? (
          <View style={[styles.tag, { backgroundColor: item.tag.bg }]}>
            <AppText style={[styles.tagText, { color: item.tag.fg }]}>{item.tag.label[language]}</AppText>
          </View>
        ) : null}
        {item.onPress && !item.action ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
      </View>
      {item.action ? (
        <View style={[styles.action, { borderColor: item.tone === 'report' ? colors.blueText : colors.yellowText }]}>
          <MaterialCommunityIcons name={item.action.icon} size={14} color={item.tone === 'report' ? colors.blueText : colors.yellowText} />
          <AppText style={[styles.actionText, { color: item.tone === 'report' ? colors.blueText : colors.yellowText }]}>
            {item.action.label[language]}
          </AppText>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.row}>
      <View style={styles.dateCol}>
        <AppText style={styles.date}>{date}</AppText>
        {isToday ? <AppText style={styles.time}>{t('today')}</AppText> : item.time ? <AppText style={styles.time}>{item.time[language]}</AppText> : null}
      </View>
      <View style={styles.rail}>
        <View style={[styles.dot, item.done ? styles.dotDone : styles.dotTodo]}>
          <MaterialCommunityIcons name={item.icon} size={17} color={item.done ? colors.brand : colors.muted} />
        </View>
        {!last ? <View style={styles.line} /> : null}
      </View>
      {item.onPress ? (
        <Pressable accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [cardStyle, styles.cardFlex, pressed && { opacity: 0.85 }]}>
          {content}
        </Pressable>
      ) : (
        <View style={[cardStyle, styles.cardFlex]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: 14 },
  filters: { gap: 8, paddingRight: 8 },
  filter: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  filterActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.surface },
  caseCard: { gap: 8 },
  caseTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  caseTitle: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  caseSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  ongoing: { backgroundColor: colors.yellow, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ongoingText: { color: colors.yellowText, fontSize: 12, fontWeight: '700' },
  progressRow: { flexDirection: 'row' },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.mint3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.brand },
  empty: { color: colors.muted, textAlign: 'center', fontSize: 13, paddingVertical: 20 },
  row: { flexDirection: 'row', gap: 8, minHeight: 64 },
  dateCol: { width: 52, alignItems: 'flex-end', paddingTop: 6 },
  date: { color: colors.text, fontSize: 11, fontWeight: '700' },
  time: { color: colors.muted, fontSize: 10, textAlign: 'right' },
  rail: { width: 34, alignItems: 'center' },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.mint2 },
  dotTodo: { backgroundColor: colors.grey },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8, marginBottom: 10 },
  cardFlex: { flex: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  tag: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700' },
  action: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  actionText: { fontSize: 12, fontWeight: '600' },
  privacy: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, paddingHorizontal: 10 },
});
