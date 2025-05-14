// file: js/audit_logic.js
(function () { // Start på IIFE
    'use-strict';

    // Helper function to safely get the translation function within this module
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
                return str + " (AuditLogic t not found)";
            };
    }

    function calculate_check_status(check_object, pass_criteria_statuses_map) {
        // pass_criteria_statuses_map är ett objekt: { pc_id1: 'passed', pc_id2: 'failed', ... }
        if (!check_object || !check_object.passCriteria || check_object.passCriteria.length === 0) {
            return "not_audited"; // Om inga passCriteria, kan inte bedömas.
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
            // 'not_audited' räknas inte som granskat kriterium för att avgöra checkens status
        }

        if (audited_criteria_count === 0) {
            return "not_audited";
        }

        if (audited_criteria_count < check_object.passCriteria.length) {
            return "partially_audited";
        }

        // Om vi kommer hit är alla kriterier granskade (audited_criteria_count === check_object.passCriteria.length)
        if (check_object.logic === "OR") {
            return passed_criteria_count_for_or_logic > 0 ? "passed" : "failed";
        } else { // Default är AND-logik
            return all_criteria_passed_for_and_logic ? "passed" : "failed";
        }
    }

    function calculate_requirement_status(requirement_object, requirement_result_object) {
        if (!requirement_object || !requirement_object.checks || requirement_object.checks.length === 0) {
            // Om inga checks finns, och status inte är manuellt satt (t.ex. vid import), är den 'not_audited'.
            // Om status finns (från t.ex. manuell bedömning innan checks fanns) så används den.
            return requirement_result_object.status && requirement_result_object.status !== 'not_audited' ? requirement_result_object.status : "not_audited";
        }

        if (!requirement_result_object || !requirement_result_object.checkResults) {
            return "not_audited";
        }

        let all_checks_passed = true;
        let any_check_failed = false;
        let any_check_partially_audited = false;
        let any_check_not_audited = false;

        for (const check of requirement_object.checks) {
            const check_result = requirement_result_object.checkResults[check.id];
            // Om en check inte finns i resultaten än (bör inte hända med initieringen), behandla som not_audited.
            const check_status = check_result ? check_result.status : 'not_audited';

            if (check_status === "failed") {
                any_check_failed = true;
                all_checks_passed = false;
            } else if (check_status === "partially_audited") {
                any_check_partially_audited = true;
                all_checks_passed = false;
            } else if (check_status === "not_audited") {
                any_check_not_audited = true;
                all_checks_passed = false;
            } else if (check_status === "passed") {
                // Gör inget specifikt, all_checks_passed förblir true om inget annat inträffar
            }
        }

        if (any_check_failed) return "failed";
        if (any_check_partially_audited) return "partially_audited";
        if (any_check_not_audited) return "not_audited";
        if (all_checks_passed) return "passed";

        // Fallback, bör inte nås om logiken är komplett
        return "not_audited";
    }

    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        if (!rule_file_content || !rule_file_content.requirements || !sample || !sample.selectedContentTypes) { return []; }
        const all_requirements_array = Object.values(rule_file_content.requirements);
        return all_requirements_array.filter(req => {
            if (!req.contentType || !Array.isArray(req.contentType) || req.contentType.length === 0) {
                return true; // Alltid relevant om inga contentTypes är specificerade på kravet
            }
            return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
        });
    }

    const public_api = {
        calculate_requirement_status,
        calculate_check_status,
        get_relevant_requirements_for_sample
    };

    window.AuditLogic = public_api;
})();