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
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css;
    let NotificationComponent_show_global_message;
    
    let form_element_ref;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_load_css = window.Helpers.load_css;
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

    function handle_form_submit(event) {
        event.preventDefault();
        const t = Translation_t;
        const requirement_id = params_ref?.id;
        const current_state = local_getState();
        const original_requirement = current_state?.ruleFileContent?.requirements[requirement_id];
        
        if (!original_requirement) {
            NotificationComponent_show_global_message(t('error_internal'), 'error');
            return;
        }

        const form_data = new FormData(form_element_ref);
        
        const title_value = (form_data.get('title') || '').trim();
        if (!title_value) {
            NotificationComponent_show_global_message(t('field_is_required', { fieldName: t('requirement_title') }), 'error');
            const title_input = form_element_ref.querySelector('#title');
            if (title_input) {
                title_input.focus();
                title_input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        const updated_requirement = JSON.parse(JSON.stringify(original_requirement));

        updated_requirement.title = title_value;
        updated_requirement.expectedObservation = form_data.get('expectedObservation') || '';
        updated_requirement.instructions = form_data.get('instructions') || '';
        updated_requirement.exceptions = form_data.get('exceptions') || '';
        updated_requirement.commonErrors = form_data.get('commonErrors') || '';
        updated_requirement.tips = form_data.get('tips') || '';
        updated_requirement.examples = form_data.get('examples') || '';
        
        if (updated_requirement.standardReference) {
            updated_requirement.standardReference.text = form_data.get('standardReferenceText') || '';
            updated_requirement.standardReference.url = form_data.get('standardReferenceUrl') || '';
        }

        updated_requirement.metadata = updated_requirement.metadata || {};
        updated_requirement.metadata.mainCategory = { text: form_data.get('mainCategoryText') || '' };
        updated_requirement.metadata.subCategory = { text: form_data.get('subCategoryText') || '' };
        updated_requirement.metadata.impact = {
            isCritical: form_data.get('isCritical') === 'on',
            primaryScore: parseInt(form_data.get('primaryScore'), 10) || 0,
            secondaryScore: parseInt(form_data.get('secondaryScore'), 10) || 0
        };

        updated_requirement.contentType = Array.from(form_element_ref.querySelectorAll('input[name="contentType"]:checked')).map(cb => cb.value);
        
        updated_requirement.classifications = Array.from(form_element_ref.querySelectorAll('input[name="classification"]:checked')).map(cb => ({
            taxonomyId: 'wcag22-pour',
            conceptId: cb.value
        }));

        updated_requirement.checks = Array.from(form_element_ref.querySelectorAll('.check-item-edit')).map(check_el => {
            const check_id = check_el.dataset.checkId;
            return {
                id: check_id,
                condition: check_el.querySelector(`[name="check_${check_id}_condition"]`).value || '',
                logic: form_data.get(`check_${check_id}_logic`) || 'AND',
                passCriteria: Array.from(check_el.querySelectorAll('.pc-item-edit')).map(pc_el => {
                    const pc_id = pc_el.dataset.pcId;
                    return {
                        id: pc_id,
                        requirement: pc_el.querySelector(`[name="pc_${check_id}_${pc_id}_requirement"]`).value || '',
                        failureStatementTemplate: pc_el.querySelector(`[name="pc_${check_id}_${pc_id}_failureTemplate"]`).value || ''
                    };
                })
            };
        });
        
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_DEFINITION,
            payload: {
                requirementId: requirement_id,
                updatedRequirementData: updated_requirement
            }
        });
        
        NotificationComponent_show_global_message(t('rulefile_requirement_saved'), 'success');
        router_ref('rulefile_view_requirement', { id: requirement_id });
    }

    function _create_form_group(label_key, name, value, is_textarea = false, input_type = 'text') {
        const t = Translation_t;
        const form_group = Helpers_create_element('div', { class_name: 'form-group' });
        form_group.appendChild(Helpers_create_element('label', { attributes: { for: name }, text_content: t(label_key) }));
        
        let input;
        if (is_textarea) {
            input = Helpers_create_element('textarea', { 
                id: name, 
                class_name: 'form-control', 
                attributes: { name: name, rows: 4 } 
            });
            input.value = Array.isArray(value) ? value.join('\n') : (value || '');
            window.Helpers.init_auto_resize_for_textarea(input);
        } else {
            input = Helpers_create_element('input', { 
                id: name, 
                class_name: 'form-control', 
                attributes: { name: name, type: input_type }
            });
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
        const section_wrapper = Helpers_create_element('div', { class_name: 'audit-section' });
        section_wrapper.appendChild(Helpers_create_element('h2', { text_content: t('classification_title') }));
        section_wrapper.appendChild(_create_form_group('main_category_text', 'mainCategoryText', metadata?.mainCategory?.text));
        section_wrapper.appendChild(_create_form_group('sub_category_text', 'subCategoryText', metadata?.subCategory?.text));
        
        const current_state = local_getState();
        const pour_taxonomy = current_state.ruleFileContent.metadata.taxonomies.find(tax => tax.id === 'wcag22-pour');
        if (pour_taxonomy && pour_taxonomy.concepts) {
            const legend_text = pour_taxonomy.label || t('wcag_principles_title');
            section_wrapper.appendChild(Helpers_create_element('h2', { text_content: legend_text }));

        const fieldset = Helpers_create_element('div', { class_name: 'classification-group' }); 

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
            section_wrapper.appendChild(fieldset);
        }
        
        return section_wrapper;
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

    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        
        const requirement_id = params_ref?.id;
        const current_state = local_getState();
        const requirement = current_state?.ruleFileContent?.requirements[requirement_id];

        if (!requirement) {
            plate_element.appendChild(Helpers_create_element('h1', { text_content: t('error_internal') }));
            app_container_ref.appendChild(plate_element);
            return;
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: `${t('rulefile_edit_requirement_title')}: ${requirement.title}` }));
        
        form_element_ref = Helpers_create_element('form');
        form_element_ref.addEventListener('submit', handle_form_submit);
        
        form_element_ref.appendChild(_create_action_buttons('top'));

        const basic_info_section = Helpers_create_element('div', { class_name: 'audit-section' });
        basic_info_section.appendChild(Helpers_create_element('h2', { text_content: t('requirement_general_info_title') }));
        basic_info_section.appendChild(_create_form_group('requirement_title', 'title', requirement.title));
        basic_info_section.appendChild(_create_form_group('requirement_standard_reference_text', 'standardReferenceText', requirement.standardReference?.text));
        basic_info_section.appendChild(_create_form_group('requirement_standard_reference_url', 'standardReferenceUrl', requirement.standardReference?.url));
        form_element_ref.appendChild(basic_info_section);
        
        const help_texts_section = Helpers_create_element('div', { class_name: 'audit-section' });
        help_texts_section.appendChild(Helpers_create_element('h2', { text_content: t('help_texts_title') }));
        help_texts_section.appendChild(_create_form_group('requirement_expected_observation', 'expectedObservation', requirement.expectedObservation, true));
        help_texts_section.appendChild(_create_form_group('requirement_instructions', 'instructions', requirement.instructions, true));
        help_texts_section.appendChild(_create_form_group('requirement_exceptions', 'exceptions', requirement.exceptions, true));
        help_texts_section.appendChild(_create_form_group('requirement_common_errors', 'commonErrors', requirement.commonErrors, true));
        help_texts_section.appendChild(_create_form_group('requirement_tips', 'tips', requirement.tips, true));
        help_texts_section.appendChild(_create_form_group('requirement_examples', 'examples', requirement.examples, true));
        form_element_ref.appendChild(help_texts_section);

        const checks_section = Helpers_create_element('div', { class_name: 'audit-section checks-container-edit' });
        checks_section.appendChild(Helpers_create_element('h2', { text_content: t('checks_title') }));
        (requirement.checks || []).forEach(check => {
            const check_el = Helpers_create_element('div', { class_name: 'check-item-edit', attributes: { 'data-check-id': check.id }});
            check_el.appendChild(_create_form_group('check_condition_label', `check_${check.id}_condition`, check.condition, true));

            const logic_fieldset = Helpers_create_element('fieldset', { class_name: 'check-logic-group' });
            logic_fieldset.appendChild(Helpers_create_element('legend', { text_content: t('check_logic_title') }));
            const logic_and = Helpers_create_element('input', { id: `logic_${check.id}_and`, name: `check_${check.id}_logic`, value: 'AND', attributes: { type: 'radio' } });
            if (!check.logic || check.logic.toUpperCase() === 'AND') logic_and.checked = true;
            const logic_or = Helpers_create_element('input', { id: `logic_${check.id}_or`, name: `check_${check.id}_logic`, value: 'OR', attributes: { type: 'radio' } });
            if (check.logic?.toUpperCase() === 'OR') logic_or.checked = true;
            
            logic_fieldset.append(
                Helpers_create_element('div', { class_name: 'form-check', children: [logic_and, Helpers_create_element('label', { attributes: { for: `logic_${check.id}_and` }, text_content: t('check_logic_and') })] }),
                Helpers_create_element('div', { class_name: 'form-check', children: [logic_or, Helpers_create_element('label', { attributes: { for: `logic_${check.id}_or` }, text_content: t('check_logic_or') })] })
            );
            check_el.appendChild(logic_fieldset);

            const pc_container = Helpers_create_element('div', { class_name: 'pc-container-edit' });
            (check.passCriteria || []).forEach(pc => {
                const pc_el = Helpers_create_element('div', { class_name: 'pc-item-edit', attributes: { 'data-pc-id': pc.id } });
                pc_el.appendChild(_create_form_group('pass_criterion_label', `pc_${check.id}_${pc.id}_requirement`, pc.requirement, true));
                
                // --- DENNA RAD ÅTERINFÖRS NU KORREKT ---
                pc_el.appendChild(_create_form_group('failure_template_label', `pc_${check.id}_${pc.id}_failureTemplate`, pc.failureStatementTemplate, true));
                
                pc_container.appendChild(pc_el);
            });
            check_el.appendChild(pc_container);
            checks_section.appendChild(check_el);
        });
        form_element_ref.appendChild(checks_section);
        
        const all_content_types = current_state.ruleFileContent.metadata.contentTypes || [];
        const selected_content_types = requirement.contentType || [];
        form_element_ref.appendChild(_create_content_types_section(all_content_types, selected_content_types));
        
        form_element_ref.appendChild(_create_classification_section(requirement.metadata, requirement.classifications));
        form_element_ref.appendChild(_create_impact_section(requirement.metadata));
        
        form_element_ref.appendChild(_create_action_buttons('bottom'));

        plate_element.appendChild(form_element_ref);
        app_container_ref.appendChild(plate_element);

        form_element_ref.querySelectorAll('input[data-parent-id]').forEach(_update_parent_checkbox_state);
    }

    function destroy() {
        if (form_element_ref) {
            form_element_ref.removeEventListener('submit', handle_form_submit);
            const ct_section = form_element_ref.querySelector('.audit-section');
            if (ct_section) {
                ct_section.removeEventListener('change', _handle_content_type_change);
            }
        }
        app_container_ref.innerHTML = '';
        form_element_ref = null;
    }

    return { init, render, destroy };
})();