// js/logic/rulefile_updater_logic.js

(function () { // IIFE start
    'use-strict';

    /**
     * Jämför två JavaScript-objekt för att se om de är identiska.
     * @param {object} obj1 - Det första objektet.
     * @param {object} obj2 - Det andra objektet.
     * @returns {boolean} - True om de är identiska, annars false.
     */
    function deep_equals(obj1, obj2) {
        // Enkel men robust metod för detta ändamål
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    /**
     * Huvudfunktionen för att stämma av en pågående granskning mot en ny regelfil.
     * @param {object} current_audit_state - Det nuvarande, kompletta granskningstillståndet.
     * @param {object} new_rule_file_content - Innehållet från den nya JSON-regelfilen.
     * @returns {object} - Ett objekt som innehåller { reconciled_state, report }.
     */
    function reconcile_audit_with_new_rule_file(current_audit_state, new_rule_file_content) {
        
        // Skapa en djup kopia av det nuvarande tillståndet för att undvika att modifiera originalet direkt.
        const new_reconciled_state = JSON.parse(JSON.stringify(current_audit_state));
        
        // Uppdatera regelfilsinnehållet i det nya tillståndet.
        new_reconciled_state.ruleFileContent = new_rule_file_content;
        
        // Initiera en rapport som kommer att visas för användaren.
        const report = {
            removed_requirements: [],   // { id, title }
            updated_requirements: [],   // { id, title }
            invalidated_samples: []     // { id, description, reason }
        };
        
        const old_requirements = current_audit_state.ruleFileContent.requirements;
        const new_requirements = new_rule_file_content.requirements;
        
        const old_req_ids = new Set(Object.keys(old_requirements));
        const new_req_ids = new Set(Object.keys(new_requirements));

        // Loopa igenom alla stickprov för att uppdatera deras resultat.
        new_reconciled_state.samples = new_reconciled_state.samples.map(sample => {
            const new_requirement_results = {};
            
            // Loopa igenom de gamla resultaten för detta stickprov.
            for (const req_id in sample.requirementResults) {
                if (old_req_ids.has(req_id)) { // Dubbelkolla att resultatet faktiskt hörde till ett existerande krav
                    
                    if (new_req_ids.has(req_id)) {
                        // Kravet finns kvar, behåll resultatet.
                        new_requirement_results[req_id] = sample.requirementResults[req_id];
                        
                        // Jämför nu den gamla och nya definitionen av kravet.
                        const old_req_def = old_requirements[req_id];
                        const new_req_def = new_requirements[req_id];
                        
                        if (!deep_equals(old_req_def, new_req_def)) {
                            // Kravet har ändrats.
                            if (new_requirement_results[req_id].status !== 'not_audited') {
                                // Markera för omgranskning endast om det redan har ett resultat.
                                new_requirement_results[req_id].needsReview = true;
                            }
                            
                            // Lägg till i rapporten (bara en gång per krav-ID).
                            if (!report.updated_requirements.some(r => r.id === req_id)) {
                                report.updated_requirements.push({ id: req_id, title: old_req_def.title });
                            }
                        }
                    } else {
                        // Kravet har tagits bort. Lägg till i rapporten och gör inget mer (resultatet kommer inte med i new_requirement_results).
                        if (!report.removed_requirements.some(r => r.id === req_id)) {
                             report.removed_requirements.push({ id: req_id, title: old_requirements[req_id].title });
                        }
                    }
                }
            }
            
            // Uppdatera stickprovets resultat.
            sample.requirementResults = new_requirement_results;

            // Validera stickprovets metadata (pageType och contentTypes).
            const new_metadata = new_rule_file_content.metadata;
            const valid_page_types = new_metadata.pageTypes || [];
            const valid_content_type_ids = (new_metadata.contentTypes || []).map(ct => ct.id);

            if (!valid_page_types.includes(sample.pageType)) {
                report.invalidated_samples.push({
                    id: sample.id,
                    description: sample.description,
                    reason: `Sidtypen '${sample.pageType}' finns inte längre i den nya regelfilen.`
                });
                // Vi ändrar inte datan här, bara rapporterar. Användaren måste åtgärda det manuellt.
            }
            
            const invalid_content_types = sample.selectedContentTypes.filter(ct_id => !valid_content_type_ids.includes(ct_id));
            if (invalid_content_types.length > 0) {
                 report.invalidated_samples.push({
                    id: sample.id,
                    description: sample.description,
                    reason: `Innehållstyperna '${invalid_content_types.join(', ')}' finns inte längre i den nya regelfilen.`
                });
            }

            return sample;
        });

        console.log("[RulefileUpdaterLogic] Reconciliation complete. Report:", report);
        
        return {
            reconciled_state: new_reconciled_state,
            report: report
        };
    }

    // Exponera den offentliga API:n
    window.RulefileUpdaterLogic = {
        reconcile_audit_with_new_rule_file
    };

    console.log("[rulefile_updater_logic.js] RulefileUpdaterLogic loaded.");

})(); // Slut på IIFE