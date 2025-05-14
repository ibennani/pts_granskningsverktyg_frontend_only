// file: js/audit_logic.js
(function () { // Start på IIFE
    'use-strict';

    // Helper function to safely get the translation function within this module
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

    function calculate_check_status(check_object, pass_criteria_statuses_map) {
        if (!check_object || !check_object.passCriteria || check_object.passCriteria.length === 0) {
            return "not_audited";
        }
        let audited_criteria_count = 0;
        let passed_criteria_count_for_or_logic = 0;
        let all_criteria_passed_for_and_logic = true;
        let any_criterion_failed = false;

        for (const pc of check_object.passCriteria) {
            const status = pass_criteria_statuses_map[pc.id];
            if (status === "passed") {
                audited_criteria_count++;
                passed_criteria_count_for_or_logic++;
            } else if (status === "failed") {
                audited_criteria_count++;
                any_criterion_failed = true;
                all_criteria_passed_for_and_logic = false;
            }
        }
        if (audited_criteria_count === 0) {
            return "not_audited";
        }
        if (audited_criteria_count < check_object.passCriteria.length) {
            // If any criterion is failed, the check is failed, even if partially audited
            if (any_criterion_failed) return "failed";
            return "partially_audited";
        }
        if (check_object.logic === "OR") {
            return passed_criteria_count_for_or_logic > 0 ? "passed" : "failed";
        } else { // AND logic (default)
            return all_criteria_passed_for_and_logic ? "passed" : "failed";
        }
    }

    function calculate_requirement_status(requirement_object, requirement_result_object) {
        if (!requirement_object || !requirement_object.checks || requirement_object.checks.length === 0) {
             // If no checks, status might be manually set or based on text fields.
             // For now, let's assume if results exist and status is set, use that.
             // Otherwise, not_audited. This part might need refinement based on how you handle requirements without checks.
            return requirement_result_object?.status && requirement_result_object.status !== 'not_audited' ? requirement_result_object.status : "not_audited";
        }
        if (!requirement_result_object || !requirement_result_object.checkResults) {
            return "not_audited";
        }
        let all_checks_passed = true;
        let any_check_failed = false;
        let any_check_partially_audited = false;
        let any_check_not_audited = false;
        let total_checks = requirement_object.checks.length;
        let audited_checks_count = 0;


        for (const check of requirement_object.checks) {
            const check_result = requirement_result_object.checkResults[check.id];
            const check_status = check_result ? check_result.status : 'not_audited';

            if (check_status === "failed") {
                any_check_failed = true;
                all_checks_passed = false; // Redundant if any_check_failed is true, but clear
                audited_checks_count++;
            } else if (check_status === "passed") {
                audited_checks_count++;
            } else if (check_status === "partially_audited") {
                any_check_partially_audited = true;
                all_checks_passed = false;
            } else if (check_status === "not_audited") {
                any_check_not_audited = true;
                all_checks_passed = false;
            }
        }

        // Determine overall requirement status
        if (any_check_failed) return "failed"; // If any check fails, the requirement fails
        if (audited_checks_count === 0 && total_checks > 0) return "not_audited"; // No checks audited yet
        if (audited_checks_count < total_checks) return "partially_audited"; // Some, but not all, checks are audited (and none have failed)
        if (all_checks_passed && audited_checks_count === total_checks) return "passed"; // All checks passed and all are audited

        return "not_audited"; // Default fallback
    }

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
        let total_completed_requirements_across_samples = 0; // Renamed for clarity

        current_audit_data.samples.forEach(sample => {
            const relevant_reqs_for_this_sample = get_relevant_requirements_for_sample(current_audit_data.ruleFileContent, sample);
            total_relevant_requirements_across_samples += relevant_reqs_for_this_sample.length;

            relevant_reqs_for_this_sample.forEach(req_definition => {
                const req_result = sample.requirementResults ? sample.requirementResults[req_definition.id] : null;
                // Even if req_result is null, the requirement still counts towards the total.
                // It just means it's 'not_audited'.
                
                // We need to calculate the status of this requirement based on its checks.
                const calculated_status = calculate_requirement_status(req_definition, req_result);
                
                // Only count as "completed" if status is 'passed' or 'failed'.
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
            
            // Beräkna den faktiska statusen för kravet
            const status = calculate_requirement_status(requirement_definition, requirement_result);

            if (status === 'not_audited' || status === 'partially_audited') {
                return req_key; // Returnera nyckeln till det första kravet som inte är 'passed' eller 'failed'
            }
        }
        return null; // Alla relevanta krav är 'passed' eller 'failed'
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