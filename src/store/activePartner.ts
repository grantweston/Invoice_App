import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActivePartnerState {
  activePartner: string;
  setActivePartner: (partner: string) => void;
}

export const useActivePartner = create<ActivePartnerState>()(
  persist(
    (set) => ({
      activePartner: 'Sam Ende',
      setActivePartner: (partner) => set({ activePartner: partner }),
    }),
    {
      name: 'active-partner-storage',
    }
  )
); 