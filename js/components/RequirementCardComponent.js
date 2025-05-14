export const RequirementCardComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_card_component.css';
    // const { t } = Translation; // Hämta t dynamiskt inuti funktioner
    // const { create_element, escape_html } = Helpers; // Samma här

    // Helper function to safely get the translation function
    function get_t_internally() {
        // Försök hämta från window.Translation om det finns, annars en fallback.
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (ReqCard t not found)";
            };
    }

    async function load_styles_if_needed() {
        if (typeof window.Helpers !== 'undefined' && typeof window.Helpers.load_css === 'function') {
            if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
                try {
                    await window.Helpers.load_css(CSS_PATH);
                } catch (error) {
                    console.warn("Failed to load CSS for RequirementCardComponent:", error);
                }
            }
        } else {
            console.warn("RequirementCardComponent: Helpers.load_css not available.");
        }
    }

    function create_card_element(requirement, sample_id, requirement_status, router_cb) {
        load_styles_if_needed();

        const t = get_t_internally();
        const create_element_func = (typeof window.Helpers !== 'undefined' && typeof window.Helpers.create_element === 'function')
            ? window.Helpers.create_element
            : (tag, opts) => { // Mycket enkel fallback för create_element
                console.error("RequirementCardComponent: Helpers.create_element not available!");
                const el = document.createElement(tag);
                if(opts && opts.text_content) el.textContent = opts.text_content;
                return el;
            };

        const card_li = create_element_func('li', { class_name: 'requirement-card' });

        const status_text_for_aria = t('audit_status_' + requirement_status, {defaultValue: requirement_status});
        const reference_text_for_aria = requirement.standardReference ? requirement.standardReference.text : '';

        const aria_label_text = t('requirement_card_aria_label', {
            title: requirement.title,
            reference: reference_text_for_aria,
            statusText: status_text_for_aria
        });

        const button = create_element_func('button', {
            class_name: 'requirement-card-button',
            attributes: {
                'type': 'button',
                'aria-label': aria_label_text // ANVÄNDER i18n
            }
        });
        button.addEventListener('click', () => {
            if (router_cb && typeof router_cb === 'function') {
                router_cb('requirement_audit', { sampleId: sample_id, requirementId: requirement.id });
            }
        });

        const indicator = create_element_func('span', {
            class_name: ['status-indicator', `status-${requirement_status}`],
            attributes: { 'aria-hidden': 'true' }
        });

        const content_div = create_element_func('div', { class_name: 'requirement-card-content' });
        const title_h = create_element_func('h3', {
            class_name: 'requirement-card-title',
            text_content: requirement.title
        });
        content_div.appendChild(title_h);

        if (requirement.standardReference && requirement.standardReference.text) {
            const ref_p = create_element_func('span', {
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

    // Exponera create-funktionen, och eventuellt en init om den ska ladda CSS mer strukturerat.
    // För nu, med `load_styles_if_needed` anropad i `create_card_element`, är det enklare.
    const public_api = {
        create: create_card_element
    };

    // Gör komponenten tillgänglig globalt om den används så av RequirementListComponent
    if (typeof window.RequirementCardComponent === 'undefined') {
        window.RequirementCardComponent = public_api;
    } else {
        // Om den redan finns, kanske slå samman eller varna, men för enkelhetens skull, ersätt.
        console.warn("RequirementCardComponent already defined on window. Overwriting.");
        window.RequirementCardComponent = public_api;
    }
    
    // console.log("[RequirementCardComponent.js] IIFE executed.");

    return public_api; // Returnera även för eventuell direkt import
})();