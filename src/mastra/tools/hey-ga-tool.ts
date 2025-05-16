import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

type AnalyticsRow = {
  url: string;
  title: string;
  referrer: string;
  city: string;
  country: string;
  views: number;
};

const allowedKeys = ['url', 'title', 'referrer', 'city', 'country'] as const;

type GroupKey = keyof Omit<AnalyticsRow, 'views'>;

const reduceRowsBy = (rows: AnalyticsRow[], key: GroupKey): AnalyticsRow[] => {
  const grouped: Record<string, AnalyticsRow> = rows.reduce(
    (acc: Record<string, AnalyticsRow>, row: AnalyticsRow): Record<string, AnalyticsRow> => {
      const groupKey = row[key];

      // Defensive: skip rows with empty or undefined group key
      if (typeof groupKey !== 'string' || groupKey.trim() === '') {
        return acc;
      }

      if (!acc[groupKey]) {
        // Initialize with current row (no need to reset fields to empty)
        acc[groupKey] = { ...row };
        acc[groupKey].views = 0; // Start views count from zero
      }

      acc[groupKey].views += row.views;

      return acc;
    },
    {}
  );

  return Object.values(grouped);
};

export const heyGaTool = createTool({
  id: 'get-analytics',
  description: 'Get page views',
  inputSchema: z.object({
    range: z.string().describe('Start date for the query'),
    key: z.enum(allowedKeys),
  }),
  outputSchema: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      referrer: z.string(),
      city: z.string(),
      country: z.string(),
      views: z.number(),
    })
  ),
  execute: async ({ context }) => {
    if (typeof context.range !== 'string') {
      throw new Error(`Expected range to be a string, got ${typeof context.range}`);
    }
    return await getAnalytics(context.range, context.key);
  },
});

const getAnalytics = async (range: string, key: GroupKey): Promise<AnalyticsRow[]> => {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64!, 'base64').toString('utf-8')
  );

  const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });

  const isRelativeRange = (val: string) => {
    return /^\d+(days|weeks|months|years)Ago$/i.test(val);
  };
  const isAbsoluteDate = (val: string) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  };

  const normalizeRange = (raw: string) => {
    return raw.replace(/(days|weeks|months|years)Ago/i, (match) => {
      const parts = match.toLowerCase().split('ago');
      return `${parts[0]}Ago`;
    });
  };

  if (!isRelativeRange(range) && !isAbsoluteDate(range)) {
    throw new Error(`Invalid date format: ${range}`);
  }

  const safeRange = isRelativeRange(range) ? normalizeRange(range) : range;

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${process.env.GA4_PROPERTY_ID}`,
    dateRanges: [
      {
        startDate: safeRange,
        endDate: 'today',
      },
    ],
    dimensions: [
      { name: 'fullPageUrl' },
      { name: 'pageTitle' },
      { name: 'pageReferrer' },
      { name: 'city' },
      { name: 'country' },
    ],
    metrics: [{ name: 'totalUsers' }],
  });

  const rows =
    response.rows?.map((row) => ({
      url: row.dimensionValues?.[0]?.value ?? '',
      title: row.dimensionValues?.[1]?.value ?? '',
      referrer: row.dimensionValues?.[2]?.value ?? '',
      city: row.dimensionValues?.[3]?.value ?? '',
      country: row.dimensionValues?.[4]?.value ?? '',
      views: Number(row.metricValues?.[0]?.value ?? '0'),
    })) ?? [];

  const aggregated = reduceRowsBy(rows, key);

  return aggregated;
};
