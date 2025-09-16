// js/components/UploadViewComponent.js

export const UploadViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/upload_view_component.css';
    let app_container_ref;
    let router_ref;
    let global_message_element_ref;

    let rule_file_for_audit_input;
    let rule_file_for_edit_input;
    let saved_audit_input_element;
    let file_info_display_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    function get_t_func() {
        return window.Translation?.t || ((key) => `**${key}**`);
    }

    function create_file_handler(validation_function, success_callback) {
        return function (event) {
            const t = get_t_func();
            const file = event.target.files[0];
            if (!file) return;

            if (file_info_display_ref) {
                file_info_display_ref.textContent = t('upload_view_loading_file', { filename: file.name });
                file_info_display_ref.style.display = 'block';
            }

            if (file.type !== "application/json") {
                if (window.NotificationComponent) window.NotificationComponent.show_global_message(t('error_file_must_be_json'), 'error');
                event.target.value = '';
                if (file_info_display_ref) file_info_display_ref.style.display = 'none';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const json_content = JSON.parse(e.target.result);
                    const validation_result = validation_function(json_content);

                    if (validation_result.isValid) {
                        if (window.Store && typeof window.Store.clearAutosavedState === 'function') {
                            window.Store.clearAutosavedState();
                        }
                        
                        // --- FIX 1: Add the success message with filename ---
                        if (window.NotificationComponent) {
                            window.NotificationComponent.show_global_message(t('rule_file_loaded_successfully', { filename: file.name }), 'success');
                        }
                        success_callback(json_content);
                    } else {
                        if (window.NotificationComponent) window.NotificationComponent.show_global_message(validation_result.message, 'error');
                        if (file_info_display_ref) file_info_display_ref.style.display = 'none';
                    }
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    if (window.NotificationComponent) window.NotificationComponent.show_global_message(`${t('rule_file_invalid_json')}: ${error.message}`, 'error');
                    if (file_info_display_ref) file_info_display_ref.style.display = 'none';
                } finally {
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        };
    }

    const handle_rule_file_for_audit = create_file_handler(
        window.ValidationLogic.validate_rule_file_json,
        (json_content) => {
            local_dispatch({ type: local_StoreActionTypes.INITIALIZE_NEW_AUDIT, payload: { ruleFileContent: json_content } });
            router_ref('metadata');
        }
    );
    const handle_rule_file_for_edit = create_file_handler(
        window.ValidationLogic.validate_rule_file_json,
        (json_content) => {
            local_dispatch({ type: local_StoreActionTypes.INITIALIZE_EDIT_MODE, payload: { ruleFileContent: json_content } });
            router_ref('edit_rulefile_main');
        }
    );
    const handle_saved_audit_file = create_file_handler(
        window.ValidationLogic.validate_saved_audit_file,
        (file_content_object) => {
            local_dispatch({ type: local_StoreActionTypes.LOAD_AUDIT_FROM_FILE, payload: file_content_object });
            router_ref('audit_overview');
        }
    );

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        if (window.NotificationComponent?.get_global_message_element_reference) {
            global_message_element_ref = window.NotificationComponent.get_global_message_element_reference();
        }
        if (window.Helpers?.load_css) {
            await window.Helpers.load_css(CSS_PATH).catch(e => console.warn(e));
        }
    }

    function render() {
        if (!app_container_ref || !window.Helpers?.create_element) {
            console.error("[UploadViewComponent] render prerequisites missing.");
            return;
        }
        app_container_ref.innerHTML = '';
        const t = get_t_func();

        if (global_message_element_ref) {
            app_container_ref.appendChild(global_message_element_ref);
        }

        const plate = window.Helpers.create_element('div', { class_name: 'content-plate' });
        plate.appendChild(window.Helpers.create_element('h1', { text_content: t('app_title') }));
        file_info_display_ref = window.Helpers.create_element('div', {
            id: 'uploaded-file-info-display',
            style: { 
                display: 'none', margin: '1rem 0', padding: '0.75rem',
                backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)', color: 'var(--text-color-muted)', fontStyle: 'italic'
            }
        });
        plate.appendChild(file_info_display_ref);
        plate.appendChild(window.Helpers.create_element('p', { class_name: 'view-intro-text', text_content: t('upload_view_intro') }));
        
        const audit_section = window.Helpers.create_element('section', { style: { 'margin-top': '2rem' } });
        const audit_button_group = window.Helpers.create_element('div', { class_name: 'button-group', style: { justifyContent: 'flex-start' } });
        const load_ongoing_audit_btn = window.Helpers.create_element('button', {
            id: 'load-ongoing-audit-btn', class_name: ['button', 'button-default'],
            html_content: `<span>${t('upload_ongoing_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('load_existing', ['currentColor'], 18) : '')
        });
        const start_new_audit_btn = window.Helpers.create_element('button', {
            id: 'start-new-audit-btn', class_name: ['button', 'button-primary'],
            html_content: `<span>${t('start_new_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('start_new', ['currentColor'], 18) : '')
        });
        audit_button_group.append(load_ongoing_audit_btn, start_new_audit_btn);
        audit_section.appendChild(audit_button_group);
        plate.appendChild(audit_section);

        plate.appendChild(window.Helpers.create_element('hr', { style: { 'margin': '2rem 0' } }));

        const edit_section = window.Helpers.create_element('section');
        const edit_button_group = window.Helpers.create_element('div', { class_name: 'button-group', style: { justifyContent: 'flex-start' } });
        const edit_rulefile_btn = window.Helpers.create_element('button', {
            id: 'edit-rulefile-btn', class_name: ['button', 'button-secondary'],
            html_content: `<span>${t('upload_view_button_edit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('edit', ['currentColor'], 18) : '')
        });
        edit_button_group.appendChild(edit_rulefile_btn);
        edit_section.appendChild(edit_button_group);
        plate.appendChild(edit_section);

        rule_file_for_audit_input = window.Helpers.create_element('input', {
            id: 'rule-file-for-audit-input',
            attributes: {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'}
        });
        rule_file_for_edit_input = window.Helpers.create_element('input', {
            id: 'rule-file-for-edit-input',
            attributes: {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'}
        });
        saved_audit_input_element = window.Helpers.create_element('input', {
            id: 'saved-audit-input',
            attributes: {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'}
        });

        app_container_ref.appendChild(plate);
        app_container_ref.appendChild(rule_file_for_audit_input);
        app_container_ref.appendChild(rule_file_for_edit_input);
        app_container_ref.appendChild(saved_audit_input_element);

        start_new_audit_btn.addEventListener('click', () => rule_file_for_audit_input.click());
        rule_file_for_audit_input.addEventListener('change', handle_rule_file_for_audit);
        edit_rulefile_btn.addEventListener('click', () => rule_file_for_edit_input.click());
        rule_file_for_edit_input.addEventListener('change', handle_rule_file_for_edit);
        load_ongoing_audit_btn.addEventListener('click', () => saved_audit_input_element.click());
        saved_audit_input_element.addEventListener('change', handle_saved_audit_file);
    }

    function destroy() { app_container_ref.innerHTML = ''; }

    return { init, render, destroy };
})();