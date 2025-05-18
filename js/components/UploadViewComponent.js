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

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes; 

    function get_t_func() {
        // ... (som tidigare) ...
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
        // console.log("[UploadViewComponent] handle_rule_file_select triggered.");
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
                        
                        console.log("[UploadViewComponent] Dispatching INITIALIZE_NEW_AUDIT with ruleFileContent.");
                        local_dispatch({
                            type: local_StoreActionTypes.INITIALIZE_NEW_AUDIT, // Använd den lokala referensen
                            payload: { ruleFileContent: json_content }
                        });
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
        if(rule_file_input_element) rule_file_input_element.value = '';
    }

    function handle_saved_audit_file_select(event) {
        const t = get_t_func();
        // console.log("[UploadViewComponent] handle_saved_audit_file_select triggered.");
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
                        const current_app_state_version = local_getState().saveFileVersion;
                        if (file_content_object.saveFileVersion > current_app_state_version) {
                            console.warn(`[UploadViewComponent] Sparfilens version (${file_content_object.saveFileVersion}) är nyare än applikationens state-version (${current_app_state_version}).`);
                            if (window.NotificationComponent) {
                                NotificationComponent.show_global_message(
                                    t('warning_save_file_newer_version', {
                                        fileVersionInFile: file_content_object.saveFileVersion,
                                        appVersion: current_app_state_version
                                    }),
                                    'warning', 8000);
                            }
                        }
                        console.log("[UploadViewComponent] Dispatching LOAD_AUDIT_FROM_FILE.");
                        local_dispatch({
                            type: local_StoreActionTypes.LOAD_AUDIT_FROM_FILE, // Använd den lokala referensen
                            payload: file_content_object
                        });
                        if (window.NotificationComponent) NotificationComponent.show_global_message(t('saved_audit_loaded_successfully'), 'success');
                        router_ref('audit_overview');

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
        if(saved_audit_input_element) saved_audit_input_element.value = '';
    }

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) { // Lade till _StoreActionTypes
        app_container_ref = _app_container;
        router_ref = _router;
        
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes; // Spara den medskickade referensen

        if (!local_StoreActionTypes) {
            console.error("[UploadViewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined.");
            // Fallback för att undvika total krasch, men detta indikerar ett problem i main.js
            local_StoreActionTypes = {
                INITIALIZE_NEW_AUDIT: 'INITIALIZE_NEW_AUDIT_ERROR',
                LOAD_AUDIT_FROM_FILE: 'LOAD_AUDIT_FROM_FILE_ERROR'
            };
        }

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
        // console.log("[UploadViewComponent] Init complete. getState, dispatch, and StoreActionTypes should be set.");
    }

    function render() {
        // console.log("[UploadViewComponent] Rendering. local_getState:", typeof local_getState, "local_dispatch:", typeof local_dispatch, "local_StoreActionTypes:", typeof local_StoreActionTypes);
        
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

        load_ongoing_audit_btn = window.Helpers.create_element('button', { /* ... som tidigare ... */ });
        load_ongoing_audit_btn.id = 'load-ongoing-audit-btn';
        load_ongoing_audit_btn.className = 'button button-secondary';
        load_ongoing_audit_btn.innerHTML = `<span>${t('upload_ongoing_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('upload_file', ['currentColor'], 18) : '');


        start_new_audit_btn = window.Helpers.create_element('button', { /* ... som tidigare ... */ });
        start_new_audit_btn.id = 'start-new-audit-btn';
        start_new_audit_btn.className = 'button button-primary';
        start_new_audit_btn.innerHTML = `<span>${t('start_new_audit')}</span>` + (window.Helpers.get_icon_svg ? window.Helpers.get_icon_svg('upload_file', ['currentColor'], 18) : '');


        const button_group = window.Helpers.create_element('div', { class_name: 'button-group' });
        button_group.appendChild(load_ongoing_audit_btn);
        button_group.appendChild(start_new_audit_btn);

        rule_file_input_element = window.Helpers.create_element('input', { /* ... som tidigare ... */ });
        rule_file_input_element.id = 'rule-file-input';
        Object.assign(rule_file_input_element, {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'});


        saved_audit_input_element = window.Helpers.create_element('input', { /* ... som tidigare ... */ });
        saved_audit_input_element.id = 'saved-audit-input';
        Object.assign(saved_audit_input_element, {type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true'});


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
        // ... (som tidigare) ...
        if (rule_file_input_element) rule_file_input_element.removeEventListener('change', handle_rule_file_select);
        if (saved_audit_input_element) saved_audit_input_element.removeEventListener('change', handle_saved_audit_file_select);
        rule_file_input_element = null;
        saved_audit_input_element = null;
        load_ongoing_audit_btn = null;
        start_new_audit_btn = null;
        local_getState = null; 
        local_dispatch = null;
        local_StoreActionTypes = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const UploadViewComponent = UploadViewComponent_internal;