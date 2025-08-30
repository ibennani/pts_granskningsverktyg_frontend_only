(function () { // IIFE start
    'use strict';

    function get_t_func() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = `**${key}**`;
                if (replacements) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (VL t not found)";
            };
    }

    

// Fil: js/validation_logic.js

// ... (behåll get_t_func() och RULE_FILE_SCHEMA)

// js/validation_logic.js

// js/validation_logic.js

function validate_rule_file_json(json_object) {
    const t = get_t_func();
    console.log("[ValidationLogic] Running validation for new rule file (r83 compatible)...");

    if (typeof json_object !== 'object' || json_object === null) {
        return { isValid: false, message: t('rule_file_invalid_json') };
    }

    const required_top_keys = ['metadata', 'requirements'];
    if (required_top_keys.some(key => !(key in json_object))) {
        const missing = required_top_keys.filter(key => !(key in json_object));
        return { isValid: false, message: t('rule_file_missing_keys', { missingKeys: missing.join(', ') }) };
    }
    
    const metadata = json_object.metadata;
    if (typeof metadata !== 'object' || metadata === null) {
        return { isValid: false, message: t('rule_file_metadata_must_be_object') };
    }

    // --- START PÅ NY r83-validering ---
    if (!metadata.samples || typeof metadata.samples !== 'object') {
        return { isValid: false, message: "Regelfilen måste innehålla ett 'metadata.samples'-objekt." };
    }
    if (!Array.isArray(metadata.samples.sampleCategories) || metadata.samples.sampleCategories.length === 0) {
        return { isValid: false, message: "'metadata.samples.sampleCategories' måste vara en array med minst en kategori." };
    }

    // Validera varje kategori i sampleCategories
    for (const category of metadata.samples.sampleCategories) {
        if (!category.id || !category.text || !Array.isArray(category.categories) || category.categories.length === 0) {
            return { isValid: false, message: `Varje objekt i 'sampleCategories' måste ha 'id', 'text', och en 'categories'-array med minst ett objekt. Fel vid: ${category.text || 'Okänd kategori'}` };
        }
        for (const subcat of category.categories) {
            if (!subcat.id || !subcat.text) {
                return { isValid: false, message: `Varje underkategori i '${category.text}' måste ha 'id' och 'text'.` };
            }
        }
    }
    // --- SLUT PÅ NY r83-validering ---

    console.log("[ValidationLogic] Validation passed for r83 structure.");
    return { isValid: true, message: t('rule_file_loaded_successfully') };
}

// ... (resten av filen, inklusive validate_saved_audit_file, kan vara kvar som den är)

    function validate_saved_audit_file(json_object) {
        const t = get_t_func();
        if (typeof json_object !== 'object' || json_object === null) {
            return { isValid: false, message: t('error_invalid_saved_audit_file') };
        }

        const required_keys = ['saveFileVersion', 'ruleFileContent', 'auditMetadata', 'auditStatus', 'samples'];
        const missing_keys = required_keys.filter(key => !(key in json_object));

        if (missing_keys.length > 0) {
            console.warn(`[ValidationLogic] Sparad granskningsfil saknar nycklar: ${missing_keys.join(', ')}`);
            return { isValid: false, message: t('error_invalid_saved_audit_file') + ` (Saknar: ${missing_keys.join(', ')})` };
        }

        return { isValid: true, message: "Validering av sparad granskningsfil OK." };
    }

    const public_api = {
        validate_rule_file_json,
        validate_saved_audit_file
    };
    window.ValidationLogic = public_api;

    console.log("[validation_logic.js] IIFE executed. typeof window.ValidationLogic:", typeof window.ValidationLogic);
    if (typeof window.ValidationLogic === 'object' && window.ValidationLogic !== null) {
        console.log("[validation_logic.js] window.ValidationLogic keys:", Object.keys(window.ValidationLogic));
    }
})();
