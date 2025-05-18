// js/components/AddSampleFormComponent.js

const AddSampleFormComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/add_sample_form_component.css';
    let form_container_ref;
    let on_sample_saved_callback; 
    let toggle_visibility_callback;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes; // Ska sättas från init via föräldern

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_generate_uuid_v4, Helpers_load_css;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message;

    let form_element;
    let page_type_select, description_input, url_input;
    let content_types_group_element;
    let content_type_checkboxes = [];
    let current_editing_sample_id = null;
    let save_button_text_span_ref;
    let save_button_icon_span_ref;
    let previous_page_type_value = "";


    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = `**${key}**`;
                if (replacements) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (AddSampleForm t not found)";
            };
    }

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return true;

        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("AddSampleForm: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_generate_uuid_v4 = window.Helpers.generate_uuid_v4;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_add_protocol_if_missing || !Helpers_generate_uuid_v4 || !Helpers_load_css) {
                console.error("AddSampleForm: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("AddSampleForm: Helpers module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message) {
                console.error("AddSampleForm: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("AddSampleForm: NotificationComponent module is missing!"); all_assigned = false; }
        return all_assigned;
    }

    // **VIKTIG ÄNDRING HÄR:** Ta emot _StoreActionTypes som sista argument
    async function init(
        _form_container, 
        _on_sample_saved_cb, 
        _toggle_visibility_cb,
        _getState,
        _dispatch,
        _StoreActionTypes // Mottaget från föräldrakomponenten
    ) {
        assign_globals_once();
        form_container_ref = _form_container;
        on_sample_saved_callback = _on_sample_saved_cb;
        toggle_visibility_callback = _toggle_visibility_cb;

        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes; // Spara den medskickade referensen

        if (!local_StoreActionTypes) {
            console.error("[AddSampleFormComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined. Using fallback.");
            // Fallback om den av någon anledning inte skickades med (bör inte hända om föräldern är korrekt)
            local_StoreActionTypes = {
                ADD_SAMPLE: 'ADD_SAMPLE_ERROR_NO_ACTIONTYPES_PASSED',
                UPDATE_SAMPLE: 'UPDATE_SAMPLE_ERROR_NO_ACTIONTYPES_PASSED'
            };
        }

        if (Helpers_load_css) {
             try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for AddSampleFormComponent:", error);
            }
        } else {
            // console.warn("[AddSampleFormComponent.js] Helpers_load_css not available, cannot load component CSS.");
        }
        // console.log("[AddSampleFormComponent] Init complete. StoreActionTypes received:", local_StoreActionTypes);
    }

    function update_description_from_page_type() { /* ... som tidigare ... */ 
        const t = get_t_internally();
        if (page_type_select && description_input && NotificationComponent_show_global_message && t) {
            const current_description = description_input.value.trim();
            const new_page_type = page_type_select.value;
            if (new_page_type && (current_description === '' || current_description === previous_page_type_value)) {
                description_input.value = new_page_type;
                if (new_page_type !== current_description && new_page_type !== '') {
                    NotificationComponent_show_global_message(t('sample_description_auto_filled'), 'info');
                }
            }
            previous_page_type_value = new_page_type;
        }
    }

    function populate_form_fields(sample_data_to_populate_with = null) { /* ... som tidigare ... */ 
        const t = get_t_internally();
        if (!local_getState || !t || !Helpers_create_element || !Helpers_generate_uuid_v4) {
            console.error("AddSampleForm: Core dependencies (local_getState or helpers) missing for populate_form_fields.");
            if (form_container_ref) {
                form_container_ref.innerHTML = `<p>${t('error_render_add_sample_form_deps_missing')}</p>`;
            }
            return;
        }
        const current_global_state = local_getState(); 
        if (!current_global_state || !current_global_state.ruleFileContent || !current_global_state.ruleFileContent.metadata) {
            console.error("AddSampleForm: Audit data or metadata for populating form is missing from store.");
            if (form_container_ref) {
                form_container_ref.innerHTML = `<p>${t('error_no_rulefile_for_form')}</p>`;
            }
            return;
        }

        if (page_type_select) {
            page_type_select.innerHTML = `<option value="">${t('select_option')}</option>`;
            (current_global_state.ruleFileContent.metadata.pageTypes || []).forEach(pt => {
                const option = Helpers_create_element('option', { value: pt, text_content: pt });
                page_type_select.appendChild(option);
            });
        }

        if (content_types_group_element) {
            content_types_group_element.innerHTML = '';
            content_type_checkboxes = [];

            if (!content_types_group_element.querySelector('legend')) {
                 content_types_group_element.appendChild(Helpers_create_element('legend', { text_content: t('content_types') }));
            }

            (current_global_state.ruleFileContent.metadata.contentTypes || []).forEach(ct => {
                const safe_ct_id = String(ct.id).replace(/[^a-zA-Z0-9-_]/g, '');
                const field_id = `content-type-${safe_ct_id}-${Helpers_generate_uuid_v4().substring(0,4)}`;
                const div_wrapper = Helpers_create_element('div', { class_name: 'form-check' });
                const checkbox_input = Helpers_create_element('input', {
                    id: field_id,
                    class_name: 'form-check-input',
                    attributes: { type: 'checkbox', name: 'selectedContentTypes', value: ct.id }
                });
                const label_element = Helpers_create_element('label', {
                    attributes: { for: field_id },
                    text_content: ct.text
                });
                div_wrapper.appendChild(checkbox_input);
                div_wrapper.appendChild(label_element);
                content_types_group_element.appendChild(div_wrapper);
                content_type_checkboxes.push(checkbox_input);
            });
        } else {
            // console.error("AddSampleForm: content_types_group_element is not defined in populate_form_fields.");
        }

        if (sample_data_to_populate_with) {
            if (page_type_select) page_type_select.value = sample_data_to_populate_with.pageType || "";
            previous_page_type_value = page_type_select ? page_type_select.value : "";
            if (description_input) description_input.value = sample_data_to_populate_with.description || "";
            if (url_input) url_input.value = sample_data_to_populate_with.url || "";
            content_type_checkboxes.forEach(cb => {
                cb.checked = (sample_data_to_populate_with.selectedContentTypes || []).includes(cb.value);
            });
            if (save_button_text_span_ref) save_button_text_span_ref.textContent = t('save_changes_button');
            if (save_button_icon_span_ref && Helpers_get_icon_svg) save_button_icon_span_ref.innerHTML = Helpers_get_icon_svg('save', ['currentColor'], 18);
        } else {
            if (page_type_select) page_type_select.value = "";
            previous_page_type_value = "";
            if (description_input) description_input.value = "";
            if (url_input) url_input.value = "";
            content_type_checkboxes.forEach(cb => cb.checked = false);
            if (save_button_text_span_ref) save_button_text_span_ref.textContent = t('save_sample_button');
            if (save_button_icon_span_ref && Helpers_get_icon_svg) save_button_icon_span_ref.innerHTML = Helpers_get_icon_svg('add', ['currentColor'], 18);
        }
    }

    function validate_and_save_sample(event) {
        event.preventDefault();
        const t = get_t_internally();

        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();

        if (!page_type_select || !description_input || !url_input || !content_type_checkboxes || !local_dispatch || !local_StoreActionTypes) { // Kontrollera local_StoreActionTypes
            console.error("AddSampleForm: Form elements not initialized or dispatch/StoreActionTypes function missing before save.");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_render_add_sample_form_deps_missing'), 'error');
            return;
        }

        const page_type = page_type_select.value;
        const description = description_input.value.trim();
        let url_val = url_input.value.trim();
        const selected_content_types = content_type_checkboxes.filter(cb => cb.checked).map(cb => cb.value);

        let is_valid = true;
        if (!page_type) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('page_type')}), 'error');
            if(page_type_select) page_type_select.focus();
            is_valid = false;
        }
        if (!description && is_valid) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('description')}), 'error');
            if(description_input) description_input.focus();
            is_valid = false;
        }
        if (selected_content_types.length === 0 && is_valid) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_min_one_content_type'), 'error');
            if(content_type_checkboxes.length > 0) content_type_checkboxes[0].focus();
            is_valid = false;
        }

        if (!is_valid) return;

        if (url_val && Helpers_add_protocol_if_missing) {
            url_val = Helpers_add_protocol_if_missing(url_val);
        }

        const sample_payload_data = {
            pageType: page_type,
            description: description,
            url: url_val,
            selectedContentTypes: selected_content_types
        };

        if (current_editing_sample_id) {
            // console.log("[AddSampleFormComponent] Dispatching UPDATE_SAMPLE for ID:", current_editing_sample_id);
            if (!local_StoreActionTypes.UPDATE_SAMPLE) {
                console.error("[AddSampleFormComponent] local_StoreActionTypes.UPDATE_SAMPLE is undefined!");
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update sample is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.UPDATE_SAMPLE,
                payload: {
                    sampleId: current_editing_sample_id,
                    updatedSampleData: sample_payload_data
                }
            });
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_updated_successfully'), "success");
        } else {
            const new_sample_id = Helpers_generate_uuid_v4 ? Helpers_generate_uuid_v4() : Date.now().toString();
            const new_sample_object = {
                ...sample_payload_data,
                id: new_sample_id,
                requirementResults: {}
            };
            // console.log("[AddSampleFormComponent] Dispatching ADD_SAMPLE with new sample object:", new_sample_object);
             if (!local_StoreActionTypes.ADD_SAMPLE) {
                console.error("[AddSampleFormComponent] local_StoreActionTypes.ADD_SAMPLE is undefined!");
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for add sample is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.ADD_SAMPLE,
                payload: new_sample_object
            });
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_added_successfully'), "success");
        }

        current_editing_sample_id = null;
        if (form_element) form_element.reset();
        previous_page_type_value = "";
        populate_form_fields();

        if (on_sample_saved_callback) {
            on_sample_saved_callback();
        }
    }

    function render(sample_id_to_edit = null) {
        // ... (som tidigare, men använd local_getState) ...
        assign_globals_once();
        // console.log("[AddSampleFormComponent] Rendering. Editing ID:", sample_id_to_edit, "local_getState:", typeof local_getState);
        const t = get_t_internally();
        if (!form_container_ref || !Helpers_create_element || !t || !local_getState) {
            console.error("AddSampleForm: Core dependencies missing for render. Has init completed?");
            if(form_container_ref) {
                 form_container_ref.innerHTML = `<p>${t('error_render_add_sample_form_deps_missing')}</p>`;
            }
            return;
        }
        form_container_ref.innerHTML = ''; 
        current_editing_sample_id = sample_id_to_edit;

        const current_global_state = local_getState(); 
        if (!current_global_state || !current_global_state.ruleFileContent) {
            form_container_ref.textContent = t('error_no_rulefile_for_form', {defaultValue: "Rule file missing. Cannot build form."});
            return;
        }

        let sample_data_for_edit = null;
        if (current_editing_sample_id && current_global_state.samples) {
            sample_data_for_edit = current_global_state.samples.find(s => s.id === current_editing_sample_id);
        }

        const form_wrapper = Helpers_create_element('div', { class_name: 'add-sample-form' });
        const form_title_text = current_editing_sample_id ? t('edit_sample') : t('add_new_sample');
        form_wrapper.appendChild(Helpers_create_element('h2', { text_content: form_title_text }));
        
        form_element = Helpers_create_element('form');
        form_element.addEventListener('submit', validate_and_save_sample);

        const page_type_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        page_type_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'pageTypeSelect'}, text_content: t('page_type') + '*' }));
        page_type_select = Helpers_create_element('select', { id: 'pageTypeSelect', class_name: 'form-control', attributes: { required: true }});
        page_type_select.innerHTML = `<option value="">${t('select_option')}</option>`;
        page_type_select.addEventListener('change', update_description_from_page_type);
        page_type_group_div.appendChild(page_type_select);
        form_element.appendChild(page_type_group_div);

        const description_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        description_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'sampleDescriptionInput'}, text_content: t('description') + '*' }));
        description_input = Helpers_create_element('input', { id: 'sampleDescriptionInput', class_name: 'form-control', attributes: { type: 'text', required: true }});
        description_group_div.appendChild(description_input);
        form_element.appendChild(description_group_div);

        const url_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        url_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'sampleUrlInput'}, text_content: t('url') }));
        url_input = Helpers_create_element('input', { id: 'sampleUrlInput', class_name: 'form-control', attributes: { type: 'url' }});
        url_group_div.appendChild(url_input);
        form_element.appendChild(url_group_div);

        content_types_group_element = Helpers_create_element('fieldset', { class_name: 'form-group content-types-group' });
        form_element.appendChild(content_types_group_element);

        const actions_div = Helpers_create_element('div', { class_name: 'form-actions' });
        save_button_text_span_ref = Helpers_create_element('span');
        save_button_icon_span_ref = Helpers_create_element('span');

        const save_button = Helpers_create_element('button', {
            id: 'save-sample-btn',
            class_name: ['button', 'button-primary'],
            attributes: { type: 'submit' }
        });
        save_button.appendChild(save_button_text_span_ref);
        save_button.appendChild(save_button_icon_span_ref);
        actions_div.appendChild(save_button);

        const show_list_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            attributes: { type: 'button' },
            html_content: `<span>${t('show_existing_samples')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('list', ['currentColor'], 18) : '')
        });
        show_list_button.addEventListener('click', () => {
            if (toggle_visibility_callback) toggle_visibility_callback(false);
        });
        actions_div.appendChild(show_list_button);
        form_element.appendChild(actions_div);

        form_wrapper.appendChild(form_element);
        form_container_ref.appendChild(form_wrapper);

        populate_form_fields(sample_data_for_edit);
    }
    
    function destroy() { /* ... som tidigare ... */ 
        if (form_element) form_element.removeEventListener('submit', validate_and_save_sample);
        if (page_type_select) page_type_select.removeEventListener('change', update_description_from_page_type);
        
        form_element = null;
        page_type_select = null;
        description_input = null;
        url_input = null;
        content_types_group_element = null;
        content_type_checkboxes = [];
        save_button_text_span_ref = null;
        save_button_icon_span_ref = null;
        previous_page_type_value = "";
        current_editing_sample_id = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
    }

    return { 
        init, 
        render, 
        destroy,
        get current_editing_sample_id() { return current_editing_sample_id; }
    };
})();

export const AddSampleFormComponent = AddSampleFormComponent_internal;