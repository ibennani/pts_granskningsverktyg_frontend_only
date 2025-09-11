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
            return [];
        }
        
        return all_reqs.filter(req => {
            if (!req.contentType || req.contentType.length === 0) return true;
            return req.contentType.some(ct => sample.selectedContentTypes.includes(ct));
        });
    }

    /**
     * The main function to calculate the Quality Index based on the 0-100 model.
     * @param {object} auditState - The complete current audit state.
     * @returns {object|null} An object with totalScore and a breakdown by principle, or null if calculation is not possible.
     */
    function calculateQualityScore(auditState) {
        if (!auditState?.ruleFileContent?.requirements || !auditState.ruleFileContent.metadata?.taxonomies || !auditState.samples?.length) {
            return null; // Not enough data to calculate a score.
        }

        const classifications = auditState.ruleFileContent.metadata.taxonomies.find(tax => tax.id === 'wcag22-pour');
        if (!classifications) return null;

        let totalMaxPerformance = 0;
        let totalActualPerformance = 0;
        
        const principleScores = {};
        classifications.concepts.forEach(c => {
            principleScores[c.id] = { max: 0, actual: 0 };
        });

        // 1. Iterate through each sample to calculate contributions.
        auditState.samples.forEach(sample => {
            const relevantReqsForSample = _getRelevantRequirementsForSample(auditState.ruleFileContent, sample);
            
            relevantReqsForSample.forEach(reqDef => {
                const reqKey = reqDef.key || reqDef.id;
                const reqWeight = _calculateRequirementWeight(reqDef);
                
                // Add to the total possible performance score for this audit
                totalMaxPerformance += reqWeight;

                // Add to the possible performance for the requirement's principle
                const principleId = reqDef.classifications?.find(c => c.taxonomyId === 'wcag22-pour')?.conceptId;
                if (principleId && principleScores.hasOwnProperty(principleId)) {
                    principleScores[principleId].max += reqWeight;
                }

                // Now, calculate actual performance based on failures
                const reqResult = sample.requirementResults?.[reqKey];
                let actualDeficiencyPoints = 0;
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
                    actualDeficiencyPoints = failureCountForReq * reqWeight;
                }

                // Clamp the deficiency points to not exceed the requirement's weight
                const adjustedDeficiencyPoints = Math.min(actualDeficiencyPoints, reqWeight);
                
                // Performance score is max score minus deductions for failures
                const performanceScore = reqWeight - adjustedDeficiencyPoints;
                
                totalActualPerformance += performanceScore;
                if (principleId && principleScores.hasOwnProperty(principleId)) {
                    principleScores[principleId].actual += performanceScore;
                }
            });
        });

        // 2. Calculate the final normalized indexes
        const finalPrincipleReport = {};
        classifications.concepts.forEach(concept => {
            const id = concept.id;
            const data = principleScores[id];
            const normalizedIndex = (data.max > 0) ? (data.actual / data.max) * 100 : 100; // Default to 100 if no relevant reqs
            finalPrincipleReport[id] = {
                label: concept.label,
                score: parseFloat(normalizedIndex.toFixed(1))
            };
        });

        const finalTotalScore = (totalMaxPerformance > 0) ? (totalActualPerformance / totalMaxPerformance) * 100 : 100; // Default to 100

        return {
            totalScore: parseFloat(finalTotalScore.toFixed(1)),
            principles: finalPrincipleReport,
            sampleCount: auditState.samples.length
        };
    }
    
    // Expose the public API to the window object
    window.ScoreCalculator = {
        calculateQualityScore
    };

    console.log("[ScoreCalculator.js] ScoreCalculator loaded and exposed on window.");

})(); // IIFE end