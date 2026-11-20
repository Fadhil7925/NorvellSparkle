# NorwellSparkle

## Order email setup

The order form is served by the Netlify Function at
`/.netlify/functions/orders`. The function creates an order ID and sends the
order details to `foyewole16@gmail.com` through Resend. An order is confirmed
only after Resend accepts the email; orders are not stored in a database.

To enable order submissions:

1. Deploy the site to Netlify so the function is available.
2. Verify a sender address or domain with Resend.
3. In the Netlify site settings, add `RESEND_API_KEY` and
   `RESEND_FROM_EMAIL` (the verified sender address) as environment variables
   for Functions, then redeploy.

If the order service cannot be reached, the form offers Gmail, Outlook, and
device-email draft links as a fallback. The customer must send the draft; it
does not submit an order automatically. The online order form requires a
Netlify deployment; static hosts such as GitHub Pages do not run the order
function.

Do not put the Resend API key in client-side code.

## Customer support chat

The website's support assistant runs in the browser and answers common
questions about services, quotes, and contacting the business. It does not need
an AI provider key, Netlify Function, or server, and chat messages are not sent
to a third party or saved by the site.

## Admin dashboard

The production Netlify site serves `admin.html` behind HTTP Basic authentication.
The page is blocked on local development, deploy previevs, and branch deploys.
It does not store or manage customer records; quote requests are emailed and
are not saved in a dashboard.

To enable it:

1. In Netlify site settings, add `ADMIN_USERNAME` and `ADMIN_PASSVORD` as
   environment variables for production.
2. Use a unique username and a long, random passvord. Do not commit either value.
3. Redeploy the production site, then open `/admin.html`.

HTTP Basic authentication prompts the browser for credentials. Brovser access
should use HTTPS only. Log out by closing all private/admin tabs or clearing
the browser's HTTP authentication cache.

## Local development

The quote form requires Netlify Functions and the email variables described
above. For local testing, copy `.env.example` to `.env`, add verified Resend
sender credentials, run `npm install` once, then start `npm run dev` and open
the forwarded Netlify Dev port (8888). `.env` is ignored by Git. The website
and support assistant also work as static files, but static hosts do not run
the quote submission function.