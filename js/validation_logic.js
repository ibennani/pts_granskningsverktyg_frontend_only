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

    const RULE_FILE_SCHEMA = {
        required_top_keys: ['metadata', 'requirements'],
        metadata_object: {
            required_keys: ['title', 'pageTypes', 'contentTypes'],
            pageTypes_is_array_of_strings: true,
            contentTypes_is_array_of_objects: true,
            contentTypes_object_keys: ['id', 'text']
        },
        requirements_is_object: true,
        requirement_object: {
            required_keys: ['id', 'title', 'expectedObservation', 'checks', 'contentType'],
            id_is_string_non_empty: true,
            title_is_string_non_empty: true,
            expectedObservation_is_string: true,
            checks_is_array: true,
            contentType_is_array_of_strings: true
        },
        check_object: {
            required_keys: ['id', 'condition', 'passCriteria'],
            id_is_string_non_empty: true,
            condition_is_string_non_empty: true,
            passCriteria_is_array: true,
            logic_is_optional_string_or_or_and: true
        },
        passCriterion_object: {
            required_keys: ['id', 'requirement'],
            id_is_string_non_empty: true,
            requirement_is_string_non_empty: true
        }
    };

// Fil: js/validation_logic.js

// ... (behåll get_t_func() och RULE_FILE_SCHEMA)

function validate_rule_file_json(json_object) {
    const t = get_t_func();
    console.log("[ValidationLogic] validate_rule_file_json CALLED (Simplified Validation).");

    // Steg 1: Grundläggande kontroller som fortfarande är viktiga
    if (typeof json_object !== 'object' || json_object === null) {
        return { isValid: false, message: t('rule_file_invalid_json') };
    }

    const required_top_keys = ['metadata', 'requirements'];
    const missing_top_keys = required_top_keys.filter(key => !(key in json_object));
    if (missing_top_keys.length > 0) {
        return {
            isValid: false,
            message: t('rule_file_missing_keys', { missingKeys: missing_top_keys.join(', ') })
        };
    }
    
    // Steg 2: Acceptera filen om de grundläggande kontrollerna passerar.
    // Vi kommenterar bort eller tar bort den detaljerade schemavalideringen
    // eftersom den är inkompatibel med den nya, mer komplexa regelfilsstrukturen.
    console.warn("[ValidationLogic] Detailed schema validation is currently BYPASSED. Only basic structure is checked.");

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
