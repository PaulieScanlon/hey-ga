import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

const AnalyticsRowSchema = z.object({
  url: z.string(),
  title: z.string(),
  referrer: z.string(),
  city: z.string(),
  country: z.string(),
  browser: z.string(),
  views: z.number()
});

type AnalyticsRow = z.infer<typeof AnalyticsRowSchema>;
type GroupKey = keyof Omit<AnalyticsRow, "views">;

const reduceRowsBy = (rows: AnalyticsRow[], key: GroupKey): AnalyticsRow[] => {
  const grouped: Record<string, AnalyticsRow> = rows.reduce(
    (acc, row) => {
      const groupKey = row[key];
      if (typeof groupKey !== "string" || groupKey.trim() === "") return acc;

      if (!acc[groupKey]) {
        acc[groupKey] = { ...row, views: 0 };
      }

      acc[groupKey].views += row.views;
      return acc;
    },
    {} as Record<string, AnalyticsRow>
  );

  return Object.values(grouped);
};

export const heyGaTool = createTool({
  id: "get-analytics",
  description: "Get page views",
  inputSchema: z.object({
    range: z.string().describe("Start date for the query")
  }),
  outputSchema: z.array(AnalyticsRowSchema),
  execute: async ({ context }) => {
    if (typeof context.range !== "string") {
      throw new Error(
        `Expected range to be a string, got ${typeof context.range}`
      );
    }
    return await getAnalytics(context.range);
  }
});

const getAnalytics = async (range: string): Promise<AnalyticsRow[]> => {
  const credentials = JSON.parse(
    Buffer.from(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64!,
      "base64"
    ).toString("utf-8")
  );

  const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });

  const isRelativeRange = (val: string) =>
    /^\d+(days|weeks|months|years)Ago$/i.test(val);
  const isAbsoluteDate = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);
  const normalizeRange = (raw: string) =>
    raw.replace(/(days|weeks|months|years)Ago/i, (match) => {
      const parts = match.toLowerCase().split("ago");
      return `${parts[0]}Ago`;
    });

  if (!isRelativeRange(range) && !isAbsoluteDate(range)) {
    throw new Error(`Invalid date format: ${range}`);
  }

  const safeRange = isRelativeRange(range) ? normalizeRange(range) : range;

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${process.env.GA4_PROPERTY_ID}`,
    dateRanges: [{ startDate: safeRange, endDate: "today" }],
    dimensions: [
      { name: "fullPageUrl" },
      { name: "pageTitle" },
      { name: "pageReferrer" },
      { name: "city" },
      { name: "country" },
      { name: "browser" }
    ],
    metrics: [{ name: "totalUsers" }]
  });

  const rows =
    response.rows?.map(
      (row): AnalyticsRow => ({
        url: row.dimensionValues?.[0]?.value ?? "",
        title: row.dimensionValues?.[1]?.value ?? "",
        referrer: row.dimensionValues?.[2]?.value ?? "",
        city: row.dimensionValues?.[3]?.value ?? "",
        country: row.dimensionValues?.[4]?.value ?? "",
        browser: row.dimensionValues?.[5]?.value ?? "",
        views: Number(row.metricValues?.[0]?.value ?? "0")
      })
    ) ?? [];

  return reduceRowsBy(rows, "url");
};
