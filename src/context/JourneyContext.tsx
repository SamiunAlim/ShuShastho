import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DemoMedicine, prescription } from '../services/mock';

/**
 * Demo patient journey shared by several screens:
 * consultation done → prescription → medicine reserved → report → check-in.
 * With a real backend this would come from the API instead.
 */
/** What the doctor actually sent from the consultation screen ("Send & finish"). */
export type SentRx = { medicineIds: string[]; tests: string[] };

/** Pharmacy's answer to the patient's pickup reservation. */
export type PharmacyStatus = 'none' | 'requested' | 'accepted' | 'partial' | 'rejected' | 'ready';

type JourneyState = {
  consulted: boolean;
  pharmacyStatus: PharmacyStatus;
  /** Medicines the pharmacy could not supply (only for a partial answer). */
  unavailableMedicineIds: string[];
  sentRx: SentRx | null;
  reservedPharmacyId: string | null;
  reportViewed: boolean;
  reportShared: boolean;
  checkInDone: boolean;
};

type JourneyContextValue = JourneyState & {
  /** The prescription the patient sees: the doctor's selection once sent, otherwise the demo default. */
  rx: { medicines: DemoMedicine[]; tests: string[] };
  completeConsultation: () => void;
  /** Doctor sends the e-prescription: marks the consultation done and makes this Rx visible to the patient. */
  sendPrescription: (rx: SentRx) => void;
  reservePharmacy: (id: string) => void;
  /** Pharmacist answers the request. `unavailableIds` only applies to 'partial'. */
  respondPharmacy: (status: 'accepted' | 'partial' | 'rejected', unavailableIds?: string[]) => void;
  markPharmacyReady: () => void;
  markReportViewed: () => void;
  shareReport: () => void;
  completeCheckIn: () => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

const initial: JourneyState = {
  consulted: false,
  pharmacyStatus: 'none',
  unavailableMedicineIds: [],
  sentRx: null,
  reservedPharmacyId: null,
  reportViewed: false,
  reportShared: false,
  checkInDone: false,
};

export function JourneyProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<JourneyState>(initial);

  const completeConsultation = useCallback(() => setState((s) => ({ ...s, consulted: true })), []);
  const sendPrescription = useCallback((rx: SentRx) => setState((s) => ({ ...s, consulted: true, sentRx: rx })), []);
  const reservePharmacy = useCallback(
    (id: string) => setState((s) => ({ ...s, reservedPharmacyId: id, pharmacyStatus: 'requested', unavailableMedicineIds: [] })),
    [],
  );
  const respondPharmacy = useCallback(
    (status: 'accepted' | 'partial' | 'rejected', unavailableIds: string[] = []) =>
      setState((s) => ({ ...s, pharmacyStatus: status, unavailableMedicineIds: status === 'partial' ? unavailableIds : [] })),
    [],
  );
  const markPharmacyReady = useCallback(
    () => setState((s) => (s.pharmacyStatus === 'accepted' || s.pharmacyStatus === 'partial' ? { ...s, pharmacyStatus: 'ready' } : s)),
    [],
  );
  const markReportViewed = useCallback(() => setState((s) => (s.reportViewed ? s : { ...s, reportViewed: true })), []);
  const shareReport = useCallback(() => setState((s) => ({ ...s, reportShared: true })), []);
  const completeCheckIn = useCallback(() => setState((s) => ({ ...s, checkInDone: true })), []);

  const value = useMemo<JourneyContextValue>(() => {
    const sent = state.sentRx;
    const rx = {
      medicines: sent ? prescription.medicines.filter((m) => sent.medicineIds.includes(m.id)) : prescription.medicines,
      tests: sent ? sent.tests : prescription.tests,
    };
    return {
      ...state, rx, completeConsultation, sendPrescription, reservePharmacy, respondPharmacy, markPharmacyReady,
      markReportViewed, shareReport, completeCheckIn,
    };
  }, [state, completeConsultation, sendPrescription, reservePharmacy, respondPharmacy, markPharmacyReady, markReportViewed, shareReport, completeCheckIn]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used within JourneyProvider');
  return context;
}
