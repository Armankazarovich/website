import "server-only";

import type {
  DirectDraft,
  DirectDraftGroup,
  DirectDraftOptions,
} from "@/lib/direct-campaign-draft";
import { callYandexDirect } from "@/lib/yandex-direct";

type DirectSettings = Record<string, string | undefined>;

type DirectNotice = {
  Code?: number;
  Message?: string;
  Details?: string;
};

type DirectActionResult = {
  Id?: number;
  Warnings?: DirectNotice[];
  Errors?: DirectNotice[];
};

type DirectAddResponse = {
  result?: {
    AddResults?: DirectActionResult[];
  };
};

type DirectUpdateResponse = {
  result?: {
    UpdateResults?: DirectActionResult[];
  };
};

type DirectSuspendResponse = {
  result?: {
    SuspendResults?: DirectActionResult[];
  };
};

type DirectKeywordGetResponse = {
  result?: {
    Keywords?: Array<{
      Id?: number;
      Keyword?: string;
    }>;
  };
};

export type YandexDirectExportResult = {
  campaignId: number;
  campaignName: string;
  directUrl: string;
  groupsCreated: number;
  adsCreated: number;
  keywordsCreated: number;
  sitelinksCreated: number;
  calloutsCreated: number;
  mode: "created-suspended";
  regionIds: number[];
  warnings: string[];
  safety: string;
};

export type YandexDirectExportParts = {
  ads?: boolean;
  keywords?: boolean;
  sitelinks?: boolean;
  callouts?: boolean;
};

function settingValue(settings: DirectSettings, keys: string[]) {
  for (const key of keys) {
    const value = settings[key]?.trim();
    if (value) return value;
  }
  return "";
}

function settingNumber(
  settings: DirectSettings,
  keys: string[],
  fallback: number,
) {
  const value = Number(settingValue(settings, keys));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function settingInteger(
  settings: DirectSettings,
  keys: string[],
  fallback = 0,
) {
  const value = Math.floor(settingNumber(settings, keys, fallback));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function settingBoolean(settings: DirectSettings, keys: string[]) {
  const value = settingValue(settings, keys).toLowerCase();
  return ["1", "true", "yes", "on", "да"].includes(value);
}

function optionNumber(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function normalizeExportParts(parts?: YandexDirectExportParts) {
  return {
    ads: parts?.ads !== false,
    keywords: parts?.keywords !== false,
    sitelinks: parts?.sitelinks !== false,
    callouts: parts?.callouts !== false,
  };
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function directUrl(campaignId: number) {
  return `https://direct.yandex.ru/dna/campaigns/${campaignId}`;
}

function warningText(result: DirectActionResult) {
  return (result.Warnings || [])
    .map((warning) =>
      [warning.Message, warning.Details].filter(Boolean).join(": "),
    )
    .filter(Boolean);
}

function errorText(result: DirectActionResult) {
  return (result.Errors || [])
    .map((error) => [error.Message, error.Details].filter(Boolean).join(": "))
    .filter(Boolean);
}

function assertDirectIds(
  response: DirectAddResponse,
  stage: string,
  expectedCount = 0,
) {
  const results = response.result?.AddResults || [];
  const errors = results.flatMap(errorText);
  if (errors.length) {
    throw new Error(`${stage}: ${errors.join("; ")}`);
  }

  const ids = results
    .map((result) => Number(result.Id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) {
    throw new Error(
      `${stage}: Yandex Direct did not return created object ids`,
    );
  }
  if (expectedCount > 0 && ids.length !== expectedCount) {
    throw new Error(
      `${stage}: Yandex Direct created ${ids.length} of ${expectedCount} objects`,
    );
  }
  return {
    ids,
    warnings: results.flatMap(warningText),
  };
}

function chunkItems<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function addDirectObjectsInChunks<TItem>(
  service: string,
  payloadKey: string,
  items: TItem[],
  settings: DirectSettings,
  stage: string,
  chunkSize: number,
) {
  const ids: number[] = [];
  const warnings: string[] = [];

  for (const batch of chunkItems(items, chunkSize)) {
    const response = await callYandexDirect<DirectAddResponse>(
      service,
      {
        method: "add",
        params: {
          [payloadKey]: batch,
        },
      },
      { settings },
    );
    const result = assertDirectIds(response, stage, batch.length);
    ids.push(...result.ids);
    warnings.push(...result.warnings);
  }

  return { ids, warnings };
}

function assertDirectSuspend(response: DirectSuspendResponse, stage: string) {
  const results = response.result?.SuspendResults || [];
  const errors = results.flatMap(errorText);
  if (errors.length) {
    throw new Error(`${stage}: ${errors.join("; ")}`);
  }

  return results.flatMap(warningText);
}

function assertDirectUpdates(
  response: DirectUpdateResponse,
  stage: string,
  expectedCount = 0,
) {
  const results = response.result?.UpdateResults || [];
  const errors = results.flatMap(errorText);
  if (errors.length) {
    throw new Error(`${stage}: ${errors.join("; ")}`);
  }
  if (expectedCount > 0 && results.length !== expectedCount) {
    throw new Error(
      `${stage}: Yandex Direct updated ${results.length} of ${expectedCount} objects`,
    );
  }
  return results.flatMap(warningText);
}

function isSafeDraftSuspendMessage(message: string) {
  return /черновик|draft/i.test(message) && /статус|останов/i.test(message);
}

async function safeSuspendCampaign(
  campaignId: number,
  settings: DirectSettings,
  stage: string,
) {
  try {
    const suspendResponse = await callYandexDirect<DirectSuspendResponse>(
      "campaigns",
      {
        method: "suspend",
        params: {
          SelectionCriteria: {
            Ids: [campaignId],
          },
        },
      },
      { settings },
    );
    return assertDirectSuspend(suspendResponse, stage);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Direct не подтвердил остановку кампании.";
    if (isSafeDraftSuspendMessage(message)) {
      return [
        `${stage}: кампания осталась черновиком/не запущена, отдельная остановка не требуется.`,
      ];
    }
    throw new Error(message);
  }
}

function sanitizeDirectText(value: string) {
  return value
    .replace(/₽/g, " руб.")
    .replace(/[·•]/g, " - ")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/×/g, "x")
    .replace(/[«»“”„]/g, '"')
    .replace(/[’`]/g, "'")
    .replace(/[©®™]/g, "")
    .replace(/[^\p{L}\p{N}\s.,:;!?()"'%+\-/=]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateDirectText(value: string, max: number) {
  const clean = sanitizeDirectText(value);
  if (clean.length <= max) return clean;
  const trimmed = clean
    .slice(0, max)
    .replace(/\s+\S*$/, "")
    .trim();
  return trimmed || clean.slice(0, max).trim();
}

function stripTrackingParams(value: string) {
  try {
    const url = new URL(value);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]) {
      url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.replace(/\/$/, "").toLowerCase();
  }
}

function sameDirectUrl(a: string, b: string) {
  return stripTrackingParams(a) === stripTrackingParams(b);
}

export function resolveRegionIds(settings: DirectSettings, draft: DirectDraft) {
  const raw = settingValue(settings, [
    "yandex_direct_region_ids",
    "direct_region_ids",
  ]);
  const allowAllRegions = settingBoolean(settings, [
    "yandex_direct_allow_all_regions",
    "direct_allow_all_regions",
  ]);
  if (raw) {
    const ids = raw
      .split(/[\s,;]+/g)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0);
    if (ids.includes(0) && !allowAllRegions) {
      throw new Error(
        "Yandex Direct region is set to all regions. Add exact region ids to yandex_direct_region_ids or enable yandex_direct_allow_all_regions deliberately.",
      );
    }
    if (ids.length) return ids;
  }

  const regionContext = [
    draft.region,
    settingValue(settings, [
      "delivery_region",
      "service_region",
      "company_city",
      "city",
      "address",
    ]),
  ].join(" ");

  if (/москв|московск|химк/i.test(regionContext)) return [1];

  throw new Error(
    "Yandex Direct region is not configured. Set yandex_direct_region_ids in site settings before export.",
  );
}

function resolveCounterIds(settings: DirectSettings) {
  const raw = settingValue(settings, [
    "yandex_metrika_id",
    "yandex_metrika_counter_id",
    "metrika_counter_id",
  ]);
  return raw
    .split(/[\s,;]+/g)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function buildBiddingStrategy() {
  return {
    Search: {
      BiddingStrategyType: "HIGHEST_POSITION",
      PlacementTypes: {
        SearchResults: "YES",
        ProductGallery: "NO",
      },
    },
    Network: {
      BiddingStrategyType: "SERVING_OFF",
    },
  };
}

function toDirectMoney(value: number) {
  return Math.max(0, Math.round(value * 1_000_000));
}

function parseHour(value: string | undefined, fallback: number) {
  const match = String(value || "").match(/^(\d{2}):/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  return Number.isInteger(hour) ? Math.max(0, Math.min(24, hour)) : fallback;
}

function weekdayNumbers(value: string | undefined) {
  const clean = String(value || "").toLowerCase();
  const all = [1, 2, 3, 4, 5, 6, 7];
  if (!clean) return [1, 2, 3, 4, 5];
  if (/24\/7|ежеднев|каждый|все/.test(clean)) return all;
  if (/пн\s*-\s*пт|будн|рабоч/.test(clean)) return [1, 2, 3, 4, 5];

  const selected = [
    [/пн|mon|1/, 1],
    [/вт|tue|2/, 2],
    [/ср|wed|3/, 3],
    [/чт|thu|4/, 4],
    [/пт|fri|5/, 5],
    [/сб|sat|6/, 6],
    [/вс|sun|7/, 7],
  ]
    .filter(([pattern]) => (pattern as RegExp).test(clean))
    .map(([, day]) => day as number);

  return selected.length ? selected : [1, 2, 3, 4, 5];
}

function buildHourlyCoefficients(
  active: boolean,
  fromHour: number,
  toHour: number,
) {
  return Array.from({ length: 24 }, (_, hour) =>
    active && hour >= fromHour && hour < toHour ? 100 : 0,
  );
}

function buildTimeTargeting(draft: DirectDraft, options?: DirectDraftOptions) {
  const schedule = options?.schedule || draft.generation.schedule;
  const isAllDay = schedule === "all_day";
  const fromHour = isAllDay
    ? 0
    : parseHour(options?.timeFrom || draft.generation.timeFrom, 9);
  const toHour = isAllDay
    ? 24
    : parseHour(options?.timeTo || draft.generation.timeTo, 19);
  const activeDays = isAllDay
    ? [1, 2, 3, 4, 5, 6, 7]
    : weekdayNumbers(options?.weekdays || draft.generation.weekdays);

  return {
    Schedule: {
      Items: [1, 2, 3, 4, 5, 6, 7].map((day) =>
        [
          day,
          ...buildHourlyCoefficients(
            activeDays.includes(day),
            fromHour,
            Math.max(fromHour + 1, toHour),
          ),
        ].join(","),
      ),
    },
    ConsiderWorkingWeekends: "YES",
    HolidaysSchedule: isAllDay
      ? {
          SuspendOnHolidays: "NO",
          BidPercent: 100,
          StartHour: 0,
          EndHour: 24,
        }
      : {
          SuspendOnHolidays: "YES",
        },
  };
}

async function restrictAutotargeting({
  campaignId,
  settings,
}: {
  campaignId: number;
  settings: DirectSettings;
}) {
  const response = await callYandexDirect<DirectKeywordGetResponse>(
    "keywords",
    {
      method: "get",
      params: {
        SelectionCriteria: { CampaignIds: [campaignId] },
        FieldNames: ["Id", "Keyword"],
      },
    },
    { settings },
  );
  const autotargetingIds = (response.result?.Keywords || [])
    .filter((keyword) => keyword.Keyword === "---autotargeting")
    .map((keyword) => Number(keyword.Id || 0))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!autotargetingIds.length) return [];

  return assertDirectUpdates(
    await callYandexDirect<DirectUpdateResponse>(
      "keywords",
      {
        method: "update",
        params: {
          Keywords: autotargetingIds.map((id) => ({
            Id: id,
            AutotargetingSettings: {
              Categories: {
                Exact: "YES",
                Narrow: "NO",
                Alternative: "NO",
                Accessory: "NO",
                Broader: "NO",
              },
              BrandOptions: {
                WithoutBrands: "YES",
                WithAdvertiserBrand: "NO",
                WithCompetitorsBrand: "NO",
              },
            },
          })),
        },
      },
      { settings },
    ),
    "Настройка безопасного автотаргетинга",
    autotargetingIds.length,
  );
}

function cleanKeyword(value: string) {
  const words = value
    .toLowerCase()
    .replace(/[^\wа-яёА-ЯЁ\s"+!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 7)
    .map((word) => (word.length > 35 ? word.slice(0, 35) : word));
  return words.join(" ");
}

function cleanNegativeKeyword(value: string) {
  const words = value
    .toLowerCase()
    .replace(/б\s*\/\s*у/gi, "бу")
    .replace(/[^\p{L}\s"\[\]\-+!]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 7)
    .map((word) => (word.length > 35 ? word.slice(0, 35) : word));
  return words.join(" ");
}

function keywordsForGroup(group: DirectDraftGroup, limit: number) {
  return Array.from(
    new Set(group.keywords.map(cleanKeyword).filter(Boolean)),
  ).slice(0, limit);
}

function negativeKeywordsForDraft(draft: DirectDraft) {
  return Array.from(
    new Set(draft.negativeWords.map(cleanNegativeKeyword).filter(Boolean)),
  ).slice(0, 250);
}

function sitelinksForGroup(group: DirectDraftGroup, mainHref: string) {
  return group.quickLinks
    .filter((link) => !sameDirectUrl(link.href, mainHref))
    .slice(0, 8)
    .map((link) => ({
      Title: truncateDirectText(link.title, 30),
      Href: link.href,
      ...(link.description
        ? { Description: truncateDirectText(link.description, 60) }
        : {}),
    }));
}

function splitDirectList(value: string) {
  return value
    .split(/[\n,;]+/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function uniqueTexts(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function directCallouts(settings: DirectSettings, draft: DirectDraft) {
  const custom = splitDirectList(
    settingValue(settings, ["yandex_direct_callouts", "direct_callouts"]),
  );
  const defaults = [
    "В наличии",
    "Цены с сайта",
    "Доставка по МО",
    "Опт и розница",
    draft.productsCount > 0 ? "Каталог проверен" : "",
  ];

  return uniqueTexts([...custom, ...defaults])
    .map((item) => truncateDirectText(item, 25))
    .filter(Boolean)
    .slice(0, 8);
}

async function addCalloutsInChunks({
  settings,
  draft,
}: {
  settings: DirectSettings;
  draft: DirectDraft;
}) {
  const callouts = directCallouts(settings, draft);
  if (!callouts.length) return { ids: [], warnings: [] };

  try {
    return await addDirectObjectsInChunks(
      "adextensions",
      "AdExtensions",
      callouts.map((text) => ({ Callout: { CalloutText: text } })),
      settings,
      "Создание уточнений",
      100,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Direct не создал уточнения.";
    return {
      ids: [],
      warnings: [`Уточнения не добавлены, объявления созданы без них: ${message}`],
    };
  }
}

async function addSitelinkSetsInChunks(
  groups: DirectDraftGroup[],
  settings: DirectSettings,
) {
  const groupResults: Array<{ ids: number[]; warnings: string[] }> = groups.map(
    () => ({ ids: [], warnings: [] }),
  );
  const entries = groups
    .map((group, groupIndex) => ({
      groupIndex,
      sitelinks: sitelinksForGroup(group, group.ads[0]?.href || ""),
    }))
    .filter((entry) => entry.sitelinks.length);

  for (const batch of chunkItems(entries, 10)) {
    const response = await callYandexDirect<DirectAddResponse>(
      "sitelinks",
      {
        method: "add",
        params: {
          SitelinksSets: batch.map((entry) => ({
            Sitelinks: entry.sitelinks,
          })),
        },
      },
      { settings },
    );
    const result = assertDirectIds(
      response,
      "Создание быстрых ссылок",
      batch.length,
    );
    const addResults = response.result?.AddResults || [];

    batch.forEach((entry, batchIndex) => {
      const addResult = addResults[batchIndex];
      const id = Number(addResult?.Id || result.ids[batchIndex] || 0);
      groupResults[entry.groupIndex] = {
        ids: Number.isFinite(id) && id > 0 ? [id] : [],
        warnings: addResult ? warningText(addResult) : [],
      };
    });
  }

  return groupResults;
}

export async function exportYandexDirectDraft({
  draft,
  settings,
  options,
  parts,
}: {
  draft: DirectDraft;
  settings: DirectSettings;
  options?: DirectDraftOptions;
  parts?: YandexDirectExportParts;
}): Promise<YandexDirectExportResult> {
  if (!draft.groups.length) {
    throw new Error("Нет групп для выгрузки в Direct");
  }

  const exportParts = normalizeExportParts(parts);
  const maxGroups = optionNumber(
    options?.maxGroups,
    settingNumber(
      settings,
      ["yandex_direct_export_max_groups", "direct_export_max_groups"],
      8,
    ),
    1,
    40,
  );
  const maxKeywordsPerGroup = optionNumber(
    options?.maxKeywordsPerGroup,
    settingNumber(
      settings,
      ["yandex_direct_export_max_keywords", "direct_export_max_keywords"],
      12,
    ),
    3,
    30,
  );
  const maxAdsPerGroup = optionNumber(
    options?.maxAdsPerGroup,
    settingNumber(
      settings,
      ["yandex_direct_export_max_ads", "direct_export_max_ads"],
      2,
    ),
    1,
    3,
  );
  const regionIds = resolveRegionIds(settings, draft);
  const counterIds = resolveCounterIds(settings);
  const businessId = settingInteger(settings, [
    "yandex_business_id",
    "yandex_maps_business_id",
    "direct_business_id",
  ]);
  const dailyBudget = optionNumber(
    options?.dailyBudget,
    settingNumber(
      settings,
      ["yandex_direct_daily_budget", "direct_daily_budget"],
      700,
    ),
    300,
    100000,
  );
  const defaultSearchBid = optionNumber(
    options?.searchBid,
    settingNumber(
      settings,
      [
        "yandex_direct_search_bid",
        "direct_search_bid",
        "yandex_direct_default_bid",
      ],
      35,
    ),
    1,
    5000,
  );
  const groups = draft.groups.slice(0, maxGroups);
  const negativeKeywords = negativeKeywordsForDraft(draft);
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const campaignName = `${draft.campaignName} | ARAY ${stamp}`;

  const campaignResponse = await callYandexDirect<DirectAddResponse>(
    "campaigns",
    {
      method: "add",
      params: {
        Campaigns: [
          {
            Name: campaignName,
            StartDate: todayDate(),
            TimeZone: "Europe/Moscow",
            DailyBudget: {
              Amount: toDirectMoney(dailyBudget),
              Mode: "DISTRIBUTED",
            },
            TimeTargeting: buildTimeTargeting(draft, options),
            ...(negativeKeywords.length
              ? { NegativeKeywords: { Items: negativeKeywords } }
              : {}),
            TextCampaign: {
              BiddingStrategy: buildBiddingStrategy(),
              Settings: [
                { Option: "ADD_METRICA_TAG", Value: "YES" },
                ...(counterIds.length
                  ? [{ Option: "ENABLE_SITE_MONITORING", Value: "YES" }]
                  : []),
              ],
              ...(counterIds.length
                ? { CounterIds: { Items: counterIds } }
                : {}),
              TrackingParams:
                "utm_source=yandex_direct&utm_medium=cpc&utm_campaign={campaign_id}&utm_content={ad_id}&utm_term={keyword}",
            },
          },
        ],
      },
    },
    { settings },
  );

  const campaignResult = assertDirectIds(
    campaignResponse,
    "Создание кампании",
    1,
  );
  const campaignId = campaignResult.ids[0];

  try {
    const adGroupResponse = await callYandexDirect<DirectAddResponse>(
      "adgroups",
      {
        method: "add",
        params: {
          AdGroups: groups.map((group) => ({
            Name: group.name,
            CampaignId: campaignId,
            RegionIds: regionIds,
          })),
        },
      },
      { settings },
    );

    const adGroupResult = assertDirectIds(
      adGroupResponse,
      "Создание групп",
      groups.length,
    );
    const adGroupIds = adGroupResult.ids;

    const sitelinkResults =
      exportParts.ads && exportParts.sitelinks
        ? await addSitelinkSetsInChunks(groups, settings)
        : [];
    const sitelinkSetIds = sitelinkResults.map(
      (result) => result.ids[0] || null,
    );
    const calloutResult =
      exportParts.ads && exportParts.callouts
        ? await addCalloutsInChunks({ settings, draft })
        : { ids: [], warnings: [] };
    const calloutIds = calloutResult.ids.slice(0, 50);

    const ads = exportParts.ads
      ? groups.flatMap((group, groupIndex) =>
          group.ads.slice(0, maxAdsPerGroup).map((ad) => ({
            AdGroupId: adGroupIds[groupIndex],
            TextAd: {
              Title: truncateDirectText(ad.title1, 56),
              Title2: truncateDirectText(ad.title2, 30),
              Text: truncateDirectText(ad.text, 81),
              Mobile: "NO",
              Href: ad.href,
              ...(businessId
                ? { BusinessId: businessId, PreferVCardOverBusiness: "NO" }
                : {}),
              ...(sitelinkSetIds[groupIndex]
                ? { SitelinkSetId: sitelinkSetIds[groupIndex] }
                : {}),
              ...(calloutIds.length ? { AdExtensionIds: calloutIds } : {}),
            },
          })),
        )
      : [];

    const adsResult = ads.length
      ? await addDirectObjectsInChunks(
          "ads",
          "Ads",
          ads,
          settings,
          "Создание объявлений",
          50,
        )
      : { ids: [], warnings: [] };

    const keywords = exportParts.keywords
      ? groups.flatMap((group, groupIndex) =>
          keywordsForGroup(group, maxKeywordsPerGroup).map((keyword) => ({
            AdGroupId: adGroupIds[groupIndex],
            Keyword: keyword,
            Bid: toDirectMoney(defaultSearchBid),
          })),
        )
      : [];

    const keywordResult = keywords.length
      ? await addDirectObjectsInChunks(
          "keywords",
          "Keywords",
          keywords,
          settings,
          "Создание ключевых фраз",
          200,
        )
      : { ids: [], warnings: [] };

    const autotargetingWarnings = await restrictAutotargeting({
      campaignId,
      settings,
    });

    const suspendWarnings = await safeSuspendCampaign(
      campaignId,
      settings,
      "Остановка кампании",
    );

    return {
      campaignId,
      campaignName,
      directUrl: directUrl(campaignId),
      groupsCreated: adGroupIds.length,
      adsCreated: adsResult.ids.length,
      keywordsCreated: keywordResult.ids.length,
      sitelinksCreated: sitelinkResults.reduce(
        (sum, result) => sum + result.ids.length,
        0,
      ),
      calloutsCreated: calloutResult.ids.length,
      mode: "created-suspended",
      regionIds,
      warnings: [
        ...campaignResult.warnings,
        ...adGroupResult.warnings,
        ...sitelinkResults.flatMap((result) => result.warnings),
        ...calloutResult.warnings,
        ...adsResult.warnings,
        ...keywordResult.warnings,
        ...autotargetingWarnings,
        ...suspendWarnings,
      ],
      safety:
        "Кампания, группы, объявления, ключи, дневной бюджет, ручные ставки, регион, график, UTM, минус-слова, быстрые ссылки, уточнения и безопасный автотаргетинг созданы в Direct как черновик. Если Direct держит кампанию в DRAFT/OFF, отдельная остановка не требуется. Показы не запускаются автоматически, перед запуском нужна ручная проверка в кабинете Direct.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Не удалось завершить выгрузку в Direct.";
    try {
      await safeSuspendCampaign(
        campaignId,
        settings,
        "Остановка кампании после ошибки",
      );
    } catch (suspendError) {
      const suspendMessage =
        suspendError instanceof Error
          ? suspendError.message
          : "Direct не подтвердил остановку кампании.";
      throw new Error(
        `${message}. Дополнительно Direct не подтвердил безопасную остановку кампании #${campaignId}: ${suspendMessage}. Проверь кабинет Direct вручную перед запуском бюджета.`,
      );
    }
    throw error;
  }
}
