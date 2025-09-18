// js/components/ViewRulefileRequirementComponent.js

export const ViewRulefileRequirementComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_audit_component.css'; // Återanvänder CSS för liknande utseende
    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css, Helpers_add_protocol_if_missing;
    let NotificationComponent_get_global_message_element_reference;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_load_css = window.Helpers.load_css;
        Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
    }

    async function init(_app_container, _router_cb, _params, _getState) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;
        local_getState = _getState;
        
        await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
    }

    function _render_markdown_section(title_key, content_data) {
        const t = Translation_t;
        
        const processed_content = Array.isArray(content_data) ? content_data.join('\n\n') : content_data;

        if (!processed_content || (typeof processed_content === 'string' && !processed_content.trim())) {
            return null;
        }
        
        const section_div = Helpers_create_element('div', { class_name: 'audit-section' });
        section_div.appendChild(Helpers_create_element('h2', { text_content: t(title_key) }));
        
        const content_element = Helpers_create_element('div', { class_name: ['audit-section-content', 'markdown-content'] });
        
        if (typeof marked !== 'undefined' && window.Helpers.escape_html) {
            const renderer = new marked.Renderer();
            renderer.link = (href, title, text) => `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            renderer.html = (html) => window.Helpers.escape_html(html);
            content_element.innerHTML = marked.parse(String(processed_content), { renderer, breaks: true, gfm: true });
        } else {
            content_element.textContent = String(processed_content);
        }
        
        section_div.appendChild(content_element);
        return section_div;
    }

    // --- KORRIGERING: Denna yttre funktion saknades ---
    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        
        const requirement_id = params_ref?.id;
        const current_state = local_getState();
        const requirement = current_state?.ruleFileContent?.requirements[requirement_id];

        if (!requirement) {
            plate_element.appendChild(Helpers_create_element('h1', { text_content: t('error_internal') }));
            plate_element.appendChild(Helpers_create_element('p', { text_content: t('error_loading_sample_or_requirement_data') }));
            app_container_ref.appendChild(plate_element);
            return;
        }

        const header_div = Helpers_create_element('div', { class_name: 'requirement-audit-header' });
        const title_wrapper = Helpers_create_element('div', { class_name: 'requirement-audit-header-title-wrapper' });
        title_wrapper.appendChild(Helpers_create_element('h1', { text_content: requirement.title }));
        
        const edit_button = Helpers_create_element('button', {
            class_name: ['button', 'button-secondary', 'button-small', 'edit-button'],
            attributes: { 'aria-label': t('edit_this_requirement_aria', { requirementTitle: requirement.title }) },
            html_content: `<span>${t('edit_prefix')}</span>` + Helpers_get_icon_svg('edit', [], 16)
        });
        edit_button.addEventListener('click', () => {
            router_ref('rulefile_edit_requirement', { id: requirement_id });
        });
        title_wrapper.appendChild(edit_button);

        header_div.appendChild(title_wrapper);

        if (requirement.standardReference) {
            const p = Helpers_create_element('p', { class_name: 'standard-reference' });
            p.appendChild(Helpers_create_element('strong', { text_content: `${t('requirement_standard_reference_label')} ` }));
            if (requirement.standardReference.url) {
                p.appendChild(Helpers_create_element('a', {
                    text_content: requirement.standardReference.text,
                    attributes: { href: Helpers_add_protocol_if_missing(requirement.standardReference.url), target: '_blank' }
                }));
            } else {
                p.appendChild(document.createTextNode(requirement.standardReference.text));
            }
            header_div.appendChild(p);
        }
        plate_element.appendChild(header_div);

        const top_nav_bar = Helpers_create_element('div', { class_name: 'audit-navigation-buttons top-nav' });
        const back_button_top = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: Helpers_get_icon_svg('arrow_back') + `<span>${t('back_to_requirement_list')}</span>`
        });
        back_button_top.addEventListener('click', () => router_ref('rulefile_requirements'));
        top_nav_bar.appendChild(back_button_top);
        plate_element.appendChild(top_nav_bar);

        const sections = [
            _render_markdown_section('requirement_expected_observation', requirement.expectedObservation),
            _render_markdown_section('requirement_instructions', requirement.instructions),
            _render_markdown_section('requirement_exceptions', requirement.exceptions),
            _render_markdown_section('requirement_common_errors', requirement.commonErrors),
            _render_markdown_section('requirement_tips', requirement.tips)
        ];
        sections.filter(Boolean).forEach(sec => plate_element.appendChild(sec));
        
        const checks_container = Helpers_create_element('div', { class_name: 'checks-container audit-section' });
        checks_container.appendChild(Helpers_create_element('h2', { text_content: t('checks_title') }));

        (requirement.checks || []).forEach(check => {
            const check_wrapper = Helpers_create_element('div', {
                class_name: 'check-item status-not_audited',
                style: 'border-left-width: 3px;'
            });
            check_wrapper.appendChild(Helpers_create_element('h3', { class_name: 'check-condition-title', text_content: check.condition }));
            
            if (check.passCriteria && check.passCriteria.length > 0) {
                const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });
                check.passCriteria.forEach(pc => {
                    const pc_item = Helpers_create_element('li', { class_name: 'pass-criterion-item' });
                    pc_item.appendChild(Helpers_create_element('div', { class_name: 'pass-criterion-requirement', text_content: pc.requirement }));
                    pc_list.appendChild(pc_item);
                });
                check_wrapper.appendChild(pc_list);
            }
            checks_container.appendChild(check_wrapper);
        });
        plate_element.appendChild(checks_container);
        
        const bottom_nav_bar = Helpers_create_element('div', { class_name: 'audit-navigation-buttons bottom-nav' });
        const back_button_bottom = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: Helpers_get_icon_svg('arrow_back') + `<span>${t('back_to_requirement_list')}</span>`
        });
        back_button_bottom.addEventListener('click', () => router_ref('rulefile_requirements'));
        bottom_nav_bar.appendChild(back_button_bottom);
        plate_element.appendChild(bottom_nav_bar);

        app_container_ref.appendChild(plate_element);
    }
    // --- SLUT PÅ KORRIGERING ---

    function destroy() {
        app_container_ref.innerHTML = '';
    }

    return { init, render, destroy };
})();