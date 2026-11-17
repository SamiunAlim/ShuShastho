import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BrandHeader, Card, DemoNotice, PageTitle } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';

export default function RecordsScreen() {
  const { t } = useLanguage();
  return (
    <AppScreen>
      <BrandHeader />
      <DemoNotice compact />
      <PageTitle title={t('records')} subtitle="Prescriptions, lab reports and health timeline" />
      <View style={styles.filterRow}>
        {[t('all'), t('visits'), t('reports'), t('medicines')].map((label, index) => (
          <View key={label} style={[styles.filter, index === 0 && styles.filterActive]}>
            <AppText style={[styles.filterText, index === 0 && styles.filterActiveText]}>{label}</AppText>
          </View>
        ))}
      </View>
      <Card style={styles.emptyCard}>
        <View style={styles.emptyIcon}><AppText style={styles.emptyIconText}>▣</AppText></View>
        <AppText style={styles.emptyTitle}>{t('records')}</AppText>
        <AppText style={styles.emptyText}>{t('noRecords')}</AppText>
      </Card>
      <AppText style={styles.privacy}>{t('privacyNote')}</AppText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8 },
  filter: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  filterText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  filterActiveText: { color: colors.brand },
  emptyCard: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: colors.brand, fontSize: 25 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 19, maxWidth: 260 },
  privacy: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 16, paddingHorizontal: 10 },
});
