// js/components/SampleListComponent.js

const SampleListComponent_internal = (function () {
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
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (SampleList t not found)";
            };
    }

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element && AuditLogic_get_relevant_requirements_for_sample) return true;

        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("SampleList: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_escape_html || !Helpers_add_protocol_if_missing || !Helpers_load_css) {
                 console.error("SampleList: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleList: Helpers module is missing!"); all_assigned = false; }

        if (window.AuditLogic) {
            AuditLogic_get_relevant_requirements_for_sample = window.AuditLogic.get_relevant_requirements_for_sample;
            AuditLogic_find_first_incomplete_requirement_key_for_sample = window.AuditLogic.find_first_incomplete_requirement_key_for_sample;
            AuditLogic_calculate_requirement_status = window.AuditLogic.calculate_requirement_status;
            if (!AuditLogic_get_relevant_requirements_for_sample || !AuditLogic_find_first_incomplete_requirement_key_for_sample || !AuditLogic_calculate_requirement_status) {
                console.error("SampleList: One or more AuditLogic functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleList: AuditLogic module is missing!"); all_assigned = false; }
        return all_assigned;
    }

    function handle_list_click(event) {
        const t = get_t_internally();
        const target = event.target;
        
        const current_global_state = local_getState ? local_getState() : null; 
        if (!current_global_state) {
            console.warn("[SampleListComponent] handle_list_click: Could not get current state via local_getState.");
            return;
        }


        const action_button = target.closest('button[data-action]');
        if (!action_button) return; 

        const sample_list_item_element = action_button.closest('.sample-list-item[data-sample-id]');
        if (!sample_list_item_element) return; 

        const sample_id = sample_list_item_element.dataset.sampleId;
        const action = action_button.dataset.action;
        const sample = current_global_state.samples.find(s => s.id === sample_id);

        if (!sample) {
            console.warn(`SampleList: Could not find sample with ID ${sample_id} for action ${action} in current state.`);
            return;
        }
        console.log(`[SampleListComponent] Clicked action "${action}" for sample ID "${sample_id}"`);

        switch (action) {
            case 'edit-sample':
                if (typeof on_edit_callback === 'function') {
                    on_edit_callback(sample_id);
                }
                break;
            case 'delete-sample':
                if (typeof on_delete_callback === 'function') {
                    on_delete_callback(sample_id);
                }
                break;
            case 'view-requirements':
                if (router_ref_from_parent) {
                    router_ref_from_parent('requirement_list', { sampleId: sample_id });
                }
                break;
            case 'visit-url':
                if (sample.url && Helpers_add_protocol_if_missing) {
                    window.open(Helpers_add_protocol_if_missing(sample.url), '_blank', 'noopener,noreferrer');
                }
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

    async function init(
        _list_container, 
        _on_edit_cb, 
        _on_delete_cb, 
        _router_cb,
        _getState
    ) {
        assign_globals_once();
        list_container_ref = _list_container;
        on_edit_callback = _on_edit_cb;
        on_delete_callback = _on_delete_cb;
        router_ref_from_parent = _router_cb;
        local_getState = _getState;

        if (!local_getState) {
            console.error("[SampleListComponent] CRITICAL: getState function not passed correctly during init.");
        }

        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for SampleListComponent:", error);
            }
        }
        console.log("[SampleListComponent] Init complete.");
    }

    function render() {
        assign_globals_once();
        const t = get_t_internally();

        if (!list_container_ref || !t || !local_getState || !Helpers_create_element || !AuditLogic_get_relevant_requirements_for_sample || !AuditLogic_calculate_requirement_status) {
            console.error("SampleListComponent: Core dependencies missing for render. Has init completed successfully?");
            if (list_container_ref) list_container_ref.innerHTML = `<p>${t('error_render_component', {componentName: 'SampleList'})}</p>`;
            return;
        }
        list_container_ref.innerHTML = ''; 

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) {
             list_container_ref.textContent = t('error_audit_data_missing_for_list');
             return; 
        }
        if (!current_global_state.samples || current_global_state.samples.length === 0) { 
            const no_samples_msg = Helpers_create_element('p', {
                class_name: 'no-samples-message',
                text_content: t('no_samples_added')
            });
            list_container_ref.appendChild(no_samples_msg);
            return; 
        }

        if (!ul_element_for_delegation) {
            ul_element_for_delegation = Helpers_create_element('ul', { class_name: 'sample-list item-list' });
            ul_element_for_delegation.addEventListener('click', handle_list_click);
        } else {
            ul_element_for_delegation.innerHTML = ''; 
        }
        
        const can_edit_or_delete = current_global_state.auditStatus === 'not_started' || current_global_state.auditStatus === 'in_progress';

        current_global_state.samples.forEach(sample => {
            const li = Helpers_create_element('li', { 
                class_name: 'sample-list-item item-list-item',
                attributes: {'data-sample-id': sample.id}
            });
            
            const info_div = Helpers_create_element('div', { class_name: 'sample-info' });
            
            // *** NY LOGIK för att kolla om stickprovet har krav som behöver ses över ***
            let sample_needs_review = false;
            if (sample.requirementResults) {
                sample_needs_review = Object.values(sample.requirementResults).some(res => res.needsReview === true);
            }

            const desc_h3 = Helpers_create_element('h3');
            if (sample_needs_review) {
                const icon_span = Helpers_create_element('span', {
                    style: 'margin-right: 0.5rem; color: var(--info-color);',
                    attributes: { title: t('sample_has_updated_reqs_tooltip', {defaultValue: "This sample has updated requirements that need re-review."}) },
                    html_content: Helpers_get_icon_svg ? Helpers_get_icon_svg('update', ['currentColor'], 20) : ''
                });
                desc_h3.appendChild(icon_span);
            }
            desc_h3.appendChild(document.createTextNode(sample.description || t('undefined_description', {defaultValue: "Undefined description"})));
            
            const type_p = Helpers_create_element('p');
            type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(sample.pageType)}`;
            info_div.appendChild(desc_h3);
            info_div.appendChild(type_p);

            if(sample.url && Helpers_add_protocol_if_missing) {
                const url_p = Helpers_create_element('p');
                const safe_url = Helpers_add_protocol_if_missing(sample.url);
                url_p.innerHTML = `<strong>${t('url')}:</strong> <a href="${Helpers_escape_html(safe_url)}" target="_blank" rel="noopener noreferrer" title="${t('visit_url')}: ${Helpers_escape_html(sample.url)}">${Helpers_escape_html(sample.url)}</a>`;
                info_div.appendChild(url_p);
            }

            const relevant_reqs_for_sample_list_info = AuditLogic_get_relevant_requirements_for_sample(current_global_state.ruleFileContent, sample);
            const total_relevant_reqs_info = relevant_reqs_for_sample_list_info.length;
            let audited_reqs_count_info = 0;

            relevant_reqs_for_sample_list_info.forEach(req_definition_from_list => {
                const req_object_from_rulefile = current_global_state.ruleFileContent.requirements[req_definition_from_list.id] || current_global_state.ruleFileContent.requirements[req_definition_from_list.key];
                const req_result_from_sample = sample.requirementResults ? sample.requirementResults[req_definition_from_list.id] || sample.requirementResults[req_definition_from_list.key] : null;
                
                if (req_object_from_rulefile) { 
                    const req_status = AuditLogic_calculate_requirement_status(req_object_from_rulefile, req_result_from_sample);
                    if (status === 'passed' || status === 'failed') {
                        audited_reqs_count_info++;
                    }
                } else {
                    console.warn(`[SampleListComponent] Could not find requirement definition for ID/key: ${req_definition_from_list.id || req_definition_from_list.key} in ruleFileContent.`);
                }
            });

            const progress_p = Helpers_create_element('p');
            progress_p.innerHTML = `<strong>${t('requirements_audited')}:</strong> ${audited_reqs_count_info} / ${total_relevant_reqs_info}`;
            info_div.appendChild(progress_p);
            
            if (window.ProgressBarComponent && typeof window.ProgressBarComponent.create === 'function') {
                const progress_bar = window.ProgressBarComponent.create(audited_reqs_count_info, total_relevant_reqs_info, {});
                info_div.appendChild(progress_bar);
            }
            if (sample.selectedContentTypes && sample.selectedContentTypes.length > 0 &&
                current_global_state.ruleFileContent.metadata && current_global_state.ruleFileContent.metadata.contentTypes) {
                const content_types_div = Helpers_create_element('div', { class_name: 'content-types-display' });
                const content_types_strong = Helpers_create_element('strong', { text_content: t('content_types') + ':'});
                const content_types_ul = Helpers_create_element('ul');
                sample.selectedContentTypes.forEach(ct_id => {
                    const ct_object = current_global_state.ruleFileContent.metadata.contentTypes.find(c => c.id === ct_id);
                    const ct_text = ct_object ? ct_object.text : ct_id;
                    content_types_ul.appendChild(Helpers_create_element('li', { text_content: Helpers_escape_html(ct_text) }));
                });
                content_types_div.appendChild(content_types_strong);
                content_types_div.appendChild(content_types_ul);
                info_div.appendChild(content_types_div);
            }
            li.appendChild(info_div);


            const actions_wrapper_div = Helpers_create_element('div', { class_name: 'sample-actions-wrapper' });
            const main_actions_div = Helpers_create_element('div', { class_name: 'sample-actions-main' });
            const delete_actions_div = Helpers_create_element('div', { class_name: 'sample-actions-delete' });

            const total_relevant_reqs = relevant_reqs_for_sample_list_info.length;

            if (total_relevant_reqs > 0) {
                const view_reqs_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-secondary', 'button-small'],
                    attributes: { 'data-action': 'view-requirements', 'aria-label': `${t('view_all_requirements_button')}: ${sample.description}` },
                    html_content: `<span>${t('view_all_requirements_button')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('list', ['currentColor'], 16) : '')
                });
                main_actions_div.appendChild(view_reqs_button);
            } else { 
                 const no_reqs_info = Helpers_create_element('span', {class_name: 'text-muted button-small', text_content: t('no_relevant_requirements_for_sample_short', {defaultValue: "(No relevant requirements)"})});
                 main_actions_div.appendChild(no_reqs_info);
            }

            if (sample.url) {
                const visit_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-secondary', 'button-small'],
                    attributes: { 'data-action': 'visit-url', 'aria-label': `${t('visit_url')}: ${sample.description}` },
                    html_content: `<span>${t('visit_url')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('visit_url', ['currentColor'], 16) : '')
                });
                main_actions_div.appendChild(visit_button);
            }

            if (current_global_state.auditStatus === 'in_progress' && total_relevant_reqs > 0) {
                const first_incomplete_req_key = AuditLogic_find_first_incomplete_requirement_key_for_sample(current_global_state.ruleFileContent, sample);
                let review_button_text_key = first_incomplete_req_key ? 'audit_next_incomplete_requirement' : 'view_audited_sample';
                
                const review_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-primary', 'button-small'],
                    attributes: { 'data-action': 'review-sample', 'aria-label': `${t(review_button_text_key)}: ${sample.description}` },
                    html_content: `<span>${t(review_button_text_key)}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('audit_sample', ['currentColor'], 16) : '')
                });
                main_actions_div.appendChild(review_button);
            }

            if (can_edit_or_delete && typeof on_edit_callback === 'function') {
                const edit_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-default', 'button-small'],
                    attributes: { 'data-action': 'edit-sample', 'aria-label': `${t('edit_sample')}: ${sample.description}` },
                    html_content: `<span>${t('edit_sample')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('edit', ['currentColor'], 16) : '')
                });
                if (main_actions_div.firstChild) {
                    main_actions_div.insertBefore(edit_button, main_actions_div.firstChild);
                } else {
                    main_actions_div.appendChild(edit_button);
                }
            }

            if (can_edit_or_delete && typeof on_delete_callback === 'function' && current_global_state.samples.length > 1) {
                const delete_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small'],
                    attributes: { 'data-action': 'delete-sample', 'aria-label': `${t('delete_sample')}: ${sample.description}` },
                    html_content: `<span>${t('delete_sample')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('delete', ['currentColor'], 16) : '')
                });
                delete_actions_div.appendChild(delete_button);
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
        list_container_ref = null;
        on_edit_callback = null;
        on_delete_callback = null;
        router_ref_from_parent = null;
        local_getState = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const SampleListComponent = SampleListComponent_internal;