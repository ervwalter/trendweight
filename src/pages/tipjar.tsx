/* eslint-disable @next/next/no-sync-scripts */
import { Box, Divider, Heading, ListItem, Text, UnorderedList } from "@chakra-ui/layout";
import Link from "~/components/shared/Link";
import { Page } from "~/lib/core/page";

const TipJar: Page = () => {
  return (
    <>
      <Box sx={{ "> * + *": { my: 4 } }}>
        <Heading pb={0}>Want to help support TrendWeight?</Heading>
        <Text>
          TrendWeight is a free app. I created it in my free time because I like tech gadgets and I wanted a better way
          to apply the concepts of the Hacker's Diet to my own day-to-day life. I didn't create it in order to make
          money. However, from time to time, I get an email from someone asking if there is some way they can make a
          donation to help support TrendWeight.
        </Text>
        <Text>
          Since TrendWeight is a development project I work on in my free time, I don't have to pay employees to develop
          or maintain the site. But there are some small fees I pay each month for the servers and software that power
          TrendWeight. In the interest of transparency, let me tell you what those costs are.
        </Text>
        <Text>
          In fact, <Link href="https://trendweight.io">trendweight.io</Link> pretty inexpensive to run:
        </Text>
        <UnorderedList pl={4}>
          <ListItem>
            The website runs on <Link href="https://vercel.com">Vercel</Link>: <b>$20</b>
            /month
          </ListItem>
          <ListItem>
            Performance monitoring is <Link href="https://vercel.com/docs/analytics">Vercel Analytics</Link>: <b>$10</b>
            /month
          </ListItem>
          <ListItem>
            The database and authentication is on <Link href="https://firebase.google.com/pricing">Firebase</Link>:{" "}
            <b>$0</b>/month
          </ListItem>
        </UnorderedList>
        <Text>
          In total, my monthly expenses are <b>$30</b>/month.
        </Text>
        <Text>
          Let me be <b>crystal clear</b>: I don't need help paying for TrendWeight. I can afford to run TrendWeight out
          of my own pocket. I only have this page because people kept emailing me asking how to support the site. If you
          really want to help, there are a few ways I can suggest...
        </Text>
        <Divider />
        <Heading pb={0}>Tip with Ko-fi</Heading>
        <Text>Ko-fi lets you give a small amount to someone using a credit card, PayPal, or Apple Pay.</Text>
        <Box
          dangerouslySetInnerHTML={{
            __html: `
              <style>img.kofiimg{display: initial!important;vertical-align:middle;height:13px!important;width:20px!important;padding-top:0!important;padding-bottom:0!important;border:none;margin-top:0;margin-right:5px!important;margin-left:0!important;margin-bottom:3px!important;content:url('https://storage.ko-fi.com/cdn/cup-border.png')}.kofiimg:after{vertical-align:middle;height:25px;padding-top:0;padding-bottom:0;border:none;margin-top:0;margin-right:6px;margin-left:0;margin-bottom:4px!important;content:url('https://storage.ko-fi.com/cdn/whitelogo.svg')}.btn-container{display:inline-block!important;white-space:nowrap;min-width:160px}span.kofitext{color:#fff !important;letter-spacing: -0.15px!important;text-wrap:none;vertical-align:middle;line-height:33px !important;padding:0;text-align:center;text-decoration:none!important; text-shadow: 0 1px 1px rgba(34, 34, 34, 0.05);}.kofitext a{color:#fff !important;text-decoration:none:important;}.kofitext a:hover{color:#fff !important;text-decoration:none}a.kofi-button{box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.2);line-height:36px!important;min-width:150px;display:inline-block!important;background-color:#29abe0;padding:2px 12px !important;text-align:center !important;border-radius:7px;color:#fff;cursor:pointer;overflow-wrap:break-word;vertical-align:middle;border:0 none #fff !important;font-family:'Quicksand',Helvetica,Century Gothic,sans-serif !important;text-decoration:none;text-shadow:none;font-weight:700!important;font-size:14px !important}a.kofi-button:visited{color:#fff !important;text-decoration:none !important}a.kofi-button:hover{opacity:.85;color:#f5f5f5 !important;text-decoration:none !important}a.kofi-button:active{color:#f5f5f5 !important;text-decoration:none !important}.kofitext img.kofiimg {height:15px!important;width:22px!important;display: initial;animation: kofi-wiggle 3s infinite;}@keyframes kofi-wiggle{0%{transform:rotate(0) scale(1)}60%{transform:rotate(0) scale(1)}75%{transform:rotate(0) scale(1.12)}80%{transform:rotate(0) scale(1.1)}84%{transform:rotate(-10deg) scale(1.1)}88%{transform:rotate(10deg) scale(1.1)}92%{transform:rotate(-10deg) scale(1.1)}96%{transform:rotate(10deg) scale(1.1)}100%{transform:rotate(0) scale(1)}}</style><link href="https://fonts.googleapis.com/css?family=Quicksand:400,700" rel="stylesheet" type="text/css"><div class="btn-container"><a title="Support me on ko-fi.com" class="kofi-button" style="background-color:#29abe0;" href="https://ko-fi.com/ervwalter" target="_blank"> <span class="kofitext"><img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi donations" class="kofiimg">Buy me a Coffee</span></a></div>          
          `,
          }}
        />
        <Divider />
        <Heading pb={0}>Venmo / PayPal</Heading>
        <Text>If you like, you can also send small amounts directly via PayPal or Venmo:</Text>
        <UnorderedList pl={4}>
          <ListItem>
            Venmo: <Link href="https://venmo.com/code?user_id=2181966380138496050">ErvWalter</Link>
          </ListItem>
          <ListItem>
            PayPal: <Link href="https://paypal.me/erv">erv@ewal.net</Link>
          </ListItem>
        </UnorderedList>
      </Box>
    </>
  );
};

TipJar.title = "Tip Jar";

export default TipJar;
