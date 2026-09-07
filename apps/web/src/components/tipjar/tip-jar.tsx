import { ExternalLink } from "@/components/common/external-link";
import { Heading } from "@/components/common/heading";

export function TipJar() {
  return (
    <>
      <div className="prose prose-gray prose-li:my-0.5 prose-hr:my-6 max-w-none">
        <Heading level={1} display>
          Want to help support TrendWeight?
        </Heading>

        <p>
          TrendWeight is a free app. I created it in my free time because I like tech gadgets and I wanted a better way to apply the concepts of the Hacker's
          Diet to my own day-to-day life. I didn't create it in order to make money. However, from time to time, I get an email from someone asking if there is
          some way they can make a donation to help support TrendWeight.
        </p>

        <p>
          Since TrendWeight is a development project I work on in my free time, I don't have to pay employees to develop or maintain the site. But there are
          some small fees I pay each month for the servers and software that power TrendWeight. In the interest of transparency, let me tell you what those
          costs are.
        </p>

        <p>In fact, TrendWeight is pretty inexpensive to run:</p>

        <ul>
          <li>
            Hosting via <ExternalLink href="https://www.digitalocean.com">Digital Ocean</ExternalLink>: <strong>$25</strong>/month
          </li>
          <li>
            Database via <ExternalLink href="https://supabase.com">Supabase</ExternalLink>: <strong>$25</strong>/month
          </li>
          <li>
            Authentication via <ExternalLink href="https://clerk.com">Clerk</ExternalLink>: <strong>$25</strong>/month
          </li>
          <li>
            Analytics via <ExternalLink href="https://plausible.io">Plausible</ExternalLink>: <strong>~$10</strong>/month
          </li>
        </ul>

        <p>
          In total, my monthly expenses are <strong>$85</strong>/month.
        </p>

        <p>
          Let me be <strong>crystal clear</strong>: I don't need help paying for TrendWeight. I can afford to run TrendWeight out of my own pocket. I only have
          this page because people kept emailing me asking how to support the site. If you really want to help, there are a few ways I can suggest...
        </p>

        <hr />

        <Heading level={2}>Tip with Ko-fi</Heading>

        <p>Ko-fi lets you give a small amount to someone using a credit card, PayPal, or Apple Pay.</p>
      </div>

      <div className="my-6">
        {/* Ko-fi's brand button, rebuilt as plain markup: no injected styles, no third-party font, and the tab gets no opener */}
        <a
          href="https://ko-fi.com/ervwalter"
          target="_blank"
          rel="noopener noreferrer"
          title="Support me on ko-fi.com"
          className="inline-flex min-w-[150px] items-center justify-center gap-1.5 rounded-[7px] bg-[#29abe0] px-3 py-0.5 text-sm leading-9 font-bold text-white no-underline shadow-[1px_1px_0_rgba(0,0,0,0.2)] transition-opacity hover:text-white hover:opacity-85"
        >
          <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="" className="m-0 h-[15px] w-[22px]" />
          Buy me a Coffee
        </a>
      </div>

      <div className="prose prose-gray prose-li:my-0.5 prose-hr:my-6 max-w-none">
        <hr />

        <Heading level={2}>GitHub Sponsors</Heading>

        <p>
          If you're a GitHub user, you can support TrendWeight through GitHub Sponsors. This allows you to make recurring monthly contributions or one-time
          sponsorships.
        </p>
      </div>

      <div className="my-6">
        <iframe
          src="https://github.com/sponsors/ervwalter/button"
          title="Sponsor ervwalter"
          height="34"
          width="160"
          style={{ border: 0, borderRadius: "6px" }}
        />
      </div>

      <div className="prose prose-gray prose-li:my-0.5 prose-hr:my-6 max-w-none">
        <hr />

        <Heading level={2}>Venmo / PayPal</Heading>

        <p>If you like, you can also send small amounts directly via PayPal or Venmo:</p>

        <ul>
          <li>
            Venmo: <ExternalLink href="https://venmo.com/code?user_id=2181966380138496050">ErvWalter</ExternalLink>
          </li>
          <li>
            PayPal: <ExternalLink href="https://paypal.me/erv">erv@ewal.net</ExternalLink>
          </li>
        </ul>
      </div>
    </>
  );
}
