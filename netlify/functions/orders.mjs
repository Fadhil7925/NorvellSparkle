import { randomUUID } from "node:crypto";

const services = new Set([
    "Residential cleaning",
    "Commercial & office cleaning",
    "Deep cleaning",
    "Move-in / move-out cleaning"
]);

const sizes = new Set([
    "Studio / 1 bedroom",
    "2–3 bedrooms",
    "4+ bedrooms",
    "Small workspace",
    "Medium workspace",
    "Large workspace"
]);

const availableExtras = new Set([
    "Oven cleaning",
    "Inside fridge",
    "Interior windows",
    "Laundry folding"
]);

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
});

const trimmedString = (value, maxLength) => (
    typeof value === "string" && value.trim().length <= maxLength
        ? value.trim()
        : null
);

const isValidDate = (value) => {
    if (value === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export default async (request) => {
    if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
    }

    let order;
    try {
        order = await request.json();
    } catch {
        return jsonResponse({ error: "Request must contain valid JSON." }, 400);
    }

    if (!order || typeof order !== "object" || Array.isArray(order)) {
        return jsonResponse({ error: "Order details are invalid." }, 400);
    }

    if (order.website !== undefined && (typeof order.website !== "string" || order.website.trim())) {
        return jsonResponse({ error: "Order details are invalid." }, 400);
    }

    const name = trimmedString(order.name, 100);
    const service = trimmedString(order.service, 80);
    const postcode = trimmedString(order.postcode, 24);
    const size = trimmedString(order.size, 80);
    const preferredDate = trimmedString(order.preferredDate ?? "", 10);
    const notes = trimmedString(order.notes ?? "", 2000);
    const extras = order.extras === undefined ? [] : order.extras;

    if (
        !name
        || !service
        || !services.has(service)
        || !postcode
        || !size
        || !sizes.has(size)
        || preferredDate === null
        || !isValidDate(preferredDate)
        || notes === null
        || !Array.isArray(extras)
        || extras.length > availableExtras.size
        || extras.some((extra) => typeof extra !== "string" || !availableExtras.has(extra))
    ) {
        return jsonResponse({ error: "Please check the order details and try again." }, 400);
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
        console.error("Order email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
        return jsonResponse({ error: "Order email is temporarily unavailable. Please try again later." }, 503);
    }

    const orderId = `NS-${randomUUID().toUpperCase()}`;
    const emailText = [
        `Order ID: ${orderId}`,
        `Customer name: ${name}`,
        `Service: ${service}`,
        `Postcode / ZIP code: ${postcode}`,
        `Home or space size: ${size}`,
        `Preferred date: ${preferredDate || "Not provided"}`,
        `Extras: ${extras.length ? extras.join(", ") : "None selected"}`,
        `Additional details: ${notes || "None"}`
    ].join("\n");

    try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from,
                to: ["foyewole16@gmail.com"],
                subject: `Order confirmed: ${orderId}`,
                text: emailText
            }),
            signal: AbortSignal.timeout(10000)
        });

        if (!emailResponse.ok) {
            console.error(`Resend rejected order email with status ${emailResponse.status}.`);
            return jsonResponse({ error: "Your order could not be confirmed. Please try again later." }, 502);
        }
    } catch (error) {
        console.error("Could not send order email:", error);
        return jsonResponse({ error: "Your order could not be confirmed. Please try again later." }, 502);
    }

    return jsonResponse({ orderId });
};
