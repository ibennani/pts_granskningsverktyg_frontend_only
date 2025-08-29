// js/components/AddSampleFormComponent.js

const AddSampleFormComponent_internal = (function () {
    'use-strict';

    // --- BEROENDEN OCH VARIABLER (Korrekt deklarerade) ---
    const CSS_PATH = 'css/components/add_sample_form_component.css';
    let form_container_ref;
    let on_sample_saved_callback;
    let toggle_visibility_callback;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_generate_uuid_v4, Helpers_load_css;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message;

    // Se till att dessa är deklarerade i scopet så de kan nås av alla funktioner
    let form_element;
    let page_type_select, description_input, url_input;
    let content_types_container_element; // Korrekt deklarerad här
    let current_editing_sample_id = null;
    let save_button_text_span_ref;
    let save_button_icon_span_ref;
    let previous_page_type_value = "";

    function render(sample_id_to_edit = null) {
        assign_globals_once();
        const t = get_t_internally();
        current_editing_sample_id = sample_id_to_edit;
        const current_state = local_getState();
        
        let sample_data_for_edit = null;
        if (current_editing_sample_id) {
            sample_data_for_edit = current_state.samples.find(s => s.id === current_editing_sample_id);
        }
        
        // Rensa alltid containern och bygg upp DOM-strukturen från grunden
        form_container_ref.innerHTML = '';

        const form_wrapper = Helpers_create_element('div', { class_name: 'add-sample-form' });
        
        const form_title_text = current_editing_sample_id ? t('edit_sample') : t('add_new_sample');
        form_wrapper.appendChild(Helpers_create_element('h2', { text_content: form_title_text }));
        
        form_element = Helpers_create_element('form');
        form_element.addEventListener('submit', validate_and_save_sample);

        page_type_select = Helpers_create_element('select', { id: 'pageTypeSelect', class_name: 'form-control', attributes: { required: true }});
        page_type_select.addEventListener('change', update_description_from_page_type);
        description_input = Helpers_create_element('input', { id: 'sampleDescriptionInput', class_name: 'form-control', attributes: { type: 'text', required: true }});
        url_input = Helpers_create_element('input', { id: 'sampleUrlInput', class_name: 'form-control', attributes: { type: 'url' }});
        content_types_container_element = Helpers_create_element('div', { class_name: 'content-types-group' });
        content_types_container_element.addEventListener('change', _handleCheckboxChange);

        form_element.append(
            Helpers_create_element('div', { class_name: 'form-group', children: [Helpers_create_element('label', { attributes: {for: 'pageTypeSelect'}, text_content: t('page_type') + '*' }), page_type_select]}),
            Helpers_create_element('div', { class_name: 'form-group', children: [Helpers_create_element('label', { attributes: {for: 'sampleDescriptionInput'}, text_content: t('description') + '*' }), description_input]}),
            Helpers_create_element('div', { class_name: 'form-group', children: [Helpers_create_element('label', { attributes: {for: 'sampleUrlInput'}, text_content: t('url') }), url_input]}),
            content_types_container_element
        );

        const actions_div = Helpers_create_element('div', { class_name: 'form-actions' });
        const save_button = Helpers_create_element('button', { class_name: ['button', 'button-primary'], attributes: { type: 'submit' }});
        save_button_text_span_ref = Helpers_create_element('span');
        save_button_icon_span_ref = Helpers_create_element('span');
        save_button.append(save_button_text_span_ref, save_button_icon_span_ref);
        
        const show_list_button = Helpers_create_element('button', { class_name: ['button', 'button-default'], attributes: { type: 'button' }});
        show_list_button.innerHTML = `<span>${t('show_existing_samples')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('list', ['currentColor'], 18) : '');
        show_list_button.addEventListener('click', () => toggle_visibility_callback(false));
        
        actions_div.append(save_button, show_list_button);
        form_element.appendChild(actions_div);
        form_wrapper.appendChild(form_element);
        form_container_ref.appendChild(form_wrapper);

        // Uppdatera knappar
        save_button_text_span_ref.textContent = current_editing_sample_id ? t('save_changes_button') : t('save_sample_button');
        save_button_icon_span_ref.innerHTML = Helpers_get_icon_svg(current_editing_sample_id ? 'save' : 'add', ['currentColor'], 18);

        // **KORRIGERAD DEL:** Använder INTE den raderade funktionen
        content_types_container_element.innerHTML = '';
        content_types_container_element.appendChild(Helpers_create_element('h2', {text_content: t('content_types')}));
        
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
                    if (typeof marked !== 'undefined') {
                        desc_div.innerHTML = marked.parse(child.description);
                    } else {
                        desc_div.textContent = child.description;
                    }
                    fieldset.appendChild(desc_div);
                }
            });
            content_types_container_element.appendChild(fieldset);
        });

        populate_form_fields(sample_data_for_edit);
    }

    function _updateParentCheckboxState(parentCheckbox) {
        if (!content_types_container_element) return; // Säkerhetskontroll
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
        if (target.type !== 'checkbox' || !content_types_container_element) return; // Säkerhetskontroll

        if (target.dataset.parentId) {
            const parentId = target.dataset.parentId;
            const isChecked = target.checked;
            const children = content_types_container_element.querySelectorAll(`input[data-child-for="${parentId}"]`);
            children.forEach(child => child.checked = isChecked);
        } else if (target.dataset.childFor) {
            const parentId = target.dataset.childFor;
            const parentCheckbox = content_types_container_element.querySelector(`input[data-parent-id="${parentId}"]`);
            if (parentCheckbox) {
                _updateParentCheckboxState(parentCheckbox);
            }
        }
    }

    // --- BEFINTLIGA FUNKTIONER ---
    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (window.Translation?.t) ? window.Translation.t : (key) => `**${key}**`;
    }

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_add_protocol_if_missing = window.Helpers?.add_protocol_if_missing;
        Helpers_generate_uuid_v4 = window.Helpers?.generate_uuid_v4;
        Helpers_load_css = window.Helpers?.load_css;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_clear_global_message = window.NotificationComponent?.clear_global_message;
    }

    async function init(_form_container, _on_sample_saved_cb, _toggle_visibility_cb, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        form_container_ref = _form_container;
        on_sample_saved_callback = _on_sample_saved_cb;
        toggle_visibility_callback = _toggle_visibility_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (Helpers_load_css) {
             await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
        }
    }
    
    function update_description_from_page_type() {
        const t = get_t_internally();
        if (!page_type_select || !description_input) return;
        
        const current_description = description_input.value.trim();
        const new_page_type = page_type_select.value;

        if (new_page_type && (current_description === '' || current_description === previous_page_type_value)) {
            description_input.value = new_page_type;
            if (new_page_type !== current_description && new_page_type !== '') {
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_description_auto_filled'), 'info');
            }
        }
        previous_page_type_value = new_page_type;
    }

    function populate_form_fields(sample_data_to_populate_with = null) {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (!current_global_state?.ruleFileContent?.metadata) {
            console.error("AddSampleForm: Cannot populate form, metadata from rule file is missing.");
            return;
        }

        page_type_select.innerHTML = `<option value="">${t('select_option')}</option>`;
        (current_global_state.ruleFileContent.metadata.pageTypes || []).forEach(pt => {
            page_type_select.appendChild(Helpers_create_element('option', { value: pt, text_content: pt }));
        });

        if (sample_data_to_populate_with) {
            page_type_select.value = sample_data_to_populate_with.pageType || "";
            previous_page_type_value = page_type_select.value;
            description_input.value = sample_data_to_populate_with.description || "";
            url_input.value = sample_data_to_populate_with.url || "";
        } else {
            page_type_select.value = "";
            previous_page_type_value = "";
            description_input.value = "";
            url_input.value = "";
        }

        if (!content_types_container_element) {
            console.error("populate_form_fields called before content_types_container_element was created.");
            return;
        }

        const all_child_checkboxes = content_types_container_element.querySelectorAll('input[data-child-for]');
        all_child_checkboxes.forEach(cb => {
            cb.checked = sample_data_to_populate_with?.selectedContentTypes?.includes(cb.value) || false;
        });

        const all_parent_checkboxes = content_types_container_element.querySelectorAll('input[data-parent-id]');
        all_parent_checkboxes.forEach(parentCb => {
            _updateParentCheckboxState(parentCb);
        });
    }

    function validate_and_save_sample(event) {
        event.preventDefault();
        const t = get_t_internally();

        if (NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();

        const page_type = page_type_select.value;
        const description = description_input.value.trim();
        let url_val = url_input.value.trim();
        
        const selected_content_types = Array.from(
            content_types_container_element.querySelectorAll('input[data-child-for]:checked')
        ).map(cb => cb.value);

        if (!page_type) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('page_type')}), 'error');
            page_type_select.focus();
            return;
        }
        if (!description) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('description')}), 'error');
            description_input.focus();
            return;
        }
        if (selected_content_types.length === 0) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_min_one_content_type'), 'error');
            content_types_container_element.querySelector('input[type="checkbox"]')?.focus();
            return;
        }

        if (url_val) {
            url_val = Helpers_add_protocol_if_missing(url_val);
        }

        const sample_payload_data = {
            pageType: page_type,
            description: description,
            url: url_val,
            selectedContentTypes: selected_content_types
        };

        if (current_editing_sample_id) {
            local_dispatch({ type: local_StoreActionTypes.UPDATE_SAMPLE, payload: { sampleId: current_editing_sample_id, updatedSampleData: sample_payload_data } });
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_updated_successfully'), "success");
        } else {
            const new_sample_object = { ...sample_payload_data, id: Helpers_generate_uuid_v4(), requirementResults: {} };
            local_dispatch({ type: local_StoreActionTypes.ADD_SAMPLE, payload: new_sample_object });
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_added_successfully'), "success");
        }

        current_editing_sample_id = null;
        form_element.reset();
        previous_page_type_value = "";
        populate_form_fields();
        on_sample_saved_callback();
    }

    function destroy() {
        if (form_element) form_element.removeEventListener('submit', validate_and_save_sample);
        if (content_types_container_element) content_types_container_element.removeEventListener('change', _handleCheckboxChange);
        form_element = null;
        content_types_container_element = null;
        page_type_select = null;
        description_input = null;
        url_input = null;
        save_button_icon_span_ref = null;
        save_button_text_span_ref = null;
        current_editing_sample_id = null;
    }

    return { 
        init, 
        render, 
        destroy,
        get current_editing_sample_id() { return current_editing_sample_id; }
    };
})();

export const AddSampleFormComponent = AddSampleFormComponent_internal;