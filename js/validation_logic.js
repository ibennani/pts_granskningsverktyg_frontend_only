// js/validation_logic.js
(function () { // IIFE start
    'use-strict';

    function get_t_func() {
        return window.Translation?.t || ((key) => `**${key}**`);
    }
    
    function validate_rule_file_json(json_object) {
        const t = get_t_func();
        console.log("[ValidationLogic] Running validation for new rule file (hierarchical structure)...");

        if (typeof json_object !== 'object' || json_object === null) {
            return { isValid: false, message: t('rule_file_invalid_json') };
        }

        const required_top_keys = ['metadata', 'requirements'];
        for (const key of required_top_keys) {
            if (!(key in json_object)) {
                return { isValid: false, message: t('rule_file_missing_keys', { missingKeys: key }) };
            }
        }
        
        const metadata = json_object.metadata;
        if (typeof metadata !== 'object' || metadata === null) {
            return { isValid: false, message: t('rule_file_metadata_must_be_object') };
        }

        if (!metadata.title || typeof metadata.title !== 'string' || metadata.title.trim() === '') {
            return { isValid: false, message: t('rule_file_metadata_title_required') };
        }

        // --- VALIDATION FOR NEW HIERARCHICAL STRUCTURE ---

        // Validate metadata.samples.sampleCategories
        if (!metadata.samples || typeof metadata.samples !== 'object' || !Array.isArray(metadata.samples.sampleCategories) || metadata.samples.sampleCategories.length === 0) {
            return { isValid: false, message: "Regelfilen måste innehålla 'metadata.samples.sampleCategories' som en array med minst en kategori." };
        }
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

        // Validate metadata.contentTypes
        if (!Array.isArray(metadata.contentTypes) || metadata.contentTypes.length === 0) {
            return { isValid: false, message: "Regelfilen måste innehålla 'metadata.contentTypes' som en array med minst en huvudinnehållstyp." };
        }
        for (const group of metadata.contentTypes) {
            if (!group.id || !group.text || !Array.isArray(group.types) || group.types.length === 0) {
                return { isValid: false, message: `Varje objekt i 'contentTypes' måste ha 'id', 'text', och en 'types'-array med minst ett objekt. Fel vid: ${group.text || 'Okänd innehållstyp'}` };
            }
            for (const type of group.types) {
                if (!type.id || !type.text) {
                    return { isValid: false, message: `Varje undertyp i '${group.text}' måste ha 'id' och 'text'.` };
                }
            }
        }

        console.log("[ValidationLogic] Validation passed for hierarchical structure.");
        return { isValid: true, message: t('rule_file_loaded_successfully') };
    }

    function validate_saved_audit_file(json_object) {
        const t = get_t_func();
        if (typeof json_object !== 'object' || json_object === null) {
            return { isValid: false, message: t('error_invalid_saved_audit_file') };
        }

        const required_keys = ['saveFileVersion', 'ruleFileContent', 'auditMetadata', 'auditStatus', 'samples'];
        const missing_keys = required_keys.filter(key => !(key in json_object));

        if (missing_keys.length > 0) {
            console.warn(`[ValidationLogic] Saved audit file is missing keys: ${missing_keys.join(', ')}`);
            return { isValid: false, message: `${t('error_invalid_saved_audit_file')} (Missing: ${missing_keys.join(', ')})` };
        }

        return { isValid: true, message: "Validation of saved audit file OK." };
    }

    const public_api = {
        validate_rule_file_json,
        validate_saved_audit_file
    };
    window.ValidationLogic = public_api;

})();