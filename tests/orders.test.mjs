import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import handler from "../netlify/functions/orders.mjs";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM_EMAIL;

const makeRequest = (body, method = "POST") => new Request("https://example.test/.netlify/functions/orders", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined
});

const validOrder = {
    name: "Sam Customer",
    service: "Deep cleaning",
    postcode: "PE11 1AA",
    size: "2–3 bedrooms",
    preferredDate: "2026-12-01",
    extras: ["Oven cleaning"],
    notes: "Please focus on the kitchen."
};

beforeEach(() => {
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_FROM_EMAIL = "orders@example.test";
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
});

test("sends the order details and returns the generated order ID only after acceptance", async () => {
    let emailRequest;
    globalThis.fetch = async (url, options) => {
        emailRequest = { url, options };
        return new Response("{}", { status: 200 });
    };

    const response = await handler(makeRequest(validOrder));
    const result = await response.json();
    const email = JSON.parse(emailRequest.options.body);

    assert.equal(response.status, 200);
    assert.match(result.orderId, /^NS-[0-9A-F-]{36}$/);
    assert.equal(emailRequest.url, "https://api.resend.com/emails");
    assert.deepEqual(email.to, ["foyewole16@gmail.com"]);
    assert.match(email.subject, new RegExp(result.orderId));
    assert.match(email.text, /Customer name: Sam Customer/);
    assert.match(email.text, /Service: Deep cleaning/);
    assert.match(email.text, /Postcode \/ ZIP code: PE11 1AA/);
    assert.match(email.text, /Preferred date: 2026-12-01/);
});

test("rejects invalid order values without sending an email", async () => {
    globalThis.fetch = async () => {
        assert.fail("Invalid orders must not send email.");
    };

    const response = await handler(makeRequest({ ...validOrder, service: "Unexpected service" }));
    assert.equal(response.status, 400);
});

test("does not return an order ID when Resend rejects the email", async () => {
    globalThis.fetch = async () => new Response("Rejected", { status: 503 });

    const response = await handler(makeRequest(validOrder));
    const result = await response.json();

    assert.equal(response.status, 502);
    assert.equal("orderId" in result, false);
});

test("rejects requests with the honeypot filled", async () => {
    globalThis.fetch = async () => {
        assert.fail("Bot submissions must not send email.");
    };

    const response = await handler(makeRequest({ ...validOrder, website: "spam" }));
    assert.equal(response.status, 400);
});

test("returns a service-unavailable error when email credentials are missing", async () => {
    delete process.env.RESEND_API_KEY;
    globalThis.fetch = async () => {
        assert.fail("Email must not be sent without credentials.");
    };

    const response = await handler(makeRequest(validOrder));
    assert.equal(response.status, 503);
});
