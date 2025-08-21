// js/logic/rulefile_updater_logic.js

function deep_equals(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

function reconcile_audit_with_new_rule_file(current_audit_state, new_rule_file_content) {
    console.log("%c--- Startar avstämning (Intelligent Matchning) ---", "color: green; font-weight: bold;");
    
    if (!current_audit_state || !current_audit_state.ruleFileContent) {
        throw new Error("Avstämningsfel: 'current_audit_state' eller 'ruleFileContent' saknas.");
    }
    
    const new_reconciled_state = JSON.parse(JSON.stringify(current_audit_state));
    new_reconciled_state.ruleFileContent = new_rule_file_content;
    
    const report = {
        removed_requirements: [],
        updated_requirements: [],
        invalidated_samples: []
    };

    const old_requirements = current_audit_state.ruleFileContent.requirements;
    const new_requirements = new_rule_file_content.requirements;

    if (typeof old_requirements !== 'object' || typeof new_requirements !== 'object') {
        throw new Error("Avstämningsfel: 'requirements' är inte ett objekt i gamla eller nya regelfilen.");
    }

    const new_req_map_by_key = new Map(Object.entries(new_requirements));
    const new_req_map_by_title = new Map(Object.values(new_requirements).map(req => req.title ? [req.title, req] : [null, null]).filter(entry => entry[0]));

    const matched_new_req_keys = new Set();

    new_reconciled_state.samples.forEach(sample => {
        const original_results = sample.requirementResults || {};
        const new_results = {};

        for (const old_req_key in original_results) {
            const old_req_def = old_requirements[old_req_key];
            if (!old_req_def) continue;

            let new_req_def = null;
            let match_type = '';

            if (new_req_map_by_key.has(old_req_key)) {
                new_req_def = new_req_map_by_key.get(old_req_key);
                match_type = 'key';
            }
            
            if (!new_req_def && old_req_def.title) {
                const potential_match = new_req_map_by_title.get(old_req_def.title);
                if (potential_match && !matched_new_req_keys.has(potential_match.key || potential_match.id)) {
                    new_req_def = potential_match;
                    match_type = 'title';
                }
            }
            
            if (new_req_def) {
                const new_req_key = new_req_def.key || new_req_def.id;
                matched_new_req_keys.add(new_req_key);
                new_results[new_req_key] = original_results[old_req_key];
                
                if (!deep_equals(old_req_def, new_req_def)) {
                    if (new_results[new_req_key].status !== 'not_audited') {
                        new_results[new_req_key].needsReview = true;
                    }
                    if (!report.updated_requirements.some(r => r.title === new_req_def.title)) {
                        report.updated_requirements.push({ id: new_req_key, title: new_req_def.title });
                    }
                }
            } else {
                if (!report.removed_requirements.some(r => r.title === old_req_def.title)) {
                    report.removed_requirements.push({ id: old_req_key, title: old_req_def.title });
                }
            }
        }
        sample.requirementResults = new_results;

        const new_metadata = new_rule_file_content.metadata;
        const valid_page_types = new_metadata.pageTypes || [];
        if (!valid_page_types.includes(sample.pageType)) {
             report.invalidated_samples.push({ id: sample.id, description: sample.description, reason: `Sidtypen '${sample.pageType}' finns inte längre.` });
        }
    });

    console.log("%c--- Avstämning klar ---", "color: green; font-weight: bold;");
    console.log("Rapport:", report);
    
    return {
        reconciled_state: new_reconciled_state,
        report: report
    };
}

// ** DENNA RAD ÄR KORRIGERINGEN **
export const RulefileUpdaterLogic = {
    reconcile_audit_with_new_rule_file
};