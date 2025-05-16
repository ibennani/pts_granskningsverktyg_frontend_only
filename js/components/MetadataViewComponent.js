// js/components/MetadataViewComponent.js

const MetadataViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/metadata_view_component.css';
    let app_container_ref;
    let navigate_and_set_hash_ref;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;

    let case_number_input, actor_name_input, actor_link_input, auditor_name_input, internal_comment_input;
    let global_message_element_ref;

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
                return str + " (MetadataView t not found)";
            };
    }


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

    async function init(_app_container, _navigate_cb, _params) {
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
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (!current_audit) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_no_active_audit_to_save_metadata'), "error");
            return false;
        }

        // Metadata should only be editable if audit is not started
        if (current_audit.auditStatus !== 'not_started') {
            console.warn("MetadataView: save_metadata called when audit status is not 'not_started'. No changes will be saved.");
            // Return true to allow navigation if the button is just "View Samples"
            return true; 
        }
        
        // Ensure input elements are defined before accessing .value
        if (!case_number_input || !actor_name_input || !actor_link_input || !auditor_name_input || !internal_comment_input) {
            console.error("MetadataView: One or more input elements are not defined in save_metadata. This can happen if render was not called or form was not built.");
            return false; 
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
        const t = get_t_internally();
        const form_group = Helpers_create_element('div', { class_name: 'form-group' });
        const label = Helpers_create_element('label', {
            attributes: { for: id },
            text_content: t(label_key)
        });

        let input_element;
        const attributes = { type: type };

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

    function create_static_field(label_key, value, is_link = false) {
        const t = get_t_internally();
        const field_div = Helpers_create_element('div', { class_name: 'static-field' });
        field_div.appendChild(Helpers_create_element('strong', { text_content: t(label_key) + ":" }));

        if (value && typeof value === 'string' && value.trim() !== '') {
            if (is_link) {
                const safe_url = Helpers_add_protocol_if_missing ? Helpers_add_protocol_if_missing(value) : value;
                field_div.appendChild(document.createTextNode(' '));
                field_div.appendChild(Helpers_create_element('a', {
                    href: safe_url,
                    text_content: value,
                    attributes: { target: '_blank', rel: 'noopener noreferrer' }
                }));
            } else {
                if (label_key === 'internal_comment' && value.includes('\n')) {
                    value.split('\n').forEach((line, index) => {
                        if (index > 0) field_div.appendChild(Helpers_create_element('br'));
                        field_div.appendChild(document.createTextNode(' ' + line));
                    });
                } else {
                    field_div.appendChild(document.createTextNode(' ' + value));
                }
            }
        } else {
            field_div.appendChild(document.createTextNode(' ' + t('value_not_set', {defaultValue: '(Not set)'})));
        }
        return field_div;
    }


    function render() {
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t || !State_getCurrentAudit) {
            console.error("MetadataView: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_metadata_view')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t("error_no_rulefile_loaded_for_metadata"), "error");
            const back_button = Helpers_create_element('button', {
                class_name: ['button', 'button-default'],
                html_content: `<span>${t('upload_rule_file_title')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('upload_file', ['currentColor'], 18) : ''),
                event_listeners: { click: () => { if(navigate_and_set_hash_ref) navigate_and_set_hash_ref('upload');} }
            });
            app_container_ref.appendChild(back_button);
            return;
        }

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate metadata-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if (NotificationComponent_show_global_message &&
                (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim())) {
                NotificationComponent_show_global_message(t('metadata_form_intro'), "info");
            }
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_metadata_title') }));
        plate_element.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('metadata_form_instruction') }));

        const form_container = Helpers_create_element('div', { class_name: 'metadata-form-container' });
        const metadata = current_audit.auditMetadata || {};
        const is_editable = current_audit.auditStatus === 'not_started';

        if (is_editable) {
            const form = Helpers_create_element('form');
            form.addEventListener('submit', handle_submit);

            const case_field = create_form_field('caseNumber', 'case_number', 'text', metadata.caseNumber);
            case_number_input = case_field.input_element;
            form.appendChild(case_field.form_group);

            const actor_field = create_form_field('actorName', 'actor_name', 'text', metadata.actorName);
            actor_name_input = actor_field.input_element;
            form.appendChild(actor_field.form_group);

            const actor_link_field = create_form_field('actorLink', 'actor_link', 'url', metadata.actorLink, true);
            actor_link_input = actor_link_field.input_element;
            form.appendChild(actor_link_field.form_group);

            const auditor_field = create_form_field('auditorName', 'auditor_name', 'text', metadata.auditorName);
            auditor_name_input = auditor_field.input_element;
            form.appendChild(auditor_field.form_group);

            const comment_field = create_form_field('internalComment', 'internal_comment', 'textarea', metadata.internalComment);
            internal_comment_input = comment_field.input_element;
            form.appendChild(comment_field.form_group);

            const form_actions_wrapper_for_form = Helpers_create_element('div', { class_name: 'form-actions metadata-actions' });
            const submit_button_editable = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                attributes: { type: 'submit' }, // Sätt type submit här
                html_content: `<span>${t('continue_to_samples')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) : '')
            });
            form_actions_wrapper_for_form.appendChild(submit_button_editable);
            form.appendChild(form_actions_wrapper_for_form); // Lägg actions inuti formen
            form_container.appendChild(form);
        } else { // Inte redigerbar (audit har startat eller är låst)
            const static_display_div = Helpers_create_element('div', { class_name: 'static-metadata-display' });
            static_display_div.appendChild(create_static_field('case_number', metadata.caseNumber));
            static_display_div.appendChild(create_static_field('actor_name', metadata.actorName));
            static_display_div.appendChild(create_static_field('actor_link', metadata.actorLink, true));
            static_display_div.appendChild(create_static_field('auditor_name', metadata.auditorName));
            static_display_div.appendChild(create_static_field('internal_comment', metadata.internalComment));
            form_container.appendChild(static_display_div);

            // Lägg till "View Samples" knapp utanför formuläret
            const actions_div_readonly = Helpers_create_element('div', { class_name: 'metadata-actions' });
            const view_samples_button = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                html_content: `<span>${t('view_samples_button')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('list', ['currentColor'], 18) : '')
            });
            view_samples_button.addEventListener('click', (e) => {
                e.preventDefault();
                if (navigate_and_set_hash_ref) navigate_and_set_hash_ref('sample_management');
            });
            actions_div_readonly.appendChild(view_samples_button);
            plate_element.appendChild(actions_div_readonly); // Läggs till plate_element direkt
        }

        plate_element.appendChild(form_container);
    }

    function destroy() {
        case_number_input = null;
        actor_name_input = null;
        actor_link_input = null;
        auditor_name_input = null;
        internal_comment_input = null;
        // app_container_ref och navigate_and_set_hash_ref ärvs och nollställs inte här.
    }

    return { init, render, destroy };
})();

export const MetadataViewComponent = MetadataViewComponent_internal;