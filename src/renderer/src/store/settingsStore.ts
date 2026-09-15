import { create } from 'zustand';

import type { StoreApi } from 'zustand';

/** App-wide toggles the player owns. Persistence arrives with task 13. */
export interface SettingsState {
  isMuted: boolean;
  toggleMuted: () => void;
}

export const useSettingsStore = create<SettingsState>((set: StoreApi<SettingsState>['setState'], get: StoreApi<SettingsState>['getState']): SettingsState => ({
  isMuted: false,
  toggleMuted: (): void => set({ isMuted: !get().isMuted }),
}));
