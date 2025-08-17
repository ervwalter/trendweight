import type { Mode } from "./interfaces";

const numberFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const numberDeltaFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "always",
});

const integerFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const metricFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "unit",
  unit: "kilogram",
});

const imperialFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "unit",
  unit: "pound",
});

const metricDeltaFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "unit",
  unit: "kilogram",
  signDisplay: "always",
});

const imperialDeltaFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "unit",
  unit: "pound",
  signDisplay: "always",
});

const percentFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
});

const percentDeltaFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
  signDisplay: "always",
});

const metricPlannedFormatter = Intl.NumberFormat([], {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  style: "unit",
  unit: "kilogram",
});

interface FormatOptions {
  type: Mode;
  metric?: boolean;
  units?: boolean;
  sign?: boolean;
}

export const formatWeight = (weight: number, metric: boolean, sign = false) => {
  if (metric) {
    if (sign) {
      return metricDeltaFormatter.format(weight);
    } else {
      return metricFormatter.format(weight);
    }
  } else {
    if (sign) {
      return imperialDeltaFormatter.format(weight);
    } else {
      return imperialFormatter.format(weight);
    }
  }
};

export const formatPlannedWeight = (weight: number, metric: boolean) => {
  if (metric) {
    return metricPlannedFormatter.format(weight);
  } else {
    return imperialFormatter.format(weight);
  }
};

export const formatPercent = (decimal: number, sign = false) => {
  if (sign) {
    return percentDeltaFormatter.format(decimal);
  } else {
    return percentFormatter.format(decimal);
  }
};

export const formatNumber = (value: number, sign = false) => {
  if (sign) {
    return numberDeltaFormatter.format(value);
  } else {
    return numberFormatter.format(value);
  }
};

export const formatInteger = (value: number) => {
  return integerFormatter.format(value);
};

export const formatMeasurement: (value: number, options: FormatOptions) => string = (value: number, { type, sign = false, units = true, metric = false }) => {
  if (type === "fatpercent") {
    if (units) {
      return formatPercent(value, sign);
    } else {
      return formatNumber(value * 100, sign);
    }
  } else if (units) {
    return formatWeight(value, metric, sign);
  } else {
    return formatNumber(value, sign);
  }
};
