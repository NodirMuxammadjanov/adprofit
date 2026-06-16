import { isMock } from "@/lib/env";

/**
 * Meta lid (leadgen) tafsilotlarini olish.
 * Real: Graph API'dan field_data + attribution (ad/adset/campaign) o'qiladi.
 * isMock(): leadId'dan deterministik fixtura (Math.random/Date.now YO'Q).
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export type MetaLeadDetails = {
  leadId: string;
  formId: string;
  createdTime: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  rawFields: Record<string, string>;
  adId: string | null;
  adsetId: string | null;
  campaignId: string | null;
};

/** leadId belgilaridan barqaror (deterministik) hash — global holatga bog'liq emas. */
function hashLeadId(leadId: string): number {
  let sum = 0;
  for (let i = 0; i < leadId.length; i += 1) {
    sum += leadId.charCodeAt(i);
  }
  return sum;
}

function mockLeadDetails(leadId: string): MetaLeadDetails {
  const hash = hashLeadId(leadId);
  const fullName = `Mijoz ${leadId}`;
  const phone = `+99890${(1000000 + hash).toString().slice(0, 7)}`;

  return {
    leadId,
    // Mock attribution mock ad ID'lariga bog'lanadi (m_ad_1 / m_ad_2 / m_ad_3).
    formId: `form_${hash % 2 === 0 ? "111" : "222"}`,
    createdTime: "2026-01-01T00:00:00+0000",
    fullName,
    phone,
    email: null,
    rawFields: {
      full_name: fullName,
      phone_number: phone,
    },
    adId: `m_ad_${(hash % 3) + 1}`,
    adsetId: `m_adset_${(hash % 2) + 1}`,
    campaignId: "m_camp_1",
  };
}

// ── Real Graph API javob shakli ──────────────────────────────────
type GraphFieldDatum = { name?: string; values?: unknown[] };
type GraphLeadResponse = {
  id?: string;
  created_time?: string;
  form_id?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  field_data?: GraphFieldDatum[];
};

function firstValue(values: unknown[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  const v = values[0];
  return v == null ? null : String(v);
}

export async function getLeadDetails(
  token: string,
  leadId: string,
): Promise<MetaLeadDetails> {
  if (isMock()) return mockLeadDetails(leadId);

  const url = new URL(`${GRAPH_BASE}/${leadId}`);
  url.searchParams.set(
    "fields",
    "id,created_time,form_id,ad_id,adset_id,campaign_id,field_data",
  );
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meta lead fetch error ${res.status}: ${body}`);
  }
  const json = (await res.json()) as GraphLeadResponse;

  const rawFields: Record<string, string> = {};
  let fullName: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;

  for (const fd of json.field_data ?? []) {
    const name = fd.name;
    if (!name) continue;
    const value = firstValue(fd.values);
    if (value == null) continue;
    rawFields[name] = value;

    switch (name) {
      case "full_name":
      case "name":
        if (fullName == null) fullName = value;
        break;
      case "phone_number":
      case "phone":
        if (phone == null) phone = value;
        break;
      case "email":
        if (email == null) email = value;
        break;
      default:
        break;
    }
  }

  return {
    leadId: json.id ?? leadId,
    formId: json.form_id ?? "",
    createdTime: json.created_time ?? "",
    fullName,
    phone,
    email,
    rawFields,
    adId: json.ad_id ?? null,
    adsetId: json.adset_id ?? null,
    campaignId: json.campaign_id ?? null,
  };
}
