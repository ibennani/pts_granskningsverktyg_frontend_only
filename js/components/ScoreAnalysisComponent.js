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
    
    function _performAnalysis() {
        // Function name is kept for compatibility, but it now returns a deficiency index
        return ScoreCalculator.calculateQualityScore(getState());
    }

    function _createGaugeSVG(value, lang_code) {
        const minAngle = -135;
        const maxAngle = 135;
        // Invert the angle calculation for deficiency index
        const angle = minAngle + (value / 100) * (maxAngle - minAngle);

        const formattedValue = Helpers.format_number_locally(value, lang_code);

        const gradientId = `gaugeGradient-${Helpers.generate_uuid_v4()}`;

        const describeArc = (x, y, radius, startAngle, endAngle) => {
            const start = polarToCartesian(x, y, radius, endAngle);
            const end = polarToCartesian(x, y, radius, startAngle);
            const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
            return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
        };

        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
            const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        };

        // Create gauge segments with different colors and straight boundaries
        const createGaugeSegment = (startAngle, endAngle, color) => {
            return `<path d="${describeArc(50, 50, 40, startAngle, endAngle)}" stroke="${color}" stroke-width="10" stroke-linecap="butt" fill="none" />`;
        };

        // Calculate angles for each percentage range
        const totalAngle = maxAngle - minAngle; // 270 degrees
        const greenEndAngle = minAngle + (15 / 100) * totalAngle; // 15% of 270° = 40.5°
        const yellowEndAngle = minAngle + (30 / 100) * totalAngle; // 30% of 270° = 81°
        const orangeEndAngle = minAngle + (45 / 100) * totalAngle; // 45% of 270° = 121.5°

        const svgContent = `
            <svg viewBox="0 0 100 85" class="score-gauge-svg">
                <!-- Gauge track (background) -->
                <path class="score-gauge__track" d="${describeArc(50, 50, 40, minAngle, maxAngle)}" />
                
                <!-- Gauge segments with straight boundaries -->
                ${createGaugeSegment(minAngle, greenEndAngle, 'var(--gradient-success-color)')}
                ${createGaugeSegment(greenEndAngle, yellowEndAngle, 'var(--gradient-warning-color)')}
                ${createGaugeSegment(yellowEndAngle, orangeEndAngle, 'var(--gradient-orange-color)')}
                ${createGaugeSegment(orangeEndAngle, maxAngle, 'var(--gradient-danger-color)')}
                
                <!-- Value text -->
                <text x="50" y="55" class="score-gauge__value">${formattedValue}</text>

                <!-- Marker -->
                <g class="score-gauge__marker-group" transform="rotate(${angle} 50 50)">
                    <circle class="score-gauge__marker" cx="50" cy="10" r="4" />
                </g>
            </svg>
        `;

        return svgContent;
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

        const section = Helpers.create_element('section', {
            class_name: ['section', 'score-analysis-section']
        });
        const hero_section = Helpers.create_element('div', { class_name: 'score-analysis-hero' });
        hero_section.appendChild(Helpers.create_element('h2', {
            class_name: 'score-analysis-section__main-title',
            text_content: t('deficiency_index_title', { defaultValue: "Deficiency Index" })
        }));
        hero_section.appendChild(Helpers.create_element('p', {
            class_name: 'view-intro-text',
            text_content: t('deficiency_index_summary_intro', { defaultValue: "A lower score indicates fewer deficiencies." })
        }));
        section.appendChild(hero_section);
        section.appendChild(Helpers.create_element('div', { class_name: 'score-analysis-section__divider' }));

        const totalScoreContainer = Helpers.create_element('div', { class_name: 'score-analysis-total' });
        totalScoreContainer.appendChild(Helpers.create_element('p', {
            class_name: 'score-analysis-section__group-title',
            text_content: t('deficiency_index_summary', { defaultValue: "Current score" })
        }));

        const scoreVisualization = Helpers.create_element('div', { class_name: 'score-analysis-total__visualization' });
        const gaugeWrapper = Helpers.create_element('div', { class_name: 'score-gauge-wrapper' });
        gaugeWrapper.innerHTML = _createGaugeSVG(analysis.totalScore, lang_code);

        const scoreContext = Helpers.create_element('div', { class_name: 'score-analysis-total__context' });
        scoreContext.appendChild(Helpers.create_element('p', {
            class_name: 'score-analysis-total__subtext',
            text_content: `(${t('lower_is_better', { defaultValue: "Lower is better" })})`
        }));
        scoreContext.appendChild(Helpers.create_element('p', {
            class_name: 'score-analysis-total__info',
            text_content: t('based_on_samples', {
                count: analysis.sampleCount,
                defaultValue: `Based on ${analysis.sampleCount} audited samples.`
            })
        }));

        scoreVisualization.appendChild(gaugeWrapper);
        scoreVisualization.appendChild(scoreContext);
        totalScoreContainer.appendChild(scoreVisualization);
        section.appendChild(totalScoreContainer);

        const principlesContainer = Helpers.create_element('div', { class_name: 'score-analysis-principles' });
        principlesContainer.appendChild(Helpers.create_element('p', {
            class_name: 'score-analysis-section__group-title',
            text_content: t('score_by_principle_deficiency', { defaultValue: "Breakdown by Principle" })
        }));
        const dl = Helpers.create_element('dl', { class_name: 'score-analysis-principles__list' });

        for (const principleId in analysis.principles) {
            const data = analysis.principles[principleId];
            
            const row = Helpers.create_element('div', { class_name: ['principle-row', 'row'] });
            const dt = Helpers.create_element('dt', { class_name: 'principle-row__name', text_content: data.label });
            
            const dd = Helpers.create_element('dd', { class_name: 'principle-row__bar-container' });
            
            const formattedScoreForAria = Helpers.format_number_locally(data.score, lang_code);
            
            const bar = Helpers.create_element('div', {
                class_name: 'principle-row__bar',
                attributes: {
                    style: `width: ${Math.min(data.score, 100)}%;`,
                    role: 'meter',
                    'aria-valuenow': data.score,
                    'aria-valuemin': '0',
                    'aria-valuemax': '100',
                    'aria-label': t('deficiency_index_for_principle', { principle: data.label, score: formattedScoreForAria, defaultValue: `Deficiency index for ${data.label}: ${formattedScoreForAria} out of 100` })
                }
            });
            bar.style.setProperty('--score-percent', data.score);

            const valueSpan = Helpers.create_element('span', { class_name: 'principle-row__value', text_content: Helpers.format_number_locally(data.score, lang_code) });
            
            dd.appendChild(bar);
            dd.appendChild(valueSpan);
            row.appendChild(dt);
            row.appendChild(dd);
            dl.appendChild(row);
        }
        
        principlesContainer.appendChild(dl);
        section.appendChild(principlesContainer);
        container_ref.appendChild(section);
    }

    function destroy() {
        if (container_ref) {
            // Clear all child elements to prevent memory leaks
            while (container_ref.firstChild) {
                container_ref.removeChild(container_ref.firstChild);
            }
            container_ref.innerHTML = '';
        }
        
        // Nullify all references to help with garbage collection
        container_ref = null;
        Helpers = null;
        Translation = null;
        getState = null;
        ScoreCalculator = null;
    }

    return { init, render, destroy };
})();