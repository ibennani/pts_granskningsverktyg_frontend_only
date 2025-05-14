// file: js/components/RequirementCardComponent.js
export const RequirementCardComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_card_component.css';

    function get_t_internally() {
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
            : (tag, opts) => {
                console.error("RequirementCardComponent: Helpers.create_element not available!");
                const el = document.createElement(tag);
                if(opts && opts.text_content) el.textContent = opts.text_content;
                if(opts && opts.class_name) el.className = Array.isArray(opts.class_name) ? opts.class_name.join(' ') : opts.class_name;
                return el;
            };
        const escape_html_func = (typeof window.Helpers !== 'undefined' && typeof window.Helpers.escape_html === 'function')
            ? window.Helpers.escape_html
            : (str) => str;

        const card_li = create_element_func('li', { class_name: 'requirement-card' });

        // Wrapper för innehållet, ersätter den tidigare .requirement-card-button som täckte allt
        const card_content_wrapper = create_element_func('div', { class_name: 'requirement-card-inner-content' });


        const indicator = create_element_func('span', {
            class_name: ['status-indicator', `status-${requirement_status}`],
            attributes: { 'aria-hidden': 'true' }
        });
        card_content_wrapper.appendChild(indicator);

        const text_content_div = create_element_func('div', { class_name: 'requirement-card-text-content' });

        // Titel blir en knapp som navigerar till granskningsvyn
        const title_button = create_element_func('button', {
            class_name: 'requirement-card-title-button', // Ny klass för styling
            text_content: requirement.title
        });
        title_button.addEventListener('click', () => {
            if (router_cb && typeof router_cb === 'function') {
                router_cb('requirement_audit', { sampleId: sample_id, requirementId: requirement.id });
            } else {
                console.warn("RequirementCard: router_cb not provided or not a function for title navigation.");
            }
        });
        const title_h_container = create_element_func('h3', { class_name: 'requirement-card-title-container'}); // Behåll H3 för semantik
        title_h_container.appendChild(title_button);
        text_content_div.appendChild(title_h_container);


        if (requirement.standardReference && requirement.standardReference.text) {
            let reference_element;
            if (requirement.standardReference.url) {
                reference_element = create_element_func('a', {
                    class_name: 'requirement-card-reference-link', // Ny klass för styling
                    text_content: requirement.standardReference.text,
                    href: requirement.standardReference.url,
                    attributes: { target: '_blank', rel: 'noopener noreferrer' }
                });
            } else {
                reference_element = create_element_func('span', {
                    class_name: 'requirement-card-reference-text', // Ny klass för styling
                    text_content: requirement.standardReference.text
                });
            }
            const ref_wrapper = create_element_func('div', {class_name: 'requirement-card-reference-wrapper'}); // Wrapper för styling
            ref_wrapper.appendChild(reference_element);
            text_content_div.appendChild(ref_wrapper);
        }
        card_content_wrapper.appendChild(text_content_div);
        card_li.appendChild(card_content_wrapper);

        return card_li;
    }

    const public_api = {
        create: create_card_element
    };

    if (typeof window.RequirementCardComponent === 'undefined') {
        window.RequirementCardComponent = public_api;
    } else {
        console.warn("RequirementCardComponent already defined on window. Overwriting.");
        window.RequirementCardComponent = public_api;
    }
    
    return public_api;
})();