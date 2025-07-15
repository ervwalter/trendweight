import { createFileRoute, Link } from "@tanstack/react-router";
import { HiOutlineHeart, HiOutlineLightBulb, HiOutlineRss, HiOutlineShoppingCart } from "react-icons/hi";
import { Layout } from "../components/Layout";
import { Heading } from "../components/ui/Heading";
import { useAuth } from "../lib/auth/useAuth";
import { pageTitle } from "../lib/utils/pageTitle";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const { isInitializing, user } = useAuth();
  const getStarted = isInitializing || !user ? { label: "Log In / Sign Up", href: "/login" } : { label: "Go to Dashboard", href: "/dashboard" };

  return (
    <>
      <title>{pageTitle("About")}</title>
      <Layout>
        <div>
          <div className="float-right hidden w-96 bg-white pb-4 pl-4 md:block">
            <Link to="/demo">
              <img src="/screenshot-large.png" alt="dashboard screenshot" className="h-auto w-full" />
            </Link>
          </div>
          <Heading level={1} className="pb-4">
            What is TrendWeight, Exactly?
          </Heading>
          <p className="pb-4">TrendWeight is a free weight tracking web app that filters out the noise and focuses on longer term trends in weight change.</p>
          <p className="pb-4">
            When you really want to track your weight loss, you probably know you should disregard day to day changes in weight and instead focus on the trend
            over time. There are multiple ways to do this, but TrendWeight uses the methodology described by John Walker in his online book,{" "}
            <i>The Hacker's Diet</i>. Curious about the math behind how it works?{" "}
            <Link to="/math" className="text-brand-600 hover:text-brand-700 underline">
              Learn more about the math
            </Link>
            .
          </p>
          <div className="float-none inline-block pt-0 pr-0 pb-6 md:float-left md:pt-2 md:pr-8 md:pb-4">
            <div className="pb-2 text-lg">
              <b>See it in action...</b>
            </div>
            <Link to="/demo" className="inline-block rounded bg-green-600 px-6 py-3 text-lg text-white transition-colors hover:bg-green-700">
              View Demo
            </Link>
          </div>
          <p className="pb-4">
            The idea is pretty simple. You weigh yourself each day and TrendWeight will plot a exponentially weighted moving average for your weight alongside
            your daily scale weight. This gives you a better idea of your weight trend by masking most of the day to day noise that variances in water weight
            introduce.
          </p>
          <p className="pb-4">
            Your dashboard will also calculate some statistics that will help you understand how close you are to your weight goal and if you are hitting your
            weekly desired rate of weight change.
          </p>
          <p>
            Once you reach your goal, keep weighing yourself every day. TrendWeight will show a goal range that is a bit above and below your goal weight so
            that you can more easily see if your weight starts to creep up too high and you need to go back to the techniques that helped you lose weight in the
            first place.
          </p>
          <div className="mt-8">
            <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="bg-brand-50 border-brand-100 mt-6 flow-root rounded-lg border px-6 pb-8">
                <div className="mt-[-24px]">
                  <div>
                    <div className="bg-brand-400 inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                      <HiOutlineLightBulb className="h-6 w-6" />
                    </div>
                  </div>
                  <Heading level={3} className="mt-6 mb-0 pb-0 tracking-tight text-gray-900">
                    Questions?
                  </Heading>
                  <p className="mt-5 text-base text-gray-500">
                    Take a look at these{" "}
                    <Link to="/faq" className="text-brand-600 hover:text-brand-700 underline">
                      FAQs
                    </Link>{" "}
                    or email{" "}
                    <a href="mailto:erv@ewal.net" className="text-brand-600 hover:text-brand-700 underline">
                      erv@ewal.net
                    </a>
                    .
                  </p>
                </div>
              </div>
              <div className="bg-brand-50 border-brand-100 mt-6 flow-root rounded-lg border px-6 pb-8">
                <div className="mt-[-24px]">
                  <div>
                    <div className="bg-brand-400 inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                      <HiOutlineShoppingCart className="h-6 w-6" />
                    </div>
                  </div>
                  <Heading level={3} className="mt-6 mb-0 pb-0 tracking-tight text-gray-900">
                    Get a Scale
                  </Heading>
                  <ul className="mt-5 list-disc pl-4 text-base text-gray-500">
                    <li>
                      <a href="https://amzn.to/2Rh8yH1" className="text-brand-600 hover:text-brand-700 underline">
                        Withings Scales
                      </a>
                    </li>
                    <li>
                      <a href="https://amzn.to/3uEWUnS" className="text-brand-600 hover:text-brand-700 underline">
                        Fitbit Scales
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-brand-50 border-brand-100 mt-6 flow-root rounded-lg border px-6 pb-8">
                <div className="mt-[-24px]">
                  <div>
                    <div className="bg-brand-400 inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                      <HiOutlineRss className="h-6 w-6" />
                    </div>
                  </div>
                  <Heading level={3} className="mt-6 mb-0 pb-0 tracking-tight text-gray-900">
                    Stay Updated
                  </Heading>
                  <ul className="mt-5 list-disc pl-4 text-base text-gray-500">
                    <li>
                      <a href="https://twitter.com/trendweight" className="text-brand-600 hover:text-brand-700 underline">
                        Twitter
                      </a>
                    </li>
                    <li>
                      <a href="https://github.com/trendweight/trendweight/releases" className="text-brand-600 hover:text-brand-700 underline">
                        Release Notes
                      </a>
                    </li>
                    <li>
                      <a href="https://blog.trendweight.com" className="text-brand-600 hover:text-brand-700 underline">
                        Blog
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-brand-50 border-brand-100 mt-6 flow-root rounded-lg border px-6 pb-8">
                <div className="mt-[-24px]">
                  <div>
                    <div className="bg-brand-400 inline-flex items-center justify-center rounded-md p-3 text-white shadow-lg">
                      <HiOutlineHeart className="h-6 w-6" />
                    </div>
                  </div>
                  <Heading level={3} className="mt-6 mb-0 pb-0 tracking-tight text-gray-900">
                    Support TrendWeight
                  </Heading>
                  <p className="mt-5 text-base text-gray-500">
                    TrendWeight is free, forever. But if you want info about how you can help fund it,{" "}
                    <Link to="/tipjar" className="text-brand-600 hover:text-brand-700 underline">
                      go here
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-brand-50 border-brand-100 mt-10 rounded-lg border">
            <div className="px-6 py-8 md:px-12 md:py-10 lg:py-12">
              <Heading level={2} className="text-brand-600 mb-0 font-extrabold tracking-tight">
                Ready to check it out?
              </Heading>
              <div className="mt-2 flex">
                <Link to={getStarted.href} className="bg-brand-600 hover:bg-brand-700 inline-block rounded px-6 py-3 text-lg text-white transition-colors">
                  {getStarted.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
