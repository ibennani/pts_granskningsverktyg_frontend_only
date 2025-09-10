// js/logic/ScoreCalculator.js

(function () { // IIFE start
    'use-strict';

    /**
     * Calculates the weight (omega, ωp) for a single requirement based on its impact.
     * This is a helper function used during score calculation.
     * @param {object} requirement - The requirement object from the rule file.
     * @returns {number} The calculated weight.
     */
    function _calculateRequirementWeight(requirement) {
        const impact = requirement?.metadata?.impact;
        if (!impact) return 0;

        const isCriticalFactor = impact.isCritical === true ? 1.0 : 0.9;
        const primaryScore = impact.primaryScore || 0;
        const secondaryScore = impact.secondaryScore || 0;
        
        const scoreComponent = Math.sqrt(primaryScore + (0.5 * secondaryScore));
        
        return isCriticalFactor * scoreComponent;
    }
    
    /**
     * Gets all relevant requirements for a given sample based on its content types.
     * @param {object} ruleFileContent - The rule file content from the state.
     * @param {object} sample - The sample object.
     * @returns {Array<object>} An array of relevant requirement objects.
     */
    function _getRelevantRequirementsForSample(ruleFileContent, sample) {
        if (!ruleFileContent?.requirements || !sample) return [];
        const all_reqs = Object.values(ruleFileContent.requirements);

        if (!sample.selectedContentTypes?.length) {
            // If a sample has no content types, it is assumed no requirements are relevant.
            // This prevents division by zero if a sample is added but not configured.
            return [];
        }
        
        return all_reqs.filter(req => {
            if (!req.contentType || req.contentType.length === 0) return true; // Relevant for all if contentType is empty
            return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
        });
    }

    /**
     * The main function to calculate the deficiency score based on the new 0-100 model.
     * @param {object} auditState - The complete current audit state.
     * @returns {object|null} An object with totalScore and a breakdown by principle, or null if calculation is not possible.
     */
    function calculateDeficiencyScore(auditState) {
        if (!auditState?.ruleFileContent?.requirements || !auditState.ruleFileContent.metadata?.taxonomies || !auditState.samples?.length) {
            return null; // Not enough data to calculate a score.
        }

        const requirements = auditState.ruleFileContent.requirements;
        const classifications = auditState.ruleFileContent.metadata.taxonomies.find(tax => tax.id === 'wcag22-pour');
        if (!classifications) return null;

        let totalActualScore = 0;
        let totalPossibleScore = 0;
        
        const principleScores = {};
        classifications.concepts.forEach(c => {
            principleScores[c.id] = { actual: 0, possible: 0 };
        });

        // 1. Iterate through each sample to calculate its contribution to the total scores.
        auditState.samples.forEach(sample => {
            const relevantReqsForSample = _getRelevantRequirementsForSample(auditState.ruleFileContent, sample);
            
            relevantReqsForSample.forEach(reqDef => {
                const reqKey = reqDef.key || reqDef.id;
                const weight = _calculateRequirementWeight(reqDef);
                
                // Add to the total possible score for this audit
                totalPossibleScore += weight;

                // Add to the possible score for the requirement's principle
                const principleId = reqDef.classifications?.find(c => c.taxonomyId === 'wcag22-pour')?.conceptId;
                if (principleId && principleScores.hasOwnProperty(principleId)) {
                    principleScores[principleId].possible += weight;
                }

                // Now, check for actual failures in this sample for this requirement
                const reqResult = sample.requirementResults?.[reqKey];
                if (reqResult?.checkResults) {
                    let failureCountForReq = 0;
                    Object.values(reqResult.checkResults).forEach(checkResult => {
                        if (checkResult.overallStatus === 'passed' && checkResult.passCriteria) {
                            Object.values(checkResult.passCriteria).forEach(pcResult => {
                                if (pcResult?.status === 'failed') {
                                    failureCountForReq++;
                                }
                            });
                        }
                    });

                    if (failureCountForReq > 0) {
                        const actualFailureScore = failureCountForReq * weight;
                        totalActualScore += actualFailureScore;
                        if (principleId && principleScores.hasOwnProperty(principleId)) {
                            principleScores[principleId].actual += actualFailureScore;
                        }
                    }
                }
            });
        });

        // 2. Calculate the final normalized indexes
        const finalPrincipleReport = {};
        classifications.concepts.forEach(concept => {
            const id = concept.id;
            const data = principleScores[id];
            const normalizedIndex = (data.possible > 0) ? (data.actual / data.possible) * 100 : 0;
            finalPrincipleReport[id] = {
                label: concept.label,
                score: parseFloat(normalizedIndex.toFixed(1))
            };
        });

        const finalTotalScore = (totalPossibleScore > 0) ? (totalActualScore / totalPossibleScore) * 100 : 0;

        return {
            totalScore: parseFloat(finalTotalScore.toFixed(1)),
            principles: finalPrincipleReport,
            sampleCount: auditState.samples.length
        };
    }
    
    // Expose the public API to the window object
    window.ScoreCalculator = {
        calculateDeficiencyScore
    };

    console.log("[ScoreCalculator.js] ScoreCalculator loaded and exposed on window.");

})(); // IIFE end