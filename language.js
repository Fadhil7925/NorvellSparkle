(() => {
    const target = document.querySelector("#google_translate_element");
    const status = document.querySelector(".language-status");
    if (!target || !status) return;

    const languageDropdown = target.closest(".language-dropdown");
    const markReady = () => {
        const languageSelect = target.querySelector(".goog-te-combo");
        if (!languageSelect) return false;

        languageSelect.setAttribute("aria-label", "Choose a language");
        languageSelect.addEventListener("change", () => {
            if (languageDropdown) languageDropdown.open = false;
        });
        status.textContent = "";
        return true;
    };

    const observer = new MutationObserver(() => {
        if (markReady()) {
            observer.disconnect();
            window.clearTimeout(loadTimeout);
        }
    });
    observer.observe(target, { childList: true, subtree: true });

    const loadTimeout = window.setTimeout(() => {
        if (!markReady()) {
            status.textContent = "Language options could not be loaded. Please try again later.";
        }
        observer.disconnect();
    }, 10000);

    window.googleTranslateElementInit = () => {
        try {
            new window.google.translate.TranslateElement(
                { pageLanguage: "en", autoDisplay: false },
                target.id
            );
        } catch (error) {
            window.clearTimeout(loadTimeout);
            observer.disconnect();
            status.textContent = "Language options could not be loaded. Please try again later.";
            console.error("Google Translate could not be initialized.", error);
        }
    };

    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => {
        window.clearTimeout(loadTimeout);
        observer.disconnect();
        status.textContent = "Language options could not be loaded. Please try again later.";
    };
    document.head.append(script);
})();
