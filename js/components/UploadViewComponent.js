export const UploadViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/upload_view_component.css';
    let app_container_ref;
    let router_ref;
    // const { t } = Translation; // Hämta t inuti funktioner som behöver den, efter att språk laddats
    let global_message_element_ref;

    let rule_file_input_element;
    let saved_audit_input_element;
    let load_ongoing_audit_btn;
    let start_new_audit_btn;

    function handle_rule_file_select(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type !== "application/json") {
                NotificationComponent.show_global_message(Translation.t('error_file_must_be_json'), 'error');
                rule_file_input_element.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const json_content = JSON.parse(e.target.result);
                    const validation_result = ValidationLogic.validate_rule_file_json(json_content);

                    if (validation_result.isValid) {
                        NotificationComponent.show_global_message(validation_result.message, 'success');
                        const current_audit = State.getCurrentAudit() || State.initNewAudit();
                        current_audit.ruleFileContent = json_content;
                        State.setCurrentAudit(current_audit);
                        router_ref('metadata');
                    } else {
                        NotificationComponent.show_global_message(validation_result.message, 'error');
                        rule_file_input_element.value = '';
                    }
                } catch (error) {
                    console.error("Fel vid parsning av JSON från regelfil:", error);
                    NotificationComponent.show_global_message(Translation.t('rule_file_invalid_json'), 'error');
                    rule_file_input_element.value = '';
                }
            };
            reader.onerror = function() {
                NotificationComponent.show_global_message(Translation.t('error_file_read_error'), 'error');
                rule_file_input_element.value = '';
            };
            reader.readAsText(file);
        }
        if(rule_file_input_element) rule_file_input_element.value = ''; // Rensa alltid
    }

    function handle_saved_audit_file_select(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type !== "application/json") {
                NotificationComponent.show_global_message(Translation.t('error_file_must_be_json'), 'error');
                saved_audit_input_element.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const file_content_object = JSON.parse(e.target.result);
                    const validation_result = ValidationLogic.validate_saved_audit_file(file_content_object);

                    if (validation_result.isValid) {
                        if (State.loadAuditFromFileData(file_content_object)) {
                            NotificationComponent.show_global_message(Translation.t('Sparad granskning inladdad!'), 'success'); // Addera nyckel om den saknas
                            router_ref('audit_overview');
                        } else {
                            NotificationComponent.show_global_message(Translation.t('error_invalid_saved_audit_file'), 'error');
                        }
                    } else {
                        NotificationComponent.show_global_message(validation_result.message, 'error');
                    }
                } catch (error) {
                    console.error("Fel vid parsning av JSON från sparad granskningsfil:", error);
                    NotificationComponent.show_global_message(Translation.t('error_invalid_saved_audit_file'), 'error');
                }
            };
            reader.onerror = function() {
                NotificationComponent.show_global_message(Translation.t('error_file_read_error'), 'error');
            };
            reader.readAsText(file);
        }
        if(saved_audit_input_element) saved_audit_input_element.value = ''; // Rensa alltid
    }

    async function init(_app_container, _router) {
        console.log("[UploadViewComponent] Init START");
        app_container_ref = _app_container;
        router_ref = _router;
        global_message_element_ref = NotificationComponent.get_global_message_element_reference();
        try {
            await Helpers.load_css(CSS_PATH);
        } catch (error) {
            console.warn(`Failed to load CSS for UploadViewComponent: ${CSS_PATH}`, error);
        }
        console.log("[UploadViewComponent] Init END");
    }

    function render() {
        console.log("[UploadViewComponent] Render START");
        if (!app_container_ref) {
            console.error("[UploadViewComponent] app_container_ref is MISSING in render!");
            return;
        }
        app_container_ref.innerHTML = ''; 
        const { t } = Translation; // Hämta 't' här för att säkerställa att den är aktuell

        if (global_message_element_ref) {
            app_container_ref.appendChild(global_message_element_ref);
        }

        const title = Helpers.create_element('h1', { text_content: t('app_title') });
        const intro_text = Helpers.create_element('p', { text_content: "Välkommen! Ladda upp en sparad granskning eller starta en ny genom att ladda upp en regelfil." }); // Hårdkodad text för nu, kan översättas

        load_ongoing_audit_btn = Helpers.create_element('button', {
            id: 'load-ongoing-audit-btn',
            class_name: ['button', 'button-secondary'],
            html_content: Helpers.get_icon_svg('load_existing', ['currentColor'], 18) + `<span>${t('upload_ongoing_audit')}</span>`
        });

        start_new_audit_btn = Helpers.create_element('button', {
            id: 'start-new-audit-btn',
            class_name: ['button', 'button-primary'],
            html_content: Helpers.get_icon_svg('start_new', ['currentColor'], 18) + `<span>${t('start_new_audit')}</span>`
        });

        const button_group = Helpers.create_element('div', { class_name: 'button-group' });
        button_group.style.display = 'flex';
        button_group.style.gap = '1rem';
        button_group.style.marginTop = '1.5rem';
        button_group.appendChild(load_ongoing_audit_btn);
        button_group.appendChild(start_new_audit_btn);

        rule_file_input_element = Helpers.create_element('input', {
            id: 'rule-file-input',
            attributes: { type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true' }
        });

        saved_audit_input_element = Helpers.create_element('input', {
            id: 'saved-audit-input',
            attributes: { type: 'file', accept: '.json', style: 'display: none;', 'aria-hidden': 'true' }
        });
        
        app_container_ref.appendChild(title);
        app_container_ref.appendChild(intro_text);
        app_container_ref.appendChild(button_group);
        app_container_ref.appendChild(rule_file_input_element); 
        app_container_ref.appendChild(saved_audit_input_element);

        start_new_audit_btn.addEventListener('click', () => { rule_file_input_element.click(); });
        if(rule_file_input_element) rule_file_input_element.addEventListener('change', handle_rule_file_select);
        load_ongoing_audit_btn.addEventListener('click', () => { saved_audit_input_element.click(); });
        if(saved_audit_input_element) saved_audit_input_element.addEventListener('change', handle_saved_audit_file_select);
        
        console.log("[UploadViewComponent] Render END, app_container_ref.childElementCount:", app_container_ref.childElementCount);
    }

    function destroy() {
        // console.log("[UploadViewComponent] Destroyed");
    }

    return {
        init,
        render,
        destroy
    };
})();