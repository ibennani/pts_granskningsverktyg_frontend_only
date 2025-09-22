// js/audit_logic.js
(function () { 
    'use-strict';

    function get_t_func() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;
    }

    function formatDeficiencyId(number) {
        const t = get_t_func();
        return `${t('deficiency_prefix', {defaultValue: "brist"})} ${String(number).padStart(4, '0')}`;
    }

    function assignSortedDeficiencyIdsOnLock(auditState) {
        console.log("[AuditLogic] Running assignSortedDeficiencyIdsOnLock...");
        const newState = JSON.parse(JSON.stringify(auditState));
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
                        const originalPcResultRef = newState.samples.find(s => s.id === sample.id)
                            ?.requirementResults[reqKey]
                            ?.checkResults[checkKey]
                            ?.passCriteria[pcKey];

                        if (pcResult.status === 'failed' && pcDef && originalPcResultRef) {
                            failedCriteria.push({
                                sampleDescription: sample.description,
                                reqRefText: reqDef.standardReference?.text || reqDef.title,
                                pcRequirementText: pcDef.requirement,
                                resultObjectToUpdate: originalPcResultRef
                            });
                        }
                    });
                });
            });
        });

        failedCriteria.sort((a, b) => {
            const reqCompare = (a.reqRefText || '').localeCompare(b.reqRefText || '', undefined, { numeric: true });
            if (reqCompare !== 0) return reqCompare;
            const sampleCompare = a.sampleDescription.localeCompare(b.sampleDescription);
            if (sampleCompare !== 0) return sampleCompare;
            return a.pcRequirementText.localeCompare(b.pcRequirementText);
        });

        let counter = 1;
        failedCriteria.forEach(item => {
            item.resultObjectToUpdate.deficiencyId = formatDeficiencyId(counter);
            counter++;
        });
        newState.deficiencyCounter = counter;

        return newState;
    }
    
    function updateIncrementalDeficiencyIds(auditState) {
        if (!auditState) return auditState;
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
        // Förbättrad null-säkerhet och validering
        if (!requirement_object || typeof requirement_object !== 'object') {
            console.warn('[AuditLogic] calculate_requirement_status: Invalid requirement_object');
            return "not_audited";
        }
        
        if (!requirement_object.checks || !Array.isArray(requirement_object.checks) || requirement_object.checks.length === 0) {
            return requirement_result_object?.status || "not_audited";
        }
        
        if (!requirement_result_object || typeof requirement_result_object !== 'object' || !requirement_result_object.checkResults) {
            return "not_audited";
        }
        
        try {
            let has_failed_check = false, has_partially_audited_check = false, has_not_audited_check = false;
            
            for (const check_definition of requirement_object.checks) {
                // Validera check_definition
                if (!check_definition || typeof check_definition !== 'object' || !check_definition.id) {
                    console.warn('[AuditLogic] calculate_requirement_status: Invalid check_definition:', check_definition);
                    has_not_audited_check = true;
                    continue;
                }
                
                const checkResultForDef = requirement_result_object.checkResults[check_definition.id];
                let status = 'not_audited';
                
                if (checkResultForDef) {
                    try {
                        status = calculate_check_status(check_definition, checkResultForDef.passCriteria, checkResultForDef.overallStatus);
                    } catch (error) {
                        console.warn('[AuditLogic] calculate_requirement_status: Error calculating check status:', error);
                        status = 'not_audited';
                    }
                }

                if (status === "failed") { 
                    has_failed_check = true; 
                    break; 
                }
                if (status === "partially_audited") has_partially_audited_check = true;
                if (status === "not_audited") has_not_audited_check = true;
            }

            if (has_failed_check) return "failed";
            if (has_partially_audited_check) return "partially_audited";
            if (has_not_audited_check) return "not_audited";
            return "passed";
        } catch (error) {
            console.error('[AuditLogic] calculate_requirement_status: Error processing requirement:', error);
            return "not_audited";
        }
    }

    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        // Förbättrad null-säkerhet och validering
        if (!rule_file_content || typeof rule_file_content !== 'object') {
            console.warn('[AuditLogic] get_relevant_requirements_for_sample: Invalid rule_file_content');
            return [];
        }
        
        if (!rule_file_content.requirements || typeof rule_file_content.requirements !== 'object') {
            console.warn('[AuditLogic] get_relevant_requirements_for_sample: Invalid or missing requirements object');
            return [];
        }
        
        if (!sample || typeof sample !== 'object') {
            console.warn('[AuditLogic] get_relevant_requirements_for_sample: Invalid sample object');
            return [];
        }
        
        try {
            const all_reqs = Object.values(rule_file_content.requirements).filter(req => {
                // Validera att varje requirement är ett giltigt objekt
                return req && typeof req === 'object' && req.id;
            });
            
            if (!sample.selectedContentTypes || !Array.isArray(sample.selectedContentTypes) || sample.selectedContentTypes.length === 0) {
                return all_reqs;
            }
            
            return all_reqs.filter(req => {
                if (!req.contentType || !Array.isArray(req.contentType) || req.contentType.length === 0) {
                    return true;
                }
                return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
            });
        } catch (error) {
            console.error('[AuditLogic] get_relevant_requirements_for_sample: Error processing requirements:', error);
            return [];
        }
    }

    function get_ordered_relevant_requirement_keys(rule_file_content, sample_object, sort_option = 'default') {
        const t = get_t_func();
        const relevant_reqs = get_relevant_requirements_for_sample(rule_file_content, sample_object);

        if (sort_option === 'default') {
            relevant_reqs.sort((a, b) => {
                const ref_a = a.standardReference?.text || null;
                const ref_b = b.standardReference?.text || null;
                if (ref_a && ref_b) return window.Helpers.natural_sort(ref_a, ref_b);
                if (ref_a && !ref_b) return -1;
                if (!ref_a && ref_b) return 1;
                return (a.title || '').localeCompare(b.title || '');
            });
        } else if (sort_option === 'category') {
            relevant_reqs.sort((a, b) => {
                const main_a = a.metadata?.mainCategory?.text || t('uncategorized');
                const main_b = b.metadata?.mainCategory?.text || t('uncategorized');
                if (main_a !== main_b) return main_a.localeCompare(main_b);
                const sub_a = a.metadata?.subCategory?.text || t('other_requirements');
                const sub_b = b.metadata?.subCategory?.text || t('other_requirements');
                if (sub_a !== sub_b) return sub_a.localeCompare(sub_b);
                return (a.title || '').localeCompare(b.title || '');
            });
        }
        
        return relevant_reqs.map(req => req.key || req.id);
    }

    function calculate_overall_audit_progress(current_audit_data) {
        if (!current_audit_data?.samples || !current_audit_data.ruleFileContent?.requirements) {
            return { audited: 0, total: 0 };
        }

        let total_possible_assessments = 0;
        let total_completed_assessments = 0;

        current_audit_data.samples.forEach(sample => {
            const relevant_reqs = get_relevant_requirements_for_sample(current_audit_data.ruleFileContent, sample);
            total_possible_assessments += relevant_reqs.length;

            relevant_reqs.forEach(req_def => {
                const status = calculate_requirement_status(req_def, sample.requirementResults?.[req_def.key || req_def.id]);
                if (status === 'passed' || status === 'failed') {
                    total_completed_assessments++;
                }
            });
        });

        return { audited: total_completed_assessments, total: total_possible_assessments };
    }


    function find_first_incomplete_requirement_key_for_sample(rule_file_content, sample_object, exclude_key = null) {
        if (!sample_object || !rule_file_content?.requirements) return null;
        const ordered_keys = get_ordered_relevant_requirement_keys(rule_file_content, sample_object, 'default');
        for (const req_key of ordered_keys) {
            if (exclude_key && req_key === exclude_key) continue; // Hoppa över det aktuella kravet
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
        assignSortedDeficiencyIdsOnLock,
        updateIncrementalDeficiencyIds
    };

    window.AuditLogic = public_api;
})();