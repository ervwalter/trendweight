interface ChangeArrowProps {
  change: number
  intendedDirection?: number
}

const ChangeArrow = ({ change, intendedDirection = 0 }: ChangeArrowProps) => {
  let color: string
  
  if (intendedDirection === 0) {
    color = "text-gray-700"
  } else {
    const isGood = change * intendedDirection >= 0
    color = isGood ? "text-green-600" : "text-red-600"
  }
  
  return (
    <span className={color} aria-label={intendedDirection === 0 ? "Neutral change" : change * intendedDirection >= 0 ? "Positive change" : "Negative change"}>
      {change <= 0 ? "↓" : "↑"}
    </span>
  )
}

export default ChangeArrow