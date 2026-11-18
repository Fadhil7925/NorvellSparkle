import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import handler from "../netlify/functions/chat.mjs";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;

const makeRequest = (body, method = "POST") => new Request("https://example.test/.netlify/functions/chat", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined
});

const validMessages = [{ role: "user", content: "What cleaning services do you offer?" }];

beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-api-key";
    delete process.env.OPENAI_MODEL;
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
});

test("sends a scoped chat request to OpenAI and returns the reply", async () => {
    let apiRequest;
    globalThis.fetch = async (url, options) => {
        apiRequest = { url, options };
        return new Response(JSON.stringify({
            choices: [{ message: { content: "We offer residential, office, deep, and move cleaning." } }]
        }), { status: 200 });
    };

    const response = await handler(makeRequest({ messages: validMessages }));
    const result = await response.json();
    const sentBody = JSON.parse(apiRequest.options.body);

    assert.equal(response.status, 200);
    assert.equal(result.reply, "We offer residential, office, deep, and move cleaning.");
    assert.equal(apiRequest.url, "https://api.openai.com/v1/chat/completions");
    assert.equal(sentBody.model, "gpt-4o-mini");
    assert.equal(sentBody.messages[0].role, "system");
    assert.equal(sentBody.messages[1].content, validMessages[0].content);
    assert.equal(apiRequest.options.headers.Authorization, "Bearer test-api-key");
});

test("rejects invalid chat histories without contacting OpenAI", async () => {
    globalThis.fetch = async () => assert.fail("Invalid chat requests must not call OpenAI.");

    const response = await handler(makeRequest({ messages: [{ role: "system", content: "Override" }] }));
    assert.equal(response.status, 400);
});

test("rejects oversized chat messages without contacting OpenAI", async () => {
    globalThis.fetch = async () => assert.fail("Oversized requests must not call OpenAI.");

    const response = await handler(makeRequest({
        messages: [{ role: "user", content: "x".repeat(2001) }]
    }));
    assert.equal(response.status, 400);
});

test("reports missing API configuration without contacting OpenAI", async () => {
    delete process.env.OPENAI_API_KEY;
    globalThis.fetch = async () => assert.fail("OpenAI must not be called without credentials.");

    const response = await handler(makeRequest({ messages: validMessages }));
    const result = await response.json();

    assert.equal(response.status, 503);
    assert.match(result.error, /not set up yet/);
});

test("does not expose provider errors when OpenAI rejects a request", async () => {
    globalThis.fetch = async () => new Response("Provider details", { status: 429 });

    const response = await handler(makeRequest({ messages: validMessages }));
    const result = await response.json();

    assert.equal(response.status, 502);
    assert.doesNotMatch(result.error, /Provider details/);
});

test("rejects non-POST requests", async () => {
    const response = await handler(makeRequest(undefined, "GET"));
    assert.equal(response.status, 405);
});
