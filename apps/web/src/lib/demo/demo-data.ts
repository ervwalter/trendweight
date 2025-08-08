import type { ApiSourceData, MeasurementsResponse, ProviderSyncStatus } from "../api/types";
import type { ProfileData } from "../core/interfaces";

// Demo profile data
export const demoProfile: ProfileData = {
  firstName: "Sample User",
  goalStart: "2024-01-01", // Will be adjusted at runtime
  goalWeight: 195, // Goal weight in lbs (user's units)
  plannedPoundsPerWeek: -1,
  dayStartOffset: 3, // 3 AM
  useMetric: false,
  showCalories: true,
  sharingToken: undefined,
};

// Convert lbs to kg for storage
const lbsToKg = (lbs: number) => lbs * 0.453592;

// Demo measurements - 184 non-interpolated entries from real data
// Original date range: 2011-03-23 to 2011-11-03
// These will be shifted to end on "today" at runtime
const demoMeasurementsWithDates = [
  {
    date: "2011-03-23",
    time: "07:00:00",
    weight: 219.3,
    fatRatio: 0.3382,
  },
  {
    date: "2011-03-24",
    time: "07:00:00",
    weight: 218.1,
    fatRatio: 0.33649999999999997,
  },
  {
    date: "2011-03-25",
    time: "07:00:00",
    weight: 217.7,
    fatRatio: 0.33509999999999995,
  },
  {
    date: "2011-03-26",
    time: "07:00:00",
    weight: 218.4,
    fatRatio: 0.3312,
  },
  {
    date: "2011-03-27",
    time: "07:00:00",
    weight: 217.7,
    fatRatio: 0.3273,
  },
  {
    date: "2011-03-28",
    time: "07:00:00",
    weight: 216.7,
    fatRatio: 0.3325,
  },
  {
    date: "2011-03-29",
    time: "07:00:00",
    weight: 217.1,
    fatRatio: 0.32280000000000003,
  },
  {
    date: "2011-03-30",
    time: "07:00:00",
    weight: 216.5,
    fatRatio: 0.3155,
  },
  {
    date: "2011-03-31",
    time: "07:00:00",
    weight: 216.6,
    fatRatio: 0.3307,
  },
  {
    date: "2011-04-01",
    time: "07:00:00",
    weight: 215.5,
    fatRatio: 0.3154,
  },
  {
    date: "2011-04-02",
    time: "07:00:00",
    weight: 216.1,
    fatRatio: 0.3196,
  },
  {
    date: "2011-04-03",
    time: "07:00:00",
    weight: 215.4,
    fatRatio: 0.3188,
  },
  {
    date: "2011-04-04",
    time: "07:00:00",
    weight: 215.9,
    fatRatio: 0.3165,
  },
  {
    date: "2011-04-05",
    time: "07:00:00",
    weight: 214.4,
    fatRatio: 0.3147,
  },
  {
    date: "2011-04-06",
    time: "07:00:00",
    weight: 213.8,
    fatRatio: 0.31370000000000003,
  },
  {
    date: "2011-04-07",
    time: "07:00:00",
    weight: 213.7,
    fatRatio: 0.31620000000000004,
  },
  {
    date: "2011-04-08",
    time: "07:00:00",
    weight: 213.1,
    fatRatio: 0.3145,
  },
  {
    date: "2011-04-09",
    time: "07:00:00",
    weight: 212.9,
    fatRatio: 0.3116,
  },
  {
    date: "2011-04-10",
    time: "07:00:00",
    weight: 212.5,
    fatRatio: 0.3049,
  },
  {
    date: "2011-04-11",
    time: "07:00:00",
    weight: 212,
    fatRatio: 0.3132,
  },
  {
    date: "2011-04-12",
    time: "07:00:00",
    weight: 212.6,
    fatRatio: 0.31739999999999996,
  },
  {
    date: "2011-04-13",
    time: "07:00:00",
    weight: 212.3,
    fatRatio: 0.3143,
  },
  {
    date: "2011-04-14",
    time: "07:00:00",
    weight: 212.8,
    fatRatio: 0.3143,
  },
  {
    date: "2011-04-15",
    time: "07:00:00",
    weight: 212.8,
    fatRatio: 0.3099,
  },
  {
    date: "2011-04-16",
    time: "07:00:00",
    weight: 213.3,
    fatRatio: 0.3166,
  },
  {
    date: "2011-04-17",
    time: "07:00:00",
    weight: 211,
    fatRatio: 0.3075,
  },
  {
    date: "2011-04-18",
    time: "07:00:00",
    weight: 210.9,
    fatRatio: 0.30870000000000003,
  },
  {
    date: "2011-04-19",
    time: "07:00:00",
    weight: 211.4,
    fatRatio: 0.3096,
  },
  {
    date: "2011-04-21",
    time: "07:00:00",
    weight: 210.7,
    fatRatio: 0.3059,
  },
  {
    date: "2011-04-23",
    time: "07:00:00",
    weight: 210.3,
    fatRatio: 0.3115,
  },
  {
    date: "2011-04-27",
    time: "07:00:00",
    weight: 210.4,
    fatRatio: 0.3071,
  },
  {
    date: "2011-04-28",
    time: "07:00:00",
    weight: 209.4,
    fatRatio: 0.3031,
  },
  {
    date: "2011-04-29",
    time: "07:00:00",
    weight: 210.5,
    fatRatio: 0.3053,
  },
  {
    date: "2011-04-30",
    time: "07:00:00",
    weight: 210.1,
    fatRatio: 0.2999,
  },
  {
    date: "2011-05-01",
    time: "07:00:00",
    weight: 208.9,
    fatRatio: 0.2969,
  },
  {
    date: "2011-05-02",
    time: "07:00:00",
    weight: 209.3,
    fatRatio: 0.3032,
  },
  {
    date: "2011-05-03",
    time: "07:00:00",
    weight: 210.1,
    fatRatio: 0.31010000000000004,
  },
  {
    date: "2011-05-04",
    time: "07:00:00",
    weight: 209.5,
    fatRatio: 0.30010000000000003,
  },
  {
    date: "2011-05-05",
    time: "07:00:00",
    weight: 209.7,
    fatRatio: 0.3128,
  },
  {
    date: "2011-05-06",
    time: "07:00:00",
    weight: 209.3,
    fatRatio: 0.3079,
  },
  {
    date: "2011-05-07",
    time: "07:00:00",
    weight: 208.5,
    fatRatio: 0.3049,
  },
  {
    date: "2011-05-11",
    time: "07:00:00",
    weight: 209.3,
    fatRatio: 0.308,
  },
  {
    date: "2011-05-12",
    time: "07:00:00",
    weight: 209.9,
    fatRatio: 0.30670000000000003,
  },
  {
    date: "2011-05-15",
    time: "07:00:00",
    weight: 209.5,
    fatRatio: 0.3045,
  },
  {
    date: "2011-05-16",
    time: "07:00:00",
    weight: 209.6,
    fatRatio: 0.3048,
  },
  {
    date: "2011-05-17",
    time: "07:00:00",
    weight: 208.7,
    fatRatio: 0.3015,
  },
  {
    date: "2011-05-19",
    time: "07:00:00",
    weight: 209.2,
    fatRatio: 0.3086,
  },
  {
    date: "2011-05-21",
    time: "07:00:00",
    weight: 209.6,
    fatRatio: 0.2912,
  },
  {
    date: "2011-05-24",
    time: "07:00:00",
    weight: 209.2,
    fatRatio: 0.30079999999999996,
  },
  {
    date: "2011-05-25",
    time: "07:00:00",
    weight: 210.1,
    fatRatio: 0.3182,
  },
  {
    date: "2011-05-26",
    time: "07:00:00",
    weight: 210.1,
    fatRatio: 0.3068,
  },
  {
    date: "2011-05-27",
    time: "07:00:00",
    weight: 209.4,
    fatRatio: 0.3055,
  },
  {
    date: "2011-05-28",
    time: "07:00:00",
    weight: 209.3,
    fatRatio: 0.2983,
  },
  {
    date: "2011-05-31",
    time: "07:00:00",
    weight: 208.9,
    fatRatio: 0.2945,
  },
  {
    date: "2011-06-01",
    time: "07:00:00",
    weight: 210.1,
    fatRatio: 0.2944,
  },
  {
    date: "2011-06-02",
    time: "07:00:00",
    weight: 209.5,
    fatRatio: 0.3003,
  },
  {
    date: "2011-06-03",
    time: "07:00:00",
    weight: 209.5,
    fatRatio: 0.2977,
  },
  {
    date: "2011-06-04",
    time: "07:00:00",
    weight: 209.2,
    fatRatio: 0.29710000000000003,
  },
  {
    date: "2011-06-06",
    time: "07:00:00",
    weight: 211.3,
    fatRatio: 0.3091,
  },
  {
    date: "2011-06-08",
    time: "07:00:00",
    weight: 210.9,
    fatRatio: 0.307,
  },
  {
    date: "2011-06-09",
    time: "07:00:00",
    weight: 210.6,
    fatRatio: 0.3145,
  },
  {
    date: "2011-06-10",
    time: "07:00:00",
    weight: 211,
    fatRatio: 0.31370000000000003,
  },
  {
    date: "2011-06-11",
    time: "07:00:00",
    weight: 211.4,
    fatRatio: 0.31170000000000003,
  },
  {
    date: "2011-06-13",
    time: "07:00:00",
    weight: 209.2,
    fatRatio: 0.2989,
  },
  {
    date: "2011-06-14",
    time: "07:00:00",
    weight: 209.4,
    fatRatio: 0.2986,
  },
  {
    date: "2011-06-15",
    time: "07:00:00",
    weight: 208.6,
    fatRatio: 0.3011,
  },
  {
    date: "2011-06-18",
    time: "07:00:00",
    weight: 209.1,
    fatRatio: 0.3072,
  },
  {
    date: "2011-06-19",
    time: "07:00:00",
    weight: 208.8,
    fatRatio: 0.3009,
  },
  {
    date: "2011-06-20",
    time: "07:00:00",
    weight: 209.5,
    fatRatio: 0.2961,
  },
  {
    date: "2011-06-21",
    time: "07:00:00",
    weight: 208.8,
    fatRatio: 0.3019,
  },
  {
    date: "2011-06-22",
    time: "07:00:00",
    weight: 207.8,
    fatRatio: 0.303,
  },
  {
    date: "2011-06-23",
    time: "07:00:00",
    weight: 207.7,
    fatRatio: 0.2999,
  },
  {
    date: "2011-06-24",
    time: "07:00:00",
    weight: 208.5,
    fatRatio: 0.30079999999999996,
  },
  {
    date: "2011-06-25",
    time: "07:00:00",
    weight: 208,
    fatRatio: 0.2979,
  },
  {
    date: "2011-06-28",
    time: "07:00:00",
    weight: 206.8,
    fatRatio: 0.2874,
  },
  {
    date: "2011-06-29",
    time: "07:00:00",
    weight: 206.9,
    fatRatio: 0.29469999999999996,
  },
  {
    date: "2011-07-01",
    time: "07:00:00",
    weight: 206.6,
    fatRatio: 0.2939,
  },
  {
    date: "2011-07-02",
    time: "07:00:00",
    weight: 206.7,
    fatRatio: 0.2953,
  },
  {
    date: "2011-07-03",
    time: "07:00:00",
    weight: 207,
    fatRatio: 0.2921,
  },
  {
    date: "2011-07-04",
    time: "07:00:00",
    weight: 206.4,
    fatRatio: 0.2938,
  },
  {
    date: "2011-07-05",
    time: "07:00:00",
    weight: 205.5,
    fatRatio: 0.297,
  },
  {
    date: "2011-07-06",
    time: "07:00:00",
    weight: 207.1,
    fatRatio: 0.29410000000000003,
  },
  {
    date: "2011-07-07",
    time: "07:00:00",
    weight: 206,
    fatRatio: 0.2969,
  },
  {
    date: "2011-07-08",
    time: "07:00:00",
    weight: 205.8,
    fatRatio: 0.2858,
  },
  {
    date: "2011-07-09",
    time: "07:00:00",
    weight: 204.4,
    fatRatio: 0.294,
  },
  {
    date: "2011-07-10",
    time: "07:00:00",
    weight: 206,
    fatRatio: 0.2877,
  },
  {
    date: "2011-07-11",
    time: "07:00:00",
    weight: 206.4,
    fatRatio: 0.28800000000000003,
  },
  {
    date: "2011-07-12",
    time: "07:00:00",
    weight: 206.3,
    fatRatio: 0.2961,
  },
  {
    date: "2011-07-13",
    time: "07:00:00",
    weight: 205.7,
    fatRatio: 0.2887,
  },
  {
    date: "2011-07-14",
    time: "07:00:00",
    weight: 206.4,
    fatRatio: 0.2859,
  },
  {
    date: "2011-07-15",
    time: "07:00:00",
    weight: 205.1,
    fatRatio: 0.2818,
  },
  {
    date: "2011-07-16",
    time: "07:00:00",
    weight: 206,
    fatRatio: 0.2872,
  },
  {
    date: "2011-07-17",
    time: "07:00:00",
    weight: 205.5,
    fatRatio: 0.2956,
  },
  {
    date: "2011-07-18",
    time: "07:00:00",
    weight: 204.9,
    fatRatio: 0.2969,
  },
  {
    date: "2011-07-19",
    time: "07:00:00",
    weight: 204.4,
    fatRatio: 0.2989,
  },
  {
    date: "2011-07-20",
    time: "07:00:00",
    weight: 204.4,
    fatRatio: 0.2847,
  },
  {
    date: "2011-07-21",
    time: "07:00:00",
    weight: 204.1,
    fatRatio: 0.28809999999999997,
  },
  {
    date: "2011-07-22",
    time: "07:00:00",
    weight: 204.7,
    fatRatio: 0.2917,
  },
  {
    date: "2011-07-23",
    time: "07:00:00",
    weight: 203.4,
    fatRatio: 0.2826,
  },
  {
    date: "2011-07-24",
    time: "07:00:00",
    weight: 204.5,
    fatRatio: 0.2834,
  },
  {
    date: "2011-07-25",
    time: "07:00:00",
    weight: 204.2,
    fatRatio: 0.28559999999999997,
  },
  {
    date: "2011-07-26",
    time: "07:00:00",
    weight: 204.6,
    fatRatio: 0.2809,
  },
  {
    date: "2011-07-27",
    time: "07:00:00",
    weight: 203.9,
    fatRatio: 0.293,
  },
  {
    date: "2011-07-28",
    time: "07:00:00",
    weight: 203.6,
    fatRatio: 0.281,
  },
  {
    date: "2011-07-29",
    time: "07:00:00",
    weight: 204,
    fatRatio: 0.28350000000000003,
  },
  {
    date: "2011-07-30",
    time: "07:00:00",
    weight: 203.9,
    fatRatio: 0.2903,
  },
  {
    date: "2011-08-02",
    time: "07:00:00",
    weight: 204.3,
    fatRatio: 0.2949,
  },
  {
    date: "2011-08-03",
    time: "07:00:00",
    weight: 203.8,
    fatRatio: 0.2734,
  },
  {
    date: "2011-08-04",
    time: "07:00:00",
    weight: 204.1,
    fatRatio: 0.2868,
  },
  {
    date: "2011-08-05",
    time: "07:00:00",
    weight: 203.9,
    fatRatio: 0.2799,
  },
  {
    date: "2011-08-06",
    time: "07:00:00",
    weight: 204.8,
    fatRatio: 0.2852,
  },
  {
    date: "2011-08-07",
    time: "07:00:00",
    weight: 204.9,
    fatRatio: 0.2917,
  },
  {
    date: "2011-08-08",
    time: "07:00:00",
    weight: 203.6,
    fatRatio: 0.2865,
  },
  {
    date: "2011-08-09",
    time: "07:00:00",
    weight: 204.2,
    fatRatio: 0.289,
  },
  {
    date: "2011-08-10",
    time: "07:00:00",
    weight: 204.8,
    fatRatio: 0.2969,
  },
  {
    date: "2011-08-11",
    time: "07:00:00",
    weight: 204.7,
    fatRatio: 0.2901,
  },
  {
    date: "2011-08-12",
    time: "07:00:00",
    weight: 203.1,
    fatRatio: 0.28809999999999997,
  },
  {
    date: "2011-08-13",
    time: "07:00:00",
    weight: 204.4,
    fatRatio: 0.2962,
  },
  {
    date: "2011-08-15",
    time: "07:00:00",
    weight: 206.1,
    fatRatio: 0.2932,
  },
  {
    date: "2011-08-18",
    time: "07:00:00",
    weight: 205,
    fatRatio: 0.28600000000000003,
  },
  {
    date: "2011-08-19",
    time: "07:00:00",
    weight: 206,
    fatRatio: 0.2923,
  },
  {
    date: "2011-08-20",
    time: "07:00:00",
    weight: 206.1,
    fatRatio: 0.2913,
  },
  {
    date: "2011-08-23",
    time: "07:00:00",
    weight: 204.3,
    fatRatio: 0.2893,
  },
  {
    date: "2011-08-24",
    time: "07:00:00",
    weight: 205,
    fatRatio: 0.28859999999999997,
  },
  {
    date: "2011-08-25",
    time: "07:00:00",
    weight: 205.2,
    fatRatio: 0.285,
  },
  {
    date: "2011-08-27",
    time: "07:00:00",
    weight: 204.6,
    fatRatio: 0.2812,
  },
  {
    date: "2011-08-30",
    time: "07:00:00",
    weight: 204.9,
    fatRatio: 0.2862,
  },
  {
    date: "2011-08-31",
    time: "07:00:00",
    weight: 204,
    fatRatio: 0.2836,
  },
  {
    date: "2011-09-01",
    time: "07:00:00",
    weight: 204.2,
    fatRatio: 0.2857,
  },
  {
    date: "2011-09-02",
    time: "07:00:00",
    weight: 203.8,
    fatRatio: 0.29109999999999997,
  },
  {
    date: "2011-09-03",
    time: "07:00:00",
    weight: 203.9,
    fatRatio: 0.2787,
  },
  {
    date: "2011-09-04",
    time: "07:00:00",
    weight: 203.2,
    fatRatio: 0.2772,
  },
  {
    date: "2011-09-06",
    time: "07:00:00",
    weight: 203.8,
    fatRatio: 0.2827,
  },
  {
    date: "2011-09-07",
    time: "07:00:00",
    weight: 203,
    fatRatio: 0.2748,
  },
  {
    date: "2011-09-08",
    time: "07:00:00",
    weight: 202.5,
    fatRatio: 0.2767,
  },
  {
    date: "2011-09-09",
    time: "07:00:00",
    weight: 203.2,
    fatRatio: 0.2876,
  },
  {
    date: "2011-09-10",
    time: "07:00:00",
    weight: 202.6,
    fatRatio: 0.2859,
  },
  {
    date: "2011-09-11",
    time: "07:00:00",
    weight: 202.7,
    fatRatio: 0.2729,
  },
  {
    date: "2011-09-12",
    time: "07:00:00",
    weight: 202.2,
    fatRatio: 0.2731,
  },
  {
    date: "2011-09-13",
    time: "07:00:00",
    weight: 202.4,
    fatRatio: 0.27899999999999997,
  },
  {
    date: "2011-09-16",
    time: "07:00:00",
    weight: 202.3,
    fatRatio: 0.27399999999999997,
  },
  {
    date: "2011-09-17",
    time: "07:00:00",
    weight: 201.8,
    fatRatio: 0.28059999999999996,
  },
  {
    date: "2011-09-21",
    time: "07:00:00",
    weight: 199.7,
    fatRatio: 0.2696,
  },
  {
    date: "2011-09-22",
    time: "07:00:00",
    weight: 201.5,
    fatRatio: 0.2832,
  },
  {
    date: "2011-09-23",
    time: "07:00:00",
    weight: 200.2,
    fatRatio: 0.2647,
  },
  {
    date: "2011-09-24",
    time: "07:00:00",
    weight: 201.1,
    fatRatio: 0.2809,
  },
  {
    date: "2011-09-25",
    time: "07:00:00",
    weight: 201.6,
    fatRatio: 0.281,
  },
  {
    date: "2011-09-26",
    time: "07:00:00",
    weight: 199.9,
    fatRatio: 0.2832,
  },
  {
    date: "2011-09-27",
    time: "07:00:00",
    weight: 200.7,
    fatRatio: 0.2647,
  },
  {
    date: "2011-09-28",
    time: "07:00:00",
    weight: 200.4,
    fatRatio: 0.2792,
  },
  {
    date: "2011-09-29",
    time: "07:00:00",
    weight: 199.5,
    fatRatio: 0.276,
  },
  {
    date: "2011-09-30",
    time: "07:00:00",
    weight: 200.8,
    fatRatio: 0.2609,
  },
  {
    date: "2011-10-01",
    time: "07:00:00",
    weight: 199.9,
    fatRatio: 0.2734,
  },
  {
    date: "2011-10-02",
    time: "07:00:00",
    weight: 198.6,
    fatRatio: 0.2539,
  },
  {
    date: "2011-10-03",
    time: "07:00:00",
    weight: 199.1,
    fatRatio: 0.2614,
  },
  {
    date: "2011-10-04",
    time: "07:00:00",
    weight: 197.5,
    fatRatio: 0.25670000000000004,
  },
  {
    date: "2011-10-05",
    time: "07:00:00",
    weight: 197.9,
    fatRatio: 0.27140000000000003,
  },
  {
    date: "2011-10-06",
    time: "07:00:00",
    weight: 197.3,
    fatRatio: 0.2561,
  },
  {
    date: "2011-10-07",
    time: "07:00:00",
    weight: 198,
    fatRatio: 0.2664,
  },
  {
    date: "2011-10-08",
    time: "07:00:00",
    weight: 198.4,
    fatRatio: 0.2555,
  },
  {
    date: "2011-10-11",
    time: "07:00:00",
    weight: 198.3,
    fatRatio: 0.27,
  },
  {
    date: "2011-10-12",
    time: "07:00:00",
    weight: 197.5,
    fatRatio: 0.2571,
  },
  {
    date: "2011-10-13",
    time: "07:00:00",
    weight: 197.2,
    fatRatio: 0.2635,
  },
  {
    date: "2011-10-14",
    time: "07:00:00",
    weight: 198.1,
    fatRatio: 0.2645,
  },
  {
    date: "2011-10-15",
    time: "07:00:00",
    weight: 196.6,
    fatRatio: 0.2552,
  },
  {
    date: "2011-10-16",
    time: "07:00:00",
    weight: 196.4,
    fatRatio: 0.2621,
  },
  {
    date: "2011-10-17",
    time: "07:00:00",
    weight: 196.4,
    fatRatio: 0.2462,
  },
  {
    date: "2011-10-18",
    time: "07:00:00",
    weight: 196.1,
    fatRatio: 0.2619,
  },
  {
    date: "2011-10-19",
    time: "07:00:00",
    weight: 195.4,
    fatRatio: 0.2491,
  },
  {
    date: "2011-10-20",
    time: "07:00:00",
    weight: 196.2,
    fatRatio: 0.2475,
  },
  {
    date: "2011-10-21",
    time: "07:00:00",
    weight: 195.7,
    fatRatio: 0.2565,
  },
  {
    date: "2011-10-22",
    time: "07:00:00",
    weight: 196.7,
    fatRatio: 0.2583,
  },
  {
    date: "2011-10-23",
    time: "07:00:00",
    weight: 195.7,
    fatRatio: 0.2519,
  },
  {
    date: "2011-10-24",
    time: "07:00:00",
    weight: 195.6,
    fatRatio: 0.2528,
  },
  {
    date: "2011-10-25",
    time: "07:00:00",
    weight: 196.1,
    fatRatio: 0.2587,
  },
  {
    date: "2011-10-26",
    time: "07:00:00",
    weight: 196.7,
    fatRatio: 0.2546,
  },
  {
    date: "2011-10-27",
    time: "07:00:00",
    weight: 196.6,
    fatRatio: 0.24760000000000001,
  },
  {
    date: "2011-10-28",
    time: "07:00:00",
    weight: 197.3,
    fatRatio: 0.2582,
  },
  {
    date: "2011-10-29",
    time: "07:00:00",
    weight: 195.1,
    fatRatio: 0.2488,
  },
  {
    date: "2011-10-30",
    time: "07:00:00",
    weight: 195.6,
    fatRatio: 0.2566,
  },
  {
    date: "2011-10-31",
    time: "07:00:00",
    weight: 195,
    fatRatio: 0.24969999999999998,
  },
  {
    date: "2011-11-01",
    time: "07:00:00",
    weight: 196.1,
    fatRatio: 0.25079999999999997,
  },
  {
    date: "2011-11-02",
    time: "07:00:00",
    weight: 196,
    fatRatio: 0.25670000000000004,
  },
  {
    date: "2011-11-03",
    time: "07:00:00",
    weight: 195.3,
    fatRatio: 0.25420000000000004,
  },
];

// Convert weights to kg and prepare raw measurements
export const demoMeasurements = demoMeasurementsWithDates.map((m) => ({
  date: m.date,
  time: m.time,
  weight: lbsToKg(m.weight),
  ...(m.fatRatio !== undefined && { fatRatio: m.fatRatio }),
}));

// Demo provider status (all good)
export const demoProviderStatus: Record<string, ProviderSyncStatus> = {
  fitbit: {
    success: true,
  },
};

// Function to get demo data with current dates
export function getDemoData(): MeasurementsResponse {
  const today = new Date();

  // Calculate the offset between the original last date and today
  const originalLastDate = new Date(demoMeasurements[demoMeasurements.length - 1].date);
  const daysDiff = Math.floor((today.getTime() - originalLastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Adjust measurement dates by adding the offset
  const measurementsWithAdjustedDates = demoMeasurements.map((measurement) => {
    const originalDate = new Date(measurement.date);
    const adjustedDate = new Date(originalDate);
    adjustedDate.setDate(adjustedDate.getDate() + daysDiff);

    return {
      ...measurement,
      date: adjustedDate.toISOString().split("T")[0],
    };
  });

  // Create source data
  const sourceData: ApiSourceData = {
    source: "fitbit",
    lastUpdate: new Date().toISOString(),
    measurements: measurementsWithAdjustedDates,
  };

  return {
    data: [sourceData],
    providerStatus: demoProviderStatus,
  };
}

// Function to get demo profile with adjusted dates
export function getDemoProfile(): ProfileData {
  // Calculate the offset to adjust the goal start date
  const today = new Date();
  const originalLastDate = new Date(demoMeasurements[demoMeasurements.length - 1].date);
  const daysDiff = Math.floor((today.getTime() - originalLastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Adjust the original start date from the data
  const originalStartDate = new Date(demoMeasurements[0].date);
  const adjustedStartDate = new Date(originalStartDate);
  adjustedStartDate.setDate(adjustedStartDate.getDate() + daysDiff);

  return {
    ...demoProfile,
    goalStart: adjustedStartDate.toISOString().split("T")[0],
  };
}
