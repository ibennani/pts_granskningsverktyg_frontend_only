// js/components/ScoreAnalysisComponent.js

export const ScoreAnalysisComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/score_analysis_component.css';
    let container_ref;
    
    // Dependencies injected via init
    let Helpers, Translation, getState, ScoreCalculator;

    async function init(_container, _dependencies) {
        container_ref = _container;
        
        Helpers = _dependencies.Helpers;
        Translation = _dependencies.Translation;
        getState = _dependencies.getState;
        ScoreCalculator = _dependencies.ScoreCalculator;

        await Helpers.load_css(CSS_PATH);
    }
    
    function _calculateRequirementWeight(requirement) {
        const impact = requirement?.metadata?.impact;
        if (!impact) return 0;

        const isCriticalFactor = impact.isCritical === true ? 1.0 : 0.9;
        const primaryScore = impact.primaryScore || 0;
        const secondaryScore = impact.secondaryScore || 0;
        
        const scoreComponent = Math.sqrt(primaryScore + (0.5 * secondaryScore));
        
        return isCriticalFactor * scoreComponent;
    }
    
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

    function _performAnalysis() {
        return ScoreCalculator.calculateDeficiencyScore(getState());
    }

    function render() {
        if (!container_ref) return;
        container_ref.innerHTML = '';
        
        const t = Translation.t;
        const lang_code = Translation.get_current_language_code();
        const analysis = _performAnalysis();
        
        if (!analysis) {
            return;
        }

        const main_container = Helpers.create_element('div', { class_name: 'score-analysis-content' });

        // --- Total Score Part ---
        const totalScoreContainer = Helpers.create_element('div', { class_name: 'score-analysis-total' });
        totalScoreContainer.appendChild(Helpers.create_element('h3', { 
            class_name: 'score-analysis-total__title',
            text_content: t('deficiency_index', {defaultValue: "Deficiency Index"})
        }));

        let totalScoreStatusClass = 'status--low';
        if (analysis.totalScore >= 50) totalScoreStatusClass = 'status--high';
        else if (analysis.totalScore >= 10) totalScoreStatusClass = 'status--medium';

        const scoreVisualization = Helpers.create_element('div', { class_name: 'score-analysis-total__visualization' });
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svgCircle = document.createElementNS(svgNS, "svg");
        svgCircle.setAttribute("class", `score-analysis-total__score-svg ${totalScoreStatusClass}`);
        svgCircle.setAttribute("viewBox", "0 0 100 100");

        const circleElement = document.createElementNS(svgNS, "circle");
        circleElement.setAttribute("cx", "50");
        circleElement.setAttribute("cy", "50");
        circleElement.setAttribute("r", "46");
        circleElement.setAttribute("class", "score-analysis-total__score-svg-circle");
        
        const textElement = document.createElementNS(svgNS, "text");
        textElement.setAttribute("x", "50");
        textElement.setAttribute("y", "50");
        textElement.setAttribute("dy", ".35em");
        textElement.setAttribute("text-anchor", "middle");
        textElement.setAttribute("class", "score-analysis-total__score-svg-text");
        
        const scoreText = Helpers.format_number_locally(analysis.totalScore, lang_code);
        
        let fontSize = 38;
        if (scoreText.length === 4) {
            fontSize = 32;
        } else if (scoreText.length >= 5) {
            fontSize = 28;
        }
        textElement.setAttribute("style", `font-size: ${fontSize}px;`);
        
        textElement.textContent = scoreText;

        svgCircle.appendChild(circleElement);
        svgCircle.appendChild(textElement);
        
        const scoreContext = Helpers.create_element('div', { class_name: 'score-analysis-total__context' });
        scoreContext.appendChild(Helpers.create_element('p', { class_name: 'score-analysis-total__subtext', text_content: `(${t('lower_is_better', {defaultValue: "Lower is better"})})` }));
        scoreContext.appendChild(Helpers.create_element('p', { class_name: 'score-analysis-total__info', text_content: t('based_on_samples', { count: analysis.sampleCount, defaultValue: `Based on ${analysis.sampleCount} audited samples.`}) }));
        
        scoreVisualization.appendChild(svgCircle);
        scoreVisualization.appendChild(scoreContext);
        totalScoreContainer.appendChild(scoreVisualization);
        main_container.appendChild(totalScoreContainer);

        // --- Score by Principle Part ---
        const principlesContainer = Helpers.create_element('div', { class_name: 'score-analysis-principles' });
        principlesContainer.appendChild(Helpers.create_element('h3', { 
            class_name: 'score-analysis-principles__title',
            text_content: t('score_by_principle', {defaultValue: "Breakdown by Principle"})
        }));

        const dl = Helpers.create_element('dl', { class_name: 'score-analysis-principles__list' });

        for (const principleId in analysis.principles) {
            const data = analysis.principles[principleId];
            
            const row = Helpers.create_element('div', { class_name: 'principle-row' });
            const dt = Helpers.create_element('dt', { class_name: 'principle-row__name', text_content: data.label });
            
            const dd = Helpers.create_element('dd', { class_name: 'principle-row__bar-container' });
            
            let barStatusClass = 'status--low';
            if (data.score > 25) barStatusClass = 'status--high';
            else if (data.score > 5) barStatusClass = 'status--medium';
            
            const formattedScoreForAria = Helpers.format_number_locally(data.score, lang_code);
            
            const bar = Helpers.create_element('div', {
                class_name: ['principle-row__bar', barStatusClass],
                attributes: {
                    style: `width: ${Math.min(data.score, 100)}%;`,
                    role: 'meter',
                    'aria-valuenow': data.score,
                    'aria-valuemin': '0',
                    'aria-valuemax': '100',
                    'aria-label': t('deficiency_index_for_principle', { principle: data.label, score: formattedScoreForAria, defaultValue: `Deficiency index for ${data.label}: ${formattedScoreForAria} out of 100` })
                }
            });

            const valueSpan = Helpers.create_element('span', { class_name: 'principle-row__value', text_content: Helpers.format_number_locally(data.score, lang_code) });
            
            dd.appendChild(bar);
            dd.appendChild(valueSpan);
            row.appendChild(dt);
            row.appendChild(dd);
            dl.appendChild(row);
        }
        
        principlesContainer.appendChild(dl);
        main_container.appendChild(principlesContainer);
        container_ref.appendChild(main_container);
    }

    function destroy() {
        if (container_ref) {
            container_ref.innerHTML = '';
        }
        container_ref = null;
        Helpers = null;
        Translation = null;
        getState = null;
        ScoreCalculator = null;
    }

    return { init, render, destroy };
})();