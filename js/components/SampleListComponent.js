// js/components/SampleListComponent.js

export const SampleListComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_list_component.css';
    let list_container_ref;
    let on_edit_callback; 
    let on_delete_callback;
    let router_ref_from_parent;

    let local_getState;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_add_protocol_if_missing, Helpers_load_css;
    let AuditLogic_get_relevant_requirements_for_sample, AuditLogic_find_first_incomplete_requirement_key_for_sample, AuditLogic_calculate_requirement_status;
    
    let ul_element_for_delegation = null; 

    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (window.Translation?.t) ? window.Translation.t : (key, replacements) => `**${key}**`;
    }

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_escape_html = window.Helpers.escape_html;
        Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
        Helpers_load_css = window.Helpers.load_css;
        AuditLogic_get_relevant_requirements_for_sample = window.AuditLogic.get_relevant_requirements_for_sample;
        AuditLogic_find_first_incomplete_requirement_key_for_sample = window.AuditLogic.find_first_incomplete_requirement_key_for_sample;
        AuditLogic_calculate_requirement_status = window.AuditLogic.calculate_requirement_status;
    }

    function handle_list_click(event) {
        const target = event.target;
        const current_global_state = local_getState ? local_getState() : null; 
        if (!current_global_state) return;

        const action_button = target.closest('button[data-action]');
        if (!action_button) return; 

        const sample_list_item_element = action_button.closest('.sample-list-item[data-sample-id]');
        if (!sample_list_item_element) return; 

        const sample_id = sample_list_item_element.dataset.sampleId;
        const action = action_button.dataset.action;
        const sample = current_global_state.samples.find(s => s.id === sample_id);

        if (!sample) return;

        switch (action) {
            case 'edit-sample':
                if (typeof on_edit_callback === 'function') on_edit_callback(sample_id);
                break;
            case 'delete-sample':
                if (typeof on_delete_callback === 'function') on_delete_callback(sample_id);
                break;
            case 'view-requirements':
                if (router_ref_from_parent) router_ref_from_parent('requirement_list', { sampleId: sample_id });
                break;
            case 'visit-url':
                if (sample.url && Helpers_add_protocol_if_missing) window.open(Helpers_add_protocol_if_missing(sample.url), '_blank', 'noopener,noreferrer');
                break;
            case 'review-sample':
                if (router_ref_from_parent && current_global_state.ruleFileContent && AuditLogic_find_first_incomplete_requirement_key_for_sample) {
                    const first_incomplete_req_key = AuditLogic_find_first_incomplete_requirement_key_for_sample(current_global_state.ruleFileContent, sample);
                    if (first_incomplete_req_key) {
                        router_ref_from_parent('requirement_audit', { sampleId: sample.id, requirementId: first_incomplete_req_key });
                    } else { 
                        router_ref_from_parent('requirement_list', { sampleId: sample.id });
                    }
                }
                break;
        }
    }

    async function init(_list_container, _on_edit_cb, _on_delete_cb, _router_cb, _getState) {
        assign_globals_once();
        list_container_ref = _list_container;
        on_edit_callback = _on_edit_cb;
        on_delete_callback = _on_delete_cb;
        router_ref_from_parent = _router_cb;
        local_getState = _getState;
        await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
    }

    function render() {
        assign_globals_once();
        const t = get_t_internally();
        const current_global_state = local_getState();

        if (!list_container_ref) return;
        list_container_ref.innerHTML = '';

        if (!current_global_state?.samples || current_global_state.samples.length === 0) {
            list_container_ref.appendChild(Helpers_create_element('p', { class_name: 'no-samples-message', text_content: t('no_samples_added') }));
            return;
        }

        if (!ul_element_for_delegation) {
            ul_element_for_delegation = Helpers_create_element('ul', { class_name: 'sample-list item-list' });
            ul_element_for_delegation.addEventListener('click', handle_list_click);
        } else {
            ul_element_for_delegation.innerHTML = '';
        }

        const content_types_map = new Map();
        (current_global_state.ruleFileContent.metadata.contentTypes || []).forEach(parent => {
            (parent.types || []).forEach(child => content_types_map.set(child.id, child.text));
        });

        const sample_categories_map = new Map();
        (current_global_state.ruleFileContent.metadata.samples?.sampleCategories || []).forEach(cat => {
            sample_categories_map.set(cat.id, cat.text);
        });

        const can_edit_or_delete = current_global_state.auditStatus === 'not_started' || current_global_state.auditStatus === 'in_progress';

        current_global_state.samples.forEach(sample => {
            const li = Helpers_create_element('li', { 
                class_name: 'sample-list-item item-list-item',
                attributes: {'data-sample-id': sample.id}
            });
            
            const info_div = Helpers_create_element('div', { class_name: 'sample-info' });
            
            const desc_h3 = Helpers_create_element('h3');
            const sample_needs_review = Object.values(sample.requirementResults || {}).some(res => res.needsReview === true);

            if (sample_needs_review && Helpers_get_icon_svg) {
                desc_h3.innerHTML = Helpers_get_icon_svg('update', ['currentColor'], 20) + ' ';
                desc_h3.title = t('sample_has_updated_reqs_tooltip', {defaultValue: "Detta stickprov har uppdaterade krav som behöver omgranskas."});
            }
            
            desc_h3.appendChild(document.createTextNode(sample.description || t('undefined_description')));
            info_div.appendChild(desc_h3);
            
            const category_text = sample_categories_map.get(sample.sampleCategory) || sample.sampleCategory;
            const type_info_string = `${sample.sampleType || ''} (${category_text || ''})`;
            const type_p = Helpers_create_element('p');
            type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(type_info_string)}`;
            info_div.appendChild(type_p);

            if (sample.url) {
                const url_p = Helpers_create_element('p');
                url_p.innerHTML = `<strong>${t('url')}:</strong> <a href="${Helpers_escape_html(Helpers_add_protocol_if_missing(sample.url))}" target="_blank" rel="noopener noreferrer">${Helpers_escape_html(sample.url)}</a>`;
                info_div.appendChild(url_p);
            }

            // *** START PÅ KORRIGERAD OCH KOMPLETT PROGRESS-LOGIK ***
            const relevant_reqs = AuditLogic_get_relevant_requirements_for_sample(current_global_state.ruleFileContent, sample);
            const total_relevant_reqs = relevant_reqs.length;
            
            let audited_reqs_count = 0;
            if (relevant_reqs.length > 0) {
                audited_reqs_count = relevant_reqs.filter(req => {
                    const result_for_req = (sample.requirementResults || {})[req.id];
                    const status = AuditLogic_calculate_requirement_status(req, result_for_req);
                    return status === 'passed' || status === 'failed';
                }).length;
            }

            info_div.appendChild(Helpers_create_element('p', { innerHTML: `<strong>${t('requirements_audited', {defaultValue: "Hanterade krav"})}:</strong> ${audited_reqs_count} / ${total_relevant_reqs}` }));
            
            if (window.ProgressBarComponent) {
                info_div.appendChild(window.ProgressBarComponent.create(audited_reqs_count, total_relevant_reqs, {}));
            }
            // *** SLUT PÅ KORRIGERAD PROGRESS-LOGIK ***
            
            if (sample.selectedContentTypes?.length > 0) {
                const content_types_div = Helpers_create_element('div', { class_name: 'content-types-display' });
                content_types_div.appendChild(Helpers_create_element('strong', { text_content: t('content_types') + ':' }));
                const content_types_ul = Helpers_create_element('ul');
                sample.selectedContentTypes.forEach(ct_id => {
                    const ct_text = content_types_map.get(ct_id) || ct_id;
                    content_types_ul.appendChild(Helpers_create_element('li', { text_content: Helpers_escape_html(ct_text) }));
                });
                content_types_div.appendChild(content_types_ul);
                info_div.appendChild(content_types_div);
            }
            li.appendChild(info_div);

            const actions_wrapper_div = Helpers_create_element('div', { class_name: 'sample-actions-wrapper' });
            const main_actions_div = Helpers_create_element('div', { class_name: 'sample-actions-main' });
            const delete_actions_div = Helpers_create_element('div', { class_name: 'sample-actions-delete' });
            
            if (can_edit_or_delete && on_edit_callback) {
                 main_actions_div.appendChild(Helpers_create_element('button', {
                    class_name: ['button', 'button-default', 'button-small'],
                    attributes: { 'data-action': 'edit-sample', 'aria-label': `${t('edit_sample')}: ${sample.description}` },
                    html_content: `<span>${t('edit_sample')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('edit', ['currentColor'], 16) : '')
                }));
            }

            if (total_relevant_reqs > 0) {
                main_actions_div.appendChild(Helpers_create_element('button', {
                    class_name: ['button', 'button-secondary', 'button-small'],
                    attributes: { 'data-action': 'view-requirements', 'aria-label': `${t('view_all_requirements_button')}: ${sample.description}` },
                    html_content: `<span>${t('view_all_requirements_button')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('list', ['currentColor'], 16) : '')
                }));
            }

            if (sample.url) {
                main_actions_div.appendChild(Helpers_create_element('button', {
                    class_name: ['button', 'button-secondary', 'button-small'],
                    attributes: { 'data-action': 'visit-url', 'aria-label': `${t('visit_url')}: ${sample.description}` },
                    html_content: `<span>${t('visit_url')}</span>` + (Helpers_get_icon_svg('visit_url', ['currentColor'], 16) || '')
                }));
            }

            if (current_global_state.auditStatus === 'in_progress' && total_relevant_reqs > 0) {
                const first_incomplete = AuditLogic_find_first_incomplete_requirement_key_for_sample(current_global_state.ruleFileContent, sample);
                const review_text_key = first_incomplete ? 'audit_next_incomplete_requirement' : 'view_audited_sample';
                main_actions_div.appendChild(Helpers_create_element('button', {
                    class_name: ['button', 'button-primary', 'button-small'],
                    attributes: { 'data-action': 'review-sample', 'aria-label': `${t(review_text_key)}: ${sample.description}` },
                    html_content: `<span>${t(review_text_key)}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('audit_sample', ['currentColor'], 16) : '')
                }));
            }
             if (can_edit_or_delete && on_delete_callback && current_global_state.samples.length > 1) {
                delete_actions_div.appendChild(Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small'],
                    attributes: { 'data-action': 'delete-sample', 'aria-label': `${t('delete_sample')}: ${sample.description}` },
                    html_content: `<span>${t('delete_sample')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('delete', ['currentColor'], 16) : '')
                }));
            }

            if (main_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(main_actions_div);
            if (delete_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(delete_actions_div);
            if (actions_wrapper_div.hasChildNodes()) li.appendChild(actions_wrapper_div);

            ul_element_for_delegation.appendChild(li);
        });
        list_container_ref.appendChild(ul_element_for_delegation);
    }

    function destroy() {
        if (ul_element_for_delegation) {
            ul_element_for_delegation.removeEventListener('click', handle_list_click);
            ul_element_for_delegation = null;
        }
    }

    return {
        init,
        render,
        destroy
    };
})();