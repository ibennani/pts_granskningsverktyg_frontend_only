(function () { // Start på IIFE
    'use-strict';

    // Denna modul kommer att ha fler beroenden senare (t.ex. State, Helpers)
    // men just nu är funktionerna ganska fristående.

    function calculate_check_status(check, check_results_for_req) {
        if (!check || !check.passCriteria || check.passCriteria.length === 0) {
            return "not_audited"; // Eller "passed" om en tom check anses godkänd
        }
        if (!check_results_for_req || !check_results_for_req.checkResults || !check_results_for_req.checkResults[check.id]) {
            return "not_audited";
        }

        const pass_criteria_statuses_for_check = check_results_for_req.checkResults[check.id].passCriteria; // { pcId: "passed/failed/not_audited" }

        let all_passed = true;
        let any_passed = false;
        let any_failed = false;
        let all_audited = true;

        for (const pc of check.passCriteria) {
            const pc_status = pass_criteria_statuses_for_check[pc.id];
            if (!pc_status || pc_status === "not_audited") {
                all_audited = false;
                // Om logiken är AND, och något inte är granskat, kan inte checken vara passed.
                // Om logiken är OR, och något inte är granskat, kan den fortfarande vara passed om ett annat är passed.
            } else if (pc_status === "passed") {
                any_passed = true;
            } else if (pc_status === "failed") {
                any_failed = true;
                all_passed = false; // Om något är failed, kan inte alla vara passed
            }
        }

        if (!all_audited && !(check.logic === "OR" && any_passed)) {
            // Om inte allt är granskat, OCH (det inte är OR-logik där något redan är godkänt)
            // då är checken fortfarande "not_audited" överlag.
            // Detta är lite komplext. Om ett OR-krav har ett godkänt PC, spelar det ingen roll om andra är ogranskade.
            // Om ett AND-krav har ett ogranskat PC, är hela checken ogranskad.
            if(check.logic === "OR") { // För OR: om något är godkänt = godkänt, om något är underkänt men inget godkänt = underkänt (om allt granskat), annars not_audited
                if(any_passed) return "passed";
                if(any_failed && all_audited) return "failed"; // Allt granskat, inget godkänt, men minst ett underkänt
                return "not_audited";
            } else { // För AND (implicit)
                if(any_failed) return "failed"; // Om något är underkänt, är AND-checken underkänd
                if(!all_audited) return "not_audited"; // Om något är ogranskat och inget underkänt
                return "passed"; // Allt är godkänt
            }
        }


        // Vid denna punkt är alla passCriteria för checken bedömda (inte "not_audited")
        if (check.logic === "OR") {
            return any_passed ? "passed" : "failed"; // Om något är godkänt, är OR-checken godkänd. Annars (om allt är failed) är den failed.
        } else { // Implicit AND
            return all_passed ? "passed" : "failed"; // Om allt är godkänt, är AND-checken godkänd. Annars (om något är failed) är den failed.
        }
    }


    function calculate_requirement_status(requirement, requirement_result_object) {
        if (!requirement || !requirement.checks) {
            // console.warn("calculate_requirement_status: Invalid requirement object provided.", requirement);
            return "not_audited"; // Eller ett felstatus
        }
        // Om requirement_result_object inte finns, eller saknar checkResults, är det inte granskat
        if (!requirement_result_object || !requirement_result_object.checkResults) {
            return "not_audited";
        }

        if (requirement.checks.length === 0) {
            // Om det inte finns några checks, men vi har ett resultObject,
            // då måste statusen ha satts manuellt (t.ex. "Godkänn alla återstående")
            // eller så är det ett fel i regelfilen. I detta fall, lita på den status som finns.
             return requirement_result_object.status || "not_audited";
        }

        let all_checks_passed = true;
        let any_check_failed = false;
        let any_check_not_audited = false;

        for (const check of requirement.checks) {
            // Hämta resultatet för denna specifika check från requirement_result_object.checkResults
            const check_status_obj = requirement_result_object.checkResults[check.id];
            
            let current_check_status;
            if (check_status_obj && check_status_obj.status) {
                current_check_status = check_status_obj.status;
            } else {
                // Om status inte finns direkt på check_status_obj, beräkna den från dess passCriteria
                // Detta är en fallback om checkens övergripande status inte sparats explicit,
                // vilket den borde göra när ett passCriterion ändras.
                current_check_status = calculate_check_status(check, requirement_result_object);
            }

            if (current_check_status === "failed") {
                all_checks_passed = false;
                any_check_failed = true;
                // Om ett check misslyckas, misslyckas hela kravet. Vi kan bryta tidigt.
                // return "failed"; // Eller fortsätt för att se om något är not_audited
            } else if (current_check_status === "not_audited") {
                all_checks_passed = false; // Kan inte vara passed om något är ogranskat
                any_check_not_audited = true;
            }
            // Om "passed", fortsätt loopa
        }

        if (any_check_failed) return "failed";
        if (any_check_not_audited) return "not_audited";
        if (all_checks_passed) return "passed"; // Om vi når hit och inget har misslyckats eller är ogranskat

        return "not_audited"; // Fallback
    }


    function get_relevant_requirements_for_sample(rule_file_content, sample) {
        if (!rule_file_content || !rule_file_content.requirements || !sample || !sample.selectedContentTypes) {
            return [];
        }

        const all_requirements_array = Object.values(rule_file_content.requirements);

        return all_requirements_array.filter(req => {
            if (!req.contentType || !Array.isArray(req.contentType)) { // contentType ska vara en array
                return false;
            }
            if (req.contentType.length === 0) { // Om contentType är tom, är kravet inte relevant för något specifikt innehållstyp-filter
                return false; 
            }
            return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
        });
    }

    const public_api = {
        calculate_requirement_status,
        calculate_check_status,
        get_relevant_requirements_for_sample
    };

    // Expose to global scope
    window.AuditLogic = public_api;

})(); // Slut på IIFE