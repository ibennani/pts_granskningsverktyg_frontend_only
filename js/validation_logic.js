(function () { // IIFE start
    'use-strict';

    const { t } = Translation; 

    // Schema för regelfilen, anpassat till din exempelfil och spec (Alternativ 2)
    const RULE_FILE_SCHEMA = {
        // Nu förväntas contentTypes och pageTypes finnas i metadata
        required_top_keys: ['metadata', 'requirements'], 
        metadata_object: {
            // title är fortfarande obligatorisk, pageTypes & contentTypes valideras här inne
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
        if (typeof json_object !== 'object' || json_object === null) {
            return { isValid: false, message: t('rule_file_invalid_json') };
        }

        // 1. Kolla obligatoriska toppnivånycklar
        const missing_top_keys = RULE_FILE_SCHEMA.required_top_keys.filter(key => !(key in json_object));
        if (missing_top_keys.length > 0) {
            return {
                isValid: false,
                message: t('rule_file_missing_keys', { missingKeys: missing_top_keys.join(', ') })
            };
        }

        // 2. Validera 'metadata' (inklusive pageTypes och contentTypes här nu)
        const metadata = json_object.metadata;
        if (typeof metadata !== 'object' || metadata === null) {
            return { isValid: false, message: "Regelfilens 'metadata' måste vara ett objekt." };
        }
        const missing_metadata_keys = RULE_FILE_SCHEMA.metadata_object.required_keys.filter(key => !(key in metadata));
        if (missing_metadata_keys.length > 0) {
            // Anpassa felmeddelandet om det specifikt är pageTypes/contentTypes som saknas inuti metadata
            let specific_message = `Regelfilens 'metadata' saknar nycklar: ${missing_metadata_keys.join(', ')}.`;
            if (missing_metadata_keys.includes('pageTypes') || missing_metadata_keys.includes('contentTypes')) {
                 specific_message = `Obligatoriska 'pageTypes' och/eller 'contentTypes' saknas inuti 'metadata'-objektet i regelfilen.`;
            }
            return { isValid: false, message: specific_message };
        }

        if (typeof metadata.title !== 'string' || !metadata.title.trim()) {
            return { isValid: false, message: "Regelfilens 'metadata.title' är obligatorisk och får inte vara tom." };
        }

        // Validera metadata.pageTypes
        if (RULE_FILE_SCHEMA.metadata_object.pageTypes_is_array_of_strings) {
            if (!Array.isArray(metadata.pageTypes) || metadata.pageTypes.some(pt => typeof pt !== 'string' || !pt.trim())) {
                return { isValid: false, message: "Regelfilens 'metadata.pageTypes' måste vara en array av icke-tomma strängar." };
            }
        }
        // Validera metadata.contentTypes
        if (RULE_FILE_SCHEMA.metadata_object.contentTypes_is_array_of_objects) {
            if (!Array.isArray(metadata.contentTypes) || metadata.contentTypes.some(ct => {
                if (typeof ct !== 'object' || ct === null) return true; 
                const missingCtKeys = RULE_FILE_SCHEMA.metadata_object.contentTypes_object_keys.filter(key => !(key in ct));
                if (missingCtKeys.length > 0) return true; 
                if (typeof ct.id !== 'string' || !ct.id.trim()) return true; 
                if (typeof ct.text !== 'string' || !ct.text.trim()) return true; 
                return false;
            })) {
                return { isValid: false, message: `Regelfilens 'metadata.contentTypes' måste vara en array av objekt, där varje objekt har 'id' (icke-tom sträng) och 'text' (icke-tom sträng).` };
            }
        }


        // 3. Validera 'requirements' (objekt)
        // (Denna del är oförändrad från den version du nyss fick, då den redan hanterade 'requirements' korrekt)
        if (RULE_FILE_SCHEMA.requirements_is_object) {
            if (typeof json_object.requirements !== 'object' || json_object.requirements === null || Array.isArray(json_object.requirements)) {
                return { isValid: false, message: "Regelfilens 'requirements' sektion måste vara ett objekt (inte en array)." };
            }

            for (const req_key in json_object.requirements) { 
                const requirement = json_object.requirements[req_key];
                if (typeof requirement !== 'object' || requirement === null) {
                    return { isValid: false, message: `Ett krav (nyckel: ${req_key}) i regelfilen är inte ett giltigt objekt.` };
                }

                const missing_req_keys = RULE_FILE_SCHEMA.requirement_object.required_keys.filter(key => !(key in requirement));
                if (missing_req_keys.length > 0) {
                    return {
                        isValid: false,
                        message: t('rule_file_requirement_missing_keys', { requirementId: requirement.id || req_key, missingKeys: missing_req_keys.join(', ') })
                    };
                }

                if (RULE_FILE_SCHEMA.requirement_object.id_is_string_non_empty && (typeof requirement.id !== 'string' || !requirement.id.trim())) {
                    return { isValid: false, message: `Kravets ID (för ${requirement.title || req_key}) måste vara en icke-tom sträng.` };
                }
                if (RULE_FILE_SCHEMA.requirement_object.title_is_string_non_empty && (typeof requirement.title !== 'string' || !requirement.title.trim())) {
                    return { isValid: false, message: `Kravets titel (för ID: ${requirement.id}) måste vara en icke-tom sträng.` };
                }
                if (RULE_FILE_SCHEMA.requirement_object.expectedObservation_is_string && typeof requirement.expectedObservation !== 'string') {
                    return { isValid: false, message: `Kravets förväntade observation (för ID: ${requirement.id}) måste vara en sträng.` };
                }
                if (RULE_FILE_SCHEMA.requirement_object.checks_is_array && !Array.isArray(requirement.checks)) {
                    return { isValid: false, message: `Kravets 'checks' (för ID: ${requirement.id}) måste vara en array.` };
                }
                if (RULE_FILE_SCHEMA.requirement_object.contentType_is_array_of_strings) {
                    if (!Array.isArray(requirement.contentType) || requirement.contentType.some(ct => typeof ct !== 'string')) {
                        return { isValid: false, message: `Kravets 'contentType' (för ID: ${requirement.id}) måste vara en array av strängar.` };
                    }
                    if (requirement.contentType.some(ct => !ct.trim() && ct.length > 0 )) { 
                         return { isValid: false, message: `Kravets 'contentType' (för ID: ${requirement.id}) innehåller ogiltiga (tomma/whitespace) strängar.` };
                    }
                }

                if (Array.isArray(requirement.checks)) {
                    for (const check of requirement.checks) {
                        if (typeof check !== 'object' || check === null) return { isValid: false, message: `En check i krav ID: ${requirement.id} är inte ett objekt.` };
                        
                        const missing_check_keys = RULE_FILE_SCHEMA.check_object.required_keys.filter(key => !(key in check));
                        if (missing_check_keys.length > 0) {
                            return { isValid: false, message: `En check i krav ID: ${requirement.id} (med condition: "${check.condition || 'okänd'}") saknar nycklar: ${missing_check_keys.join(', ')}.` };
                        }

                        if (RULE_FILE_SCHEMA.check_object.id_is_string_non_empty && (typeof check.id !== 'string' || !check.id.trim())) {
                            return { isValid: false, message: `En check i krav ID: ${requirement.id} saknar giltigt 'id'.` };
                        }
                        if (RULE_FILE_SCHEMA.check_object.condition_is_string_non_empty && (typeof check.condition !== 'string' || !check.condition.trim())) {
                            return { isValid: false, message: `En check (ID: ${check.id}) i krav ID: ${requirement.id} saknar giltig 'condition'.` };
                        }
                        if (RULE_FILE_SCHEMA.check_object.passCriteria_is_array && !Array.isArray(check.passCriteria)) {
                            return { isValid: false, message: `En check (ID: ${check.id}) i krav ID: ${requirement.id} har 'passCriteria' som inte är en array.` };
                        }

                        if (check.logic && RULE_FILE_SCHEMA.check_object.logic_is_optional_string_or_or_and &&
                            (typeof check.logic !== 'string' || (check.logic.toUpperCase() !== 'OR' && check.logic.toUpperCase() !== 'AND'))) {
                            return { isValid: false, message: `En check (ID: ${check.id}) i krav ID: ${requirement.id} har ogiltigt 'logic' värde. Ska vara "OR" eller "AND" (eller utelämnas för AND).` };
                        }

                        if (Array.isArray(check.passCriteria)) {
                            for (const pc of check.passCriteria) {
                                if (typeof pc !== 'object' || pc === null) return { isValid: false, message: `Ett passCriterion i check (ID: ${check.id}), krav ID: ${requirement.id} är inte ett objekt.` };
                                
                                const missing_pc_keys = RULE_FILE_SCHEMA.passCriterion_object.required_keys.filter(key => !(key in pc));
                                if (missing_pc_keys.length > 0) {
                                    return { isValid: false, message: `Ett passCriterion i check (ID: ${check.id}), krav ID: ${requirement.id} saknar nycklar: ${missing_pc_keys.join(', ')}.` };
                                }
                                if (RULE_FILE_SCHEMA.passCriterion_object.id_is_string_non_empty && (typeof pc.id !== 'string' || !pc.id.trim())) {
                                    return { isValid: false, message: `Ett passCriterion i check (ID: ${check.id}), krav ID: ${requirement.id} saknar giltigt 'id'.` };
                                }
                                if (RULE_FILE_SCHEMA.passCriterion_object.requirement_is_string_non_empty && (typeof pc.requirement !== 'string' || !pc.requirement.trim())) {
                                    return { isValid: false, message: `Ett passCriterion (ID: ${pc.id}) i check (ID: ${check.id}), krav ID: ${requirement.id} saknar giltig 'requirement' text.` };
                                }
                            }
                        }
                    }
                }
            }
        }

        // Steg 4 & 5 (validering av toppnivå contentTypes och pageTypes) är borttagna
        // eftersom de nu förväntas finnas och valideras inuti metadata-objektet.

        return { isValid: true, message: t('rule_file_loaded_successfully') };
    }


    function validate_saved_audit_file(json_object) {
        if (typeof json_object !== 'object' || json_object === null) {
            return { isValid: false, message: t('error_invalid_saved_audit_file') };
        }

        const required_keys = [
            'saveFileVersion',
            'ruleFileContent',
            'auditMetadata',
            'auditStatus',
            'samples'
        ];

        const missing_keys = required_keys.filter(key => !(key in json_object));
        if (missing_keys.length > 0) {
            return {
                isValid: false,
                message: `${t('error_invalid_saved_audit_file')} Saknade nycklar: ${missing_keys.join(', ')}.`
            };
        }

        if (json_object.saveFileVersion !== State.getAppSaveFileVersion()) {
             console.warn(`Varning: Sparfilens version (${json_object.saveFileVersion}) matchar inte applikationens version (${State.getAppSaveFileVersion()}). Kompatibilitetsproblem kan uppstå.`);
        }
        return { isValid: true, message: 'Sparad granskningsfil verkar giltig.' };
    }

    const public_api = {
        validate_rule_file_json,
        validate_saved_audit_file
    };

    window.ValidationLogic = public_api;
})(); // IIFE end