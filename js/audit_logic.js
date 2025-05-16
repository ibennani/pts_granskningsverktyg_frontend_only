// file: js/audit_logic.js
(function () { // Start på IIFE
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

    // Modifierad för att ta hänsyn till overall_manual_status mer noggrant
    function calculate_check_status(check_object, pass_criteria_statuses_map, overall_manual_status = 'not_audited') {
        // 1. Om "Stämmer inte" (overall_manual_status === 'failed') är valt för hela kontrollpunkten,
        //    då anses kontrollpunkten som 'passed' (godkänd), eftersom dess underkriterier
        //    automatiskt sattes till 'passed' och inte längre är föremål för individuell bedömning.
        if (overall_manual_status === 'failed') {
            return "passed";
        }

        // 2. Om "Stämmer" (overall_manual_status === 'passed') är valt,
        //    beräkna status baserat på de individuella passkriterierna.
        // 3. Om ingen manuell status är satt (overall_manual_status === 'not_audited'),
        //    beräkna också status baserat på de individuella passkriterierna (som då bör vara 'not_audited' initialt).
        if (!check_object || !check_object.passCriteria || check_object.passCriteria.length === 0) {
            // Om inga passkriterier finns:
            // Om "Stämmer" är valt manuellt -> passed. Annars (not_audited) -> not_audited.
            return overall_manual_status === 'passed' ? 'passed' : 'not_audited';
        }

        let audited_criteria_count = 0;
        let passed_criteria_count_for_or_logic = 0;
        let all_criteria_passed_for_and_logic = true;
        let any_criterion_failed = false;

        const current_pass_criteria_map = pass_criteria_statuses_map || {};

        for (const pc of check_object.passCriteria) {
            const status = current_pass_criteria_map[pc.id] || 'not_audited'; // Default till not_audited om status saknas
            if (status === "passed") {
                audited_criteria_count++;
                passed_criteria_count_for_or_logic++;
            } else if (status === "failed") {
                audited_criteria_count++;
                any_criterion_failed = true;
                all_criteria_passed_for_and_logic = false;
            }
            // Om status är 'not_audited', påverkar det audited_criteria_count och därmed partially_audited.
        }

        // Om "Stämmer" är valt, men inga underliggande kriterier är bedömda än
        if (overall_manual_status === 'passed' && audited_criteria_count === 0) {
            return "not_audited"; // Eller "partially_audited" om man vill indikera att det förväntas input. 'not_audited' är nog tydligast.
        }
        
        // Om inga kriterier alls är granskade (och overallStatus inte är 'failed' eller 'passed')
        if (audited_criteria_count === 0) { // Detta täcker fallet där overall_manual_status är 'not_audited'
            return "not_audited";
        }

        // Om något kriterium har underkänts (och vi inte redan returnerat pga overall_manual_status)
        if (any_criterion_failed) {
            return "failed";
        }

        // Om inte alla kriterier är granskade (och inget har underkänts)
        // Detta gäller främst när overall_manual_status är 'passed' eller 'not_audited'
        if (audited_criteria_count < check_object.passCriteria.length) {
            return "partially_audited";
        }

        // Om alla kriterier är granskade och inget har underkänts:
        // (Detta exekveras när overall_manual_status är 'passed' och alla underkriterier är ifyllda,
        // eller när overall_manual_status är 'not_audited' men alla underkriterier råkar vara ifyllda)
        if (check_object.logic === "OR") {
            return passed_criteria_count_for_or_logic > 0 ? "passed" : "failed";
        } else { // AND logic (default)
            return all_criteria_passed_for_and_logic ? "passed" : "failed";
        }
    }

    function calculate_requirement_status(requirement_object, requirement_result_object) {
        if (!requirement_object || !requirement_object.checks || requirement_object.checks.length === 0) {
            return requirement_result_object?.status && requirement_result_object.status !== 'not_audited' ? requirement_result_object.status : "not_audited";
        }
        if (!requirement_result_object || !requirement_result_object.checkResults) {
            return "not_audited";
        }
        
        let all_checks_passed = true;
        let any_check_failed = false;
        let audited_checks_count = 0;
        let total_checks = requirement_object.checks.length;

        for (const check_definition of requirement_object.checks) {
            const check_result = requirement_result_object.checkResults[check_definition.id];
            
            // Använd den beräknade statusen för checken, som nu tar hänsyn till overallStatus
            // och passCriteria enligt logiken i calculate_check_status.
            const current_check_calculated_status = check_result ? check_result.status : 'not_audited';

            if (current_check_calculated_status === "failed") {
                any_check_failed = true;
                all_checks_passed = false; // En misslyckad check gör att kravet inte kan vara 'passed'
                audited_checks_count++;
            } else if (current_check_calculated_status === "passed") {
                audited_checks_count++;
            } else { // partially_audited eller not_audited
                all_checks_passed = false; // Om en check inte är fullt godkänd/bedömd, kan inte kravet vara 'passed'
            }
        }
        
        if (any_check_failed) return "failed"; // Om någon check misslyckas, misslyckas kravet.
        if (audited_checks_count === 0 && total_checks > 0) return "not_audited"; // Ingen check är bedömd (passed/failed).
        if (audited_checks_count < total_checks) return "partially_audited"; // Inte alla checks är bedömda (passed/failed).
        if (all_checks_passed && audited_checks_count === total_checks) return "passed"; // Alla checks är bedömda som 'passed'.

        return "not_audited"; // Fallback, bör normalt inte nås.
    }

    // get_relevant_requirements_for_sample, get_ordered_relevant_requirement_keys,
    // calculate_overall_audit_progress, find_first_incomplete_requirement_key_for_sample
    // är OFÖRÄNDRADE från din senaste fungerande version. Kopiera in dem här.
    // Jag inkluderar dem för fullständighet:

    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        if (!rule_file_content || !rule_file_content.requirements || !sample || !sample.selectedContentTypes) { return []; }
        const all_requirements_array = Object.values(rule_file_content.requirements);
        return all_requirements_array.filter(req => {
            if (!req.contentType || !Array.isArray(req.contentType) || req.contentType.length === 0) {
                return true;
            }
            return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
        });
    }

    function get_ordered_relevant_requirement_keys(rule_file_content, sample_object) {
        const t = get_t_func();
        const relevant_req_objects = get_relevant_requirements_for_sample(rule_file_content, sample_object);

        if (!relevant_req_objects || relevant_req_objects.length === 0) {
            return [];
        }

        relevant_req_objects.sort((req_a, req_b) => {
            const main_cat_a_text = req_a.metadata?.mainCategory?.text || t('uncategorized', { defaultValue: 'Uncategorized' });
            const main_cat_b_text = req_b.metadata?.mainCategory?.text || t('uncategorized', { defaultValue: 'Uncategorized' });
            let comparison = main_cat_a_text.localeCompare(main_cat_b_text);
            if (comparison !== 0) return comparison;

            const sub_cat_a_text = req_a.metadata?.subCategory?.text || t('other_requirements', { defaultValue: 'Other Requirements' });
            const sub_cat_b_text = req_b.metadata?.subCategory?.text || t('other_requirements', { defaultValue: 'Other Requirements' });
            comparison = sub_cat_a_text.localeCompare(sub_cat_b_text);
            if (comparison !== 0) return comparison;

            const title_a = req_a.title || '';
            const title_b = req_b.title || '';
            return title_a.localeCompare(title_b);
        });

        return relevant_req_objects.map(req => req.key);
    }

    function calculate_overall_audit_progress(current_audit_data) {
        if (!current_audit_data || !current_audit_data.samples || !current_audit_data.ruleFileContent) {
            return { audited: 0, total: 0 };
        }

        let total_relevant_requirements_across_samples = 0;
        let total_completed_requirements_across_samples = 0;

        current_audit_data.samples.forEach(sample => {
            const relevant_reqs_for_this_sample = get_relevant_requirements_for_sample(current_audit_data.ruleFileContent, sample);
            total_relevant_requirements_across_samples += relevant_reqs_for_this_sample.length;

            relevant_reqs_for_this_sample.forEach(req_definition => {
                const req_result = sample.requirementResults ? sample.requirementResults[req_definition.id] : null;
                const calculated_status = calculate_requirement_status(req_definition, req_result);
                
                if (calculated_status === 'passed' || calculated_status === 'failed') {
                    total_completed_requirements_across_samples++;
                }
            });
        });

        return {
            audited: total_completed_requirements_across_samples,
            total: total_relevant_requirements_across_samples
        };
    }

    function find_first_incomplete_requirement_key_for_sample(rule_file_content, sample_object) {
        if (!sample_object || !rule_file_content) return null;

        const ordered_req_keys = get_ordered_relevant_requirement_keys(rule_file_content, sample_object);
        if (!ordered_req_keys || ordered_req_keys.length === 0) return null;

        for (const req_key of ordered_req_keys) {
            const requirement_definition = rule_file_content.requirements[req_key];
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