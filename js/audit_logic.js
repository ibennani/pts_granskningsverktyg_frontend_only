(function () { // Start på IIFE
    'use-strict';

    function calculate_check_status(check, check_results_for_req) {
        // ... (din befintliga logik, oförändrad)
        if (!check || !check.passCriteria || check.passCriteria.length === 0) { return "not_audited"; }
        if (!check_results_for_req || !check_results_for_req.checkResults || !check_results_for_req.checkResults[check.id]) { return "not_audited"; }
        const pass_criteria_statuses_for_check = check_results_for_req.checkResults[check.id].passCriteria;
        let all_passed = true, any_passed = false, any_failed = false, all_audited = true;
        for (const pc of check.passCriteria) {
            const pc_status = pass_criteria_statuses_for_check[pc.id];
            if (!pc_status || pc_status === "not_audited") { all_audited = false; }
            else if (pc_status === "passed") { any_passed = true; }
            else if (pc_status === "failed") { any_failed = true; all_passed = false; }
        }
        if (!all_audited && !(check.logic === "OR" && any_passed)) {
            if(check.logic === "OR") { if(any_passed) return "passed"; if(any_failed && all_audited) return "failed"; return "not_audited"; }
            else { if(any_failed) return "failed"; if(!all_audited) return "not_audited"; return "passed"; }
        }
        if (check.logic === "OR") { return any_passed ? "passed" : "failed"; }
        else { return all_passed ? "passed" : "failed"; }
    }

    function calculate_requirement_status(requirement, requirement_result_object) {
        // ... (din befintliga logik, oförändrad)
        if (!requirement || !requirement.checks) { return "not_audited"; }
        if (!requirement_result_object || !requirement_result_object.checkResults) { return "not_audited"; }
        if (requirement.checks.length === 0) { return requirement_result_object.status || "not_audited"; }
        let all_checks_passed = true, any_check_failed = false, any_check_not_audited = false;
        for (const check of requirement.checks) {
            const check_status_obj = requirement_result_object.checkResults[check.id];
            let current_check_status;
            if (check_status_obj && check_status_obj.status) { current_check_status = check_status_obj.status; }
            else { current_check_status = calculate_check_status(check, requirement_result_object); }
            if (current_check_status === "failed") { all_checks_passed = false; any_check_failed = true; }
            else if (current_check_status === "not_audited") { all_checks_passed = false; any_check_not_audited = true; }
        }
        if (any_check_failed) return "failed"; if (any_check_not_audited) return "not_audited";
        if (all_checks_passed) return "passed"; return "not_audited";
    }

    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        // ... (din befintliga logik, oförändrad)
        if (!rule_file_content || !rule_file_content.requirements || !sample || !sample.selectedContentTypes) { return []; }
        const all_requirements_array = Object.values(rule_file_content.requirements);
        return all_requirements_array.filter(req => {
            if (!req.contentType || !Array.isArray(req.contentType)) { return false; }
            if (req.contentType.length === 0) { return false; }
            return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
        });
    }

    const public_api = {
        calculate_requirement_status,
        calculate_check_status,
        get_relevant_requirements_for_sample
    };

    window.AuditLogic = public_api;

    console.log("[audit_logic.js] IIFE executed. typeof window.AuditLogic:", typeof window.AuditLogic);
    if (typeof window.AuditLogic === 'object' && window.AuditLogic !== null) {
        console.log("[audit_logic.js] window.AuditLogic keys:", Object.keys(window.AuditLogic));
    }
})();