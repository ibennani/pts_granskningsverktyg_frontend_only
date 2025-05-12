export const MetadataViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/metadata_view_component.css';
    let app_container_ref;
    let navigate_and_set_hash_ref; // Omdöpt från router_ref för tydlighet
    
    // Globala referenser tilldelas i init
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;


    let case_number_input, actor_name_input, actor_link_input, auditor_name_input, internal_comment_input;
    let global_message_element_ref;

    function assign_globals() {
        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("MetadataView: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_add_protocol_if_missing || !Helpers_load_css) {
                console.error("MetadataView: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("MetadataView: Helpers module is missing!"); all_assigned = false; }
        
        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
            if (!State_getCurrentAudit || !State_setCurrentAudit) {
                console.error("MetadataView: One or more State functions are missing!"); all_assigned = false;
            }
        } else { console.error("MetadataView: State module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
                console.error("MetadataView: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("MetadataView: NotificationComponent module is missing!"); all_assigned = false; }
        return all_assigned;
    }

    async function init(_app_container, _navigate_cb, _params) { // _navigate_cb är nu navigate_and_set_hash
        if (!assign_globals()) {
             console.error("MetadataViewComponent: Failed to assign global dependencies in init.");
        }
        app_container_ref = _app_container;
        navigate_and_set_hash_ref = _navigate_cb; 
        
        if(NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        
        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if(!link_tag) await Helpers_load_css(CSS_PATH);
            } catch (error) {
                console.warn("Failed to load CSS for MetadataViewComponent:", error);
            }
        }
    }

    function save_metadata() {
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (!current_audit) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('error_no_active_audit_to_save_metadata'), "error");
            return false;
        }

        if (current_audit.auditStatus !== 'not_started') {
            return true; 
        }
        
        let actor_link_value = actor_link_input.value.trim();
        if (actor_link_value && Helpers_add_protocol_if_missing) {
            actor_link_value = Helpers_add_protocol_if_missing(actor_link_value);
        }

        current_audit.auditMetadata = {
            caseNumber: case_number_input.value.trim(),
            actorName: actor_name_input.value.trim(),
            actorLink: actor_link_value,
            auditorName: auditor_name_input.value.trim(),
            internalComment: internal_comment_input.value.trim()
        };
        if(State_setCurrentAudit) State_setCurrentAudit(current_audit);
        return true;
    }

    function handle_submit(event) {
        event.preventDefault();
        if (save_metadata()) {
            if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message(); 
            if (navigate_and_set_hash_ref) { 
                navigate_and_set_hash_ref('sample_management');
            }
        }
    }

    function create_form_field(id, label_key, type = 'text', current_value = '', remove_placeholder = false) {
        const form_group = Helpers_create_element('div', { class_name: 'form-group' });
        const label = Helpers_create_element('label', { 
            attributes: { for: id },
            text_content: Translation_t(label_key)
        });
        
        let input_element;
        const attributes = { type: type };
        if (remove_placeholder) { /* Ingen placeholder */ }

        if (type === 'textarea') {
            input_element = Helpers_create_element('textarea', { 
                id: id, class_name: 'form-control', attributes: { rows: '3' }
            });
            input_element.value = current_value;
        } else {
            input_element = Helpers_create_element('input', { 
                id: id, class_name: 'form-control', attributes: attributes
            });
            input_element.value = current_value;
        }
        
        form_group.appendChild(label);
        form_group.appendChild(input_element);
        return { form_group, input_element };
    }

    function create_static_field(label_key, value) { /* ... (som tidigare) ... */ }

    function render() {
        if (!app_container_ref || !Helpers_create_element || !Translation_t || !State_getCurrentAudit) {
            console.error("MetadataView: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = "<p>Kunde inte rendera metadatavyn.</p>";
            return;
        }
        app_container_ref.innerHTML = '';

        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t("error_no_rulefile_loaded_for_metadata"), "error"); // Nyckel
            const back_button = Helpers_create_element('button', {
                text_content: Translation_t('upload_rule_file_title'), 
                class_name: ['button', 'button-default'],
                event_listeners: { click: () => { if(navigate_and_set_hash_ref) navigate_and_set_hash_ref('upload');} }
            });
            app_container_ref.appendChild(back_button);
            return;
        }
        
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate metadata-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if (NotificationComponent_show_global_message && Translation_t && 
                (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim())) {
                NotificationComponent_show_global_message(Translation_t('metadata_form_intro'), "info"); // Ny nyckel
            }
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: Translation_t('audit_metadata_title') }));
        plate_element.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: Translation_t('metadata_form_instruction') })); // Ny nyckel

        const form_container = Helpers_create_element('div', { class_name: 'metadata-form-container' });
        const form = Helpers_create_element('form');
        form.addEventListener('submit', handle_submit);

        const metadata = current_audit.auditMetadata || {};
        const is_editable = current_audit.auditStatus === 'not_started';

        if (is_editable) {
            // ... (skapande av form fields som tidigare, men använd Helpers_create_element och Translation_t)
            // Exempel för ett fält:
            const case_field = create_form_field('caseNumber', 'case_number', 'text', metadata.caseNumber);
            case_number_input = case_field.input_element;
            form.appendChild(case_field.form_group);
            // ... upprepa för actor_name, actor_link (med remove_placeholder=true), auditor_name, internal_comment ...
             const actor_field = create_form_field('actorName', 'actor_name', 'text', metadata.actorName); actor_name_input = actor_field.input_element; form.appendChild(actor_field.form_group);
            const actor_link_field = create_form_field('actorLink', 'actor_link', 'url', metadata.actorLink, true); actor_link_input = actor_link_field.input_element; form.appendChild(actor_link_field.form_group);
            const auditor_field = create_form_field('auditorName', 'auditor_name', 'text', metadata.auditorName); auditor_name_input = auditor_field.input_element; form.appendChild(auditor_field.form_group);
            const comment_field = create_form_field('internalComment', 'internal_comment', 'textarea', metadata.internalComment); internal_comment_input = comment_field.input_element; form.appendChild(comment_field.form_group);
            
            form_container.appendChild(form);
        } else { 
            // ... (visning av statisk data som tidigare, men använd Helpers_create_element och Translation_t) ...
        }
        
        plate_element.appendChild(form_container); 
        
        const actions_div = Helpers_create_element('div', { class_name: 'metadata-actions' });
        const submit_button_text = is_editable ? Translation_t('continue_to_samples') : Translation_t('view_samples_button'); // Nyckel
        const submit_button_icon = is_editable ? 'arrow_forward' : 'list';

        const submit_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            html_content: Helpers_get_icon_svg(submit_button_icon, ['currentColor'], 18) + `<span>${submit_button_text}</span>`
        });
        
        if (is_editable) {
            submit_button.setAttribute('type', 'submit');
            form.appendChild(actions_div); 
        } else {
            submit_button.addEventListener('click', (e) => {
                e.preventDefault(); 
                if (navigate_and_set_hash_ref) navigate_and_set_hash_ref('sample_management');
            });
            plate_element.appendChild(actions_div);
        }
        actions_div.appendChild(submit_button);
    }

    function destroy() { /* ... (som tidigare) ... */ }

    return { init, render, destroy };
})();