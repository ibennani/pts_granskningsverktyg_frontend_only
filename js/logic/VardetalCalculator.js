// js/logic/VardetalCalculator.js
(function () { // IIFE start
    'use-strict';

    // Modul-lokal lagring för förberäknad data från regelfilen
    let precalculated_data_store = {
        weights_map: null,        // { "kravId1": vikt1, "kravId2": vikt2, ... }
        rE_total: 0,              // Antal relevanta WCAG A/AA-krav + EN-krav
        sum_of_all_weights: 0     // SUMMA(ω(ρ))
    };

    const WCAG_REQUIREMENT_PREFIX = "9."; // Antagande för att identifiera WCAG-krav
    const M_SECONDARY_FPS_WEIGHT = 0.5;

    function get_t_func_internal() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (VardetalCalc t not found)";
            };
    }

    /**
     * Förberäknar vikter och summor baserat på regelfilen.
     * Resultatet sparas internt i modulen och returneras även.
     * @param {object} ruleFileContent - Innehållet från den uppladdade regelfilen.
     * @returns {object} Ett objekt med weights_map, rE_total, sum_of_all_weights.
     */
    function precalculate_rule_data(ruleFileContent) {
        const t = get_t_func_internal();
        console.log("[VardetalCalculator] precalculate_rule_data CALLED.");

        const new_weights_map = {};
        let new_rE_total = 0;
        let new_sum_of_all_weights = 0;

        if (!ruleFileContent || !ruleFileContent.requirements) {
            console.error("[VardetalCalculator] No ruleFileContent or requirements found for precalculation.");
            precalculated_data_store = { weights_map: null, rE_total: 0, sum_of_all_weights: 0 };
            return precalculated_data_store; // Returnera tomt objekt
        }

        for (const req_id_key in ruleFileContent.requirements) {
            const requirement = ruleFileContent.requirements[req_id_key];

            if (requirement && requirement.metadata && requirement.metadata.impact) {
                let lambda_rho;
                let nu_rho;

                if (requirement.metadata.level === 'A') {
                    lambda_rho = 1;
                    nu_rho = requirement.metadata.impact.isCritical === true ? 1 : 0.9;
                } else if (requirement.metadata.level === 'AA') {
                    lambda_rho = 0.75;
                    nu_rho = requirement.metadata.impact.isCritical === true ? 1 : 0.9;
                } else if (requirement.metadata.level) { // Okänd men existerande level
                    console.warn(`[VardetalCalculator] Unknown WCAG level "${requirement.metadata.level}" for ${req_id_key}. Defaulting lambda_rho to 1, nu_rho to 0.9.`);
                    lambda_rho = 1;
                    nu_rho = 0.9;
                }
                else { // metadata.level saknas (t.ex. EN-specifikt krav)
                    lambda_rho = 1;    // Enligt vår överenskommelse
                    nu_rho = 0.9;      // Enligt vår överenskommelse
                    // Alternativt: nu_rho = requirement.metadata.impact.isCritical === true ? 1 : 0.9; (om isCritical fortfarande ska styra)
                }

                const phi_prime_rho = requirement.metadata.impact.primaryScore || 0;
                const phi_double_prime_rho = requirement.metadata.impact.secondaryScore || 0;

                const omega_rho_sqrt_part = phi_prime_rho + (M_SECONDARY_FPS_WEIGHT * phi_double_prime_rho);
                const omega_rho = lambda_rho * nu_rho * Math.sqrt(Math.max(0, omega_rho_sqrt_part));

                new_weights_map[req_id_key] = omega_rho;
                new_sum_of_all_weights += omega_rho;
                new_rE_total++; // Alla krav som har impact-data och kan viktas räknas med i rE
            }
        }

        precalculated_data_store = {
            weights_map: new_weights_map,
            rE_total: new_rE_total,
            sum_of_all_weights: new_sum_of_all_weights
        };

        console.log("[VardetalCalculator] Precalculation complete:", JSON.parse(JSON.stringify(precalculated_data_store)));
        return precalculated_data_store; // Returnera den beräknade datan
    }

    function calculate_current_vardetal(current_audit_state, precalculated_rule_data_input) {
        console.log("[VardetalCalculator] calculate_current_vardetal CALLED.");

        // Använd den medskickade precalculated_rule_data_input om den finns, annars fallback till modulens lagring
        const precalc_data_to_use = precalculated_rule_data_input && precalculated_rule_data_input.weights_map ?
                                    precalculated_rule_data_input :
                                    precalculated_data_store;

        if (!current_audit_state || !current_audit_state.ruleFileContent || !precalc_data_to_use.weights_map || precalc_data_to_use.rE_total === 0) {
            console.warn("[VardetalCalculator] Cannot calculate vardetal: Missing audit state, precalculated data, rE_total is 0, or weights_map missing.");
            // Om sum_of_all_weights är 0 (och rE_total > 0), kommer division med noll hanteras nedan, vilket resulterar i 0.
            // Om rE_total är 0, är det meningslöst.
            if (precalc_data_to_use.rE_total === 0) return null;
        }
        
        if (!window.AuditLogic || typeof window.AuditLogic.calculate_requirement_status !== 'function') {
            console.error("[VardetalCalculator] AuditLogic.calculate_requirement_status is not available!");
            return null;
        }


        if (!current_audit_state.samples || current_audit_state.samples.length === 0) {
            console.log("[VardetalCalculator] No samples in audit. Vardetal is 0.");
            return 0;
        }

        const sigma_number_of_samples = current_audit_state.samples.length;
        let sum_fp_x_omega_p = 0;

        for (const requirement_id in precalc_data_to_use.weights_map) {
            const omega_p_weight = precalc_data_to_use.weights_map[requirement_id];
            let fp_failed_samples_for_requirement = 0;

            const requirement_definition = current_audit_state.ruleFileContent.requirements[requirement_id];
            if (!requirement_definition) {
                console.warn(`[VardetalCalculator] Requirement definition not found for ID: ${requirement_id} during vardetal calculation. Skipping.`);
                continue;
            }

            current_audit_state.samples.forEach(sample => {
                const result_for_sample = (sample.requirementResults || {})[requirement_id];
                const status = window.AuditLogic.calculate_requirement_status(requirement_definition, result_for_sample);
                if (status === 'failed') {
                    fp_failed_samples_for_requirement++;
                }
            });
            sum_fp_x_omega_p += fp_failed_samples_for_requirement * omega_p_weight;
        }

        const C_DELTA_MAX_POINTS = 500;
        const R_T_TOTAL_REQUIREMENTS_IN_MODEL = 50;

        const numerator = C_DELTA_MAX_POINTS * R_T_TOTAL_REQUIREMENTS_IN_MODEL * sum_fp_x_omega_p;
        const denominator = precalc_data_to_use.rE_total * sigma_number_of_samples * precalc_data_to_use.sum_of_all_weights;

        if (denominator === 0) {
            console.log("[VardetalCalculator] Denominator is zero, returning 0 for vardetal to avoid division by zero.");
            return 0;
        }

        const vardetal = numerator / denominator;
        const rounded_vardetal = Math.round(vardetal);
        
        console.log(`[VardetalCalculator] Calculation details: Sum(fp*ω(ρ)):${sum_fp_x_omega_p}, rE:${precalc_data_to_use.rE_total}, σ:${sigma_number_of_samples}, Sum(ω(ρ)):${precalc_data_to_use.sum_of_all_weights}, Num:${numerator}, Den:${denominator}, Raw:${vardetal}, Rounded:${rounded_vardetal}`);

        return Math.min(C_DELTA_MAX_POINTS, Math.max(0, rounded_vardetal));
    }
    
    function get_precalculated_data_store() {
        // Returnera en kopia för att undvika extern modifiering
        return JSON.parse(JSON.stringify(precalculated_data_store));
    }

    window.VardetalCalculator = {
        precalculate_rule_data,
        calculate_current_vardetal,
        get_precalculated_data_store
    };

    console.log("[VardetalCalculator.js] VardetalCalculator loaded and exposed on window.");

})(); // IIFE end