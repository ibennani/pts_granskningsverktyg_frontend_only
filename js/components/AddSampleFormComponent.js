export const AddSampleFormComponent = (function () {
    'use-strict';
    console.log("[AddSampleFormComponent.js] FILE PARSED AND IIFE EXECUTING"); 

    const CSS_PATH = 'css/components/add_sample_form_component.css';
    let form_container_ref;
    let on_sample_saved_callback;
    let toggle_visibility_callback;
    
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_generate_uuid_v4, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message;

    let form_element;
    let page_type_select, description_input, url_input;
    let content_types_group_element;
    let content_type_checkboxes = [];
    let current_editing_sample_id = null;
    let save_button_text_span; 
    let save_button_icon_span; 
    let previous_page_type_value = "";

    function assign_globals() {
        // console.log("[AddSampleFormComponent.js] assign_globals CALLED");
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

        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
            if (!State_getCurrentAudit || !State_setCurrentAudit) {
                console.error("AddSampleForm: One or more State functions are missing!"); all_assigned = false;
            }
        } else { console.error("AddSampleForm: State module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message) {
                console.error("AddSampleForm: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("AddSampleForm: NotificationComponent module is missing!"); all_assigned = false; }
        // console.log("[AddSampleFormComponent.js] assign_globals COMPLETED, all_assigned:", all_assigned);
        return all_assigned;
    }

    async function init(_form_container, _on_sample_saved_cb, _toggle_visibility_cb) {
        // console.log("[AddSampleFormComponent.js] INIT CALLED");
        if (!assign_globals()) { 
            console.error("AddSampleFormComponent: Failed to assign global dependencies in init. Component functionality will be impaired.");
        }
        form_container_ref = _form_container;
        on_sample_saved_callback = _on_sample_saved_cb;
        toggle_visibility_callback = _toggle_visibility_cb;
        
        if (Helpers_load_css) { 
             try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    // console.log("[AddSampleFormComponent.js] Loading CSS:", CSS_PATH);
                    await Helpers_load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for AddSampleFormComponent:", error);
            }
        } else {
            console.warn("[AddSampleFormComponent.js] Helpers_load_css not available, cannot load component CSS.");
        }
        // console.log("[AddSampleFormComponent.js] INIT COMPLETED");
    }
    
    function update_description_from_page_type() {
        if (page_type_select && description_input && NotificationComponent_show_global_message && Translation_t) {
            const current_description = description_input.value.trim();
            const new_page_type = page_type_select.value;
            if (new_page_type && (current_description === '' || current_description === previous_page_type_value)) {
                description_input.value = new_page_type;
                if (new_page_type !== current_description && new_page_type !== '') { 
                    NotificationComponent_show_global_message(Translation_t('sample_description_auto_filled'), 'info');
                }
            }
            previous_page_type_value = new_page_type; 
        }
    }

    function populate_form_fields(sample_data_to_populate_with = null) {
        // console.log("[AddSampleFormComponent.js] populate_form_fields CALLED. Editing sample:", sample_data_to_populate_with ? sample_data_to_populate_with.id : "No (New Sample)");
        if (!State_getCurrentAudit || !Translation_t || !Helpers_create_element || !Helpers_generate_uuid_v4) {
            console.error("AddSampleForm: Core dependencies missing for populate_form_fields.");
            return;
        }
        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent || !current_audit.ruleFileContent.metadata) {
            console.error("AddSampleForm: Audit data or metadata for populating form is missing.");
            return;
        }

        if (page_type_select) {
            page_type_select.innerHTML = `<option value="">${Translation_t('select_option')}</option>`;
            (current_audit.ruleFileContent.metadata.pageTypes || []).forEach(pt => {
                const option = Helpers_create_element('option', { value: pt, text_content: pt });
                page_type_select.appendChild(option);
            });
        }
        
        if (content_types_group_element) {
            content_types_group_element.innerHTML = ''; 
            content_type_checkboxes = []; 
            
            if (!content_types_group_element.querySelector('legend')) {
                 content_types_group_element.appendChild(Helpers_create_element('legend', { text_content: Translation_t('content_types') }));
            }

            (current_audit.ruleFileContent.metadata.contentTypes || []).forEach(ct => {
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
            console.error("AddSampleForm: content_types_group_element is not defined in populate_form_fields.");
        }

        if (sample_data_to_populate_with) { 
            if (page_type_select) page_type_select.value = sample_data_to_populate_with.pageType || "";
            previous_page_type_value = page_type_select ? page_type_select.value : ""; 
            if (description_input) description_input.value = sample_data_to_populate_with.description || "";
            if (url_input) url_input.value = sample_data_to_populate_with.url || "";
            content_type_checkboxes.forEach(cb => {
                cb.checked = (sample_data_to_populate_with.selectedContentTypes || []).includes(cb.value);
            });
            if (save_button_text_span) save_button_text_span.textContent = Translation_t('save_changes_button');
            if (save_button_icon_span && Helpers_get_icon_svg) save_button_icon_span.innerHTML = Helpers_get_icon_svg('save', ['currentColor'], 18);
        } else { 
            if (page_type_select) page_type_select.value = "";
            previous_page_type_value = "";
            if (description_input) description_input.value = "";
            if (url_input) url_input.value = "";
            content_type_checkboxes.forEach(cb => cb.checked = false);
            if (save_button_text_span) save_button_text_span.textContent = Translation_t('save_sample_button');
            if (save_button_icon_span && Helpers_get_icon_svg) save_button_icon_span.innerHTML = Helpers_get_icon_svg('add', ['currentColor'], 18);
        }
    }
    
    function validate_and_save_sample(event) {
        event.preventDefault();
        console.log("[AddSampleForm] validate_and_save_sample CALLED"); // LOGG 1

        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();

        const page_type = page_type_select.value;
        const description = description_input.value.trim();
        let url_val = url_input.value.trim();
        const selected_content_types = content_type_checkboxes.filter(cb => cb.checked).map(cb => cb.value);

        console.log("[AddSampleForm] Form data:", { page_type, description, url_val, selected_content_types }); // LOGG 2

        let is_valid = true;
        if (!page_type) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('field_is_required', {fieldName: Translation_t('page_type')}), 'error');
            if(page_type_select) page_type_select.focus();
            is_valid = false;
        }
        if (!description && is_valid) { 
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('field_is_required', {fieldName: Translation_t('description')}), 'error');
            if(description_input) description_input.focus();
            is_valid = false;
        }
        if (selected_content_types.length === 0 && is_valid) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('error_min_one_content_type'), 'error');
            if(content_type_checkboxes.length > 0) content_type_checkboxes[0].focus();
            is_valid = false;
        }

        console.log("[AddSampleForm] Validation result, is_valid:", is_valid); // LOGG 3

        if (!is_valid) return;

        if (url_val && Helpers_add_protocol_if_missing) {
            url_val = Helpers_add_protocol_if_missing(url_val);
        }

        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (!current_audit) { 
            console.error("[AddSampleForm] current_audit is NULL when trying to save sample!");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('error_no_active_audit', {defaultValue: "Error: No active audit."}), 'error');
            return;
        }

        const updated_sample_form_data = {
            pageType: page_type, 
            description: description, 
            url: url_val,
            selectedContentTypes: selected_content_types,
        };

        if (current_editing_sample_id) {
            const sample_index = current_audit.samples.findIndex(s => s.id === current_editing_sample_id);
            if (sample_index > -1) {
                updated_sample_form_data.requirementResults = current_audit.samples[sample_index].requirementResults || {};
                current_audit.samples[sample_index] = { ...current_audit.samples[sample_index], ...updated_sample_form_data }; 
                console.log("[AddSampleForm] SAMPLE UPDATED:", current_audit.samples[sample_index]); // LOGG 4a
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('sample_updated_successfully'), "success");
            } else { 
                console.error("[AddSampleForm] Failed to find sample to update with ID:", current_editing_sample_id);
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('error_sample_update_failed', {defaultValue: "Error: Could not update sample."}), "error"); 
                return; 
            }
        } else {
            updated_sample_form_data.id = Helpers_generate_uuid_v4 ? Helpers_generate_uuid_v4() : Date.now().toString();
            updated_sample_form_data.requirementResults = {}; 
            if (!Array.isArray(current_audit.samples)) {
                current_audit.samples = [];
            }
            current_audit.samples.push(updated_sample_form_data);
            console.log("[AddSampleForm] NEW SAMPLE PUSHED:", updated_sample_form_data); // LOGG 4b
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('sample_added_successfully'), "success");
        }
        
        if(State_setCurrentAudit) {
             State_setCurrentAudit(current_audit);
             console.log("[AddSampleForm] current_audit SAVED to State. Samples count:", current_audit.samples.length, "Samples:", JSON.parse(JSON.stringify(current_audit.samples))); // LOGG 5
        }
        current_editing_sample_id = null; 
        if (form_element) form_element.reset(); 
        previous_page_type_value = ""; 
        populate_form_fields(); 

        if (on_sample_saved_callback) { 
            console.log("[AddSampleForm] Calling on_sample_saved_callback"); // LOGG 6
            on_sample_saved_callback(); 
        }
        console.log("[AddSampleForm] validate_and_save_sample COMPLETED"); // LOGG 7
    }

    function render(sample_id_to_edit = null) {
        // console.log("[AddSampleFormComponent.js] RENDER CALLED. Editing sample ID:", sample_id_to_edit);
        if (!form_container_ref || !Helpers_create_element || !Translation_t || !State_getCurrentAudit) {
            console.error("AddSampleForm: Core dependencies missing for render. Has init completed?");
            if(form_container_ref) form_container_ref.innerHTML = "<p>Kunde inte rendera formulär på grund av saknade beroenden.</p>";
            return;
        }
        form_container_ref.innerHTML = ''; 
        current_editing_sample_id = sample_id_to_edit;

        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent) {
            form_container_ref.textContent = Translation_t ? Translation_t('error_no_rulefile_for_form', {defaultValue: "Rule file missing."}) : "Rule file missing.";
            return;
        }
        
        let sample_data_for_edit = null; 
        if (current_editing_sample_id && current_audit.samples) {
            sample_data_for_edit = current_audit.samples.find(s => s.id === current_editing_sample_id);
        }
        // console.log("[AddSampleFormComponent.js] sample_data_for_edit (in render before populate):", sample_data_for_edit);


        const form_wrapper = Helpers_create_element('div', { class_name: 'add-sample-form' });
        const form_title_text = current_editing_sample_id ? Translation_t('edit_sample') : Translation_t('add_new_sample');
        form_wrapper.appendChild(Helpers_create_element('h2', { text_content: form_title_text }));
        form_element = Helpers_create_element('form');
        form_element.addEventListener('submit', validate_and_save_sample);

        const page_type_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        page_type_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'pageTypeSelect'}, text_content: Translation_t('page_type') + '*' }));
        page_type_select = Helpers_create_element('select', { id: 'pageTypeSelect', class_name: 'form-control', attributes: { required: true }});
        page_type_select.addEventListener('change', update_description_from_page_type);
        page_type_group_div.appendChild(page_type_select);
        form_element.appendChild(page_type_group_div);

        const description_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        description_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'sampleDescriptionInput'}, text_content: Translation_t('description') + '*' }));
        description_input = Helpers_create_element('input', { id: 'sampleDescriptionInput', class_name: 'form-control', attributes: { type: 'text', required: true }});
        description_group_div.appendChild(description_input);
        form_element.appendChild(description_group_div);
        
        const url_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        url_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'sampleUrlInput'}, text_content: Translation_t('url') }));
        url_input = Helpers_create_element('input', { id: 'sampleUrlInput', class_name: 'form-control', attributes: { type: 'url' }});
        url_group_div.appendChild(url_input);
        form_element.appendChild(url_group_div);

        content_types_group_element = Helpers_create_element('fieldset', { class_name: 'form-group content-types-group' });
        form_element.appendChild(content_types_group_element);
        
        const actions_div = Helpers_create_element('div', { class_name: 'form-actions' });
        save_button_text_span = Helpers_create_element('span'); 
        save_button_icon_span = Helpers_create_element('span');
        const save_button = Helpers_create_element('button', {
            id: 'save-sample-btn',
            class_name: ['button', 'button-primary'],
            attributes: { type: 'submit' }
        });
        save_button.appendChild(save_button_icon_span); 
        save_button.appendChild(save_button_text_span); 
        actions_div.appendChild(save_button);

        const show_list_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            attributes: { type: 'button' }, 
            html_content: Helpers_get_icon_svg('list', ['currentColor'], 18) + `<span>${Translation_t('show_existing_samples')}</span>`
        });
        show_list_button.addEventListener('click', () => {
            current_editing_sample_id = null; 
            if (toggle_visibility_callback) toggle_visibility_callback(false);
        });
        actions_div.appendChild(show_list_button);
        form_element.appendChild(actions_div);

        form_wrapper.appendChild(form_element);
        form_container_ref.appendChild(form_wrapper);

        populate_form_fields(sample_data_for_edit); 
        // console.log("[AddSampleFormComponent.js] RENDER COMPLETED");
    }

    function destroy() { 
        form_element = null; page_type_select = null; description_input = null; url_input = null;
        content_types_group_element = null; content_type_checkboxes = [];
        save_button_text_span = null; save_button_icon_span = null; previous_page_type_value = ""; current_editing_sample_id = null;
    }

    return { init, render, destroy };
})();