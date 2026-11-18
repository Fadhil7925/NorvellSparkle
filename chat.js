(() => {
    const markup = `
        <div class="chat-widget">
            <section class="chat-panel" id="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title" hidden>
                <div class="chat-panel-header">
                    <div>
                        <h2 id="chat-title">Norwell Sparkle Support</h2>
                        <p>Support assistant · Avoid sharing sensitive details</p>
                    </div>
                    <button class="chat-close" type="button" aria-label="Close chat">×</button>
                </div>
                <div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
                    <p class="chat-message chat-message-assistant">Hi! I’m Norwell Sparkle’s support assistant. Ask about our services, quotes, or getting in touch.</p>
                </div>
                <p class="chat-status" id="chat-status" role="status" aria-live="polite"></p>
                <form class="chat-form" id="chat-form">
                    <label class="chat-sr-only" for="chat-input">Your message</label>
                    <input id="chat-input" name="message" type="text" maxlength="2000" autocomplete="off" placeholder="Type your question…" required>
                    <button class="chat-send" type="submit">Send</button>
                </form>
                <p class="chat-disclaimer">This support assistant runs in your browser. For a quote, use <a href="quote.html">Get a Quote</a>.</p>
            </section>
            <button class="chat-toggle" type="button" aria-expanded="false" aria-controls="chat-panel">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 20l.9-4.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/></svg>
                <span>Chat with us</span>
            </button>
        </div>`;

    document.body.insertAdjacentHTML("beforeend", markup);

    const toggle = document.querySelector(".chat-toggle");
    const panel = document.querySelector("#chat-panel");
    const close = document.querySelector(".chat-close");
    const messagesElement = document.querySelector("#chat-messages");
    const status = document.querySelector("#chat-status");
    const form = document.querySelector("#chat-form");
    const input = document.querySelector("#chat-input");
    const send = form.querySelector('button[type="submit"]');
    let conversation = [];

    const getSupportReply = (message) => {
        const normalized = message.toLowerCase();

        if (/\b(price|prices|cost|costs|how much|pricing|quote)\b/.test(normalized)) {
            return "We don’t publish set prices. Tell us about your space and the service you need through the quote form, and Norwell Sparkle will follow up with a quote. A request isn’t a confirmed booking.";
        }
        if (/\b(available|availability|area|areas|postcode|location|service area)\b/.test(normalized)) {
            return "Service availability depends on your area. Share your postcode in the quote form or email foyewole16@gmail.com to ask.";
        }
        if (/\b(book|booking|schedule|appointment|when|date)\b/.test(normalized)) {
            return "To get started, send a quote request with your preferred date and service. Norwell Sparkle will confirm details with you; a request isn’t a confirmed booking.";
        }
        if (/\b(recurring|regular|weekly|fortnightly|monthly)\b/.test(normalized)) {
            return "You can ask about a recurring schedule. Share the routine you have in mind in a quote request, and the team can discuss what fits.";
        }
        if (/\b(extra|extras|oven|fridge|window|windows|laundry)\b/.test(normalized)) {
            return "You can request extras such as oven cleaning, inside-fridge cleaning, interior windows, or laundry folding in the quote form. Extras are subject to confirmation.";
        }
        if (/\b(move|moving|moved|tenancy)\b/.test(normalized)) {
            return "Move-in and move-out cleaning can be planned around your space and timing. Share the details in a quote request and the team will follow up.";
        }
        if (/\b(commercial|office|workplace|business)\b/.test(normalized)) {
            return "Commercial and office cleaning is planned around your workplace and business schedule. Share the space and timing you have in mind in a quote request.";
        }
        if (/\b(deep clean|deep cleaning)\b/.test(normalized)) {
            return "Deep cleaning focuses on the areas that need extra attention. Tell us your priorities in a quote request so the team can discuss your needs.";
        }
        if (/\b(residential|home|house|flat|apartment|bedroom)\b/.test(normalized)) {
            return "Residential cleaning is planned around your home’s rooms and routine. Use the quote form to share the size of your space and your priorities.";
        }
        if (/\b(human|person|team|contact|email|talk|speak)\b/.test(normalized)) {
            return "You can reach the Norwell Sparkle team at foyewole16@gmail.com, or share your cleaning needs through the quote form.";
        }

        return "I can help with residential, commercial, deep, or move-in/move-out cleaning, quote requests, extras, and contacting the team. What would you like to know? For a question I can’t answer, email foyewole16@gmail.com.";
    };

    const getQuoteDetails = (messages) => {
        const details = messages
            .filter((message) => message.role === "user")
            .map((message) => message.content)
            .join("\n")
            .slice(-2000);
        const normalized = details.toLowerCase();
        let service = "";
        let servicePage = "";

        if (/\b(move|moving|moved|tenancy)\b/.test(normalized)) {
            service = "Move-in / move-out cleaning";
            servicePage = "move-cleaning.html";
        } else if (/\b(commercial|office|workplace|business)\b/.test(normalized)) {
            service = "Commercial & office cleaning";
            servicePage = "commercial-cleaning.html";
        } else if (/\bdeep clean(?:ing)?\b/.test(normalized)) {
            service = "Deep cleaning";
            servicePage = "deep-cleaning.html";
        } else if (/\b(residential|home|house|flat|apartment)\b/.test(normalized)) {
            service = "Residential cleaning";
            servicePage = "residential-cleaning.html";
        }

        let size = "";
        if (/\b(?:studio|one|1)[ -]?(?:bed(?:room)?s?)\b/.test(normalized)) {
            size = "Studio / 1 bedroom";
        } else if (/\b(?:two|2|three|3)[ -]?(?:bed(?:room)?s?)\b/.test(normalized)) {
            size = "2–3 bedrooms";
        } else if (/\b(?:four|4)(?:\s*(?:\+|plus|or more))?[ -]?(?:bed(?:room)?s?)\b/.test(normalized)) {
            size = "4+ bedrooms";
        } else if (/\bsmall\b.{0,20}\b(?:office|workspace)\b/.test(normalized)) {
            size = "Small workspace";
        } else if (/\bmedium\b.{0,20}\b(?:office|workspace)\b/.test(normalized)) {
            size = "Medium workspace";
        } else if (/\blarge\b.{0,20}\b(?:office|workspace)\b/.test(normalized)) {
            size = "Large workspace";
        }

        const extras = [];
        if (/\boven\b/.test(normalized)) extras.push("Oven cleaning");
        if (/\bfridge\b/.test(normalized)) extras.push("Inside fridge");
        if (/\bwindows?\b/.test(normalized)) extras.push("Interior windows");
        if (/\blaundry\b/.test(normalized)) extras.push("Laundry folding");

        const params = new URLSearchParams();
        if (service) params.set("service", service);
        if (size) params.set("size", size);
        extras.forEach((extra) => params.append("extras", extra));
        if (details) params.set("notes", details);

        return {
            service,
            servicePage,
            quoteUrl: `quote.html?${params.toString()}#quote-form`
        };
    };

    const appendMessage = (role, content, quoteMessages = conversation) => {
        const message = document.createElement("p");
        message.className = `chat-message chat-message-${role}`;
        message.textContent = content;
        messagesElement.append(message);
        if (role === "assistant") {
            const details = getQuoteDetails(quoteMessages);
            const actions = document.createElement("div");
            actions.className = "chat-actions";

            if (details.servicePage) {
                const serviceLink = document.createElement("a");
                serviceLink.href = details.servicePage;
                serviceLink.textContent = `Explore ${details.service}`;
                actions.append(serviceLink);
            }

            const quoteLink = document.createElement("a");
            quoteLink.href = details.quoteUrl;
            quoteLink.textContent = "Start a quote";
            actions.append(quoteLink);
            messagesElement.append(actions);
        }
        messagesElement.scrollTop = messagesElement.scrollHeight;
    };

    const closePanel = () => {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
    };

    toggle.addEventListener("click", () => {
        const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
        panel.hidden = !shouldOpen;
        toggle.setAttribute("aria-expanded", String(shouldOpen));
        if (shouldOpen) input.focus();
    });

    close.addEventListener("click", closePanel);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.hidden) closePanel();
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const content = input.value.trim();
        if (!content) return;

        const pendingConversation = [
            ...conversation,
            { role: "user", content }
        ].slice(-12);

        appendMessage("user", content);
        input.value = "";
        input.disabled = true;
        send.disabled = true;
        const reply = getSupportReply(content);
        conversation = [...pendingConversation, { role: "assistant", content: reply }].slice(-12);
        appendMessage("assistant", reply, conversation);
        status.textContent = "";
        input.disabled = false;
        send.disabled = false;
        if (!panel.hidden) input.focus();
    });
})();
