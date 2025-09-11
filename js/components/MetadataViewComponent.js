// js/components/MetadataViewComponent.js

const MetadataViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/metadata_view_component.css';
    let app_container_ref;
    let navigate_and_set_hash_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_load_css, Helpers_escape_html;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;

    let case_number_input, actor_name_input, actor_link_input, auditor_name_input, internal_comment_input;
    let global_message_element_ref;
    let form_element_ref; 

    function get_t_internally() {
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

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return true;

        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("MetadataView: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css;
            Helpers_escape_html = window.Helpers.escape_html;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_add_protocol_if_missing || !Helpers_load_css || !Helpers_escape_html) {
                console.error("MetadataView: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("MetadataView: Helpers module is missing!"); all_assigned = false; }


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

    async function init(_app_container, _navigate_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();

        app_container_ref = _app_container;
        navigate_and_set_hash_ref = _navigate_cb;
        
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes) {
            console.error("[MetadataViewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined.");
            local_StoreActionTypes = { UPDATE_METADATA: 'UPDATE_METADATA_ERROR' };
        }
        
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

    function save_metadata_via_dispatch() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (!current_global_state) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_no_active_audit_to_save_metadata'), "error");
            return false;
        }

        const is_editable = current_global_state.auditStatus === 'not_started' || current_global_state.auditStatus === 'in_progress';
        if (!is_editable) {
            console.warn("MetadataView: save_metadata_via_dispatch called when audit is not in an editable state. No changes will be dispatched.");
            return true;
        }
        
        if (!case_number_input || !actor_name_input || !actor_link_input || !auditor_name_input || !internal_comment_input) {
            console.error("MetadataView: One or more input elements are not defined in save_metadata_via_dispatch.");
            return false; 
        }

        let actor_link_value = actor_link_input.value.trim();
        if (actor_link_value && Helpers_add_protocol_if_missing) {
            actor_link_value = Helpers_add_protocol_if_missing(actor_link_value);
        }

        const metadata_payload = {
            caseNumber: case_number_input.value.trim(),
            actorName: actor_name_input.value.trim(),
            actorLink: actor_link_value,
            auditorName: auditor_name_input.value.trim(),
            internalComment: internal_comment_input.value.trim()
        };

        local_dispatch({
            type: local_StoreActionTypes.UPDATE_METADATA,
            payload: metadata_payload
        });
        
        return true;
    }

    function handle_submit(event) {
        event.preventDefault();
        if (save_metadata_via_dispatch()) {
            if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
            if (navigate_and_set_hash_ref) {
                const current_status = local_getState().auditStatus;
                const next_view = (current_status === 'not_started') ? 'sample_management' : 'audit_overview';
                navigate_and_set_hash_ref(next_view);
            }
        }
    }

    function create_form_field(id, label_key, type = 'text', current_value = '', remove_placeholder = false, is_readonly = false) {
        const t = get_t_internally();
        const form_group = Helpers_create_element('div', { class_name: 'form-group' });
        const label = Helpers_create_element('label', {
            attributes: { for: id },
            text_content: t(label_key)
        });

        let input_element;
        const attributes = { type: type };
        if (is_readonly) {
            attributes.readonly = true;
        }

        if (type === 'textarea') {
            input_element = Helpers_create_element('textarea', {
                id: id, class_name: 'form-control', attributes: { rows: '4', ...attributes }
            });
            input_element.value = current_value;
        } else {
            input_element = Helpers_create_element('input', {
                id: id, class_name: 'form-control', attributes: attributes
            });
            input_element.value = current_value;
        }
        if (is_readonly) {
            input_element.classList.add('readonly-textarea'); 
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
                const value_container = (label_key === 'internal_comment') 
                    ? Helpers_create_element('div', { class_name: 'markdown-content', style: { 'padding-top': '0.25rem', 'display': 'inline-block' } })
                    : document.createTextNode('');

                if (label_key === 'internal_comment') {
                    if (typeof marked !== 'undefined') {
                        const renderer = new marked.Renderer();
                        renderer.link = (href, title, text) => `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                        renderer.html = (html_token) => {
                            const text_to_escape = (typeof html_token === 'object' && html_token !== null && typeof html_token.text === 'string')
                                ? html_token.text
                                : String(html_token || '');
                            return window.Helpers.escape_html(text_to_escape);
                        };
                        
                        // DEN DEFINITIVA FIXEN:
                        const singleLineValue = value.replace(/(\r\n|\n|\r)/gm, " ");
                        value_container.innerHTML = marked.parseInline(singleLineValue, { renderer: renderer, gfm: true });
                    } else {
                        value_container.textContent = value;
                    }
                } else {
                    value_container.nodeValue = ' ' + Helpers_escape_html(value);
                }
                field_div.appendChild(value_container);
            }
        } else {
            field_div.appendChild(document.createTextNode(' ' + t('value_not_set', {defaultValue: '(Not set)'})));
        }
        return field_div;
    }

    function render() {
        assign_globals_once(); 
        const t = get_t_internally();

        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) { 
            console.error("MetadataView: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_metadata_view')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const current_global_state = local_getState(); 
        if (!current_global_state || !current_global_state.ruleFileContent) {
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
            if (NotificationComponent_clear_global_message && 
                !global_message_element_ref.classList.contains('message-error') &&
                !global_message_element_ref.classList.contains('message-warning')) {
                NotificationComponent_clear_global_message();
            }
        }
        if (current_global_state.auditStatus === 'not_started' &&
            NotificationComponent_show_global_message &&
            (!global_message_element_ref || global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim())) {
            NotificationComponent_show_global_message(t('metadata_form_intro'), "info");
        }


        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_metadata_title') }));
        plate_element.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('metadata_form_instruction') }));

        const form_container = Helpers_create_element('div', { class_name: 'metadata-form-container' });
        const metadata_from_store = current_global_state.auditMetadata || {};
        const is_editable = current_global_state.auditStatus === 'not_started' || current_global_state.auditStatus === 'in_progress';

        if (is_editable) {
            form_element_ref = Helpers_create_element('form');
            form_element_ref.addEventListener('submit', handle_submit);

            const case_field = create_form_field('caseNumber', 'case_number', 'text', metadata_from_store.caseNumber, false, !is_editable);
            case_number_input = case_field.input_element;
            form_element_ref.appendChild(case_field.form_group);

            const actor_field = create_form_field('actorName', 'actor_name', 'text', metadata_from_store.actorName, false, !is_editable);
            actor_name_input = actor_field.input_element;
            form_element_ref.appendChild(actor_field.form_group);

            const actor_link_field = create_form_field('actorLink', 'actor_link', 'url', metadata_from_store.actorLink, true, !is_editable);
            actor_link_input = actor_link_field.input_element;
            form_element_ref.appendChild(actor_link_field.form_group);

            const auditor_field = create_form_field('auditorName', 'auditor_name', 'text', metadata_from_store.auditorName, false, !is_editable);
            auditor_name_input = auditor_field.input_element;
            form_element_ref.appendChild(auditor_field.form_group);

            const comment_field = create_form_field('internalComment', 'internal_comment', 'textarea', metadata_from_store.internalComment, false, !is_editable);
            internal_comment_input = comment_field.input_element;
            form_element_ref.appendChild(comment_field.form_group);

            if (window.Helpers && window.Helpers.init_auto_resize_for_textarea) {
                window.Helpers.init_auto_resize_for_textarea(internal_comment_input);
            }

            const form_actions_wrapper_for_form = Helpers_create_element('div', { class_name: 'form-actions metadata-actions' });
            
            if (current_global_state.auditStatus === 'in_progress') {
                const return_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-default'],
                    attributes: { type: 'button' },
                    html_content: `<span>${t('return_to_overview_without_saving')}</span>`
                });
                return_button.addEventListener('click', () => navigate_and_set_hash_ref('audit_overview'));
                form_actions_wrapper_for_form.appendChild(return_button);
            }

            const submit_button_text_key = (current_global_state.auditStatus === 'not_started') ? 'continue_to_samples' : 'save_metadata_changes_button';
            const submit_button_icon = (current_global_state.auditStatus === 'not_started') ? 'arrow_forward' : 'save';

            const submit_button_editable = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                attributes: { type: 'submit' },
                html_content: `<span>${t(submit_button_text_key)}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg(submit_button_icon, ['currentColor'], 18) : '')
            });
            form_actions_wrapper_for_form.appendChild(submit_button_editable);
            form_element_ref.appendChild(form_actions_wrapper_for_form);
            form_container.appendChild(form_element_ref);

        } else { 
            const static_display_div = Helpers_create_element('div', { class_name: 'static-metadata-display' });
            static_display_div.appendChild(create_static_field('case_number', metadata_from_store.caseNumber));
            static_display_div.appendChild(create_static_field('actor_name', metadata_from_store.actorName));
            static_display_div.appendChild(create_static_field('actor_link', metadata_from_store.actorLink, true));
            static_display_div.appendChild(create_static_field('auditor_name', metadata_from_store.auditorName));
            static_display_div.appendChild(create_static_field('internal_comment', metadata_from_store.internalComment));
            form_container.appendChild(static_display_div);

            const actions_div_readonly = Helpers_create_element('div', { class_name: 'metadata-actions' });
            const view_next_step_button = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                html_content: `<span>${t('back_to_audit_overview')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) : '')
            });
            view_next_step_button.addEventListener('click', (e) => {
                e.preventDefault();
                if (navigate_and_set_hash_ref) navigate_and_set_hash_ref('audit_overview');
            });
            actions_div_readonly.appendChild(view_next_step_button);
            plate_element.appendChild(actions_div_readonly);
        }

        plate_element.appendChild(form_container);
    }

    function destroy() {
        if (form_element_ref) {
            form_element_ref.removeEventListener('submit', handle_submit);
            form_element_ref = null;
        }
        case_number_input = null;
        actor_name_input = null;
        actor_link_input = null;
        auditor_name_input = null;
        internal_comment_input = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
    }

    return { init, render, destroy };
})();

export const MetadataViewComponent = MetadataViewComponent_internal;