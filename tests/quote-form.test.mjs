import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const services = [
    "Home Cleaning",
    "Office & Commercial Cleaning",
    "Deep Cleaning",
    "Carpet & Upholstery Cleaning"
];

const runQuoteForm = async (search, fetchResponse) => {
    const source = await readFile(new URL("../quote.html", import.meta.url), "utf8");
    const script = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
    const elements = new Map();
    const makeElement = () => ({
        dataset: {},
        attributes: {},
        addEventListener(type, handler) {
            this[`on${type}`] = handler;
        },
        getAttribute(name) {
            return this.attributes[name] ?? "false";
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        classList: { toggle() {} }
    });

    for (const selector of [
        ".menu-toggle",
        "#primary-navigation",
        "#quote-result",
        "#quote-brief",
        "#quote-status",
        "#copy-quote",
        "#quote-email-fallback",
        "#quote-gmail-fallback",
        "#quote-outlook-fallback",
        "#quote-mailto-fallback"
    ]) {
        elements.set(selector, makeElement());
    }

    const serviceField = makeElement();
    serviceField.options = [{ value: "" }, ...services.map((value) => ({ value }))];
    const sizeField = makeElement();
    sizeField.options = [{ value: "" }, { value: "2–3 bedrooms" }];
    const notesField = makeElement();
    const extras = services.map((value) => {
        const label = { hidden: false };
        return {
            value,
            checked: false,
            closest: () => label,
            label
        };
    });
    const submitButton = makeElement();
    const fields = {
        name: { value: "Sam Customer" },
        email: { value: "sam@example.test" },
        service: serviceField,
        postcode: { value: "PE11 1AA" },
        size: sizeField,
        preferredDate: { value: "" },
        notes: notesField,
        website: { value: "" }
    };
    const form = makeElement();
    form.elements = { namedItem: (name) => fields[name] };
    form.querySelectorAll = () => extras;
    form.querySelector = (selector) => selector === 'button[type="submit"]' ? submitButton : makeElement();
    form.resetCount = 0;
    form.reset = () => { form.resetCount += 1; };
    elements.set("#quote-form", form);

    const document = { querySelector: (selector) => elements.get(selector) };
    class MockFormData {
        constructor() {
            this.values = new Map(Object.entries(fields).map(([name, field]) => [name, field.value]));
            this.values.set("extras", extras.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value));
        }
        get(name) {
            const value = this.values.get(name);
            return Array.isArray(value) ? value[0] ?? null : value ?? null;
        }
        getAll(name) {
            const value = this.values.get(name);
            return Array.isArray(value) ? value : value === undefined ? [] : [value];
        }
        [Symbol.iterator]() {
            return this.values.entries();
        }
    }

    vm.runInNewContext(script, {
        document,
        window: { location: { search } },
        URLSearchParams,
        FormData: MockFormData,
        fetch: fetchResponse,
        Map,
        Set,
        String,
        Error
    });

    return { elements, extras, fields, form, submitButton };
};

test("prefills each service and omits the primary service from optional extras", async () => {
    for (const service of services) {
        const { fields, extras } = await runQuoteForm(
            `?service=${encodeURIComponent(service)}`,
            async () => new Response("{}")
        );

        assert.equal(fields.service.value, service);
        assert.equal(extras.filter((checkbox) => !checkbox.label.hidden).length, 3);
        assert.equal(extras.find((checkbox) => checkbox.value === service).label.hidden, true);
    }
});

test("keeps entered details and shows no reference when the endpoint rejects a request", async () => {
    const { elements, fields, form, submitButton } = await runQuoteForm(
        `?service=${encodeURIComponent("Carpet & Upholstery Cleaning")}`,
        async () => new Response(JSON.stringify({ error: "Please try again." }), { status: 502 })
    );

    await form.onsubmit({ preventDefault() {} });

    assert.equal(fields.name.value, "Sam Customer");
    assert.equal(fields.email.value, "sam@example.test");
    assert.equal(fields.service.value, "Carpet & Upholstery Cleaning");
    assert.equal(fields.postcode.value, "PE11 1AA");
    assert.equal(form.resetCount, 0);
    assert.equal(elements.get("#quote-result").hidden, true);
    assert.equal(elements.get("#quote-email-fallback").hidden, false);
    assert.match(elements.get("#quote-status").textContent, /Please try again/);
    assert.equal(submitButton.disabled, false);
});

test("shows a reference only after the endpoint returns an accepted order ID", async () => {
    const { elements, form } = await runQuoteForm(
        `?service=${encodeURIComponent("Deep Cleaning")}`,
        async () => new Response(JSON.stringify({ orderId: "NS-test-reference" }), { status: 200 })
    );

    await form.onsubmit({ preventDefault() {} });

    assert.equal(elements.get("#quote-result").hidden, false);
    assert.match(elements.get("#quote-brief").textContent, /Reference ID: NS-test-reference/);
    assert.equal(elements.get("#quote-status").dataset.state, "success");
    assert.equal(form.resetCount, 1);
});
