import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Demo patient journey shared by several screens:
 * consultation done → prescription → medicine reserved → report → check-in.
 * With a real backend this would come from the API instead.
 */
type JourneyState = {
  consulted: boolean;
  reservedPharmacyId: string | null;
  reportViewed: boolean;
  reportShared: boolean;
  checkInDone: boolean;
};

type JourneyContextValue = JourneyState & {
  completeConsultation: () => void;
  reservePharmacy: (id: string) => void;
  markReportViewed: () => void;
  shareReport: () => void;
  completeCheckIn: () => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

const initial: JourneyState = {
  consulted: false,
  reservedPharmacyId: null,
  reportViewed: false,
  reportShared: false,
  checkInDone: false,
};

export function JourneyProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<JourneyState>(initial);

  const completeConsultation = useCallback(() => setState((s) => ({ ...s, consulted: true })), []);
  const reservePharmacy = useCallback((id: string) => setState((s) => ({ ...s, reservedPharmacyId: id })), []);
  const markReportViewed = useCallback(() => setState((s) => (s.reportViewed ? s : { ...s, reportViewed: true })), []);
  const shareReport = useCallback(() => setState((s) => ({ ...s, reportShared: true })), []);
  const completeCheckIn = useCallback(() => setState((s) => ({ ...s, checkInDone: true })), []);

  const value = useMemo(
    () => ({ ...state, completeConsultation, reservePharmacy, markReportViewed, shareReport, completeCheckIn }),
    [state, completeConsultation, reservePharmacy, markReportViewed, shareReport, completeCheckIn],
  );
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used within JourneyProvider');
  return context;
}
