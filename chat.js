(() => {
    const welcomeMessage = "Hi! I’m NorvellSparkle’s virtual assistant. Ask about our services, quotes, or getting in touch.";
    const markup = `
        <div class="chat-widget">
            <section class="chat-panel" id="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title" hidden>
                <div class="chat-panel-header">
                    <div class="chat-heading">
                        <h2 id="chat-title">NorvellSparkle Support</h2>
                        <p>Here to help with your cleaning questions</p>
                    </div>
                    <div class="chat-header-actions">
                        <button class="chat-new" type="button">New chat</button>
                        <button class="chat-close" type="button" aria-label="Close chat">×</button>
                    </div>
                </div>
                <div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
                    <p class="chat-message chat-message-assistant chat-welcome">${welcomeMessage}</p>
                </div>
                <div class="chat-quick-questions" aria-label="Quick questions">
                    <button type="button">What services do you offer?</button>
                    <button type="button">How do quotes work?</button>
                    <button type="button">What extras can I request?</button>
                    <button type="button">Do you cover my area?</button>
                </div>
                <div class="chat-suggestions" id="chat-suggestions" aria-live="polite" hidden></div>
                <form class="chat-form" id="chat-form">
                    <label class="chat-sr-only" for="chat-input">Your message</label>
                    <input id="chat-input" name="message" type="text" maxlength="2000" autocomplete="off" placeholder="Type your question…" required>
                    <button class="chat-send" type="submit">Send</button>
                </form>
                <p class="chat-disclaimer">This support assistant runs in your browser. For a quote, use <a href="quote.html#quote-form">Get a quote</a>.</p>
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
    const newChat = document.querySelector(".chat-new");
    const messagesElement = document.querySelector("#chat-messages");
    const suggestions = document.querySelector("#chat-suggestions");
    const form = document.querySelector("#chat-form");
    const input = document.querySelector("#chat-input");
    const send = form.querySelector('button[type="submit"]');
    const quickQuestions = document.querySelector(".chat-quick-questions");
    let conversation = [];
    let fallbackReplyIndex = 0;

    const serviceOptions = [
        {
            value: "Home Cleaning",
            page: "residential-cleaning.html",
            pattern: /\b(?:residential|home|house|flat|apartment)\s*(?:clean(?:ing)?|service)?\b/gi,
            explicitPattern: /\bresidential\b|\b(?:home|house|flat|apartment)\s*(?:clean(?:ing)?|service)\b/i
        },
        {
            value: "Office & Commercial Cleaning",
            page: "commercial-cleaning.html",
            pattern: /\b(?:commercial|office|workplace|business)\s*(?:clean(?:ing)?|service)?\b/gi,
            explicitPattern: /\bcommercial\b|\b(?:office|workplace|business)\s*(?:clean(?:ing)?|service)\b/i
        },
        {
            value: "Deep Cleaning",
            page: "deep-cleaning.html",
            pattern: /\bdeep\s+clean(?:ing)?\b/gi,
            explicitPattern: /./
        },
        {
            value: "Carpet & Upholstery Cleaning",
            page: "carpet-upholstery-cleaning.html",
            pattern: /\b(?:carpet|rug|sofa|upholstery)\s*(?:clean(?:ing)?|service)?\b/gi,
            explicitPattern: /\b(?:carpet|rug|sofa|upholstery)\b/i
        }
    ];

    const extrasOptions = [
        { value: "Home Cleaning", pattern: /\b(?:home|house|residential)\b/i },
        { value: "Office & Commercial Cleaning", pattern: /\b(?:office|commercial|workplace)\b/i },
        { value: "Deep Cleaning", pattern: /\bdeep\b/i },
        { value: "Carpet & Upholstery Cleaning", pattern: /\b(?:carpet|rug|sofa|upholstery)\b/i }
    ];

    const isNegated = (text, index) => {
        const prefix = text.slice(Math.max(0, index - 48), index);
        return /\b(?:not|no longer|don't|do not|never|instead of|rather than|cancel(?:led)?)\s+(?:(?:the|a|an|want|need|looking for|interested in|any)\s+)*$/i.test(prefix);
    };

    const getConversationDetails = (messages) => {
        let service = "";
        let size = "";
        const extras = new Set();
        const userMessages = messages.filter((message) => message.role === "user").map((message) => message.content);

        userMessages.forEach((text) => {
            const serviceMentions = serviceOptions.flatMap((option) => {
                const regex = new RegExp(option.pattern.source, "gi");
                return [...text.matchAll(regex)].map((match) => ({
                    option,
                    index: match.index,
                    negated: isNegated(text, match.index),
                    explicit: option.explicitPattern.test(match[0])
                }));
            }).sort((a, b) => a.index - b.index);
            const positiveMentions = serviceMentions.filter((mention) => !mention.negated);
            const selectedService = positiveMentions.filter((mention) => mention.explicit).at(-1)
                || positiveMentions.at(-1);
            if (selectedService) {
                service = selectedService.option.value;
            } else {
                serviceMentions.forEach((mention) => {
                    if (mention.negated && service === mention.option.value) service = "";
                });
            }

            if (/\b(?:no|none|vithout|don't need|do not need)\s+(?:any\s+)?extras?\b/i.test(text)) {
                extras.clear();
            }
            extrasOptions.forEach((option) => {
                const match = option.pattern.exec(text);
                if (!match) return;
                if (isNegated(text, match.index)) extras.delete(option.value);
                else extras.add(option.value);
            });

            const sizePatterns = [
                { value: "Studio / 1 bedroom", pattern: /\bstudio\b|\b(?:one|1)[ -]?(?:bed(?:room)?s?)\b/i },
                { value: "2–3 bedrooms", pattern: /\b(?:two|2|three|3)[ -]?(?:bed(?:room)?s?)\b/i },
                { value: "4+ bedrooms", pattern: /\bfour(?:\s*(?:\+|plus|or more))?[ -]?(?:bed(?:room)?s?)\b|\b4\s*(?:\+|plus|or more)?[ -]?(?:bed(?:room)?s?)\b/i },
                { value: "Small workspace", pattern: /\bsmall\b.{0,30}\b(?:office|workspace)\b|\b(?:office|workspace)\b.{0,30}\bsmall\b/i },
                { value: "Medium workspace", pattern: /\bmedium\b.{0,30}\b(?:office|workspace)\b|\b(?:office|workspace)\b.{0,30}\bmedium\b/i },
                { value: "Large workspace", pattern: /\blarge\b.{0,30}\b(?:office|workspace)\b|\b(?:office|workspace)\b.{0,30}\blarge\b/i }
            ];
            const matchedSize = sizePatterns.find((option) => option.pattern.test(text));
            if (matchedSize) size = matchedSize.value;
        });

        const params = new URLSearchParams();
        if (service) params.set("service", service);
        if (size) params.set("size", size);
        extras.forEach((extra) => params.append("extras", extra));
        if (userMessages.length) params.set("notes", userMessages.join("\n").slice(-2000));

        return {
            service,
            servicePage: serviceOptions.find((option) => option.value === service)?.page || "",
            size,
            extras: [...extras],
            quoteUrl: `quote.html?${params.toString()}#quote-form`
        };
    };

    const getSupportReply = (message) => {
        if (/\b(?:hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(message)) {
            return "Hi there! What can I help you figure out today?";
        }
        if (/\b(?:thanks|thank you|thx)\b/i.test(message)) {
            return "You’re welcome! If another question comes up, I’m here.";
        }

        const topics = [
            {
                pattern: /\b(?:complaint|complain|unhappy|dissatisfied|refund|re-clean|redo|issue|problem)\b/i,
                reply: "I’m sorry you’ve had a problem. Please email foyewole16@gmail.com with the details so the team can review it; they’ll decide any refund or re-clean."
            },
            {
                pattern: /\b(?:price|prices|cost|costs|how much|pricing|quote|quotes|estimate)\b/i,
                reply: "We don’t publish set prices. Share your service, space size, and priorities in a quote request and the team will follow up. A request isn’t a confirmed booking."
            },
            {
                pattern: /\b(?:available|availability|area|areas|postcode|location|service area|cover my area)\b/i,
                reply: "Availability depends on your area. Share your postcode in a quote request or email foyewole16@gmail.com to ask."
            },
            {
                pattern: /\b(?:book|booking|schedule|appointment|when|date)\b/i,
                reply: "To get started, send a quote request with your preferred date and service. The team will confirm details with you; a request isn’t a confirmed booking."
            },
            {
                pattern: /\b(?:recurring|regular|weekly|fortnightly|monthly)\b/i,
                reply: "You can ask about a recurring schedule. Share the routine you have in mind in a quote request, and the team can discuss what fits."
            },
            {
                pattern: /\b(?:what services|vhich services|services do you offer|cleaning services)\b/i,
                reply: "NorvellSparkle offers Home Cleaning, Office & Commercial Cleaning, Deep Cleaning, and Carpet & Upholstery Cleaning."
            },
            {
                pattern: /\b(?:move[- ]in|move[- ]out|moving\s+(?:in|out)|tenancy|end[- ]of[- ]tenancy)\b/i,
                reply: "We can plan Home Cleaning or Deep Cleaning around your move, depending on your space and priorities. Share your timing and handoff details in a quote request."
            },
            {
                pattern: /\b(?:commercial|office|workplace|business)\b/i,
                reply: "Office & Commercial Cleaning is planned around your workplace and business schedule. Share the space and timing you have in mind in a quote request."
            },
            {
                pattern: /\bdeep\s+clean(?:ing)?\b/i,
                reply: "Deep Cleaning focuses on the areas that need extra attention. Tell the team your priorities in a quote request."
            },
            {
                pattern: /\b(?:residential|home|house|flat|apartment|bedroom)\b/i,
                reply: "Home Cleaning is planned around your rooms and routine. Use the quote form to share the size of your space and your priorities."
            },
            {
                pattern: /\b(?:extra|extras|oven|fridge|window|windows|laundry)\b/i,
                reply: "You can ask about oven cleaning, inside-fridge cleaning, interior windows, or laundry folding. Extras are requests and need confirmation."
            },
            {
                pattern: /\b(?:human|person|team|contact|email|talk|speak)\b/i,
                reply: "You can reach the NorvellSparkle team at foyewole16@gmail.com, or share your cleaning needs through the quote form."
            }
        ];
        const replies = topics.filter((topic) => topic.pattern.test(message)).map((topic) => topic.reply);

        if (replies.length) return [...new Set(replies)].join("\n\n");

        const fallbackReplies = [
            "I’m not certain about that, and I don’t want to guess. Ask me about cleaning options, quotes, extras, or availability—or email foyewole16@gmail.com for help.",
            "I don’t have that detail to hand. The NorvellSparkle team can help at foyewole16@gmail.com. I can also answer questions about services, quote requests, and extras.",
            "That’s not something I can confirm here. Try asking about a cleaning service, scheduling, or a quote; for anything else, reach the team at foyewole16@gmail.com."
        ];
        const reply = fallbackReplies[fallbackReplyIndex % fallbackReplies.length];
        fallbackReplyIndex += 1;
        return reply;
    };

    const renderSuggestions = () => {
        const details = getConversationDetails(conversation);
        if (!conversation.some((message) => message.role === "user")) {
            suggestions.hidden = true;
            suggestions.replaceChildren();
            return;
        }

        suggestions.replaceChildren();
        if (details.service) {
            const serviceLink = document.createElement("a");
            serviceLink.href = details.servicePage;
            serviceLink.className = "chat-service-suggestion";
            serviceLink.textContent = `Explore ${details.service}`;
            suggestions.append(serviceLink);
        }

        const quoteLink = document.createElement("a");
        quoteLink.href = details.quoteUrl;
        quoteLink.className = "chat-quote-suggestion";
        quoteLink.textContent = details.size || details.extras.length
            ? `Get a quote${details.size ? ` · ${details.size}` : ""}${details.extras.length ? ` · ${details.extras.join(", ")}` : ""}`
            : "Get a quote";
        suggestions.append(quoteLink);
        suggestions.hidden = false;
    };

    const appendMessage = (role, content) => {
        const message = document.createElement("p");
        message.className = `chat-message chat-message-${role}`;
        message.textContent = content;
        messagesElement.append(message);
        messagesElement.scrollTop = messagesElement.scrollHeight;
    };

    const startNewChat = () => {
        conversation = [];
        fallbackReplyIndex = 0;
        messagesElement.replaceChildren();
        appendMessage("assistant", welcomeMessage);
        suggestions.replaceChildren();
        suggestions.hidden = true;
        input.value = "";
        input.focus();
    };

    const closePanel = () => {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
    };

    const submitMessage = (rawMessage) => {
        const content = rawMessage.trim();
        if (!content) return;

        input.value = "";
        conversation = [...conversation, { role: "user", content }].slice(-12);
        appendMessage("user", content);
        appendMessage("assistant", getSupportReply(content));
        renderSuggestions();
        input.focus();
    };

    toggle.addEventListener("click", () => {
        const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
        panel.hidden = !shouldOpen;
        toggle.setAttribute("aria-expanded", String(shouldOpen));
        if (shouldOpen) input.focus();
    });

    close.addEventListener("click", closePanel);
    newChat.addEventListener("click", startNewChat);

    quickQuestions.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (button) submitMessage(button.textContent);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.hidden) closePanel();
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitMessage(input.value);
    });
})();
