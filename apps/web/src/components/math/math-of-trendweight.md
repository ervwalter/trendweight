# The Math Behind TrendWeight

## The TrendWeight Dashboard

The TrendWeight dashboard presents a lot of information – current weight, trend weight, daily change, weekly loss rate, goal predictions, calorie estimates, and more. With all these numbers and charts, it can be overwhelming at first glance. Before diving into using these features, it's worth taking a step back to understand the challenge they're designed to solve and how they work together to give you meaningful insights into your weight loss journey.

## Weight Tracking is Hard

### The Daily Weight Problem

If you've ever tried to track your weight, you know the frustration. You eat perfectly for a week, exercise regularly, and then step on the scale to find you've "gained" 2 pounds. The next day, without changing anything, you're down 3 pounds. What's going on?

Your body weight fluctuates dramatically from day to day due to:

- **Water retention**: Salty meals, hormones, and exercise all affect water storage
- **Food in transit**: The physical weight of food in your digestive system
- **Bathroom timing**: When you last used the bathroom
- **Glycogen storage**: Your body's quick-energy reserves bind with water

These fluctuations can be 3-5 pounds in a single day, while actual fat loss might only be 1-2 pounds per _week_. The daily "noise" drowns out the weekly "signal" of real progress.

### Enter the Trend Line

Math can help with this problem. TrendWeight calculates a **trend line** - a smooth curve that filters out the daily noise to reveal your true weight direction. Think of it like this:

- **Daily weights** = Bumpy dirt road
- **Trend line** = Smooth highway running through the middle

The trend line uses a mathematical technique called "exponential smoothing" that:

1. Gives more weight to recent measurements
2. Still remembers older measurements (but counts them less)
3. Smoothly adjusts to real changes while ignoring temporary spikes

### The Simple Formula

At its heart, TrendWeight uses this formula every day:

**New Trend = Old Trend + 0.1 × (Today's Weight - Old Trend)**

In plain English: "Move the trend 10% of the way toward today's weight."

**Example**:

- Yesterday's trend: 150.0 lbs
- Today's weight: 152.0 lbs (maybe you had salty food)
- New trend: 150.0 + 0.1 × (152.0 - 150.0) = 150.2 lbs

The 2-pound spike only moved your trend by 0.2 pounds. If it's real weight gain, the trend will keep climbing. If it's just water, tomorrow's lower weight will pull it back down.

### What You See on the Dashboard

The centerpiece of your dashboard is the weight chart. When you look at it, you'll notice there's a main line with diamond-shaped points scattered above and below it, each connected to the line by a vertical "string." These elements represent:

- **Diamond points**: Your actual daily scale readings
- **Main line (trend)**: The calculated trend that filters out daily noise
- **Vertical strings**: The difference between your actual weight and the trend

Think of the points below the line as "sinkers" that seem to pull the trend downward, and points above as "floaters" that appear to pull it upward. When you're losing weight, you'll have more sinkers than floaters, gradually bringing the trend line down. This visualization helps you see that weight loss isn't about every day being lower – it's about having more down days than up days over time.

The trend line is what matters – it reveals whether you're actually losing, gaining, or maintaining weight by smoothing out the day-to-day fluctuations.

The other numbers on your dashboard come from mathematical analysis of this trend line:

- **Current Weight**: Your latest trend value (not today's actual weight)
- **Loss per Week**: How fast your trend line is going down
- **Time Comparisons**: How your trend today compares to last week
- **Goal Predictions**: When you'll reach your goal at current rate
- **Calorie Estimates**: How many calories you're burning based on weight loss rate

## Common Questions About the Math

### "Why does my trend weight differ from my actual weight?"

Your trend weight is intentionally different - it's the "smoothed" version that filters out daily noise.

**The math**: Each day's influence on the trend decreases exponentially:

- Today: 10% influence
- Yesterday: 9% (90% of 10%)
- 2 days ago: 8.1% (90% of 9%)
- 3 days ago: 7.29% (90% of 8.1%)
- And so on...

This means a single day's weight can never drastically change your trend, protecting you from false signals.

### "How is my weight loss rate calculated?"

TrendWeight doesn't just subtract two weights - it uses **linear regression** on your recent trend values.

**Simple explanation**: It finds the "best fit" straight line through your last 14 days of trend data, then calculates that line's slope.

**Why this matters**: This method handles irregular weighing patterns and gives a statistically sound rate that's not thrown off by any single measurement.

### "Where do the calorie numbers come from?"

The calculation uses the scientific approximation that **1 pound of fat = 3,500 calories**.

**Example math**:

- Losing 1.5 lbs/week
- That's 1.5 × 3,500 = 5,250 calories/week deficit
- Or 5,250 ÷ 7 = 750 calories/day deficit

This means you're burning 750 more calories daily than you're eating.

**Important note**: This is a simplification. Actual weight loss includes water, muscle, and other tissues, not just fat. The 3,500 calorie rule gives you a useful estimate, but individual results vary based on metabolism, body composition, and other factors.

### "How does TrendWeight predict when I'll reach my goal?"

Simple linear projection:

**Days to Goal = (Current Trend - Goal Weight) ÷ Daily Loss Rate**  
**Goal Date = Today + Days to Goal**

**Example**:

- Current trend: 180 lbs
- Goal: 160 lbs
- Losing: 1.4 lbs/week = 0.2 lbs/day
- Days to goal: (180 - 160) ÷ 0.2 = 100 days

**Keep in mind**: This assumes your current rate continues unchanged. In reality, weight loss often slows as you get closer to your goal due to metabolic adaptation and having less weight to lose. Think of the prediction as "if current trends continue" rather than a guarantee.

### "What do the time-based changes mean?"

When TrendWeight shows "Since last week: -1.5 lbs", it's comparing:

- Your trend value today
- Your trend value exactly 7 days ago

This is more meaningful than comparing actual weights because the trend values are already smoothed, giving you a reliable progress indicator.

### "How does TrendWeight handle days I don't weigh myself?"

**Linear interpolation** fills the gaps. If you weigh Monday (150 lbs) and Wednesday (149 lbs), Tuesday is estimated as 149.5 lbs.

This keeps the trend calculation mathematically consistent - the smoothing algorithm needs continuous daily data to work properly.

### "How does the goal weight 'maintenance' range work?"

When you set a goal weight, TrendWeight automatically creates a maintenance range around it:

- **Imperial**: Goal ± 2.5 lbs
- **Metric**: Goal ± 1.134 kg

You're considered "maintaining" when:

1. Your trend was previously outside this range (either above or below)
2. Your trend enters the range by crossing your goal
3. Your trend stays within the range

**Example**: If your goal is 150 lbs:

- Maintenance range: 147.5 to 152.5 lbs
- If you're losing weight and cross from 153 → 149 lbs, you're now "maintaining"
- As long as you stay between 147.5-152.5 lbs, you remain in maintenance
- If you drift outside the range, you'll need to cross the goal again to re-enter maintenance

This prevents the status from flip-flopping when you're hovering right at your goal weight, giving you a stable 5-pound window to work within.

### "Why do some time comparisons show '--' instead of a number?"

TrendWeight requires a minimum amount of data to make reliable comparisons. If you haven't weighed yourself enough in a given period, the comparison won't be shown:

| Comparison | Required Weighings  | Why                        |
| ---------- | ------------------- | -------------------------- |
| Yesterday  | 2+ in last 2 days   | Need both endpoints        |
| Last Week  | 4+ in last 7 days   | ~60% coverage for validity |
| Two Weeks  | 9+ in last 14 days  | ~65% coverage              |
| Last Month | 19+ in last 28 days | ~68% coverage              |

These thresholds ensure the comparisons are statistically meaningful. If you see '--', just weigh yourself more consistently and the comparisons will appear.

## Mathematical Deep Dive

### The Exponentially Smoothed Moving Average (ESMA)

The trend calculation uses an ESMA with smoothing factor $\alpha = 0.1$:

$$S_t = \alpha \cdot X_t + (1 - \alpha) \cdot S_{t-1}$$

Where:

- $S_t$ = Smoothed value (trend) at time $t$
- $X_t$ = Actual observation (weight) at time $t$
- $\alpha$ = Smoothing factor (0.1)
- $S_{t-1}$ = Previous smoothed value

This can be rewritten as:
$$S_t = S_{t-1} + \alpha(X_t - S_{t-1})$$

Which is the "move 10% toward today's weight" formula we use.

### Relationship to Simple Moving Averages

Unlike a simple moving average (SMA) that gives equal weight to a fixed number of days, ESMA gives exponentially decreasing weights to all historical data. This creates several advantages:

- **No sudden jumps**: In a 20-day SMA, when day 21 "ages out," your average can jump suddenly. ESMA smoothly fades old data.
- **Natural weighting**: Recent data matters more (10% for today) while old data gracefully fades away
- **Memory efficient**: Only requires storing one value (the previous trend), not 20+ daily weights
- **No arbitrary cutoff**: Instead of saying "20 days count, 21 days don't," ESMA naturally phases out old data

The real power of ESMA is that it gives you smooth, responsive tracking without the artifacts of fixed-window averages.

### Weight Distribution in ESMA

The weight given to a measurement $k$ days ago is:

$$w_k = \alpha(1-\alpha)^k$$

For $\alpha = 0.1$, here's how weights decay over time:

- Day 0: $0.1 \times 0.9^0 = 0.1$ (10%)
- Day 1: $0.1 \times 0.9^1 = 0.09$ (9%)
- Day 2: $0.1 \times 0.9^2 = 0.081$ (8.1%)
- Day 7: $0.1 \times 0.9^7 = 0.0478$ (4.78%)
- Day 10: $0.1 \times 0.9^{10} = 0.0349$ (3.5%)
- Day 14: $0.1 \times 0.9^{14} = 0.0229$ (2.29%)
- Day 20: $0.1 \times 0.9^{20} = 0.0122$ (1.2%)
- Day 30: $0.1 \times 0.9^{30} = 0.0042$ (0.4%)
- Day 45: $0.1 \times 0.9^{45} = 0.0008$ (0.08%)

The sum of all weights equals 1:
$$\sum_{k=0}^{\infty} \alpha(1-\alpha)^k = \alpha \sum_{k=0}^{\infty} (1-\alpha)^k = \alpha \cdot \frac{1}{1-(1-\alpha)} = 1$$

**Practical Impact**

Looking at the decay rates above, we can see that:

- Your last 2 weeks of weights contribute about 75% of your trend
- Weights from 3-4 weeks ago still have small influence (1-3%)
- Anything older than 6 weeks has virtually no impact (< 0.1%)

In practice, your trend is primarily determined by your last 3-4 weeks of data. While the math theoretically considers all your historical data forever, weights older than a month contribute so little they essentially don't matter. This is why missing a day here or there doesn't break the system - the algorithm has plenty of recent data to work with.

This exponential decay is what makes ESMA psychologically effective: recent changes show up quickly in your trend (10% influence for today), but no single day can dominate the calculation. It's responsive without being jumpy.

### Linear Regression for Slope Calculation

The weight loss rate uses least squares regression on the most recent 14 trend values.

**What this means**: We find the straight line that best fits through your last two weeks of trend data. The slope of this line is your rate of weight change.

**Why 14 days?** Two weeks provides enough data for a stable calculation while remaining responsive to recent changes. It's long enough to smooth out weekly patterns (like weekend eating) but short enough to adapt when you change your habits.

The mathematical formula:

$$\text{slope} = \frac{n\sum xy - \sum x \sum y}{n\sum x^2 - (\sum x)^2}$$

Where:

- $x$ = Day index (0, 1, 2, ..., 13)
- $y$ = Trend weight for that day
- $n$ = Number of points (14)

This gives the change in pounds per day, which we multiply by 7 for weekly rate.

### Interpolation Mathematics

When you don't weigh yourself every day, TrendWeight needs to estimate the missing values.

**Simple explanation**: We draw a straight line between your two actual weights and use points along that line for the missing days.

**Example**: You weigh 150 lbs on Monday and 148 lbs on Thursday. For the missing days:

- Tuesday: 149.33 lbs (1/3 of the way)
- Wednesday: 148.67 lbs (2/3 of the way)

The mathematical formula:

$$w(t) = w_1 + \frac{w_2 - w_1}{t_2 - t_1} \cdot (t - t_1)$$

This linear interpolation ensures:

- Continuity in the trend calculation
- No artificial jumps in the data
- Reasonable estimates for missing measurements

## Conclusion

TrendWeight transforms the emotional rollercoaster of daily weighing into a mathematically sound feedback system. By applying exponential smoothing, linear regression, and careful statistical analysis, it reveals the true signal hiding in the noise of daily weight fluctuations.

The math isn't just academically interesting - it's psychologically powerful. When you understand that today's 2-pound gain will only move your trend by 0.2 pounds, you can stay focused on the long-term journey rather than daily drama.

Remember: Your weight will fluctuate. The trend reveals the truth.
