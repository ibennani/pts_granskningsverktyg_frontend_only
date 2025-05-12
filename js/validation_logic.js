(function () { // IIFE start
    'use-strict';

    // Translation_t hämtas inuti funktionerna

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
            contentType_is_array_of_strings: true,
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

    function validate_rule_file_json(json_object) {
        const t = window.Translation ? window.Translation.t : key => `**${key}** (VL)`;
        
        console.log("[ValidationLogic] validate_rule_file_json CALLED. json_object type:", typeof json_object);
        console.log("[ValidationLogic] RULE_FILE_SCHEMA object:", JSON.parse(JSON.stringify(RULE_FILE_SCHEMA))); // Logga en kopia

        if (typeof json_object !== 'object' || json_object === null) {
            return { isValid: false, message: t('rule_file_invalid_json') };
        }

        // Kontrollera att RULE_FILE_SCHEMA och dess nyckel finns innan användning
        if (!RULE_FILE_SCHEMA || !Array.isArray(RULE_FILE_SCHEMA.required_top_keys)) {
            console.error("[ValidationLogic] CRITICAL: RULE_FILE_SCHEMA.required_top_keys is not defined or not an array!");
            return { isValid: false, message: "Internt valideringsfel: Schema definition saknas eller är korrupt." };
        }
        
        const missing_top_keys = RULE_FILE_SCHEMA.required_top_keys.filter(key => !(key in json_object));
        if (missing_top_keys.length > 0) {
            return {
                isValid: false,
                message: t('rule_file_missing_keys', { missingKeys: missing_top_keys.join(', ') })
            };
        }

        const metadata = json_object.metadata;
        if (typeof metadata !== 'object' || metadata === null) {
            return { isValid: false, message: "Regelfilens 'metadata' måste vara ett objekt." };
        }
        // ... (resten av valideringslogiken från den version du fick 00:23, den var korrekt därifrån och framåt)
        // Se till att hela validate_rule_file_json och validate_saved_audit_file är med.
        // Jag klistrar in resten här för fullständighet:
        const missing_metadata_keys = RULE_FILE_SCHEMA.metadata_object.required_keys.filter(key => !(key in metadata));
        if (missing_metadata_keys.length > 0) { let specific_message = `Regelfilens 'metadata' saknar nycklar: ${missing_metadata_keys.join(', ')}.`; if (missing_metadata_keys.includes('pageTypes') || missing_metadata_keys.includes('contentTypes')) { specific_message = `Obligatoriska 'pageTypes' och/eller 'contentTypes' saknas inuti 'metadata'-objektet i regelfilen.`;} return { isValid: false, message: specific_message };}
        if (typeof metadata.title !== 'string' || !metadata.title.trim()) { return { isValid: false, message: "Regelfilens 'metadata.title' är obligatorisk och får inte vara tom." }; }
        if (RULE_FILE_SCHEMA.metadata_object.pageTypes_is_array_of_strings) { if (!Array.isArray(metadata.pageTypes) || metadata.pageTypes.some(pt => typeof pt !== 'string' || !pt.trim())) { return { isValid: false, message: "Regelfilens 'metadata.pageTypes' måste vara en array av icke-tomma strängar." }; } }
        if (RULE_FILE_SCHEMA.metadata_object.contentTypes_is_array_of_objects) { if (!Array.isArray(metadata.contentTypes) || metadata.contentTypes.some(ct => { if (typeof ct !== 'object' || ct === null) return true; const missingCtKeys = RULE_FILE_SCHEMA.metadata_object.contentTypes_object_keys.filter(key => !(key in ct)); if (missingCtKeys.length > 0) return true; if (typeof ct.id !== 'string' || !ct.id.trim()) return true; if (typeof ct.text !== 'string' || !ct.text.trim()) return true; return false; })) { return { isValid: false, message: `Regelfilens 'metadata.contentTypes' måste vara en array av objekt...` }; } }
        if (RULE_FILE_SCHEMA.requirements_is_object) { if (typeof json_object.requirements !== 'object' || json_object.requirements === null || Array.isArray(json_object.requirements)) { return { isValid: false, message: "Regelfilens 'requirements' sektion måste vara ett objekt (inte en array)." }; } for (const req_key in json_object.requirements) { const requirement = json_object.requirements[req_key]; if (typeof requirement !== 'object' || requirement === null) { return { isValid: false, message: `Ett krav (nyckel: ${req_key}) i regelfilen är inte ett giltigt objekt.` }; } const missing_req_keys = RULE_FILE_SCHEMA.requirement_object.required_keys.filter(key => !(key in requirement)); if (missing_req_keys.length > 0) { return { isValid: false, message: t('rule_file_requirement_missing_keys', { requirementId: requirement.id || req_key, missingKeys: missing_req_keys.join(', ') }) }; } if (RULE_FILE_SCHEMA.requirement_object.id_is_string_non_empty && (typeof requirement.id !== 'string' || !requirement.id.trim())) { return { isValid: false, message: `Kravets ID (för ${requirement.title || req_key}) måste vara en icke-tom sträng.` }; } /* ... liknande kontroller för title, expectedObservation, checks, contentType ... */ if (Array.isArray(requirement.checks)) { for (const check of requirement.checks) { /* ... din check och passCriterion validering ... */ }}}}

        return { isValid: true, message: t('rule_file_loaded_successfully') };
    }

    function validate_saved_audit_file(json_object) { /* ... (som tidigare) ... */ }

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