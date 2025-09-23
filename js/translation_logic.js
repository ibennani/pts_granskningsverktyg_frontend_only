// js/translation_logic.js

(function () {
    'use strict';

    const translationModules = import.meta.glob('./i18n/*.json', { eager: true });

    window.Translation = window.Translation || {};

    const supported_languages = {
        'sv-SE': 'Svenska (Sverige)',
        'en-GB': 'English (UK)'
    };

    const DEFAULT_LANGUAGE_TAG = 'sv-SE';

    let current_language_tag = DEFAULT_LANGUAGE_TAG;
    let loaded_translations = {};
    let initial_load_promise = null;

    function log(...args) {
        console.log('[Translation]', ...args);
    }

    function warn(...args) {
        console.warn('[Translation]', ...args);
    }

    function error(...args) {
        console.error('[Translation]', ...args);
    }

    function getModuleKey(lang_tag) {
        return `./i18n/${lang_tag}.json`;
    }

    function resolve_effective_language_tag(requested_tag) {
        if (supported_languages[requested_tag]) {
            return requested_tag;
        }

        const base_lang = requested_tag.split('-')[0];
        const matching_supported_base = Object.keys(supported_languages).find(
            key => key === base_lang || key.startsWith(`${base_lang}-`)
        );
        if (matching_supported_base) {
            warn(`Language tag "${requested_tag}" not supported directly. Falling back to "${matching_supported_base}".`);
            return matching_supported_base;
        }

        warn(`Language tag "${requested_tag}" not supported. Falling back to default "${DEFAULT_LANGUAGE_TAG}".`);
        return DEFAULT_LANGUAGE_TAG;
    }

    async function load_language_file(lang_tag_to_load) {
        const effective_lang_tag = resolve_effective_language_tag(lang_tag_to_load || DEFAULT_LANGUAGE_TAG);
        const moduleKey = getModuleKey(effective_lang_tag);
        const moduleData = translationModules[moduleKey];

        if (!moduleData) {
            error(`No bundled translations found for "${effective_lang_tag}" (module key: ${moduleKey}). Falling back to default.`);
            if (effective_lang_tag !== DEFAULT_LANGUAGE_TAG) {
                return load_language_file(DEFAULT_LANGUAGE_TAG);
            }
            loaded_translations = { app_title: 'Audit Tool - Missing translations' };
            current_language_tag = DEFAULT_LANGUAGE_TAG;
            document.documentElement.lang = 'en';
            return loaded_translations;
        }

        const new_translations = moduleData.default || moduleData;
        loaded_translations = JSON.parse(JSON.stringify(new_translations));
        current_language_tag = effective_lang_tag;
        document.documentElement.lang = current_language_tag;

        log(`Loaded translations for "${current_language_tag}". app_title: "${loaded_translations['app_title']}"`);
        return loaded_translations;
    }

    async function set_language(lang_tag) {
        log(`set_language called with: ${lang_tag}. Current: ${current_language_tag}`);
        await load_language_file(lang_tag);
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang_tag: current_language_tag } }));
    }

    function t(key, replacements = {}) {
        const translation_value = loaded_translations?.[key];
        if (translation_value === undefined) {
            warn(`t(): Missing key "${key}" for lang "${current_language_tag}". Returning key.`);
            return `**${key}**`;
        }
        
        // Sanitize replacement values to prevent XSS
        const sanitized_replacements = {};
        for (const [replacement_key, replacement_value] of Object.entries(replacements)) {
            if (typeof replacement_value === 'string') {
                // Escape HTML in replacement values
                sanitized_replacements[replacement_key] = window.Helpers?.escape_html(replacement_value) || replacement_value;
            } else {
                sanitized_replacements[replacement_key] = replacement_value;
            }
        }
        
        return translation_value.replace(/{([^{}]+)}/g, (match, placeholder_key) => (
            sanitized_replacements[placeholder_key] !== undefined ? sanitized_replacements[placeholder_key] : match
        ));
    }

    window.Translation.set_language = set_language;
    window.Translation.t = t;
    window.Translation.get_current_language_code = () => current_language_tag;
    window.Translation.get_supported_languages = () => ({ ...supported_languages });

    function resolve_browser_language() {
        const navigator_lang = navigator.language || DEFAULT_LANGUAGE_TAG;
        return resolve_effective_language_tag(navigator_lang);
    }

    const initial_lang = resolve_browser_language();
    log('Initial browser language resolved to:', initial_lang);
    initial_load_promise = load_language_file(initial_lang);

    window.Translation.ensure_initial_load = () => initial_load_promise;
    log('Translation bootstrap completed.');
})();
