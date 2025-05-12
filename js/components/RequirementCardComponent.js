export const RequirementCardComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_card_component.css';
    const { t } = Translation;
    const { create_element, escape_html } = Helpers;

    // Denna komponent är enklare och behöver kanske inte full init/destroy om den alltid
    // renderas av en förälder som hanterar DOM-rensning.
    // För nu gör vi den enkel.

    async function load_styles_if_needed() { // Ladda bara CSS en gång
        if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
            try {
                await Helpers.load_css(CSS_PATH);
            } catch (error) {
                console.warn("Failed to load CSS for RequirementCardComponent:", error);
            }
        }
    }
    
    // Tar emot requirement-objekt, sampleId, och en router-callback
    function create_card_element(requirement, sample_id, requirement_status, router_cb) {
        load_styles_if_needed(); // Ladda CSS vid första anrop

        const card_li = create_element('li', { class_name: 'requirement-card' });
        
        const button = create_element('button', {
            class_name: 'requirement-card-button',
            attributes: { 
                'type': 'button',
                'aria-label': `${requirement.title} (${requirement.standardReference ? requirement.standardReference.text : ''}), Status: ${t('audit_status_' + requirement_status)}`
            }
        });
        button.addEventListener('click', () => {
            if (router_cb) {
                router_cb('requirement_audit', { sampleId: sample_id, requirementId: requirement.id });
            }
        });

        const indicator = create_element('span', { 
            class_name: ['status-indicator', `status-${requirement_status}`],
            attributes: { 'aria-hidden': 'true' } // Visuell indikator
        });

        const content_div = create_element('div', { class_name: 'requirement-card-content' });
        const title_h = create_element('h3', { 
            class_name: 'requirement-card-title', 
            text_content: requirement.title 
        });
        content_div.appendChild(title_h);

        if (requirement.standardReference && requirement.standardReference.text) {
            const ref_p = create_element('span', { 
                class_name: 'requirement-card-reference',
                text_content: requirement.standardReference.text
            });
            content_div.appendChild(ref_p);
        }
        
        button.appendChild(indicator);
        button.appendChild(content_div);
        card_li.appendChild(button);

        return card_li;
    }

    return {
        create: create_card_element // Exponera bara create-funktionen
    };
})();