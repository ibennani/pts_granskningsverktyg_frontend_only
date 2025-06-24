// file: js/audit_logic.js
(function () { 
    'use-strict';

    function get_t_func() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (AuditLogic t not found)";
            };
    }

    // Beräknar status för en enskild kontrollpunkt
    function calculate_check_status(check_object, pass_criteria_statuses_map, overall_manual_status = 'not_audited') {
        if (overall_manual_status === 'failed') { // "Stämmer inte" manuellt valt
            return "passed"; // Hela kontrollpunkten anses då godkänd då villkoret inte är applicerbart
        }

        if (overall_manual_status === 'not_audited') { // "Stämmer" är inte aktivt (avmarkerat eller aldrig markerat)
            return "not_audited";
        }

        // HÄR ÄR overall_manual_status === 'passed' ("Stämmer" är aktivt)

        if (!check_object || !check_object.passCriteria || check_object.passCriteria.length === 0) {
            // "Stämmer" är valt, och inga underkriterier finns
            return "passed";
        }

        // Nu hanterar vi fallet där "Stämmer" är valt och det FINNS passCriteria
        const pc_statuses = check_object.passCriteria.map(pc => {
            const pc_data = (pass_criteria_statuses_map || {})[pc.id];
            // Hantera både sträng och objektformat för pc_data (pc_data.status om det är ett objekt)
            return (typeof pc_data === 'object' && pc_data !== null) ? pc_data.status : (pc_data || 'not_audited');
        });
        
        const any_pc_is_failed = pc_statuses.some(s => s === 'failed');
        const any_pc_is_not_audited = pc_statuses.some(s => s === 'not_audited');

        if (any_pc_is_failed) {
            return "failed"; // Om något underkriterium är underkänt.
        }

        if (any_pc_is_not_audited) {
            // Om "Stämmer" är valt och minst ett subkriterium är "Ej granskat" (och inget är "Underkänt")
            // då är kontrollpunkten "Delvis granskad".
            return "partially_audited";
        }

        // Om vi når hit, har "Stämmer" valts, det finns passCriteria, inget är 'failed', och inget är 'not_audited'.
        // Det betyder att alla passCriteria måste vara 'passed'.
        // Med AND/OR-logik: Om alla är 'passed', blir både AND och OR 'passed'.
        // Om check_object.logic === "OR" och minst ett är 'passed' (vilket är sant här), då 'passed'.
        // Om check_object.logic === "AND" och alla är 'passed' (vilket är sant här), då 'passed'.
        return "passed";
    }

    // Beräknar övergripande status för ett krav
    function calculate_requirement_status(requirement_object, requirement_result_object) {
        if (!requirement_object || !requirement_object.checks || requirement_object.checks.length === 0) {
            // Om kravet inte har några kontrollpunkter, kan dess status vara satt manuellt eller default
            return requirement_result_object?.status || "not_audited";
        }
        if (!requirement_result_object || !requirement_result_object.checkResults) {
            return "not_audited"; // Ingen resultatdata finns alls
        }
        
        let has_failed_check = false;
        let has_partially_audited_check = false;
        let has_not_audited_check = false;
        
        for (const check_definition of requirement_object.checks) {
            const check_result_data = requirement_result_object.checkResults[check_definition.id];
            // Den beräknade statusen för kontrollpunkten ska användas här
            const current_check_calculated_status = check_result_data ? check_result_data.status : 'not_audited';

            if (current_check_calculated_status === "failed") {
                has_failed_check = true;
                break; 
            }
            if (current_check_calculated_status === "partially_audited") {
                has_partially_audited_check = true;
            }
            if (current_check_calculated_status === "not_audited") {
                has_not_audited_check = true;
            }
        }

        if (has_failed_check) {
            return "failed";
        }
        if (has_partially_audited_check) {
            return "partially_audited";
        }
        // Viktigt: Om det finns 'not_audited' men ingen 'partially_audited' (och ingen 'failed')
        // så är kravet 'not_audited' om inte alla checks är 'passed'.
        // Om alla checks är 'passed', och has_not_audited_check är falskt, då blir det 'passed'.
        if (has_not_audited_check) { 
            return "not_audited";
        }
        
        // Om ingen är failed, partial eller not_audited, då måste alla vara passed
        return "passed";
    }

    // Hämtar relevanta krav för ett givet stickprov
    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        if (!rule_file_content || !rule_file_content.requirements || !sample) { 
            return []; 
        }
        const all_requirements_array = Object.values(rule_file_content.requirements);

        if (!sample.selectedContentTypes || sample.selectedContentTypes.length === 0) {
            return all_requirements_array; 
        }

        return all_requirements_array.filter(req => {
            if (!req.contentType || !Array.isArray(req.contentType) || req.contentType.length === 0) {
                return false; 
            }
            return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
        });
    }

    // Hämtar en sorterad lista av nycklar för relevanta krav
    function get_ordered_relevant_requirement_keys(rule_file_content, sample_object) {
        const t = get_t_func();
        const relevant_req_objects = get_relevant_requirements_for_sample(rule_file_content, sample_object);

        if (!relevant_req_objects || relevant_req_objects.length === 0) {
            return [];
        }

        relevant_req_objects.sort((req_a, req_b) => {
            const main_cat_a_text = req_a.metadata?.mainCategory?.text || t('uncategorized', { defaultValue: 'Uncategorized' });
            const main_cat_b_text = req_b.metadata?.mainCategory?.text || t('uncategorized', { defaultValue: 'Uncategorized' });
            let comparison = main_cat_a_text.localeCompare(main_cat_b_text, undefined, { numeric: true, sensitivity: 'base' });
            if (comparison !== 0) return comparison;

            const sub_cat_a_text = req_a.metadata?.subCategory?.text || t('other_requirements', { defaultValue: 'Other Requirements' });
            const sub_cat_b_text = req_b.metadata?.subCategory?.text || t('other_requirements', { defaultValue: 'Other Requirements' });
            comparison = sub_cat_a_text.localeCompare(sub_cat_b_text, undefined, { numeric: true, sensitivity: 'base' });
            if (comparison !== 0) return comparison;

            const title_a = req_a.title || '';
            const title_b = req_b.title || '';
            return title_a.localeCompare(title_b, undefined, { numeric: true, sensitivity: 'base' });
        });

        return relevant_req_objects.map(req => req.key || req.id);
    }

    // Beräknar övergripande granskningsprogress
    function calculate_overall_audit_progress(current_audit_data) {
        // console.log("[AuditLogic] calculate_overall_audit_progress CALLED."); 

        if (!current_audit_data || !current_audit_data.samples || !current_audit_data.ruleFileContent || !current_audit_data.ruleFileContent.requirements) {
            // console.warn("[AuditLogic] Missing critical data for calculate_overall_audit_progress. Returning 0/0.");
            return { audited: 0, total: 0 };
        }

        let total_relevant_requirements_across_samples = 0;
        let total_completed_requirements_across_samples = 0;

        current_audit_data.samples.forEach((sample) => {
            const relevant_reqs_for_this_sample = get_relevant_requirements_for_sample(current_audit_data.ruleFileContent, sample);
            total_relevant_requirements_across_samples += relevant_reqs_for_this_sample.length;

            relevant_reqs_for_this_sample.forEach((req_definition) => {
                const requirement_key_for_results = req_definition.key || req_definition.id; 
                const req_result = sample.requirementResults ? sample.requirementResults[requirement_key_for_results] : null;
                const calculated_status = calculate_requirement_status(req_definition, req_result);
                
                // console.log(`  [AuditLogic CALC_OVERALL] Sample: "${sample.description}", Req: "${req_definition.title}" (Key for result: ${requirement_key_for_results}), Result obj from sample:`, 
                //             req_result ? JSON.parse(JSON.stringify(req_result)) : "No result obj", 
                //             `Calculated status for this req: "${calculated_status}"`);

                if (calculated_status === 'passed' || calculated_status === 'failed') {
                    total_completed_requirements_across_samples++;
                }
            });
        });

        // console.log(`[AuditLogic] calculate_overall_audit_progress RETURNING: audited = ${total_completed_requirements_across_samples}, total = ${total_relevant_requirements_across_samples}`);
        return {
            audited: total_completed_requirements_across_samples,
            total: total_relevant_requirements_across_samples
        };
    }

    // Hittar nyckeln till nästa ohanterade krav för ett stickprov
    function find_first_incomplete_requirement_key_for_sample(rule_file_content, sample_object) {
        if (!sample_object || !rule_file_content || !rule_file_content.requirements) return null;

        const ordered_req_keys = get_ordered_relevant_requirement_keys(rule_file_content, sample_object);
        if (!ordered_req_keys || ordered_req_keys.length === 0) return null;

        for (const req_key of ordered_req_keys) {
            const requirement_definition = rule_file_content.requirements[req_key]; 
            if (!requirement_definition) {
                // console.warn(`[AuditLogic] find_first_incomplete: No definition found for req_key "${req_key}"`);
                continue; 
            }
            const requirement_result = sample_object.requirementResults ? sample_object.requirementResults[req_key] : null;
            
            const status = calculate_requirement_status(requirement_definition, requirement_result);

            if (status === 'not_audited' || status === 'partially_audited') {
                return req_key;
            }
        }
        return null;
    }

    const public_api = {
        calculate_requirement_status,
        calculate_check_status,
        get_relevant_requirements_for_sample,
        get_ordered_relevant_requirement_keys,
        calculate_overall_audit_progress,
        find_first_incomplete_requirement_key_for_sample
    };

    window.AuditLogic = public_api;
})();