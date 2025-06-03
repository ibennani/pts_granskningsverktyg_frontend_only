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

        if (!check_object || !check_object.passCriteria || check_object.passCriteria.length === 0) {
            // Om inga passkriterier finns:
            // Om "Stämmer" (passed) är valt manuellt -> passed. 
            // Om "Ej bedömt" (not_audited) är valt manuellt -> not_audited.
            return overall_manual_status === 'passed' ? 'passed' : 'not_audited';
        }

        // Om "Stämmer" (passed) eller "Ej bedömt" (not_audited) är valt för kontrollpunkten,
        // bedöm baserat på underliggande passCriteria.
        let audited_criteria_count = 0;
        let passed_criteria_count_for_or_logic = 0;
        let all_criteria_passed_for_and_logic = true;
        let any_criterion_failed = false;

        const current_pass_criteria_map = pass_criteria_statuses_map || {};

        for (const pc of check_object.passCriteria) {
            const status = current_pass_criteria_map[pc.id] || 'not_audited';
            if (status === "passed") {
                audited_criteria_count++;
                passed_criteria_count_for_or_logic++;
            } else if (status === "failed") {
                audited_criteria_count++;
                any_criterion_failed = true;
                all_criteria_passed_for_and_logic = false; // För AND logik
            }
            // Om status är 'not_audited', påverkar det bara om alla andra är 'not_audited'
            // eller om det är färre än totalt antal kriterier som är bedömda.
        }

        // Om "Stämmer" är valt för kontrollpunkten, men inga underliggande kriterier är bedömda än
        if (overall_manual_status === 'passed' && audited_criteria_count === 0) {
            return "not_audited"; 
        }
        
        if (audited_criteria_count === 0) { // Gäller om overall_manual_status är 'not_audited' och inga kriterier bedömda
            return "not_audited";
        }

        if (any_criterion_failed) { // Om något kriterium underkänts (och overall_manual_status inte var 'failed')
            return "failed";
        }

        // Om inte alla kriterier är bedömda (och inget har underkänts)
        if (audited_criteria_count < check_object.passCriteria.length) {
            return "partially_audited";
        }

        // Om alla kriterier är bedömda och inget har underkänts:
        if (check_object.logic === "OR") {
            return passed_criteria_count_for_or_logic > 0 ? "passed" : "failed"; // Om OR, räcker det att en är passed
        } else { // AND logic (default)
            return all_criteria_passed_for_and_logic ? "passed" : "failed"; // Om AND, måste alla vara passed
        }
    }

    // Beräknar övergripande status för ett krav
    function calculate_requirement_status(requirement_object, requirement_result_object) {
        if (!requirement_object || !requirement_object.checks || requirement_object.checks.length === 0) {
            // Om kravet inte har några kontrollpunkter, kan dess status vara satt manuellt eller default
            return requirement_result_object?.status && requirement_result_object.status !== 'not_audited' 
                   ? requirement_result_object.status 
                   : "not_audited"; // Kan behöva mer logik här om det finns krav utan checks
        }
        if (!requirement_result_object || !requirement_result_object.checkResults) {
            return "not_audited"; // Ingen resultatdata finns alls
        }
        
        let all_checks_passed_or_not_audited_or_partial = true; // Anta initialt
        let any_check_failed = false;
        let audited_checks_count = 0; // Antal checks som är 'passed' eller 'failed'
        let partially_audited_check_exists = false;
        let total_checks = requirement_object.checks.length;

        for (const check_definition of requirement_object.checks) {
            const check_result_data = requirement_result_object.checkResults[check_definition.id];
            
            // Använd den sparade/beräknade statusen för checken
            const current_check_calculated_status = check_result_data ? check_result_data.status : 'not_audited';

            if (current_check_calculated_status === "failed") {
                any_check_failed = true;
                audited_checks_count++;
            } else if (current_check_calculated_status === "passed") {
                audited_checks_count++;
            } else if (current_check_calculated_status === "partially_audited") {
                partially_audited_check_exists = true;
                all_checks_passed_or_not_audited_or_partial = false; // Kan inte vara 'passed' om en är partial
            } else { // not_audited
                all_checks_passed_or_not_audited_or_partial = false; // Kan inte vara 'passed' om en är not_audited
            }
        }
        
        if (any_check_failed) return "failed";
        if (partially_audited_check_exists) return "partially_audited"; // Om någon check är delvis, är kravet delvis
        if (audited_checks_count === 0 && total_checks > 0) return "not_audited";
        
        // Om vi når hit, har ingen check underkänts och ingen är delvis.
        // Nu kollar vi om alla är godkända eller om några fortfarande är 'not_audited'.
        if (audited_checks_count < total_checks) { // Några är 'not_audited' men ingen är 'failed' eller 'partially_audited'
            return "partially_audited"; // Tidigare var detta "not_audited", men "partially_audited" är mer korrekt
        }
        
        // Om audited_checks_count === total_checks (och ingen failed/partial)
        return "passed"; 
    }

    // Hämtar relevanta krav för ett givet stickprov
    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        if (!rule_file_content || !rule_file_content.requirements || !sample) { // Tog bort selectedContentTypes från denna guard clause
            return []; 
        }
        const all_requirements_array = Object.values(rule_file_content.requirements);

        // Om stickprovet INTE har några specificerade innehållstyper, visa ALLA krav.
        // Detta är ett antagande om att användaren då vill se en bredare uppsättning.
        // Om detta INTE är önskat, och man alltid vill filtrera strikt, kan denna if-sats tas bort.
        if (!sample.selectedContentTypes || sample.selectedContentTypes.length === 0) {
            return all_requirements_array; 
        }

        // Om stickprovet HAR specificerade innehållstyper, filtrera strikt:
        return all_requirements_array.filter(req => {
            // Kravet MÅSTE ha contentTypes definierade för att kunna matchas mot ett stickprov som har specifika typer.
            if (!req.contentType || !Array.isArray(req.contentType) || req.contentType.length === 0) {
                return false; // Krav utan specifik typ visas INTE om stickprovet har specifika typer.
            }
            // Annars, kolla om någon av kravets contentTypes matchar någon av stickprovets valda contentTypes.
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

        // Sortera baserat på text för kategorier och titel
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

        // Returnera arrayen av nycklar (som bör vara UUID:n från req.key)
        return relevant_req_objects.map(req => req.key || req.id); // Föredra key om den finns, annars id
    }

    // Beräknar övergripande granskningsprogress
    function calculate_overall_audit_progress(current_audit_data) {
        console.log("[AuditLogic] calculate_overall_audit_progress CALLED."); 
        // Ta bort den stora loggen av current_audit_data om den är för pratig, eller gör den villkorlig
        // console.log("[AuditLogic] current_audit_data:", current_audit_data ? JSON.parse(JSON.stringify(current_audit_data)) : "null/undefined");


        if (!current_audit_data || !current_audit_data.samples || !current_audit_data.ruleFileContent || !current_audit_data.ruleFileContent.requirements) {
            console.warn("[AuditLogic] Missing critical data for calculate_overall_audit_progress. Returning 0/0.");
            return { audited: 0, total: 0 };
        }

        let total_relevant_requirements_across_samples = 0;
        let total_completed_requirements_across_samples = 0;

        current_audit_data.samples.forEach((sample, sample_index) => {
            // console.log(`[AuditLogic] Processing sample ${sample_index + 1}/${current_audit_data.samples.length}: ID = ${sample.id}, Description = "${sample.description}"`);
            
            const relevant_reqs_for_this_sample = get_relevant_requirements_for_sample(current_audit_data.ruleFileContent, sample);
            total_relevant_requirements_across_samples += relevant_reqs_for_this_sample.length;
            // console.log(`[AuditLogic] Sample "${sample.description}": Found ${relevant_reqs_for_this_sample.length} relevant requirements.`);

            if (!sample.requirementResults) {
                // console.log(`[AuditLogic] Sample "${sample.description}": No requirementResults object found.`);
            }

            relevant_reqs_for_this_sample.forEach((req_definition, req_index) => {
                const requirement_key_for_results = req_definition.key || req_definition.id; 
                const req_result = sample.requirementResults ? sample.requirementResults[requirement_key_for_results] : null;
                const calculated_status = calculate_requirement_status(req_definition, req_result);
                
                // Mer detaljerad loggning för varje krav
                console.log(`  [AuditLogic CALC_OVERALL] Sample: "${sample.description}", Req: "${req_definition.title}" (Key for result: ${requirement_key_for_results}), Result obj from sample:`, 
                            req_result ? JSON.parse(JSON.stringify(req_result)) : "No result obj", 
                            `Calculated status for this req: "${calculated_status}"`);

                if (calculated_status === 'passed' || calculated_status === 'failed') {
                    total_completed_requirements_across_samples++;
                    // console.log(`    Incrementing completed count. New count: ${total_completed_requirements_across_samples}`);
                }
            });
        });

        console.log(`[AuditLogic] calculate_overall_audit_progress RETURNING: audited = ${total_completed_requirements_across_samples}, total = ${total_relevant_requirements_across_samples}`);
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
            const requirement_definition = rule_file_content.requirements[req_key]; // Använd req_key för att hämta definitionen
            if (!requirement_definition) {
                console.warn(`[AuditLogic] find_first_incomplete: No definition found for req_key "${req_key}"`);
                continue; 
            }
            // Använd samma req_key för att hämta resultatet, eftersom det är så vi sparar det nu
            const requirement_result = sample_object.requirementResults ? sample_object.requirementResults[req_key] : null;
            
            const status = calculate_requirement_status(requirement_definition, requirement_result);

            if (status === 'not_audited' || status === 'partially_audited') {
                return req_key; // Returnera nyckeln (UUID)
            }
        }
        return null; // Inget ohanterat hittades
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