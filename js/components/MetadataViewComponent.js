// js/components/MetadataViewComponent.js
import { MetadataFormComponent } from './MetadataFormComponent.js';

export const MetadataViewComponent = (function () {
    'use-strict';

    let app_container_ref;
    let router_ref;

    // Dependencies from main.js
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let Translation_t;
    let Helpers_create_element;
    let NotificationComponent_show_global_message;
    let NotificationComponent_get_global_message_element_reference;
    let NotificationComponent_clear_global_message;

    // Sub-component and its container
    let metadata_form_component_instance;
    let metadata_form_container_element;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
        NotificationComponent_clear_global_message = window.NotificationComponent?.clear_global_message;
    }

    // MODIFIED: init is now simpler
    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        metadata_form_container_element = Helpers_create_element('div', { id: 'metadata-form-container-in-create-view' });

        metadata_form_component_instance = MetadataFormComponent;
        await metadata_form_component_instance.init(metadata_form_container_element, {
            onSubmit: handle_form_submit
            // No onCancel callback needed for this view
        });
    }

    function handle_form_submit(form_data) {
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_METADATA,
            payload: form_data
        });
        router_ref('sample_management');
    }
    
    function render_static_view(plate_element, metadata_from_store) {
        const t = Translation_t;
        
        const static_display_div = Helpers_create_element('div', { class_name: 'static-metadata-display' });

        const create_static_field = (label_key, value, is_link = false) => {
            const field_div = Helpers_create_element('div', { class_name: 'static-field' });
            field_div.appendChild(Helpers_create_element('strong', { text_content: t(label_key) + ":" }));

            if (value && String(value).trim()) {
                if (is_link) {
                    const safe_url = window.Helpers.add_protocol_if_missing(value);
                    field_div.appendChild(Helpers_create_element('a', {
                        href: safe_url, text_content: value, attributes: { target: '_blank', rel: 'noopener noreferrer' }
                    }));
                } else {
                    field_div.appendChild(document.createTextNode(' ' + value));
                }
            } else {
                field_div.appendChild(Helpers_create_element('span', { class_name: 'text-muted', text_content: ' ' + t('value_not_set') }));
            }
            return field_div;
        };
        
        static_display_div.appendChild(create_static_field('case_number', metadata_from_store.caseNumber));
        static_display_div.appendChild(create_static_field('actor_name', metadata_from_store.actorName));
        static_display_div.appendChild(create_static_field('actor_link', metadata_from_store.actorLink, true));
        static_display_div.appendChild(create_static_field('auditor_name', metadata_from_store.auditorName));
        static_display_div.appendChild(create_static_field('internal_comment', metadata_from_store.internalComment));

        plate_element.appendChild(static_display_div);

        const actions_div_readonly = Helpers_create_element('div', { class_name: 'metadata-actions' });
        const view_next_step_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            text_content: t('view_samples_button')
        });
        view_next_step_button.addEventListener('click', () => router_ref('sample_management'));
        actions_div_readonly.appendChild(view_next_step_button);
        plate_element.appendChild(actions_div_readonly);
    }

    // MODIFIED: render now passes dynamic options to the form component
    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';

        const current_state = local_getState();
        if (!current_state || !current_state.ruleFileContent) {
            NotificationComponent_show_global_message(t("error_no_rulefile_loaded_for_metadata"), "error");
            return;
        }

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate metadata-form-plate' });
        
        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) {
            plate_element.appendChild(global_message_element);
            if (!global_message_element.classList.contains('message-error') && !global_message_element.classList.contains('message-warning')) {
                NotificationComponent_clear_global_message();
            }
        }
        
        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_metadata_title') }));
        
        const is_editable = current_state.auditStatus === 'not_started';

        if (is_editable) {
            plate_element.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('metadata_form_instruction') }));
            
            // Dynamic options are created here with fresh translations
            const form_options = {
                initialData: current_state.auditMetadata,
                submitButtonText: t('continue_to_samples')
                // No cancelButtonText needed for this view
            };
            metadata_form_component_instance.render(form_options);
            
            plate_element.appendChild(metadata_form_container_element);
        } else {
            plate_element.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('audit_started_metadata_locked') }));
            render_static_view(plate_element, current_state.auditMetadata);
        }

        app_container_ref.appendChild(plate_element);
    }

    function destroy() {
        if (metadata_form_component_instance?.destroy) {
            metadata_form_component_instance.destroy();
        }
        app_container_ref.innerHTML = '';
    }

    return {
        init,
        render,
        destroy
    };
})();