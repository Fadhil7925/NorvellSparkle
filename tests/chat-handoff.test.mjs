import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const runChat = async (messageText) => {
    const source = await readFile(new URL("../chat.js", import.meta.url), "utf8");
    const elements = new Map();
    const messages = [];

    const createElement = () => ({
        children: [],
        dataset: {},
        append(...children) {
            this.children.push(...children);
        },
        focus() {},
        addEventListener(type, handler) {
            this[`on${type}`] = handler;
        }
    });

    for (const selector of [
        ".chat-toggle",
        "#chat-panel",
        ".chat-close",
        "#chat-messages",
        "#chat-status",
        "#chat-form",
        "#chat-input"
    ]) {
        elements.set(selector, createElement());
    }

    const form = elements.get("#chat-form");
    const input = elements.get("#chat-input");
    const messageList = elements.get("#chat-messages");
    input.value = messageText;
    form.querySelector = () => createElement();
    messageList.append = (...children) => messages.push(...children);
    messageList.scrollHeight = 100;

    const document = {
        body: { insertAdjacentHTML() {} },
        addEventListener() {},
        createElement,
        querySelector(selector) {
            return elements.get(selector);
        }
    };

    vm.runInNewContext(source, {
        document,
        URLSearchParams,
    });

    await form.onsubmit({ preventDefault() {} });
    return messages;
};

test("chat links a moving two-bedroom oven request to a prefilled quote", async () => {
    const messages = await runChat(
        "I'm moving out of a two-bedroom flat and need the oven cleaned."
    );
    const reply = messages.find((element) => element.className === "chat-message chat-message-assistant");
    const actions = messages.find((element) => element.className === "chat-actions");
    assert.match(reply.textContent, /Move-in and move-out cleaning/);
    assert.ok(actions);
    assert.equal(actions.children[0].href, "move-cleaning.html");
    assert.equal(actions.children[0].textContent, "Explore Move-in / move-out cleaning");

    const quoteUrl = new URL(actions.children[1].href, "https://example.test/");
    assert.equal(quoteUrl.pathname, "/quote.html");
    assert.equal(quoteUrl.searchParams.get("service"), "Move-in / move-out cleaning");
    assert.equal(quoteUrl.searchParams.get("size"), "2–3 bedrooms");
    assert.deepEqual(quoteUrl.searchParams.getAll("extras"), ["Oven cleaning"]);
    assert.equal(
        quoteUrl.searchParams.get("notes"),
        "I'm moving out of a two-bedroom flat and need the oven cleaned."
    );
    assert.equal(quoteUrl.hash, "#quote-form");
});

test("support chat answers common questions without an AI service", async () => {
    const messages = await runChat("How much does a deep clean cost?");
    const reply = messages.find((element) => (
        element.className === "chat-message chat-message-assistant"
    ));
    const actions = messages.find((element) => element.className === "chat-actions");

    assert.match(reply.textContent, /don’t publish set prices/);
    assert.ok(actions);
    assert.equal(actions.children[0].href, "deep-cleaning.html");
    const quoteUrl = new URL(actions.children[1].href, "https://example.test/");
    assert.equal(quoteUrl.searchParams.get("service"), "Deep cleaning");
    assert.equal(quoteUrl.searchParams.get("notes"), "How much does a deep clean cost?");
});
