import type { ConditionBucket } from "@prisma/client";

export type CardMarketView = {
  card: {
    id: string;
    name: string;
    setName: string | null;
    cardNumber: string | null;
    imageSmall: string;
    imageLarge: string;
    normalizedCardKey: string;
  };
  conditionBucket: ConditionBucket;
  avgPrice: number;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  listingsCount: number;
  lastUpdated: Date;
  isStale: boolean;
  isRefreshing: boolean;
  listings: Array<{
    title: string;
    source: string;
    soldPrice: number;
    soldDate: Date;
    listingUrl: string;
    conditionLabel: string | null;
    gradeLabel: string | null;
    rawOrGraded: string | null;
    position: number;
  }>;
};

