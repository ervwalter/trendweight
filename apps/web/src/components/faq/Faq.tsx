import { Link } from "@tanstack/react-router";
import { ExternalLink } from "../common/external-link";
import { Heading } from "../common/heading";
import { Question } from "./Question";

export function Faq() {
  return (
    <div className="bg-background">
      <div>
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          <div>
            <Heading level={1} className="text-foreground pb-4">
              Frequently asked questions
            </Heading>
            <p className="text-muted-foreground text-base">
              Can't find the answer you're looking for? Email me at{" "}
              <a href="mailto:erv@ewal.net" className="text-link hover:text-link underline">
                erv@ewal.net
              </a>
              .
            </p>
          </div>
          <div className="mt-6 lg:col-span-3 lg:mt-0">
            <dl className="space-y-8">
              <Question title="Do I need to have a Withings or Fitbit scale to use this site? Can I manually enter my weight data instead?">
                <p>
                  You do <i>not</i> need special scales. You <i>do</i> have to have either a Withings or Fitbit <i>account</i>. TrendWeight doesn't know or care
                  if your weight readings come from a connected scale or were entered manually in the Withings or Fitbit apps. Any method is fine as long as the
                  weight readings end up in your Withings or Fitbit account.
                </p>
                <p>
                  That said, I do recommend getting a smart scale. They are easy to setup and make it super easy to record your weight everyday. You just step
                  on the scale and your weight gets automatically uploaded. If you don't have one and want to buy one, you can find them on Amazon:{" "}
                  <ExternalLink href="https://amzn.to/2Rh8yH1">Withings Scales</ExternalLink> or{" "}
                  <ExternalLink href="https://amzn.to/3uEWUnS">Fitbit Scales</ExternalLink>.
                </p>
                <p>
                  If you don't have a connected scale, just use either the{" "}
                  <ExternalLink href="https://www.withings.com/us/en/health-mate">Withings Health Mate</ExternalLink> app or the{" "}
                  <ExternalLink href="https://www.fitbit.com/sg/app">Fitbit App</ExternalLink> and enter your weight manually each day.
                </p>
              </Question>
              <Question title="Is there a mobile app for TrendWeight?">
                <p>No. The TrendWeight website works great on mobile sizes, and there are no plans for a native mobile app.</p>
              </Question>
              <Question title="How do I change from Withings to Fitbit (or vice versa)?">
                <p>
                  If you have some data in one type of account and are going to start using the other type of account, you can simply add a connection via the{" "}
                  <Link to="/settings" className="text-link hover:text-link underline">
                    settings page
                  </Link>{" "}
                  to your new account. TrendWeight will keep all the existing weight data from your old account and combine it with the data from the new one,
                  giving you a unified view of your weight over time.
                </p>
              </Question>
              <Question title="What happens when I weigh myself multiple times in a single day?">
                <p>
                  TrendWeight will only use one weigh-in per day—the first weigh-in of the day is used. To get the most reliable weight readings day after day,
                  professionals recommend you step on your scale first thing in the morning after you wake up (and use the restroom). As such, TrendWeight uses
                  only the first reading of the day.
                </p>
                <p>
                  Feel free to weigh yourself as many times as you want in the day, as those subsequent readings won't throw off TrendWeight even if you weigh
                  yourself right after a large meal.
                </p>
                <p>
                  If your first weigh-in of the day is incorrect for some reason and you don't want TrendWeight to use that data, you can log into the Fitbit or
                  Withings apps and edit or delete that incorrect data point. TrendWeight will see the corrected reading the next time it syncs your data.
                </p>
              </Question>
              <Question title="Can I share my charts and stats with others?">
                <p>
                  Yep! Losing weight is hard, and sharing your progress with the people who support you can help improve your odds of success. Each user gets a
                  private URL that can be given to friends and family. That URL will allow anyone to see your trend graphs and statistics (so only give it to
                  people you want to see your charts and stats).
                </p>
                <p>
                  Go to your{" "}
                  <Link to="/settings" className="text-link hover:text-link underline">
                    Settings
                  </Link>{" "}
                  page to find your private URL. You can also change your private URL at any time in case you gave your URL to someone and later decide you
                  don't want them to see your stats anymore. You can also disable sharing entirely if you prefer.
                </p>
              </Question>
              <Question title="What is the math behind TrendWeight?">
                <p>
                  The techniques used on TrendWeight come from John Walker's The Hacker's Diet. I found it to be an interesting read (and it's free!). In
                  particular, I recommend reading the "Signal and Noise" chapter for a better understanding of the weight tracking methodology used on this
                  site.
                </p>
                <p>
                  Additionally, we have a{" "}
                  <Link to="/math" className="text-link hover:text-link underline">
                    detailed explanation of the math behind TrendWeight
                  </Link>{" "}
                  that covers everything from the basic concepts to the advanced calculations.
                </p>
              </Question>
              <Question title="Is there some way I can help support TrendWeight?">
                <p>
                  TrendWeight is an app that I created in my free time out of a passion for tech gadgets and software development. And because I wanted this
                  functionality for myself.
                </p>
                <p>
                  TrendWeight is free. It will always be free, but if you'd like to know how to help support TrendWeight, you can read more{" "}
                  <Link to="/tipjar" className="text-link hover:text-link underline">
                    here
                  </Link>
                  .
                </p>
              </Question>
              <Question title="Is TrendWeight open source?">
                <p>
                  Yes. You can find the project on GitHub <ExternalLink href="https://github.com/ervwalter/trendweight">here</ExternalLink>. However, it's
                  essentially a one-man show (me), and I'm pretty protective of the project—probably too overprotective. That said, if you have something you'd
                  like to contribute, please reach out.
                </p>
              </Question>
              <Question title="I still have a question or a suggestion for a new feature.">
                <p>
                  No problem. If you have a question you don't see answered here, feel free to email{" "}
                  <a href="mailto:erv@ewal.net" className="text-link hover:text-link underline">
                    erv@ewal.net
                  </a>{" "}
                  and let me know. If you have a suggestion, you can also email that to me, or you can post your idea{" "}
                  <ExternalLink href="https://github.com/trendweight/trendweight/issues">here</ExternalLink>.
                </p>
              </Question>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
