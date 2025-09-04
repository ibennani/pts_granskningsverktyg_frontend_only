// js/components/AddSampleFormComponent.js

export const AddSampleFormComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/add_sample_form_component.css';
    let form_container_ref;
    let on_sample_saved_callback;
    let discard_and_return_callback;
    
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_generate_uuid_v4, Helpers_load_css, Helpers_add_protocol_if_missing, Helpers_escape_html;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message;
    let AuditLogic_get_relevant_requirements_for_sample;

    // --- NYTT: Behöver en referens till routern för att navigera ---
    let router_ref_internal;

    let form_element;
    let category_container_element, category_fieldset_element;
    let sample_info_container_element, content_types_container_element;
    let sample_type_select, description_input, url_input, url_form_group_ref;
    
    let current_editing_sample_id = null;
    let original_content_types_on_load = [];
    let previous_sample_type_value = ""; 

    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (window.Translation?.t) ? window.Translation.t : (key) => `**${key}**`;
    }

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_escape_html = window.Helpers?.escape_html;
        Helpers_add_protocol_if_missing = window.Helpers?.add_protocol_if_missing;
        Helpers_generate_uuid_v4 = window.Helpers?.generate_uuid_v4;
        Helpers_load_css = window.Helpers?.load_css;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_clear_global_message = window.NotificationComponent?.clear_global_message;
        AuditLogic_get_relevant_requirements_for_sample = window.AuditLogic?.get_relevant_requirements_for_sample;
    }

    // --- UPPDATERAD INIT ---
    async function init(_form_container, _on_sample_saved_cb, _discard_cb, _getState, _dispatch, _StoreActionTypes, _router_ref) {
        assign_globals_once();
        form_container_ref = _form_container;
        on_sample_saved_callback = _on_sample_saved_cb;
        discard_and_return_callback = _discard_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        router_ref_internal = _router_ref; // Spara routern
        await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
    }

    function update_description_from_sample_type() {
        if (!sample_type_select || !description_input) return;
        
        const current_description = description_input.value.trim();
        const new_sample_type = sample_type_select.value;

        if (new_sample_type && (current_description === '' || current_description === previous_sample_type_value)) {
            description_input.value = new_sample_type;
        }
        previous_sample_type_value = new_sample_type;
    }

    function render(sample_id_to_edit = null) {
        const t = get_t_internally();
        current_editing_sample_id = sample_id_to_edit;
        const current_state = local_getState();
        const sample_data_for_edit = current_editing_sample_id ? current_state.samples.find(s => s.id === current_editing_sample_id) : null;

        original_content_types_on_load = sample_data_for_edit ? [...sample_data_for_edit.selectedContentTypes] : [];

        form_container_ref.innerHTML = '';
        const form_wrapper = Helpers_create_element('div', { class_name: 'add-sample-form' });
        
        form_element = Helpers_create_element('form');
        form_element.addEventListener('submit', handle_form_submit);

        category_container_element = Helpers_create_element('div', { class_name: 'form-group' });
        category_container_element.appendChild(Helpers_create_element('h2', { text_content: t('sample_category_title') }));
        category_fieldset_element = Helpers_create_element('fieldset', { class_name: 'content-type-parent-group' }); 
        category_container_element.appendChild(category_fieldset_element);
        
        sample_info_container_element = Helpers_create_element('div', { class_name: 'form-group' });
        sample_info_container_element.appendChild(Helpers_create_element('h2', { text_content: t('sample_info_title')}));
        
        sample_type_select = Helpers_create_element('select', { id: 'sampleTypeSelect', class_name: 'form-control', attributes: { required: true, disabled: true }});
        sample_type_select.addEventListener('change', update_description_from_sample_type);

        description_input = Helpers_create_element('input', { id: 'sampleDescriptionInput', class_name: 'form-control', attributes: { type: 'text', required: true }});
        url_input = Helpers_create_element('input', { id: 'sampleUrlInput', class_name: 'form-control', attributes: { type: 'url' }});
        
        url_form_group_ref = Helpers_create_element('div', { class_name: 'form-group', children: [Helpers_create_element('label', { attributes: {for: 'sampleUrlInput'}, text_content: t('url') }), url_input]});

        sample_info_container_element.append(
            Helpers_create_element('div', { class_name: 'form-group', children: [Helpers_create_element('label', { attributes: {for: 'sampleTypeSelect'}, text_content: t('sample_type_label') + '*' }), sample_type_select]}),
            Helpers_create_element('div', { class_name: 'form-group', children: [Helpers_create_element('label', { attributes: {for: 'sampleDescriptionInput'}, text_content: t('description') + '*' }), description_input]}),
            url_form_group_ref
        );

        content_types_container_element = Helpers_create_element('div', { class_name: 'content-types-group' });
        content_types_container_element.appendChild(Helpers_create_element('h2', { text_content: t('content_types')}));
        content_types_container_element.appendChild(Helpers_create_element('p', { text_content: t('content_types_instruction'), style: { 'margin-top': '0', 'color': 'var(--text-color-muted)' } }));
        content_types_container_element.addEventListener('change', _handleCheckboxChange);
        
        form_element.append(category_container_element, sample_info_container_element, content_types_container_element);
        
        const actions_div = Helpers_create_element('div', { class_name: 'form-actions' });
        const save_button = Helpers_create_element('button', { class_name: ['button', 'button-primary'], attributes: { type: 'submit' }});
        save_button.innerHTML = `<span>${current_editing_sample_id ? t('save_changes_button') : t('save_sample_button')}</span>` + Helpers_get_icon_svg(current_editing_sample_id ? 'save' : 'add');
        actions_div.appendChild(save_button);
        
        form_element.appendChild(actions_div);
        form_wrapper.appendChild(form_element);
        form_container_ref.appendChild(form_wrapper);

        populate_form_fields(sample_data_for_edit);
    }

    function populate_form_fields(sample_data = null) {
        const t = Translation_t;
        const current_state = local_getState();
        const sample_config = current_state.ruleFileContent.metadata.samples || {};
        const sample_categories = sample_config.sampleCategories || [];

        category_fieldset_element.innerHTML = '';
        category_fieldset_element.appendChild(Helpers_create_element('legend', { 
            text_content: t('sample_category_title'),
            class_name: 'visually-hidden'
        }));
        
        sample_categories.forEach((cat, index) => {
            const radio_id = `sample-cat-${cat.id}`;
            const radio_wrapper = Helpers_create_element('div', { class_name: ['form-check', 'content-type-child-item'] });
            const radio = Helpers_create_element('input', { id: radio_id, class_name: 'form-check-input', attributes: { type: 'radio', name: 'sampleCategory', value: cat.id, required: true }});
            
            if ((sample_data && sample_data.sampleCategory === cat.id) || (!sample_data && index === 0)) {
                radio.checked = true;
            }
            radio.addEventListener('change', () => on_category_change(cat.id));
            
            const label = Helpers_create_element('label', { attributes: { for: radio_id }, text_content: cat.text });
            radio_wrapper.append(radio, label);
            category_fieldset_element.appendChild(radio_wrapper);
        });

        description_input.value = sample_data?.description || "";
        url_input.value = sample_data?.url || "";
        
        render_content_types(sample_data);

        const selected_cat_id = sample_data?.sampleCategory || sample_categories[0]?.id;
        if (selected_cat_id) {
            on_category_change(selected_cat_id, sample_data?.sampleType);
        }

        previous_sample_type_value = sample_type_select.value;
    }
    
    function on_category_change(selected_cat_id, preselected_sample_type = null) {
        const current_state = local_getState();
        const sample_categories = current_state.ruleFileContent.metadata.samples.sampleCategories;
        const selected_category = sample_categories.find(c => c.id === selected_cat_id);

        if (!selected_category) return;

        sample_type_select.innerHTML = `<option value="">${Translation_t('select_option')}</option>`;
        (selected_category.categories || []).forEach(subcat => {
            sample_type_select.appendChild(Helpers_create_element('option', { value: subcat.text, text_content: subcat.text }));
        });
        sample_type_select.disabled = false;
        
        if (preselected_sample_type) {
            sample_type_select.value = preselected_sample_type;
        }

        if (url_form_group_ref) {
            url_form_group_ref.style.display = selected_category.hasUrl ? '' : 'none';
            if (!selected_category.hasUrl) {
                url_input.value = '';
            }
        }
    }
    
    function render_content_types(sample_data) {
        const existing_fieldsets = content_types_container_element.querySelectorAll('fieldset');
        existing_fieldsets.forEach(fs => fs.remove());
        const current_state = local_getState();
        const groupedContentTypes = current_state?.ruleFileContent?.metadata?.contentTypes || [];
        groupedContentTypes.forEach(group => {
            const fieldset = Helpers_create_element('fieldset', { class_name: 'content-type-parent-group' });
            const legend = Helpers_create_element('legend');
            const parent_id = `ct-parent-${group.id}`;
            const parent_checkbox = Helpers_create_element('input', { id: parent_id, class_name: 'form-check-input', attributes: { type: 'checkbox', 'data-parent-id': group.id } });
            const parent_label = Helpers_create_element('label', { attributes: { for: parent_id }, text_content: group.text });
            legend.append(parent_checkbox, parent_label);
            fieldset.appendChild(legend);
            (group.types || []).forEach(child => {
                const child_id = `ct-child-${child.id}`;
                const child_wrapper = Helpers_create_element('div', { class_name: 'form-check content-type-child-item' });
                const child_checkbox = Helpers_create_element('input', { id: child_id, class_name: 'form-check-input', attributes: { type: 'checkbox', name: 'selectedContentTypes', value: child.id, 'data-child-for': group.id } });
                const child_label = Helpers_create_element('label', { attributes: { for: child_id }, text_content: child.text });
                child_wrapper.append(child_checkbox, child_label);
                fieldset.appendChild(child_wrapper);
                if (child.description) {
                    const desc_div = Helpers_create_element('div', { class_name: 'content-type-description markdown-content' });
                    if (typeof marked !== 'undefined' && typeof window.Helpers.escape_html === 'function') {
                        const renderer = new marked.Renderer();
                        renderer.html = (html_token) => {
                            const text_to_escape = (typeof html_token === 'object' && html_token !== null && typeof html_token.text === 'string')
                                ? html_token.text
                                : String(html_token || '');
                            return window.Helpers.escape_html(text_to_escape);
                        };
                        renderer.link = (href, title, text) => `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                        desc_div.innerHTML = marked.parse(child.description, { renderer: renderer });
                    } else {
                        desc_div.textContent = child.description;
                    }
                    fieldset.appendChild(desc_div);
                }
            });
            content_types_container_element.appendChild(fieldset);
        });
        const all_child_checkboxes = content_types_container_element.querySelectorAll('input[data-child-for]');
        all_child_checkboxes.forEach(cb => {
            cb.checked = sample_data?.selectedContentTypes?.includes(cb.value) || false;
        });
        const all_parent_checkboxes = content_types_container_element.querySelectorAll('input[data-parent-id]');
        all_parent_checkboxes.forEach(_updateParentCheckboxState);
    }

    function _updateParentCheckboxState(parentCheckbox) {
        if (!content_types_container_element) return;
        const parentId = parentCheckbox.dataset.parentId;
        const children = content_types_container_element.querySelectorAll(`input[data-child-for="${parentId}"]`);
        if (children.length === 0) return;
        const allChecked = Array.from(children).every(child => child.checked);
        const someChecked = Array.from(children).some(child => child.checked);
        parentCheckbox.checked = allChecked;
        parentCheckbox.indeterminate = someChecked && !allChecked;
    }

    function _handleCheckboxChange(event) {
        const target = event.target;
        if (target.type !== 'checkbox' || !content_types_container_element) return;
        if (target.dataset.parentId) {
            const parentId = target.dataset.parentId;
            const isChecked = target.checked;
            content_types_container_element.querySelectorAll(`input[data-child-for="${parentId}"]`).forEach(child => child.checked = isChecked);
        } else if (target.dataset.childFor) {
            const parentId = target.dataset.childFor;
            const parentCheckbox = content_types_container_element.querySelector(`input[data-parent-id="${parentId}"]`);
            if (parentCheckbox) _updateParentCheckboxState(parentCheckbox);
        }
    }

    function handle_form_submit(event) {
        event.preventDefault();
        const t = Translation_t;
        NotificationComponent_clear_global_message();
        
        const selected_category_radio = form_element.querySelector('input[name="sampleCategory"]:checked');
        const sample_category = selected_category_radio ? selected_category_radio.value : null;
        const sample_type = sample_type_select.value;
        const description = description_input.value.trim();
        let url_val = url_input.value.trim();
        const selected_content_types = Array.from(content_types_container_element.querySelectorAll('input[name="selectedContentTypes"]:checked')).map(cb => cb.value);

        if (!sample_category) { NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('sample_category_title')}), 'error'); return; }
        if (!sample_type) { NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('sample_type_label')}), 'error'); sample_type_select.focus(); return; }
        if (!description) { NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('description')}), 'error'); description_input.focus(); return; }
        if (selected_content_types.length === 0) { NotificationComponent_show_global_message(t('error_min_one_content_type'), 'error'); return; }
        if (url_val) { url_val = Helpers_add_protocol_if_missing(url_val); }

        const sample_payload_data = {
            sampleCategory: sample_category,
            sampleType: sample_type,
            description: description,
            url: url_val,
            selectedContentTypes: selected_content_types
        };

        if (!current_editing_sample_id) {
            _perform_save(sample_payload_data);
            return;
        }

        const original_set = new Set(original_content_types_on_load);
        const new_set = new Set(selected_content_types);
        const are_sets_equal = original_set.size === new_set.size && [...original_set].every(value => new_set.has(value));

        if (are_sets_equal) {
            _perform_save(sample_payload_data);
        } else {
            // ÄNDRING: Istället för modal, mellanlagra och navigera
            _stage_changes_and_navigate(sample_payload_data);
        }
    }
    
    // --- NY FUNKTION ---
    function _stage_changes_and_navigate(sample_payload_data) {
        const current_state = local_getState();
        const rule_file = current_state.ruleFileContent;
        const sample_being_edited = current_state.samples.find(s => s.id === current_editing_sample_id);

        const old_relevant_reqs = new Set(AuditLogic_get_relevant_requirements_for_sample(rule_file, { ...sample_being_edited, selectedContentTypes: original_content_types_on_load }).map(r => r.id));
        const new_relevant_reqs = new Set(AuditLogic_get_relevant_requirements_for_sample(rule_file, sample_payload_data).map(r => r.id));

        const added_req_ids = [...new_relevant_reqs].filter(id => !old_relevant_reqs.has(id));
        const removed_req_ids = [...old_relevant_reqs].filter(id => !new_relevant_reqs.has(id));

        const data_will_be_lost = removed_req_ids.some(id => sample_being_edited.requirementResults[id]);

        const pending_changes_payload = {
            sampleId: current_editing_sample_id,
            updatedSampleData: sample_payload_data,
            analysis: {
                added_reqs: added_req_ids,
                removed_reqs: removed_req_ids,
                data_will_be_lost: data_will_be_lost
            }
        };

        local_dispatch({
            type: local_StoreActionTypes.STAGE_SAMPLE_CHANGES,
            payload: pending_changes_payload
        });

        router_ref_internal('confirm_sample_edit');
    }


    function _perform_save(sample_payload_data) {
        const t = Translation_t;
        if (current_editing_sample_id) {
            local_dispatch({ type: local_StoreActionTypes.UPDATE_SAMPLE, payload: { sampleId: current_editing_sample_id, updatedSampleData: sample_payload_data } });
            NotificationComponent_show_global_message(t('sample_updated_successfully'), "success");
        } else {
            const new_sample_object = { ...sample_payload_data, id: Helpers_generate_uuid_v4(), requirementResults: {} };
            local_dispatch({ type: local_StoreActionTypes.ADD_SAMPLE, payload: new_sample_object });
            NotificationComponent_show_global_message(t('sample_added_successfully'), "success");
        }
        current_editing_sample_id = null;
        original_content_types_on_load = [];
        on_sample_saved_callback();
    }

    function destroy() {
        if (form_element) form_element.removeEventListener('submit', handle_form_submit);
        if (sample_type_select) sample_type_select.removeEventListener('change', update_description_from_sample_type);
        if (content_types_container_element) content_types_container_element.removeEventListener('change', _handleCheckboxChange);
        form_element = null;
    }

    return { 
        init, 
        render, 
        destroy
    };
})();