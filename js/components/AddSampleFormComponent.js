// js/components/AddSampleFormComponent.js

const AddSampleFormComponent_internal = (function () {
    'use-strict';

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
    let current_editing_sample_id = null; // Hålls internt i komponenten
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

    function assign_globals() {
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
        return all_assigned;
    }

    async function init(_form_container, _on_sample_saved_cb, _toggle_visibility_cb) {
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
                    await Helpers_load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for AddSampleFormComponent:", error);
            }
        } else {
            console.warn("[AddSampleFormComponent.js] Helpers_load_css not available, cannot load component CSS.");
        }
    }

    function update_description_from_page_type() {
        const t = get_t_internally();
        if (page_type_select && description_input && NotificationComponent_show_global_message && t) {
            const current_description = description_input.value.trim();
            const new_page_type = page_type_select.value;
            if (new_page_type && (current_description === '' || current_description === previous_page_type_value)) {
                description_input.value = new_page_type;
                if (new_page_type !== current_description && new_page_type !== '') { // Visa meddelande bara om värdet faktiskt ändrades och inte är tomt
                    NotificationComponent_show_global_message(t('sample_description_auto_filled'), 'info');
                }
            }
            previous_page_type_value = new_page_type;
        }
    }

    function populate_form_fields(sample_data_to_populate_with = null) {
        const t = get_t_internally();
        if (!State_getCurrentAudit || !t || !Helpers_create_element || !Helpers_generate_uuid_v4) {
            console.error("AddSampleForm: Core dependencies missing for populate_form_fields.");
            if (form_container_ref) {
                form_container_ref.innerHTML = `<p>${t('error_render_add_sample_form_deps_missing')}</p>`;
            }
            return;
        }
        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent || !current_audit.ruleFileContent.metadata) {
            console.error("AddSampleForm: Audit data or metadata for populating form is missing.");
            if (form_container_ref) {
                form_container_ref.innerHTML = `<p>${t('error_no_rulefile_for_form')}</p>`; // Generic error
            }
            return;
        }

        if (page_type_select) { // Kontrollera att elementet finns
            page_type_select.innerHTML = `<option value="">${t('select_option')}</option>`;
            (current_audit.ruleFileContent.metadata.pageTypes || []).forEach(pt => {
                const option = Helpers_create_element('option', { value: pt, text_content: pt });
                page_type_select.appendChild(option);
            });
        }

        if (content_types_group_element) { // Kontrollera att elementet finns
            content_types_group_element.innerHTML = ''; // Rensa tidigare
            content_type_checkboxes = []; // Återställ arrayen

            // Skapa legend om den inte redan finns (t.ex. om render körs flera ggr)
            if (!content_types_group_element.querySelector('legend')) {
                 content_types_group_element.appendChild(Helpers_create_element('legend', { text_content: t('content_types') }));
            }

            (current_audit.ruleFileContent.metadata.contentTypes || []).forEach(ct => {
                const safe_ct_id = String(ct.id).replace(/[^a-zA-Z0-9-_]/g, ''); // Säkerställ ID
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

        // Fyll fält om vi redigerar, annars återställ
        if (sample_data_to_populate_with) {
            if (page_type_select) page_type_select.value = sample_data_to_populate_with.pageType || "";
            previous_page_type_value = page_type_select ? page_type_select.value : ""; // Sätt initialvärde
            if (description_input) description_input.value = sample_data_to_populate_with.description || "";
            if (url_input) url_input.value = sample_data_to_populate_with.url || "";
            content_type_checkboxes.forEach(cb => {
                cb.checked = (sample_data_to_populate_with.selectedContentTypes || []).includes(cb.value);
            });
            if (save_button_text_span_ref) save_button_text_span_ref.textContent = t('save_changes_button');
            if (save_button_icon_span_ref && Helpers_get_icon_svg) save_button_icon_span_ref.innerHTML = Helpers_get_icon_svg('save', ['currentColor'], 18);
        } else { // Återställ för nytt stickprov
            if (page_type_select) page_type_select.value = "";
            previous_page_type_value = ""; // Återställ
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

        // Säkerställ att formulärelementen är definierade
        if (!page_type_select || !description_input || !url_input || !content_type_checkboxes) {
            console.error("AddSampleForm: Form elements not initialized before save.");
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
        if (!description && is_valid) { // Kontrollera bara om föregående var OK
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('field_is_required', {fieldName: t('description')}), 'error');
            if(description_input) description_input.focus();
            is_valid = false;
        }
        if (selected_content_types.length === 0 && is_valid) { // Kontrollera bara om föregående var OK
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_min_one_content_type'), 'error');
            if(content_type_checkboxes.length > 0) content_type_checkboxes[0].focus(); // Fokus på första checkboxen
            is_valid = false;
        }

        if (!is_valid) return;

        if (url_val && Helpers_add_protocol_if_missing) {
            url_val = Helpers_add_protocol_if_missing(url_val);
        }

        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (!current_audit) {
            console.error("[AddSampleForm] current_audit is NULL when trying to save sample!");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_no_active_audit', {defaultValue: "Error: No active audit."}), 'error');
            return;
        }

        const updated_sample_form_data = {
            pageType: page_type,
            description: description,
            url: url_val,
            selectedContentTypes: selected_content_types,
            // requirementResults kommer att ärvas eller skapas nytt
        };

        if (current_editing_sample_id) { // Om vi redigerar
            const sample_index = current_audit.samples.findIndex(s => s.id === current_editing_sample_id);
            if (sample_index > -1) {
                // Behåll befintliga requirementResults, men uppdatera resten
                updated_sample_form_data.requirementResults = current_audit.samples[sample_index].requirementResults || {};
                current_audit.samples[sample_index] = { ...current_audit.samples[sample_index], ...updated_sample_form_data };
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_updated_successfully'), "success");
            } else {
                console.error("[AddSampleForm] Failed to find sample to update with ID:", current_editing_sample_id);
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_sample_update_failed', {defaultValue: "Error: Could not update sample."}), "error");
                return; // Avbryt om vi inte kunde hitta stickprovet
            }
        } else { // Nytt stickprov
            updated_sample_form_data.id = Helpers_generate_uuid_v4 ? Helpers_generate_uuid_v4() : Date.now().toString();
            updated_sample_form_data.requirementResults = {}; // Tomma resultat för nytt stickprov
            if (!Array.isArray(current_audit.samples)) { // Säkerställ att samples är en array
                current_audit.samples = [];
            }
            current_audit.samples.push(updated_sample_form_data);
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_added_successfully'), "success");
        }

        if(State_setCurrentAudit) State_setCurrentAudit(current_audit);
        current_editing_sample_id = null; // Återställ redigerings-ID
        if (form_element) form_element.reset(); // Rensa formuläret
        previous_page_type_value = ""; // Återställ för autofill-logiken
        populate_form_fields(); // Återställ fälten till "nytt stickprov"-läge

        if (on_sample_saved_callback) {
            on_sample_saved_callback();
        }
    }

    function render(sample_id_to_edit = null) {
        const t = get_t_internally();
        if (!form_container_ref || !Helpers_create_element || !t || !State_getCurrentAudit) {
            console.error("AddSampleForm: Core dependencies missing for render. Has init completed?");
            if(form_container_ref) {
                 form_container_ref.innerHTML = `<p>${t('error_render_add_sample_form_deps_missing')}</p>`;
            }
            return;
        }
        form_container_ref.innerHTML = ''; // Rensa container
        current_editing_sample_id = sample_id_to_edit; // Sätt redigerings-ID

        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent) {
            form_container_ref.textContent = t('error_no_rulefile_for_form', {defaultValue: "Rule file missing. Cannot build form."});
            return;
        }

        let sample_data_for_edit = null;
        if (current_editing_sample_id && current_audit.samples) {
            sample_data_for_edit = current_audit.samples.find(s => s.id === current_editing_sample_id);
        }

        const form_wrapper = Helpers_create_element('div', { class_name: 'add-sample-form' });
        const form_title_text = current_editing_sample_id ? t('edit_sample') : t('add_new_sample');
        form_wrapper.appendChild(Helpers_create_element('h2', { text_content: form_title_text }));
        
        form_element = Helpers_create_element('form'); // Skapa <form>
        form_element.addEventListener('submit', validate_and_save_sample);

        // Page Type
        const page_type_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        page_type_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'pageTypeSelect'}, text_content: t('page_type') + '*' }));
        page_type_select = Helpers_create_element('select', { id: 'pageTypeSelect', class_name: 'form-control', attributes: { required: true }});
        page_type_select.innerHTML = `<option value="">${t('select_option')}</option>`; // Initial option
        page_type_select.addEventListener('change', update_description_from_page_type);
        page_type_group_div.appendChild(page_type_select);
        form_element.appendChild(page_type_group_div);

        // Description
        const description_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        description_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'sampleDescriptionInput'}, text_content: t('description') + '*' }));
        description_input = Helpers_create_element('input', { id: 'sampleDescriptionInput', class_name: 'form-control', attributes: { type: 'text', required: true }});
        description_group_div.appendChild(description_input);
        form_element.appendChild(description_group_div);

        // URL
        const url_group_div = Helpers_create_element('div', { class_name: 'form-group' });
        url_group_div.appendChild(Helpers_create_element('label', { attributes: {for: 'sampleUrlInput'}, text_content: t('url') }));
        url_input = Helpers_create_element('input', { id: 'sampleUrlInput', class_name: 'form-control', attributes: { type: 'url' }});
        url_group_div.appendChild(url_input);
        form_element.appendChild(url_group_div);

        // Content Types
        content_types_group_element = Helpers_create_element('fieldset', { class_name: 'form-group content-types-group' });
        // Legend och checkboxes läggs till i populate_form_fields
        form_element.appendChild(content_types_group_element);

        // Actions
        const actions_div = Helpers_create_element('div', { class_name: 'form-actions' });
        save_button_text_span_ref = Helpers_create_element('span');
        save_button_icon_span_ref = Helpers_create_element('span');

        const save_button = Helpers_create_element('button', {
            id: 'save-sample-btn',
            class_name: ['button', 'button-primary'],
            attributes: { type: 'submit' } // Viktigt för formulär-submit
        });
        save_button.appendChild(save_button_text_span_ref); // Text först
        save_button.appendChild(save_button_icon_span_ref); // Sedan ikon
        actions_div.appendChild(save_button);

        const show_list_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            attributes: { type: 'button' }, // Inte submit
            html_content: `<span>${t('show_existing_samples')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('list', ['currentColor'], 18) : '')
        });
        show_list_button.addEventListener('click', () => {
            current_editing_sample_id = null; // Återställ redigerings-ID när man byter till listan
            if (toggle_visibility_callback) toggle_visibility_callback(false); // Anropa callback för att visa listan
        });
        actions_div.appendChild(show_list_button);
        form_element.appendChild(actions_div);

        form_wrapper.appendChild(form_element); // Lägg till formuläret i wrappern
        form_container_ref.appendChild(form_wrapper); // Lägg till wrappern i DOM

        populate_form_fields(sample_data_for_edit); // Fyll i fält med data
    }
    
    // Lägg till current_editing_sample_id i destroy
    function destroy() {
        // Rensa eventuella lyssnare om de inte tas bort när elementen tas bort från DOM
        if (form_element) form_element.removeEventListener('submit', validate_and_save_sample);
        if (page_type_select) page_type_select.removeEventListener('change', update_description_from_page_type);
        
        // Nollställ referenser
        form_element = null;
        page_type_select = null;
        description_input = null;
        url_input = null;
        content_types_group_element = null;
        content_type_checkboxes = [];
        save_button_text_span_ref = null;
        save_button_icon_span_ref = null;
        previous_page_type_value = "";
        current_editing_sample_id = null; // Viktigt att nollställa denna
        // form_container_ref, on_sample_saved_callback, toggle_visibility_callback sätts vid init och behöver inte nollställas här
    }


    return { 
        init, 
        render, 
        destroy,
        get current_editing_sample_id() { return current_editing_sample_id; } // Exponera för SampleManagementView
    };
})();

export const AddSampleFormComponent = AddSampleFormComponent_internal;