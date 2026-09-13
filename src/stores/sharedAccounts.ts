import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SHARED_ACCOUNTS } from "@/data/mock/members";

interface SharedAccountsState {
  byPayer: Record<string, string[]>;
  add: (payer: string, member: string) => void;
  remove: (payer: string, member: string) => void;
}

export const useSharedAccountsStore = create<SharedAccountsState>()(
  persist(
    (set, get) => ({
      byPayer: DEFAULT_SHARED_ACCOUNTS,
      add: (payer, member) =>
        set(() => ({
          byPayer: { ...get().byPayer, [payer]: [...(get().byPayer[payer] ?? []), member] },
        })),
      remove: (payer, member) =>
        set(() => {
          const next = { ...get().byPayer, [payer]: (get().byPayer[payer] ?? []).filter((n) => n !== member) };
          if (!next[payer].length) delete next[payer];
          return { byPayer: next };
        }),
    }),
    { name: "2110-shared-accounts" },
  ),
);
