interface ChangeArrowProps {
  change: number;
  intendedDirection?: number;
}

const ChangeArrow = ({ change, intendedDirection = 0 }: ChangeArrowProps) => {
  // No change means no direction to point in
  if (change === 0) {
    return null;
  }

  let color: string;

  if (intendedDirection === 0) {
    color = "text-foreground/80";
  } else {
    const isGood = change * intendedDirection > 0;
    color = isGood ? "text-success" : "text-destructive";
  }

  return (
    <span className={color} aria-label={intendedDirection === 0 ? "Neutral change" : change * intendedDirection > 0 ? "Positive change" : "Negative change"}>
      {change < 0 ? "↓" : "↑"}
    </span>
  );
};

export default ChangeArrow;
