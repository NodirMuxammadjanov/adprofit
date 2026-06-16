import type { CrmAdapter } from "./adapter";
import { bitrix24Adapter } from "./bitrix24";
import type { CrmProvider } from "./types";

/**
 * Provayder nomi bo'yicha mos CrmAdapter'ni qaytaradi.
 * amoCRM adapteri Phase 10'da qo'shiladi.
 */
export function getCrmAdapter(provider: CrmProvider): CrmAdapter {
  switch (provider) {
    case "bitrix24":
      return bitrix24Adapter;
    case "amocrm":
      throw new Error("amoCRM Phase 10'da");
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Noma'lum CRM provayder: ${String(_exhaustive)}`);
    }
  }
}
