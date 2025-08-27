// file: js/logic/audit_logic.js
(function () { 
    'use-strict';

    function get_t_func() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;
    }

    // --- NY FUNKTION för att formatera ID ---
    function formatDeficiencyId(number) {
        const t = get_t_func();
        return `${t('deficiency_prefix', {defaultValue: "brist"})} ${String(number).padStart(4, '0')}`;
    }

    // --- NY FUNKTION: Tilldelar ID:n första gången granskningen låses ---
    function assignSortedDeficiencyIdsOnLock(auditState) {
        const t = get_t_func();
        console.log("[AuditLogic] Running assignSortedDeficiencyIdsOnLock...");
        const newState = JSON.parse(JSON.stringify(auditState));

        // Steg 1: Rensa eventuella preliminära ID:n och återställ räknaren
        newState.deficiencyCounter = 1;
        (newState.samples || []).forEach(sample => {
            Object.values(sample.requirementResults || {}).forEach(reqResult => {
                Object.values(reqResult.checkResults || {}).forEach(checkResult => {
                    Object.values(checkResult.passCriteria || {}).forEach(pcResult => {
                        delete pcResult.deficiencyId;
                    });
                });
            });
        });

        // Steg 2: Samla alla underkända kriterier i en lista för sortering
        const failedCriteria = [];
        (newState.samples || []).forEach(sample => {
            Object.keys(sample.requirementResults || {}).forEach(reqKey => {
                const reqResult = sample.requirementResults[reqKey];
                const reqDef = newState.ruleFileContent.requirements[reqKey];
                if (!reqDef || !reqResult) return;

                Object.keys(reqResult.checkResults || {}).forEach(checkKey => {
                    const checkResult = reqResult.checkResults[checkKey];
                    const checkDef = reqDef.checks.find(c => c.id === checkKey);
                    if (!checkDef || !checkResult) return;

                    Object.keys(checkResult.passCriteria || {}).forEach(pcKey => {
                        const pcResult = checkResult.passCriteria[pcKey];
                        const pcDef = checkDef.passCriteria.find(pc => pc.id === pcKey);
                        // Hitta den ursprungliga referensen i state-trädet för att kunna uppdatera den
                        const originalPcResultRef = newState.samples.find(s => s.id === sample.id)
                            ?.requirementResults[reqKey]
                            ?.checkResults[checkKey]
                            ?.passCriteria[pcKey];

                        if (pcResult.status === 'failed' && pcDef && originalPcResultRef) {
                            failedCriteria.push({
                                sampleDescription: sample.description,
                                reqRefText: reqDef.standardReference?.text || reqDef.title,
                                pcRequirementText: pcDef.requirement,
                                resultObjectToUpdate: originalPcResultRef // Direkt referens till objektet som ska ändras
                            });
                        }
                    });
                });
            });
        });

        // Steg 3: Sortera listan enligt specifikation
        failedCriteria.sort((a, b) => {
            const reqCompare = a.reqRefText.localeCompare(b.reqRefText, undefined, { numeric: true });
            if (reqCompare !== 0) return reqCompare;
            const sampleCompare = a.sampleDescription.localeCompare(b.sampleDescription);
            if (sampleCompare !== 0) return sampleCompare;
            return a.pcRequirementText.localeCompare(b.pcRequirementText);
        });

        // Steg 4: Loopa igenom den sorterade listan och tilldela nya, sekventiella ID:n
        let counter = 1;
        failedCriteria.forEach(item => {
            item.resultObjectToUpdate.deficiencyId = formatDeficiencyId(counter);
            counter++;
        });
        newState.deficiencyCounter = counter; // Spara nästa tillgängliga nummer

        return newState;
    }
    
    // --- UPPDATERAD FUNKTION: Hanterar nu endast inkrementella ändringar ---
    function updateIncrementalDeficiencyIds(auditState) {
        if (!auditState) return auditState;
        console.log("[AuditLogic] Running updateIncrementalDeficiencyIds...");

        const newState = JSON.parse(JSON.stringify(auditState));
        let nextId = newState.deficiencyCounter || 1;

        (newState.samples || []).forEach(sample => {
            Object.values(sample.requirementResults || {}).forEach(reqResult => {
                Object.values(reqResult.checkResults || {}).forEach(checkResult => {
                    Object.values(checkResult.passCriteria || {}).forEach(pcResult => {
                        if (pcResult.status === 'failed' && !pcResult.deficiencyId) {
                            pcResult.deficiencyId = formatDeficiencyId(nextId);
                            nextId++;
                        } else if (pcResult.status !== 'failed' && pcResult.deficiencyId) {
                            delete pcResult.deficiencyId;
                        }
                    });
                });
            });
        });
        
        newState.deficiencyCounter = nextId;
        return newState;
    }

    function calculate_check_status(check_object, pass_criteria_statuses_map, overall_manual_status = 'not_audited') {
        if (overall_manual_status === 'failed') return "passed";
        if (overall_manual_status === 'not_audited') return "not_audited";
        if (!check_object?.passCriteria || check_object.passCriteria.length === 0) return "passed";

        const pc_statuses = check_object.passCriteria.map(pc => {
            const pc_data = (pass_criteria_statuses_map || {})[pc.id];
            return (typeof pc_data === 'object' && pc_data !== null) ? pc_data.status : (pc_data || 'not_audited');
        });
        
        if (pc_statuses.some(s => s === 'failed')) return "failed";
        if (pc_statuses.some(s => s === 'not_audited')) return "partially_audited";
        return "passed";
    }

    function calculate_requirement_status(requirement_object, requirement_result_object) {
        if (!requirement_object?.checks || requirement_object.checks.length === 0) {
            return requirement_result_object?.status || "not_audited";
        }
        if (!requirement_result_object?.checkResults) return "not_audited";
        
        let has_failed_check = false, has_partially_audited_check = false, has_not_audited_check = false;
        
        for (const check_definition of requirement_object.checks) {
            const status = (requirement_result_object.checkResults[check_definition.id])?.status || 'not_audited';
            if (status === "failed") { has_failed_check = true; break; }
            if (status === "partially_audited") has_partially_audited_check = true;
            if (status === "not_audited") has_not_audited_check = true;
        }

        if (has_failed_check) return "failed";
        if (has_partially_audited_check) return "partially_audited";
        if (has_not_audited_check) return "not_audited";
        return "passed";
    }

    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        if (!rule_file_content?.requirements || !sample) return [];
        const all_reqs = Object.values(rule_file_content.requirements);
        if (!sample.selectedContentTypes?.length) return all_reqs;
        return all_reqs.filter(req => req.contentType?.some(ct => sample.selectedContentTypes.includes(ct)));
    }

    function get_ordered_relevant_requirement_keys(rule_file_content, sample_object) {
        const t = get_t_func();
        const relevant_reqs = get_relevant_requirements_for_sample(rule_file_content, sample_object);
        relevant_reqs.sort((a, b) => {
            const main_a = a.metadata?.mainCategory?.text || t('uncategorized');
            const main_b = b.metadata?.mainCategory?.text || t('uncategorized');
            if (main_a !== main_b) return main_a.localeCompare(main_b);
            const sub_a = a.metadata?.subCategory?.text || t('other_requirements');
            const sub_b = b.metadata?.subCategory?.text || t('other_requirements');
            if (sub_a !== sub_b) return sub_a.localeCompare(sub_b);
            return (a.title || '').localeCompare(b.title || '');
        });
        return relevant_reqs.map(req => req.key || req.id);
    }

    function calculate_overall_audit_progress(current_audit_data) {
        if (!current_audit_data?.samples || !current_audit_data.ruleFileContent?.requirements) return { audited: 0, total: 0 };
        let total_relevant = 0, total_completed = 0;
        current_audit_data.samples.forEach(sample => {
            const relevant_reqs = get_relevant_requirements_for_sample(current_audit_data.ruleFileContent, sample);
            total_relevant += relevant_reqs.length;
            relevant_reqs.forEach(req_def => {
                const status = calculate_requirement_status(req_def, sample.requirementResults?.[req_def.key || req_def.id]);
                if (status === 'passed' || status === 'failed') total_completed++;
            });
        });
        return { audited: total_completed, total: total_relevant };
    }

    function find_first_incomplete_requirement_key_for_sample(rule_file_content, sample_object) {
        if (!sample_object || !rule_file_content?.requirements) return null;
        const ordered_keys = get_ordered_relevant_requirement_keys(rule_file_content, sample_object);
        for (const req_key of ordered_keys) {
            const req_def = rule_file_content.requirements[req_key];
            if (!req_def) continue;
            const status = calculate_requirement_status(req_def, sample_object.requirementResults?.[req_key]);
            if (status === 'not_audited' || status === 'partially_audited') return req_key;
        }
        return null;
    }

    const public_api = {
        calculate_requirement_status,
        calculate_check_status,
        get_relevant_requirements_for_sample,
        get_ordered_relevant_requirement_keys,
        calculate_overall_audit_progress,
        find_first_incomplete_requirement_key_for_sample,
        assignSortedDeficiencyIdsOnLock: assignSortedDeficiencyIdsOnLock,
        updateIncrementalDeficiencyIds: updateIncrementalDeficiencyIds
    };

    window.AuditLogic = public_api;
})();