// js/components/UploadViewComponent.js

const UploadViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/upload_view_component.css';
    let app_container_ref;
    let router_ref;
    let global_message_element_ref;

    let rule_file_input_element;
    let saved_audit_input_element;
    let load_ongoing_audit_btn;
    let start_new_audit_btn;

    // Helper function to safely get the translation function within this component
    function get_t_func() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = `**${key}**`;
                if (replacements) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (UploadView t not found)";
            };
    }

    function handle_rule_file_select(event) {
        const t = get_t_func();
        const file = event.target.files[0];
        if (file) {
            if (file.type !== "application/json") {
                if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_file_must_be_json'), 'error');
                if (rule_file_input_element) rule_file_input_element.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const json_content = JSON.parse(e.target.result);
                    const validation_result = window.ValidationLogic.validate_rule_file_json(json_content);

                    if (validation_result.isValid) {
                        if (window.NotificationComponent) NotificationComponent.show_global_message(validation_result.message, 'success');
                        const current_audit = window.State.getCurrentAudit() || window.State.initNewAudit();
                        current_audit.ruleFileContent = json_content;
                        window.State.setCurrentAudit(current_audit);
                        router_ref('metadata');
                    } else {
                        if (window.NotificationComponent) NotificationComponent.show_global_message(validation_result.message, 'error');
                        if (rule_file_input_element) rule_file_input_element.value = '';
                    }
                } catch (error) {
                    console.error("Fel vid parsning av JSON från regelfil:", error);
                    if (window.NotificationComponent) NotificationComponent.show_global_message(t('rule_file_invalid_json'), 'error');
                    if (rule_file_input_element) rule_file_input_element.value = '';
                }
            };
            reader.onerror = function() {
                if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_file_read_error'), 'error');
                if (rule_file_input_element) rule_file_input_element.value = '';
            };
            reader.readAsText(file);
        }
        if(rule_file_input_element) rule_file_input_element.value = ''; // Rensa alltid input efteråt
    }

    function handle_saved_audit_file_select(event) {
        const t = get_t_func();
        const file = event.target.files[0];
        if (file) {
            if (file.type !== "application/json") {
                if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_file_must_be_json'), 'error');
                if (saved_audit_input_element) saved_audit_input_element.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const file_content_object = JSON.parse(e.target.result);
                    const validation_result = window.ValidationLogic.validate_saved_audit_file(file_content_object);

                    if (validation_result.isValid) {
                        if (window.State.loadAuditFromFileData(file_content_object)) {
                            if (window.NotificationComponent) NotificationComponent.show_global_message(t('saved_audit_loaded_successfully'), 'success');
                            router_ref('audit_overview');
                        } else {
                            if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_invalid_saved_audit_file'), 'error');
                        }
                    } else {
                        if (window.NotificationComponent) NotificationComponent.show_global_message(validation_result.message, 'error');
                    }
                } catch (error) {
                    console.error("Fel vid parsning av JSON från sparad granskningsfil:", error);
                    if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_invalid_saved_audit_file'), 'error');
                }
            };
            reader.onerror = function() {
                if (window.NotificationComponent) NotificationComponent.show_global_message(t('error_file_read_error'), 'error');
            };
            reader.readAsText(file);
        }
        if(saved_audit_input_element) saved_audit_input_element.value = ''; // Rensa alltid input efteråt
    }

    async function init(_app_container, _router) {
        app_container_ref = _app_container;
        router_ref = _router;
        if (window.NotificationComponent && typeof window.NotificationComponent.get_global_message_element_reference === 'function') {
            global_message_element_ref = NotificationComponent.get_global_message_element_reference();
        } else {
            console.error("[UploadViewComponent] NotificationComponent.get_global_message_element_reference not available!");
        }
        try {
            if (window.Helpers && typeof window.Helpers.load_css === 'function') {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await window.Helpers.load_css(CSS_PATH);
                }
            } else {
                console.warn("[UploadViewComponent] Helpers.load_css not available.");
            }
        } catch (error) {
            console.warn(`Failed to load CSS for UploadViewComponent: ${CSS_PATH}`, error);
        }
    }

    function render() {
        if (!app_container_ref || !window.Helpers || !window.Helpers.create_element) {
            console.error("[UploadViewComponent] app_container_ref or Helpers.create_element is MISSING in render!");
            if (app_container_ref) app_container_ref.innerHTML = "<p>Error rendering Upload View.</p>";
            return;
        }
        app_container_ref.innerHTML = '';
        const t = get_t_func();

        if (global_message_element_ref) {
            app_container_ref.appendChild(global_message_element_ref);
        }

        const title = window.Helpers.create_element('h1', { text_content: t('app_title') });
        const intro_text = window.Helpers.create_element('p', { text_content: t('upload_view_intro') });

        load_ongoing_audit_btn = window.Helpers.create_element('button', {
            id: 'load-ongoing-audit-btn',
            class_name: ['button', 'button-secondary'],
            html_content: `<span>${t('upload_ongoing_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('upload_file', ['currentColor'], 18) : '')
        });

        start_new_audit_btn = window.Helpers.create_element('button', {
            id: 'start-new-audit-btn',
            class_name: ['button', 'button-primary'],
            html_content: `<span>${t('start_new_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('upload_file', ['currentColor'], 18) : '')
        });

        const button_group = window.Helpers.create_element('div', { class_name: 'button-group' });
        button_group.appendChild(load_ongoing_audit_btn);
        button_group.appendChild(start_new_audit_btn);

        rule_file_input_element = window.Helpers.create_element('input', {
            id: 'rule-file-input',
            attributes: { type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true' }
        });

        saved_audit_input_element = window.Helpers.create_element('input', {
            id: 'saved-audit-input',
            attributes: { type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true' }
        });

        app_container_ref.appendChild(title);
        app_container_ref.appendChild(intro_text);
        app_container_ref.appendChild(button_group);
        app_container_ref.appendChild(rule_file_input_element);
        app_container_ref.appendChild(saved_audit_input_element);

        start_new_audit_btn.addEventListener('click', () => { if(rule_file_input_element) rule_file_input_element.click(); });
        if(rule_file_input_element) rule_file_input_element.addEventListener('change', handle_rule_file_select);
        load_ongoing_audit_btn.addEventListener('click', () => { if(saved_audit_input_element) saved_audit_input_element.click(); });
        if(saved_audit_input_element) saved_audit_input_element.addEventListener('change', handle_saved_audit_file_select);
    }

    function destroy() {
        if (rule_file_input_element) rule_file_input_element.removeEventListener('change', handle_rule_file_select);
        if (saved_audit_input_element) saved_audit_input_element.removeEventListener('change', handle_saved_audit_file_select);
        rule_file_input_element = null;
        saved_audit_input_element = null;
        load_ongoing_audit_btn = null;
        start_new_audit_btn = null;
        // app_container_ref och router_ref nollställs inte här då de sätts av main.js
    }

    return {
        init,
        render,
        destroy
    };
})();

export const UploadViewComponent = UploadViewComponent_internal;