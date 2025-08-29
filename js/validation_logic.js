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

function validate_rule_file_json(json_object) {
    const t = get_t_func();
    console.log("[ValidationLogic] Running validation for new rule file...");

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
    
    const metadata = json_object.metadata;
    if (typeof metadata !== 'object' || metadata === null) {
        return { isValid: false, message: t('rule_file_metadata_must_be_object') };
    }

    const required_metadata_keys = ['title', 'pageTypes', 'contentTypes'];
    const missing_metadata_keys = required_metadata_keys.filter(key => !(key in metadata));
    if (missing_metadata_keys.length > 0) {
        return {
            isValid: false,
            message: t('rule_file_metadata_missing_keys', { missingKeys: missing_metadata_keys.join(', ') })
        };
    }

    // Validera att kravets `instructions` nu är en sträng (om det finns)
    if (typeof json_object.requirements === 'object' && json_object.requirements !== null) {
        for (const req_key in json_object.requirements) {
            const requirement = json_object.requirements[req_key];
            if (requirement && requirement.hasOwnProperty('instructions') && typeof requirement.instructions !== 'string') {
                // Detta är den centrala ändringen för r80
                return { isValid: false, message: `Validation Error: Requirement '${req_key}' has an 'instructions' field that is not a string.` };
            }
        }
    } else {
         return { isValid: false, message: t('rule_file_requirements_must_be_object') };
    }

    console.log("[ValidationLogic] Basic validation passed for r80 structure.");
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
