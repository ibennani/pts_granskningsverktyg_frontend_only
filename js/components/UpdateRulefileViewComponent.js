// js/components/UpdateRulefileViewComponent.js

export const UpdateRulefileViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/update_rulefile_view.css'; // Kommer att skapas senare
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css, Helpers_escape_html;
    let NotificationComponent_show_global_message, NotificationComponent_get_global_message_element_reference;
    let SaveAuditLogic_save_audit_to_json_file;
    let ValidationLogic_validate_rule_file_json;
    let RulefileUpdaterLogic_reconcile;

    let global_message_element_ref;
    let plate_element_ref;

    // Steg-variabler för att hålla reda på var i flödet vi är
    const VIEW_STEPS = {
        WARNING: 'WARNING',
        UPLOAD: 'UPLOAD',
        REPORT: 'REPORT'
    };
    let current_step = VIEW_STEPS.WARNING;

    function get_t_internally() {
        return window.Translation?.t || ((key) => `**${key}**`);
    }

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return; // Redan assignade

        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_load_css = window.Helpers?.load_css;
        Helpers_escape_html = window.Helpers?.escape_html;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
        SaveAuditLogic_save_audit_to_json_file = window.SaveAuditLogic?.save_audit_to_json_file;
        ValidationLogic_validate_rule_file_json = window.ValidationLogic?.validate_rule_file_json;
        RulefileUpdaterLogic_reconcile = window.RulefileUpdaterLogic?.reconcile_audit_with_new_rule_file;
    }
    
    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }

        if (Helpers_load_css && CSS_PATH) {
            try {
                // Denna CSS-fil finns inte än, men vi förbereder för den.
                // await Helpers_load_css(CSS_PATH);
            } catch (error) {
                console.warn("CSS for UpdateRulefileViewComponent not found yet, skipping load.", error);
            }
        }
        current_step = VIEW_STEPS.WARNING; // Alltid starta på första steget
    }

    function handle_backup_click() {
        const t = get_t_internally();
        if (SaveAuditLogic_save_audit_to_json_file) {
            SaveAuditLogic_save_audit_to_json_file(local_getState(), t, NotificationComponent_show_global_message);
            current_step = VIEW_STEPS.UPLOAD;
            render(); // Rita om vyn för att visa nästa steg
        } else {
            console.error("SaveAuditLogic not available to perform backup.");
            if (NotificationComponent_show_global_message) {
                NotificationComponent_show_global_message(t('error_saving_audit', {defaultValue: "Could not save audit."}), 'error');
            }
        }
    }

    function handle_new_rule_file_upload(event) {
        const t = get_t_internally();
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== "application/json") {
            NotificationComponent_show_global_message(t('error_file_must_be_json'), 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const new_rule_file_content = JSON.parse(e.target.result);
                const validation = ValidationLogic_validate_rule_file_json(new_rule_file_content);

                if (!validation.isValid) {
                    NotificationComponent_show_global_message(validation.message, 'error');
                    return;
                }

                // Kör avstämningslogiken
                const current_audit_state = local_getState();
                const { reconciled_state, report } = RulefileUpdaterLogic_reconcile(current_audit_state, new_rule_file_content);

                // Dispatcha det nya, uppdaterade tillståndet
                local_dispatch({
                    type: local_StoreActionTypes.REPLACE_RULEFILE_AND_RECONCILE,
                    payload: reconciled_state
                });
                
                // Spara rapporten för att visa i nästa steg och rendera om
                plate_element_ref.dataset.report = JSON.stringify(report);
                current_step = VIEW_STEPS.REPORT;
                render();

            } catch (error) {
                console.error("Error processing new rule file:", error);
                NotificationComponent_show_global_message(t('rule_file_invalid_json'), 'error');
            }
        };
        reader.readAsText(file);
    }
    
    function render() {
        assign_globals_once();
        const t = get_t_internally();

        if (!plate_element_ref) {
            app_container_ref.innerHTML = '';
            plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate update-rulefile-view-plate' });
            app_container_ref.appendChild(plate_element_ref);
        }
        
        // Återanvänd samma "platta" men rendera om innehållet baserat på `current_step`
        plate_element_ref.innerHTML = '';

        if (global_message_element_ref) {
            plate_element_ref.appendChild(global_message_element_ref);
        }

        plate_element_ref.appendChild(Helpers_create_element('h1', { text_content: t('update_rulefile_title', {defaultValue: "Update Rule File"}) }));

        switch (current_step) {
            case VIEW_STEPS.WARNING:
                render_warning_step();
                break;
            case VIEW_STEPS.UPLOAD:
                render_upload_step();
                break;
            case VIEW_STEPS.REPORT:
                const report_data = JSON.parse(plate_element_ref.dataset.report || '{}');
                render_report_step(report_data);
                break;
        }
    }

    function render_warning_step() {
        const t = get_t_internally();
        plate_element_ref.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('update_rulefile_warning_intro', {defaultValue: "You are about to update the rule file for an ongoing audit. This is an advanced action with consequences:"}) }));
        
        const warning_list = Helpers_create_element('ul', { class_name: 'warning-list' });
        warning_list.innerHTML = `
            <li>${t('update_rulefile_warning_li1', {defaultValue: "Results for requirements that are removed from the new rule file will be permanently deleted."})}</li>
            <li>${t('update_rulefile_warning_li2', {defaultValue: "Requirements that have been changed will be marked for re-review."})}</li>
            <li>${t('update_rulefile_warning_li3', {defaultValue: "Samples with settings (like page type) that no longer exist will be marked as invalid and must be corrected."})}</li>
        `;
        plate_element_ref.appendChild(warning_list);

        plate_element_ref.appendChild(Helpers_create_element('h2', { style: 'font-size: 1.2rem; margin-top: 1.5rem;', text_content: t('update_rulefile_recommendation', {defaultValue: "Step 1: Save a backup"}) }));
        plate_element_ref.appendChild(Helpers_create_element('p', { text_content: t('update_rulefile_backup_text', {defaultValue: "It is strongly recommended to save a backup of your current audit before proceeding."}) }));

        const backup_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            html_content: `<span>${t('save_audit_to_file', {defaultValue: "Save Audit to File"})}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('save') : '')
        });
        backup_button.addEventListener('click', handle_backup_click);
        
        const cancel_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            text_content: t('cancel', {defaultValue: "Cancel"})
        });
        cancel_button.addEventListener('click', () => router_ref('audit_overview'));

        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem;' });
        actions_div.append(cancel_button, backup_button);
        plate_element_ref.appendChild(actions_div);
    }
    
    function render_upload_step() {
        const t = get_t_internally();
        
        plate_element_ref.appendChild(Helpers_create_element('div', {
            class_name: 'backup-confirmation', // För styling
            html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('check_circle') : '✔') + ` <span>${t('update_rulefile_backup_saved', {defaultValue: "Backup saved."})}</span>`
        }));
        
        plate_element_ref.appendChild(Helpers_create_element('h2', { style: 'font-size: 1.2rem; margin-top: 1.5rem;', text_content: t('update_rulefile_step2_title', {defaultValue: "Step 2: Upload new rule file"}) }));
        plate_element_ref.appendChild(Helpers_create_element('p', { text_content: t('update_rulefile_step2_text', {defaultValue: "Select the new, updated JSON rule file from your computer."}) }));

        const file_input = Helpers_create_element('input', { id: 'new-rule-file-input', attributes: { type: 'file', accept: '.json', style: 'display: none;' } });
        file_input.addEventListener('change', handle_new_rule_file_upload);

        const upload_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            html_content: `<span>${t('upload_new_rulefile_btn', {defaultValue: "Upload New Rule File"})}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('upload_file') : '')
        });
        upload_button.addEventListener('click', () => file_input.click());
        
        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem;' });
        actions_div.appendChild(upload_button);
        
        plate_element_ref.appendChild(file_input);
        plate_element_ref.appendChild(actions_div);
    }

    function render_report_step(report) {
        const t = get_t_internally();

        plate_element_ref.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('update_rulefile_report_intro', {defaultValue: "The rule file has been updated. Below is a summary of the changes."}) }));

        // Funktion för att rendera en sektion av rapporten
        const render_report_section = (title_key, items) => {
            const section = Helpers_create_element('div', { class_name: 'report-section' });
            section.appendChild(Helpers_create_element('h3', { text_content: `${t(title_key)} (${items.length})` }));
            if (items.length > 0) {
                const ul = Helpers_create_element('ul', { class_name: 'report-list' });
                items.forEach(item => {
                    const text = item.title ? `${item.title} (ID: ${item.id})` : `${item.description} (${item.reason})`;
                    ul.appendChild(Helpers_create_element('li', { text_content: Helpers_escape_html(text) }));
                });
                section.appendChild(ul);
            } else {
                section.appendChild(Helpers_create_element('p', { class_name: 'text-muted', text_content: t('no_items_in_category', {defaultValue: "No items in this category."}) }));
            }
            return section;
        };

        plate_element_ref.appendChild(render_report_section('update_report_removed_reqs_title', report.removed_requirements));
        plate_element_ref.appendChild(render_report_section('update_report_updated_reqs_title', report.updated_requirements));
        plate_element_ref.appendChild(render_report_section('update_report_invalid_samples_title', report.invalidated_samples));

        const back_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            html_content: `<span>${t('back_to_audit_overview')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward') : '')
        });
        back_button.addEventListener('click', () => router_ref('audit_overview'));
        
        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem;' });
        actions_div.appendChild(back_button);
        plate_element_ref.appendChild(actions_div);
    }

    function destroy() {
        app_container_ref.innerHTML = ''; // Rensa vyn
        plate_element_ref = null;
        global_message_element_ref = null;
        current_step = VIEW_STEPS.WARNING;
    }

    return {
        init,
        render,
        destroy
    };
})();