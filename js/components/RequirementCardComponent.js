// file: js/components/RequirementCardComponent.js

const RequirementCardComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_card_component.css';
    let css_loaded = false; // För att bara ladda CSS en gång

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
        if (!css_loaded && typeof window.Helpers !== 'undefined' && typeof window.Helpers.load_css === 'function') {
            if (!document.querySelector(`link[href="${CSS_PATH}"]`)) {
                try {
                    await window.Helpers.load_css(CSS_PATH);
                    css_loaded = true;
                } catch (error) {
                    console.warn("Failed to load CSS for RequirementCardComponent:", error);
                }
            } else {
                css_loaded = true; // CSS redan i DOM
            }
        } else if (!css_loaded) {
            console.warn("RequirementCardComponent: Helpers.load_css not available or CSS loaded state unknown.");
        }
    }

    function create_card_element(requirement, sample_id, requirement_status, router_cb) {
        load_styles_if_needed(); // Ladda CSS om det behövs

        const t = get_t_internally();
        const create_element_func = (typeof window.Helpers !== 'undefined' && typeof window.Helpers.create_element === 'function')
            ? window.Helpers.create_element
            : (tag, opts) => { // Fallback om Helpers inte finns
                console.error("RequirementCardComponent: Helpers.create_element not available!");
                const el = document.createElement(tag);
                if(opts && opts.text_content) el.textContent = opts.text_content;
                if(opts && opts.class_name) el.className = Array.isArray(opts.class_name) ? opts.class_name.join(' ') : opts.class_name;
                return el;
            };
        const add_protocol_if_missing_func = (typeof window.Helpers !== 'undefined' && typeof window.Helpers.add_protocol_if_missing === 'function')
            ? window.Helpers.add_protocol_if_missing
            : (url) => url; // Fallback

        const card_li = create_element_func('li', { class_name: 'requirement-card' });
        const card_content_wrapper = create_element_func('div', { class_name: 'requirement-card-inner-content' });

        const indicator = create_element_func('span', {
            class_name: ['status-indicator', `status-${requirement_status}`],
            attributes: { 'aria-hidden': 'true' } // Dekorativt
        });
        card_content_wrapper.appendChild(indicator);

        const text_content_div = create_element_func('div', { class_name: 'requirement-card-text-content' });

        const title_h_container = create_element_func('h3', { class_name: 'requirement-card-title-container'});
        const title_button = create_element_func('button', {
            class_name: 'requirement-card-title-button',
            text_content: requirement.title
        });
        title_button.addEventListener('click', () => {
            if (router_cb && typeof router_cb === 'function') {
                // Antag att requirement.key finns och är det ID som ska användas för routing
                router_cb('requirement_audit', { sampleId: sample_id, requirementId: requirement.key }); 
            } else {
                console.warn("RequirementCard: router_cb not provided or not a function for title navigation.");
            }
        });
        title_h_container.appendChild(title_button);
        text_content_div.appendChild(title_h_container);

        if (requirement.standardReference && requirement.standardReference.text) {
            let reference_element;
            if (requirement.standardReference.url) {
                const url_to_use = add_protocol_if_missing_func(requirement.standardReference.url);
                reference_element = create_element_func('a', {
                    class_name: 'requirement-card-reference-link',
                    text_content: requirement.standardReference.text,
                    attributes: {
                        href: url_to_use,
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }
                });
            } else {
                reference_element = create_element_func('span', {
                    class_name: 'requirement-card-reference-text',
                    text_content: requirement.standardReference.text
                });
            }
            const ref_wrapper = create_element_func('div', {class_name: 'requirement-card-reference-wrapper'});
            ref_wrapper.appendChild(reference_element);
            text_content_div.appendChild(ref_wrapper);
        }
        card_content_wrapper.appendChild(text_content_div);
        card_li.appendChild(card_content_wrapper);

        return card_li;
    }

    // Det enda som exponeras är create-funktionen
    const public_api = {
        create: create_card_element
    };

    // Denna globala tilldelning kan tas bort om komponenten endast importeras via ES6-moduler
    // if (typeof window.RequirementCardComponent === 'undefined') {
    //     window.RequirementCardComponent = public_api;
    // } else {
    //     window.RequirementCardComponent = public_api; 
    // }

    return public_api; // Returnera API:et för ES6-exporten
})();

export const RequirementCardComponent = RequirementCardComponent_internal;