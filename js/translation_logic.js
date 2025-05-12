(function () { // IIFE start
    'use-strict';

    // Skapa det globala objektet FÖRST om det inte finns
    window.Translation = window.Translation || {};

    let current_language_tag = 'sv-SE'; 
    let loaded_translations = {};     
    const supported_languages = {     
        'sv-SE': 'Svenska (Sverige)',
        'en-GB': 'English (UK)'
    };
    let initial_load_promise = null;
    const DEFAULT_LANGUAGE_TAG = 'sv-SE'; 

    async function load_language_file(lang_tag_to_load) {
        // ... (load_language_file funktionen som tidigare, med all loggning) ...
        let effective_lang_tag = lang_tag_to_load;
        let file_to_fetch = effective_lang_tag;

        if (!supported_languages[effective_lang_tag]) {
            console.warn(`[Translation] Language tag "${effective_lang_tag}" is not directly in supported_languages list.`);
            const base_lang = effective_lang_tag.split('-')[0]; 
            const matching_supported_base = Object.keys(supported_languages).find(
                key => key.startsWith(base_lang + '-') || key === base_lang
            );
            if (matching_supported_base) {
                console.log(`[Translation] Falling back from "${effective_lang_tag}" to supported regional/base variant "${matching_supported_base}".`);
                file_to_fetch = matching_supported_base;
                effective_lang_tag = matching_supported_base;
            } else {
                console.warn(`[Translation] No regional/base variant for "${effective_lang_tag}" (base: "${base_lang}") found. Falling back to default: ${DEFAULT_LANGUAGE_TAG}.`);
                file_to_fetch = DEFAULT_LANGUAGE_TAG;
                effective_lang_tag = DEFAULT_LANGUAGE_TAG;
            }
        }
        if (current_language_tag === effective_lang_tag && Object.keys(loaded_translations).length > 0 && loaded_translations['app_title']) {
            console.log(`[Translation] Language "${effective_lang_tag}" is already loaded and current (skipped fetch).`);
            return loaded_translations;
        }
        try {
            const response = await fetch(`js/i18n/${file_to_fetch}.json?v=${new Date().getTime()}`); 
            if (!response.ok) {
                const failed_url = new URL(`js/i18n/${file_to_fetch}.json`, window.location.href).href;
                throw new Error(`Failed to load language file ${failed_url}: ${response.status} ${response.statusText}`);
            }
            const new_translations = await response.json(); 
            console.log(`[Translation] Fetched translations for "${file_to_fetch}":`, JSON.parse(JSON.stringify(new_translations))); 
            loaded_translations = new_translations; 
            current_language_tag = effective_lang_tag; 
            console.log(`[Translation] Global 'loaded_translations' updated for "${current_language_tag}". app_title is now: "${loaded_translations['app_title']}"`);
            document.documentElement.lang = current_language_tag; 
            return loaded_translations;
        } catch (error) { 
            console.error(`[Translation] Error loading or parsing language file for "${file_to_fetch}":`, error);
            if (effective_lang_tag !== DEFAULT_LANGUAGE_TAG) {
                console.warn(`[Translation] Falling back to default language '${DEFAULT_LANGUAGE_TAG}' due to error.`);
                return await load_language_file(DEFAULT_LANGUAGE_TAG); 
            } else if (Object.keys(loaded_translations).length === 0) {
                console.error(`[Translation] CRITICAL: Could not load default language file '${DEFAULT_LANGUAGE_TAG}'.`);
                loaded_translations = { app_title: "Audit Tool - Language File Error" }; 
                document.documentElement.lang = 'en'; 
            }
            return loaded_translations; 
        }
    }

    async function set_language(lang_tag) {
        // ... (set_language som tidigare) ...
        console.log(`[Translation] set_language called with: ${lang_tag}. Current: ${current_language_tag}`);
        if (current_language_tag === lang_tag && Object.keys(loaded_translations).length > 0 && loaded_translations['app_title']) {
             console.log(`[Translation] Language ${lang_tag} already active, but dispatching event anyway for UI refresh.`);
        }
        await load_language_file(lang_tag); 
        console.log(`[Translation] Dispatching languageChanged event for ${current_language_tag} (after load). app_title: "${loaded_translations['app_title']}"`);
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang_tag: current_language_tag } }));
    }

    function t(key, replacements = {}) { 
        // ... (t-funktionen som tidigare) ...
        const current_translations_for_t = loaded_translations; 
        let translation = current_translations_for_t[key];
        if (translation === undefined) {
            console.warn(`[Translation] t(): Key "${key}" not found for lang "${current_language_tag}". Using key as fallback.`);
            return `**${key}**`; 
        }
        translation = translation.replace(/{([^{}]+)}/g, (match, placeholder_key) => {
            return replacements[placeholder_key] !== undefined ? replacements[placeholder_key] : match;
        });
        return translation;
    }
    
    // Definiera funktionerna först, sen tilldela dem till window.Translation
    window.Translation.set_language = set_language;
    window.Translation.t = t;
    window.Translation.get_current_language_code = () => current_language_tag;
    window.Translation.get_supported_languages = () => ({ ...supported_languages });
    
    let browser_lang_tag_resolved = (navigator.language || DEFAULT_LANGUAGE_TAG);
    const base_browser_lang_check = browser_lang_tag_resolved.split('-')[0];
    let found_supported_browser_lang = false;
    for (const key in supported_languages) {
        if (key === browser_lang_tag_resolved || key.startsWith(base_browser_lang_check + '-')) {
            browser_lang_tag_resolved = key;
            found_supported_browser_lang = true;
            break;
        }
    }
    if (!found_supported_browser_lang) {
        browser_lang_tag_resolved = DEFAULT_LANGUAGE_TAG;
    }

    console.log("[Translation] Initial browser language resolved to:", browser_lang_tag_resolved);
    initial_load_promise = load_language_file(browser_lang_tag_resolved);
    
    // Säkerställ att ensure_initial_load finns på window.Translation när initial_load_promise är definierad
    window.Translation.ensure_initial_load = () => initial_load_promise; 

    console.log("[Translation] IIFE executed, window.Translation keys:", Object.keys(window.Translation));

})(); // IIFE end