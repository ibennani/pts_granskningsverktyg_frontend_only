// js/components/EditRulefileRequirementComponent.js

export const EditRulefileRequirementComponent = (function () {
    'use-strict';

    const CSS_PATH_SHARED = 'css/components/requirement_audit_component.css';
    const CSS_PATH_SPECIFIC = 'css/components/edit_rulefile_requirement_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css, Helpers_generate_uuid_v4, Helpers_sanitize_id_for_css_selector;
    let NotificationComponent_show_global_message;
    
    let form_element_ref;
    let local_requirement_data = null;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_load_css = window.Helpers.load_css;
        Helpers_generate_uuid_v4 = window.Helpers.generate_uuid_v4;
        Helpers_sanitize_id_for_css_selector = window.Helpers.sanitize_id_for_css_selector;
        NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        
        await Helpers_load_css(CSS_PATH_SHARED).catch(e => console.warn(e));
        await Helpers_load_css(CSS_PATH_SPECIFIC).catch(e => console.warn(e));
    }

    // --- NY FUNKTION: Uppdaterar local_requirement_data från formuläret ---
    function _update_local_data_from_form() {
        if (!form_element_ref) return;
        
        local_requirement_data.title = form_element_ref.querySelector('#title')?.value || '';
        local_requirement_data.expectedObservation = form_element_ref.querySelector('#expectedObservation')?.value || '';
        local_requirement_data.instructions = form_element_ref.querySelector('#instructions')?.value || '';
        local_requirement_data.exceptions = form_element_ref.querySelector('#exceptions')?.value || '';
        local_requirement_data.commonErrors = form_element_ref.querySelector('#commonErrors')?.value || '';
        local_requirement_data.tips = form_element_ref.querySelector('#tips')?.value || '';
        local_requirement_data.examples = form_element_ref.querySelector('#examples')?.value || '';
        
        if (local_requirement_data.standardReference) {
            local_requirement_data.standardReference.text = form_element_ref.querySelector('#standardReferenceText')?.value || '';
            local_requirement_data.standardReference.url = form_element_ref.querySelector('#standardReferenceUrl')?.value || '';
        }
        if (local_requirement_data.metadata) {
            local_requirement_data.metadata.mainCategory.text = form_element_ref.querySelector('#mainCategoryText')?.value || '';
            local_requirement_data.metadata.subCategory.text = form_element_ref.querySelector('#subCategoryText')?.value || '';
            local_requirement_data.metadata.impact.isCritical = form_element_ref.querySelector('#isCritical')?.checked || false;
            local_requirement_data.metadata.impact.primaryScore = parseInt(form_element_ref.querySelector('#primaryScore')?.value, 10) || 0;
            local_requirement_data.metadata.impact.secondaryScore = parseInt(form_element_ref.querySelector('#secondaryScore')?.value, 10) || 0;
        }

        local_requirement_data.contentType = Array.from(form_element_ref.querySelectorAll('input[name="contentType"]:checked')).map(cb => cb.value);
        
        local_requirement_data.classifications = Array.from(form_element_ref.querySelectorAll('input[name="classification"]:checked')).map(cb => ({
            taxonomyId: 'wcag22-pour',
            conceptId: cb.value
        }));

        const checks_data = [];
        form_element_ref.querySelectorAll('.check-item-edit').forEach(check_el => {
            const check_id = check_el.dataset.checkId;
            const sane_check_id = Helpers_sanitize_id_for_css_selector(check_id);
            const check_obj = {
                id: check_id,
                condition: check_el.querySelector(`#check_${sane_check_id}_condition`)?.value || '',
                logic: check_el.querySelector(`input[name="check_${sane_check_id}_logic"]:checked`)?.value || 'AND',
                passCriteria: []
            };

            check_el.querySelectorAll('.pc-item-edit').forEach(pc_el => {
                const pc_id = pc_el.dataset.pcId;
                const sane_pc_id = Helpers_sanitize_id_for_css_selector(pc_id);
                check_obj.passCriteria.push({
                    id: pc_id,
                    requirement: pc_el.querySelector(`#pc_${sane_check_id}_${sane_pc_id}_requirement`)?.value || '',
                    failureStatementTemplate: pc_el.querySelector(`#pc_${sane_check_id}_${sane_pc_id}_failureTemplate`)?.value || ''
                });
            });
            checks_data.push(check_obj);
        });
        local_requirement_data.checks = checks_data;
    }

    function handle_form_submit(event) {
        event.preventDefault();
        _update_local_data_from_form(); // Använd den nya funktionen

        const t = Translation_t;
        if (!local_requirement_data.title.trim()) {
            NotificationComponent_show_global_message(t('field_is_required', { fieldName: t('requirement_title') }), 'error');
            form_element_ref.querySelector('#title')?.focus();
            return;
        }
        
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_DEFINITION,
            payload: {
                requirementId: params_ref.id,
                updatedRequirementData: local_requirement_data
            }
        });
        
        NotificationComponent_show_global_message(t('rulefile_requirement_saved'), 'success');
        router_ref('rulefile_view_requirement', { id: params_ref.id });
    }
    
    function handle_form_click(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        event.stopPropagation();
        event.preventDefault();
        
        // Uppdatera modellen från DOM innan vi ändrar modellen
        _update_local_data_from_form();

        const action = button.dataset.action;
        let check_id, pc_id;

        switch (action) {
            case 'add-check':
                local_requirement_data.checks.push({
                    id: `new-check-${Helpers_generate_uuid_v4()}`,
                    condition: '',
                    logic: 'AND',
                    passCriteria: []
                });
                _rerender_all_sections(); // Rendera om hela formuläret
                break;

            case 'delete-check':
                check_id = button.closest('.check-item-edit')?.dataset.checkId;
                if (check_id) {
                    router_ref('confirm_delete', { type: 'check', reqId: params_ref.id, checkId: check_id });
                }
                break;

            case 'add-pass-criterion':
                check_id = button.closest('.check-item-edit')?.dataset.checkId;
                const check = local_requirement_data.checks.find(c => c.id === check_id);
                if (check) {
                    check.passCriteria.push({
                        id: `new-pc-${Helpers_generate_uuid_v4()}`,
                        requirement: '',
                        failureStatementTemplate: ''
                    });
                    _rerender_all_sections(); // Rendera om hela formuläret
                }
                break;

            case 'delete-pass-criterion':
                const pc_item = button.closest('.pc-item-edit');
                check_id = button.closest('.check-item-edit')?.dataset.checkId;
                pc_id = pc_item?.dataset.pcId;
                if (check_id && pc_id) {
                    router_ref('confirm_delete', { type: 'criterion', reqId: params_ref.id, checkId: check_id, pcId: pc_id });
                }
                break;
        }
    }

    function _create_form_group(label_key, id, value, is_textarea = false, input_type = 'text') {
        const t = Translation_t;
        const form_group = Helpers_create_element('div', { class_name: 'form-group' });
        form_group.appendChild(Helpers_create_element('label', { attributes: { for: id }, text_content: t(label_key) }));
        
        let input;
        if (is_textarea) {
            input = Helpers_create_element('textarea', { id: id, name: id, class_name: 'form-control', attributes: { rows: 4 } });
            input.value = Array.isArray(value) ? value.join('\n') : (value || '');
            window.Helpers.init_auto_resize_for_textarea(input);
        } else {
            input = Helpers_create_element('input', { id: id, name: id, class_name: 'form-control', attributes: { type: input_type }});
            input.value = value || ''; 
        }
        form_group.appendChild(input);
        return form_group;
    }
    
    function _create_action_buttons(position) {
        const t = Translation_t;
        const actions_div = Helpers_create_element('div', { 
            class_name: 'form-actions', 
            style: { 
                marginTop: position === 'top' ? '1.5rem' : '2rem',
                marginBottom: position === 'top' ? '2rem' : '0',
                paddingBottom: position === 'top' ? '1.5rem' : '0',
                borderBottom: position === 'top' ? '1px dashed var(--secondary-color)' : 'none'
            } 
        });
        
        const save_button = Helpers_create_element('button', {
            type: 'submit',
            class_name: ['button', 'button-primary'],
            html_content: `<span>${t('save_changes_button')}</span>` + Helpers_get_icon_svg('save')
        });

        const cancel_button = Helpers_create_element('button', {
            type: 'button',
            class_name: ['button', 'button-default'],
            html_content: `<span>${t('cancel_and_return_to_list')}</span>`
        });
        cancel_button.addEventListener('click', () => router_ref('rulefile_requirements'));
        
        actions_div.append(save_button, cancel_button);
        return actions_div;
    }
    
    function _create_classification_section(metadata, classifications) {
        const t = Translation_t;
        const fragment = document.createDocumentFragment();
        
        const section_wrapper = Helpers_create_element('div', { class_name: 'audit-section' });
        section_wrapper.appendChild(Helpers_create_element('h2', { text_content: t('classification_title') }));
        section_wrapper.appendChild(_create_form_group('main_category_text', 'mainCategoryText', metadata?.mainCategory?.text));
        section_wrapper.appendChild(_create_form_group('sub_category_text', 'subCategoryText', metadata?.subCategory?.text));
        fragment.appendChild(section_wrapper);

        const current_state = local_getState();
        const pour_taxonomy = current_state.ruleFileContent.metadata.taxonomies.find(tax => tax.id === 'wcag22-pour');
        
        if (pour_taxonomy && pour_taxonomy.concepts) {
            const pour_section = Helpers_create_element('div', { class_name: 'audit-section' });
            const fieldset = Helpers_create_element('div', { class_name: 'classification-group' });
            const legend_text = t('wcag_principles_title');
            pour_section.appendChild(Helpers_create_element('h2', { text_content: legend_text }));

            const selected_concepts = new Set((classifications || []).map(c => c.conceptId));
            
            pour_taxonomy.concepts.forEach(concept => {
                const wrapper = Helpers_create_element('div', { class_name: 'form-check' });
                const checkbox = Helpers_create_element('input', {
                    id: `classification-${concept.id}`,
                    name: 'classification',
                    value: concept.id,
                    class_name: 'form-check-input',
                    attributes: { type: 'checkbox' }
                });
                if (selected_concepts.has(concept.id)) {
                    checkbox.checked = true;
                }
                const label = Helpers_create_element('label', { attributes: { for: `classification-${concept.id}` }, text_content: concept.label });
                wrapper.append(checkbox, label);
                fieldset.appendChild(wrapper);
            });
            pour_section.appendChild(fieldset);
            fragment.appendChild(pour_section);
        }
        
        return fragment;
    }

    function _create_impact_section(metadata) {
        const t = Translation_t;
        const section_wrapper = Helpers_create_element('div', { class_name: 'audit-section' });
        section_wrapper.appendChild(Helpers_create_element('h2', { text_content: t('impact_title') }));
        
        const impact_group = Helpers_create_element('div', { class_name: 'impact-group' });
        impact_group.appendChild(_create_form_group('primary_score', 'primaryScore', metadata?.impact?.primaryScore, false, 'number'));
        impact_group.appendChild(_create_form_group('secondary_score', 'secondaryScore', metadata?.impact?.secondaryScore, false, 'number'));

        const critical_wrapper = Helpers_create_element('div', { class_name: 'form-check' });
        const critical_checkbox = Helpers_create_element('input', { id: 'isCritical', name: 'isCritical', class_name: 'form-check-input', attributes: { type: 'checkbox' }});
        if (metadata?.impact?.isCritical) {
            critical_checkbox.checked = true;
        }
        critical_wrapper.appendChild(critical_checkbox);
        critical_wrapper.appendChild(Helpers_create_element('label', { attributes: { for: 'isCritical' }, text_content: t('is_critical') }));
        impact_group.appendChild(critical_wrapper);

        section_wrapper.appendChild(impact_group);
        return section_wrapper;
    }

    function _update_parent_checkbox_state(parent_checkbox) {
        const parent_id = parent_checkbox.dataset.parentId;
        if (!parent_id) return;

        const children = form_element_ref.querySelectorAll(`input[data-child-for="${parent_id}"]`);
        if (children.length === 0) return;

        const total_children = children.length;
        const checked_children = Array.from(children).filter(child => child.checked).length;

        if (checked_children === 0) {
            parent_checkbox.checked = false;
            parent_checkbox.indeterminate = false;
        } else if (checked_children === total_children) {
            parent_checkbox.checked = true;
            parent_checkbox.indeterminate = false;
        } else {
            parent_checkbox.checked = false;
            parent_checkbox.indeterminate = true;
        }
    }

    function _handle_content_type_change(event) {
        const target = event.target;
        if (target.type !== 'checkbox') return;

        if (target.dataset.parentId) {
            const parent_id = target.dataset.parentId;
            const children = form_element_ref.querySelectorAll(`input[data-child-for="${parent_id}"]`);
            children.forEach(child => child.checked = target.checked);
        } else if (target.dataset.childFor) {
            const parent_id = target.dataset.childFor;
            const parent_checkbox = form_element_ref.querySelector(`input[data-parent-id="${parent_id}"]`);
            if (parent_checkbox) {
                _update_parent_checkbox_state(parent_checkbox);
            }
        }
    }

    function _create_content_types_section(all_content_types, selected_content_types) {
        const t = Translation_t;
        const section_wrapper = Helpers_create_element('div', { class_name: 'audit-section' });
        section_wrapper.appendChild(Helpers_create_element('h2', { text_content: t('content_types_section_title') }));
        section_wrapper.addEventListener('change', _handle_content_type_change);

        all_content_types.forEach(group => {
            const fieldset = Helpers_create_element('fieldset', { class_name: 'content-type-parent-group-edit' });
            
            const legend = Helpers_create_element('legend');
            const parent_id = `ct-parent-${group.id}`;
            const parent_checkbox = Helpers_create_element('input', { id: parent_id, class_name: 'form-check-input', attributes: { type: 'checkbox', 'data-parent-id': group.id } });
            const parent_label = Helpers_create_element('label', { attributes: { for: parent_id }, text_content: group.text });
            legend.append(parent_checkbox, parent_label);
            fieldset.appendChild(legend);

            (group.types || []).forEach(child => {
                const child_id = `ct-child-${child.id}`;
                const is_checked = selected_content_types.includes(child.id);

                const child_wrapper = Helpers_create_element('div', { class_name: 'form-check content-type-child-item-edit' });
                const child_checkbox = Helpers_create_element('input', { 
                    id: child_id, 
                    class_name: 'form-check-input', 
                    attributes: { type: 'checkbox', name: 'contentType', value: child.id, 'data-child-for': group.id } 
                });
                if (is_checked) {
                    child_checkbox.checked = true;
                }
                const child_label = Helpers_create_element('label', { attributes: { for: child_id }, text_content: child.text });
                
                child_wrapper.append(child_checkbox, child_label);
                fieldset.appendChild(child_wrapper);
            });
            section_wrapper.appendChild(fieldset);
        });
        return section_wrapper;
    }
    
    function _rerender_all_sections(animate_last_item = false) {
        const t = Translation_t;
        const scroll_position = window.scrollY;
        
        // Spara referens till det element som hade fokus
        const active_element_id = document.activeElement ? document.activeElement.id : null;

        form_element_ref.innerHTML = ''; // Rensa hela formuläret

        const current_state = local_getState();
        
        form_element_ref.appendChild(_create_action_buttons('top'));

        const basic_info_section = Helpers_create_element('div', { class_name: 'audit-section' });
        basic_info_section.appendChild(Helpers_create_element('h2', { text_content: t('requirement_general_info_title') }));
        basic_info_section.appendChild(_create_form_group('requirement_title', 'title', local_requirement_data.title));
        basic_info_section.appendChild(_create_form_group('requirement_standard_reference_text', 'standardReferenceText', local_requirement_data.standardReference?.text));
        basic_info_section.appendChild(_create_form_group('requirement_standard_reference_url', 'standardReferenceUrl', local_requirement_data.standardReference?.url));
        form_element_ref.appendChild(basic_info_section);
        
        const help_texts_section = Helpers_create_element('div', { class_name: 'audit-section' });
        help_texts_section.appendChild(Helpers_create_element('h2', { text_content: t('help_texts_title') }));
        help_texts_section.appendChild(_create_form_group('requirement_expected_observation', 'expectedObservation', true));
        help_texts_section.appendChild(_create_form_group('requirement_instructions', 'instructions', true));
        help_texts_section.appendChild(_create_form_group('requirement_exceptions', 'exceptions', true));
        help_texts_section.appendChild(_create_form_group('requirement_common_errors', 'commonErrors', true));
        help_texts_section.appendChild(_create_form_group('requirement_tips', 'tips', true));
        help_texts_section.appendChild(_create_form_group('requirement_examples', 'examples', true));
        form_element_ref.appendChild(help_texts_section);
        
        const checks_container_wrapper = Helpers_create_element('div', { class_name: 'checks-container-edit' });
        form_element_ref.appendChild(checks_container_wrapper);
        _rerender_checks_section(animate_last_item);
        
        form_element_ref.appendChild(_create_classification_section(local_requirement_data.metadata, local_requirement_data.classifications));
        form_element_ref.appendChild(_create_impact_section(local_requirement_data.metadata));

        const all_content_types = current_state.ruleFileContent.metadata.contentTypes || [];
        const selected_content_types = local_requirement_data.contentType || [];
        form_element_ref.appendChild(_create_content_types_section(all_content_types, selected_content_types));
        
        form_element_ref.appendChild(_create_action_buttons('bottom'));

        form_element_ref.querySelectorAll('input[data-parent-id]').forEach(_update_parent_checkbox_state);

        window.scrollTo(0, scroll_position);

        // Återställ fokus
        if (active_element_id) {
            const elementToFocus = document.getElementById(active_element_id);
            elementToFocus?.focus();
        }
    }

    function _rerender_checks_section(animate_last_item = false) {
        const t = Translation_t;
        let checks_section = form_element_ref.querySelector('.checks-container-edit');
        if (!checks_section) return;

        checks_section.innerHTML = '';
        checks_section.appendChild(Helpers_create_element('h2', { id: 'checks-section-heading', attributes: {tabindex: '-1'}, text_content: t('checks_title') }));

        (local_requirement_data.checks || []).forEach((check) => {
            const check_el = _create_check_fieldset(check);
            checks_section.appendChild(check_el);
        });

        const add_check_button = Helpers_create_element('button', { type: 'button', class_name: ['button', 'button-primary'], attributes: { 'data-action': 'add-check' }, text_content: t('add_check_button') });
        checks_section.appendChild(add_check_button);
    }
    
    function _create_check_fieldset(check) {
        const t = Translation_t;
        const sane_check_id = Helpers_sanitize_id_for_css_selector(check.id);
        const check_el = Helpers_create_element('div', { class_name: 'check-item-edit', attributes: { 'data-check-id': check.id }});
        
        const delete_check_btn = Helpers_create_element('button', {
            type: 'button', 
            class_name: 'button button-danger button-small delete-item-btn', 
            attributes: {
                'data-action': 'delete-check',
                'aria-label': t('delete_check_aria_label', { conditionText: check.condition || t('aria_label_empty_content') })
            }, 
            html_content: Helpers_get_icon_svg('delete') + `<span>${t('delete_check_button')}</span>`
        });
        check_el.appendChild(delete_check_btn);
        
        check_el.appendChild(_create_form_group('check_condition_label', `check_${sane_check_id}_condition`, check.condition, true));

        const logic_fieldset = Helpers_create_element('fieldset', { class_name: 'check-logic-group' });
        logic_fieldset.appendChild(Helpers_create_element('legend', { text_content: t('check_logic_title') }));
        const logic_and = Helpers_create_element('input', { id: `logic_${sane_check_id}_and`, name: `check_${sane_check_id}_logic`, value: 'AND', attributes: { type: 'radio' } });
        if (!check.logic || check.logic.toUpperCase() === 'AND') logic_and.checked = true;
        const logic_or = Helpers_create_element('input', { id: `logic_${sane_check_id}_or`, name: `check_${sane_check_id}_logic`, value: 'OR', attributes: { type: 'radio' } });
        if (check.logic?.toUpperCase() === 'OR') logic_or.checked = true;
        
        logic_fieldset.append(
            Helpers_create_element('div', { class_name: 'form-check', children: [logic_and, Helpers_create_element('label', { attributes: { for: `logic_${sane_check_id}_and` }, text_content: t('check_logic_and') })] }),
            Helpers_create_element('div', { class_name: 'form-check', children: [logic_or, Helpers_create_element('label', { attributes: { for: `logic_${sane_check_id}_or` }, text_content: t('check_logic_or') })] })
        );
        check_el.appendChild(logic_fieldset);
        
        const pc_container = Helpers_create_element('div', { class_name: 'pc-container-edit' });
        (check.passCriteria || []).forEach((pc) => {
            pc_container.appendChild(_create_pc_item(pc, sane_check_id));
        });
        
        const add_pc_button = Helpers_create_element('button', { type: 'button', class_name: ['button', 'button-default', 'button-small'], attributes: { 'data-action': 'add-pass-criterion' }, text_content: t('add_criterion_button') });
        pc_container.appendChild(add_pc_button);
        check_el.appendChild(pc_container);

        return check_el;
    }

    function _create_pc_item(pc, sane_check_id) {
        const t = Translation_t;
        const sane_pc_id = Helpers_sanitize_id_for_css_selector(pc.id);
        const pc_el = Helpers_create_element('div', { class_name: 'pc-item-edit', attributes: { 'data-pc-id': pc.id } });
        const delete_pc_btn = Helpers_create_element('button', {
            type: 'button', 
            class_name: 'button button-danger button-small delete-item-btn', 
            attributes: {
                'data-action': 'delete-pass-criterion',
                'aria-label': t('delete_criterion_aria_label', { criterionText: pc.requirement || t('aria_label_empty_content') })
            }, 
            html_content: Helpers_get_icon_svg('delete') + `<span>${t('delete_criterion_button')}</span>`
        });
        pc_el.appendChild(delete_pc_btn);
        pc_el.appendChild(_create_form_group('pass_criterion_label', `pc_${sane_check_id}_${sane_pc_id}_requirement`, pc.requirement, true));
        pc_el.appendChild(_create_form_group('failure_template_label', `pc_${sane_check_id}_${sane_pc_id}_failureTemplate`, pc.failureStatementTemplate, true));
        return pc_el;
    }

    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        
        const requirement_id = params_ref?.id;
        const current_state = local_getState();
        const requirement_from_store = current_state?.ruleFileContent?.requirements[requirement_id];

        if (!requirement_from_store) {
            plate_element.appendChild(Helpers_create_element('h1', { text_content: t('error_internal') }));
            app_container_ref.appendChild(plate_element);
            return;
        }

        local_requirement_data = JSON.parse(JSON.stringify(requirement_from_store));

        plate_element.appendChild(Helpers_create_element('h1', { text_content: `${t('rulefile_edit_requirement_title')}: ${local_requirement_data.title}` }));
        
        form_element_ref = Helpers_create_element('form');
        form_element_ref.addEventListener('submit', handle_form_submit);
        form_element_ref.addEventListener('click', handle_form_click);
        
        _rerender_all_sections();
        
        plate_element.appendChild(form_element_ref);
        app_container_ref.appendChild(plate_element);

        setTimeout(() => {
            const focusSelector = sessionStorage.getItem('focusAfterLoad');
            if (focusSelector) {
                sessionStorage.removeItem('focusAfterLoad');
                const elementToFocus = form_element_ref.querySelector(focusSelector);
                if (elementToFocus) {
                    try {
                        elementToFocus.focus();
                        window.customFocusApplied = true;
                    } catch (e) {
                        console.warn(`Could not focus on element with selector: ${focusSelector}`, e);
                    }
                }
            }
        }, 100);
    }

    function destroy() {
        if (form_element_ref) {
            form_element_ref.removeEventListener('submit', handle_form_submit);
            form_element_ref.removeEventListener('click', handle_form_click);
        }
        app_container_ref.innerHTML = '';
        form_element_ref = null;
        local_requirement_data = null;
    }

    return { init, render, destroy };
})();