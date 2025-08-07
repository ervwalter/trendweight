import { Link } from "@tanstack/react-router";
import { Heart, Lightbulb, Rss, ShoppingCart } from "lucide-react";
import { Heading } from "../common/heading";
import { useAuth } from "../../lib/auth/useAuth";
import { ExternalLink } from "../common/external-link";
import { Button } from "../ui/button";
import { useTheme } from "../../lib/hooks/use-theme";

export function About() {
  const { isInitializing, user } = useAuth();
  const { theme } = useTheme();
  const getStarted = isInitializing || !user ? { label: "Log In / Sign Up", href: "/login" } : { label: "Go to Dashboard", href: "/dashboard" };
  const screenshotSrc = theme === "dark" ? "/screenshot-large-dark.png" : "/screenshot-large.png";

  return (
    <div>
      <div className="bg-background float-right hidden w-96 pb-4 pl-4 md:block">
        <Link to="/demo">
          <img src={screenshotSrc} alt="dashboard screenshot" className="h-auto w-full" />
        </Link>
      </div>
      <Heading level={1} className="pb-4">
        What is TrendWeight, Exactly?
      </Heading>
      <p className="pb-4">TrendWeight is a free weight tracking web app that filters out the noise and focuses on longer term trends in weight change.</p>
      <p className="pb-4">
        When you really want to track your weight loss, you probably know you should disregard day to day changes in weight and instead focus on the trend over
        time. There are multiple ways to do this, but TrendWeight uses the methodology described by John Walker in his online book, <i>The Hacker's Diet</i>.
        Curious about the math behind how it works?{" "}
        <Link to="/math" className="text-link hover:text-link underline">
          Learn more about the math
        </Link>
        .
      </p>
      <div className="float-none inline-block pt-0 pr-0 pb-6 md:float-left md:pt-2 md:pr-8 md:pb-4">
        <div className="pb-2 text-lg">
          <b>See it in action...</b>
        </div>
        <Button variant="success" size="lg" asChild>
          <Link to="/demo">View Demo</Link>
        </Button>
      </div>
      <p className="pb-4">
        The idea is pretty simple. You weigh yourself each day and TrendWeight will plot a exponentially weighted moving average for your weight alongside your
        daily scale weight. This gives you a better idea of your weight trend by masking most of the day to day noise that variances in water weight introduce.
      </p>
      <p className="pb-4">
        Your dashboard will also calculate some statistics that will help you understand how close you are to your weight goal and if you are hitting your
        weekly desired rate of weight change.
      </p>
      <p>
        Once you reach your goal, keep weighing yourself every day. TrendWeight will show a goal range that is a bit above and below your goal weight so that
        you can more easily see if your weight starts to creep up too high and you need to go back to the techniques that helped you lose weight in the first
        place.
      </p>
      <div className="mt-8">
        <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="bg-primary/10 border-primary/30 mt-6 flow-root rounded-lg border px-6 pb-8">
            <div className="mt-[-24px]">
              <div>
                <div className="bg-primary inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                  <Lightbulb className="h-6 w-6" />
                </div>
              </div>
              <Heading level={3} className="text-foreground mt-6 mb-0 pb-0 tracking-tight">
                Questions?
              </Heading>
              <p className="text-muted-foreground mt-5 text-base">
                Take a look at these{" "}
                <Link to="/faq" className="text-link hover:text-link underline">
                  FAQs
                </Link>{" "}
                or email{" "}
                <a href="mailto:erv@ewal.net" className="text-link hover:text-link underline">
                  erv@ewal.net
                </a>
                .
              </p>
            </div>
          </div>
          <div className="bg-primary/10 border-primary/30 mt-6 flow-root rounded-lg border px-6 pb-8">
            <div className="mt-[-24px]">
              <div>
                <div className="bg-primary inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
              <Heading level={3} className="text-foreground mt-6 mb-0 pb-0 tracking-tight">
                Get a Scale
              </Heading>
              <ul className="text-muted-foreground mt-5 list-disc pl-4 text-base">
                <li>
                  <ExternalLink href="https://amzn.to/2Rh8yH1">Withings Scales</ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://amzn.to/3uEWUnS">Fitbit Scales</ExternalLink>
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/10 border-primary/30 mt-6 flow-root rounded-lg border px-6 pb-8">
            <div className="mt-[-24px]">
              <div>
                <div className="bg-primary inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                  <Rss className="h-6 w-6" />
                </div>
              </div>
              <Heading level={3} className="text-foreground mt-6 mb-0 pb-0 tracking-tight">
                Stay Updated
              </Heading>
              <ul className="text-muted-foreground mt-5 list-disc pl-4 text-base">
                <li>
                  <ExternalLink href="https://ewal.dev/series/trendweight">Blog</ExternalLink>
                </li>
                <li>
                  <ExternalLink href="https://github.com/trendweight/trendweight/releases">Release Notes</ExternalLink>
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/10 border-primary/30 mt-6 flow-root rounded-lg border px-6 pb-8">
            <div className="mt-[-24px]">
              <div>
                <div className="bg-primary inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                  <Heart className="h-6 w-6" />
                </div>
              </div>
              <Heading level={3} className="text-foreground mt-6 mb-0 pb-0 tracking-tight">
                Support TrendWeight
              </Heading>
              <p className="text-muted-foreground mt-5 text-base">
                TrendWeight is free, forever. But if you want info about how you can help fund it,{" "}
                <Link to="/tipjar" className="text-link hover:text-link underline">
                  go here
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-primary/5 border-primary/20 mt-10 rounded-lg border">
        <div className="px-6 py-8 md:px-12 md:py-10 lg:py-12">
          <Heading level={2} className="text-primary mb-0 font-extrabold tracking-tight">
            Ready to check it out?
          </Heading>
          <div className="mt-2 flex">
            <Button variant="default" size="lg" asChild>
              <Link to={getStarted.href}>{getStarted.label}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
