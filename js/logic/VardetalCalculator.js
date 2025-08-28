// js/logic/VardetalCalculator.js
(function () { // IIFE start
    'use-strict';

    let precalculated_data_store = {
        weights_map: null,
        rE_total: 0,
        sum_of_all_weights: 0
    };

    const M_SECONDARY_FPS_WEIGHT = 0.5;

    function get_t_func_internal() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;
    }

    function precalculate_rule_data(ruleFileContent) {
        const t = get_t_func_internal();
        console.log("[VardetalCalculator] precalculate_rule_data CALLED.");

        const new_weights_map = {};
        let new_rE_total = 0;
        let new_sum_of_all_weights = 0;

        if (!ruleFileContent || !ruleFileContent.requirements) {
            console.error("[VardetalCalculator] No ruleFileContent or requirements found for precalculation.");
            precalculated_data_store = { weights_map: null, rE_total: 0, sum_of_all_weights: 0 };
            return precalculated_data_store;
        }

        for (const req_id_key in ruleFileContent.requirements) {
            const requirement = ruleFileContent.requirements[req_id_key];

            if (requirement && requirement.metadata && requirement.metadata.impact) {
                let lambda_rho = 1;
                let nu_rho = 0.9;
                
                if (requirement.metadata.level === 'A') {
                    lambda_rho = 1;
                    nu_rho = requirement.metadata.impact.isCritical === true ? 1 : 0.9;
                } else if (requirement.metadata.level === 'AA') {
                    lambda_rho = 0.75;
                    nu_rho = requirement.metadata.impact.isCritical === true ? 1 : 0.9;
                }

                const phi_prime_rho = requirement.metadata.impact.primaryScore || 0;
                const phi_double_prime_rho = requirement.metadata.impact.secondaryScore || 0;

                const omega_rho_sqrt_part = phi_prime_rho + (M_SECONDARY_FPS_WEIGHT * phi_double_prime_rho);
                const omega_rho = lambda_rho * nu_rho * Math.sqrt(Math.max(0, omega_rho_sqrt_part));

                new_weights_map[req_id_key] = omega_rho;
                new_sum_of_all_weights += omega_rho;
                new_rE_total++;
            }
        }

        precalculated_data_store = {
            weights_map: new_weights_map,
            rE_total: new_rE_total,
            sum_of_all_weights: new_sum_of_all_weights
        };

        console.log("[VardetalCalculator] Precalculation complete:", JSON.parse(JSON.stringify(precalculated_data_store)));
        return precalculated_data_store;
    }
    
    function calculate_current_vardetal(current_audit_state, precalculated_rule_data_input) {
        console.log("[VardetalCalculator] calculate_current_vardetal CALLED (Model B Logic with active check fix).");

        const precalc_data_to_use = precalculated_rule_data_input && precalculated_rule_data_input.weights_map ?
                                    precalculated_rule_data_input :
                                    precalculated_data_store;

        if (!current_audit_state || !current_audit_state.ruleFileContent || !precalc_data_to_use.weights_map || precalc_data_to_use.rE_total === 0) {
            if (precalc_data_to_use.rE_total === 0) return null;
        }

        if (!current_audit_state.samples || current_audit_state.samples.length === 0) {
            return 0;
        }

        let sum_fp_x_omega_p = 0;

        for (const requirement_id in precalc_data_to_use.weights_map) {
            const omega_p_weight = precalc_data_to_use.weights_map[requirement_id];
            let fp_failed_criteria_for_requirement = 0;

            current_audit_state.samples.forEach(sample => {
                const result_for_sample = (sample.requirementResults || {})[requirement_id];
                if (result_for_sample && result_for_sample.checkResults) {
                    Object.values(result_for_sample.checkResults).forEach(checkResult => {
                        // --- KORRIGERING HÄR ---
                        // Räkna bara underkända kriterier om den överordnade kontrollpunkten är aktiv ("Stämmer").
                        if (checkResult.overallStatus === 'passed' && checkResult.passCriteria) {
                            Object.values(checkResult.passCriteria).forEach(pcResult => {
                                if (pcResult && pcResult.status === 'failed') {
                                    fp_failed_criteria_for_requirement++;
                                }
                            });
                        }
                    });
                }
            });
            
            if (fp_failed_criteria_for_requirement > 0) {
                sum_fp_x_omega_p += fp_failed_criteria_for_requirement * omega_p_weight;
            }
        }

        const C_DELTA_MAX_POINTS = 500;
        const R_T_TOTAL_REQUIREMENTS_IN_MODEL = 50;

        const numerator = C_DELTA_MAX_POINTS * R_T_TOTAL_REQUIREMENTS_IN_MODEL * sum_fp_x_omega_p;
        const denominator = precalc_data_to_use.rE_total * precalc_data_to_use.sum_of_all_weights;

        if (denominator === 0) {
            return 0;
        }

        const vardetal = numerator / denominator;
        const rounded_vardetal = Math.round(vardetal);
        
        console.log(`[VardetalCalculator] Calculation (Model B): Sum(fp*ω(ρ)):${sum_fp_x_omega_p}, rE:${precalc_data_to_use.rE_total}, Sum(ω(ρ)):${precalc_data_to_use.sum_of_all_weights}, Num:${numerator}, Den:${denominator}, Raw:${vardetal}, Rounded:${rounded_vardetal}`);

        return Math.min(C_DELTA_MAX_POINTS, Math.max(0, rounded_vardetal));
    }
    
    function get_precalculated_data_store() {
        return JSON.parse(JSON.stringify(precalculated_data_store));
    }

    window.VardetalCalculator = {
        precalculate_rule_data,
        calculate_current_vardetal,
        get_precalculated_data_store
    };

    console.log("[VardetalCalculator.js] VardetalCalculator loaded and exposed on window.");

})(); // IIFE end