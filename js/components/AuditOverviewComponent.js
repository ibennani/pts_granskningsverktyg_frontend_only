// file: js/components/AuditOverviewComponent.js
// Importera SampleListComponent
import { SampleListComponent } from './SampleListComponent.js';

export const AuditOverviewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/audit_overview_component.css';
    let app_container_ref;
    let router_ref;

    // Globala referenser tilldelas i assign_globals
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_format_iso_to_local_datetime, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_add_protocol_if_missing, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let ExportLogic_export_to_csv, ExportLogic_export_to_excel;
    let AuditLogic_calculate_overall_audit_progress;

    let global_message_element_ref;
    let sample_list_component_instance;
    let sample_list_container_element;


    // Helper function to safely get the translation function
    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (AuditOverview t not found)";
            };
    }

    function assign_globals() {
        let all_assigned = true;
        if (window.Translation && window.Translation.t) Translation_t = window.Translation.t;
        else { console.error("AuditOverview: Translation module not found on window."); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_format_iso_to_local_datetime = window.Helpers.format_iso_to_local_datetime;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_get_current_iso_datetime_utc = window.Helpers.get_current_iso_datetime_utc;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_format_iso_to_local_datetime || !Helpers_escape_html || !Helpers_get_current_iso_datetime_utc || !Helpers_add_protocol_if_missing || !Helpers_load_css) {
                 console.error("AuditOverview: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("AuditOverview: Helpers module not found on window."); all_assigned = false; }

        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
            if (!State_getCurrentAudit || !State_setCurrentAudit) {
                 console.error("AuditOverview: One or more State functions are missing!"); all_assigned = false;
            }
        } else { console.error("AuditOverview: State module not found on window."); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
                 console.error("AuditOverview: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("AuditOverview: NotificationComponent module not found on window."); all_assigned = false; }

        if (window.ExportLogic) {
            ExportLogic_export_to_csv = window.ExportLogic.export_to_csv;
            ExportLogic_export_to_excel = window.ExportLogic.export_to_excel;
        }

        if (window.AuditLogic && window.AuditLogic.calculate_overall_audit_progress) {
            AuditLogic_calculate_overall_audit_progress = window.AuditLogic.calculate_overall_audit_progress;
        } else {
            console.error("AuditOverview: AuditLogic.calculate_overall_audit_progress is missing!"); all_assigned = false;
        }
        return all_assigned;
    }


    function handle_lock_audit() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (current_audit && current_audit.auditStatus === 'in_progress') {
            if (Helpers_get_current_iso_datetime_utc) {
                current_audit.auditStatus = 'locked';
                current_audit.endTime = Helpers_get_current_iso_datetime_utc();
                State_setCurrentAudit(current_audit);
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_locked_successfully'), 'success');
                render();
            } else {
                console.error("AuditOverview: Helpers_get_current_iso_datetime_utc is not available to lock audit.");
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_dependencies_missing', {action: t('lock_audit')}), 'error');
            }
        }
    }
    function handle_unlock_audit() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (current_audit && current_audit.auditStatus === 'locked') {
            current_audit.auditStatus = 'in_progress';
            current_audit.endTime = null;
            State_setCurrentAudit(current_audit);
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_unlocked_successfully'), 'success');
            render();
        }
    }


    function handle_save_audit_to_file() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (!current_audit) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('no_audit_data_to_save'), "error");
            return;
        }
        try {
            const audit_json_string = JSON.stringify(current_audit, null, 2);
            const blob = new Blob([audit_json_string], { type: 'application/json;charset=utf-8;' });

            const date_now = new Date();
            const date_string = `${date_now.getFullYear()}-${String(date_now.getMonth() + 1).padStart(2, '0')}-${String(date_now.getDate()).padStart(2, '0')}-${String(date_now.getHours()).padStart(2, '0')}-${String(date_now.getMinutes()).padStart(2, '0')}-${String(date_now.getSeconds()).padStart(2, '0')}`;

            const metadata = current_audit.auditMetadata || {};
            let case_number_part = metadata.caseNumber ? metadata.caseNumber.trim().toLowerCase().replace(/[^a-z0-9\-_åäö]+/gi, '_') : '';
            let actor_name_part = metadata.actorName ? metadata.actorName.trim().toLowerCase().replace(/[^a-z0-9\-_åäö]+/gi, '_') : '';

            case_number_part = case_number_part.replace(/__+/g, '_');
            actor_name_part = actor_name_part.replace(/__+/g, '_');

            if (case_number_part.startsWith('_')) case_number_part = case_number_part.substring(1);
            if (case_number_part.endsWith('_')) case_number_part = case_number_part.slice(0, -1);
            if (actor_name_part.startsWith('_')) actor_name_part = actor_name_part.substring(1);
            if (actor_name_part.endsWith('_')) actor_name_part = actor_name_part.slice(0, -1);
            
            let filename_parts = ['granskning'];
            if (case_number_part) {
                filename_parts.push(case_number_part);
            }
            if (actor_name_part) {
                filename_parts.push(actor_name_part);
            }
            filename_parts.push(date_string);

            const filename = filename_parts.join('_') + '.json';

            const link = Helpers_create_element("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_saved_as_file', {filename: filename}), "success");
            } else {
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('browser_does_not_support_download'), "warning");
            }
        } catch (error) {
            console.error("Kunde inte serialisera eller spara granskningen:", error);
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_saving_audit'), "error");
        }
    }

    
    function handle_export_csv() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (!current_audit || current_audit.auditStatus !== 'locked') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', {status: current_audit ? t(`audit_status_${current_audit.auditStatus}`) : 'N/A'}), "warning");
            return;
        }
        if(ExportLogic_export_to_csv) ExportLogic_export_to_csv(current_audit);
        else console.error("ExportLogic_export_to_csv not available.");
    }
    function handle_export_excel() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
         if (!current_audit || current_audit.auditStatus !== 'locked') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', {status: current_audit ? t(`audit_status_${current_audit.auditStatus}`) : 'N/A'}), "warning");
            return;
        }
        if(ExportLogic_export_to_excel) ExportLogic_export_to_excel(current_audit);
        else console.error("ExportLogic_export_to_excel not available.");
    }

    function create_info_item(label_key, value, is_html = false) {
        const t = get_t_internally();
        const p = Helpers_create_element('p');
        const strong = Helpers_create_element('strong', { text_content: t(label_key) + ':' });
        p.appendChild(strong); p.appendChild(document.createTextNode(' '));
        if (value || typeof value === 'number' || typeof value === 'boolean') {
            if (is_html) {
                const span = Helpers_create_element('span', { class_name: 'value' });
                span.innerHTML = value;
                p.appendChild(span);
            } else {
                p.appendChild(Helpers_create_element('span', { class_name: 'value', text_content: String(value) }));
            }
        } else {
            p.appendChild(Helpers_create_element('span', { class_name: 'value text-muted', text_content: '---' }));
        }
        const item_div = Helpers_create_element('div', { class_name: 'info-item'});
        item_div.appendChild(p);
        return item_div;
    }

    async function init_sub_components() {
        if (!Helpers_create_element) {
            console.error("AuditOverview: Helpers_create_element not available for init_sub_components.");
            return;
        }
        sample_list_container_element = Helpers_create_element('div', { id: 'overview-sample-list-area' });
        sample_list_component_instance = SampleListComponent;
        if (sample_list_component_instance && typeof sample_list_component_instance.init === 'function') {
            await sample_list_component_instance.init( sample_list_container_element, null, null, router_ref);
        } else {
            console.error("AuditOverview: SampleListComponent is not correctly initialized or its init function is missing.");
        }
    }

    async function init(_app_container, _router) {
        app_container_ref = _app_container;
        router_ref = _router;
        if (!assign_globals()) {
            console.error("AuditOverviewComponent: Failed to assign global dependencies in init. Component may not function correctly.");
        }

        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        await init_sub_components();

        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                }
            }
            catch (error) { console.warn("Failed to load CSS for AuditOverviewComponent:", error); }
        }
    }

    function render() {
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t || !State_getCurrentAudit) {
            console.error("AuditOverview: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_overview', {defaultValue: "Could not render the overview."})}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t("error_no_active_audit", {defaultValue: "Error: No active audit to display."}), "error");
            const go_to_upload_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                // ÄNDRAD ORDNING: Text först, sedan ikon
                html_content: `<span>${t('start_new_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('start_new', ['currentColor'], 18) : ''),
                event_listeners: { click: () => router_ref('upload') }
            });
            app_container_ref.appendChild(go_to_upload_btn);
            return;
        }

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate audit-overview-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_overview_title') }));

        if (AuditLogic_calculate_overall_audit_progress && window.ProgressBarComponent) {
            const progress_data = AuditLogic_calculate_overall_audit_progress(current_audit);
            
            const overall_progress_section = Helpers_create_element('section', { class_name: 'audit-overview-section overall-progress-section' });
            overall_progress_section.appendChild(Helpers_create_element('h2', { text_content: t('overall_audit_progress_title', {defaultValue: "Overall Audit Progress"}) }));
            
            const progress_info_text_p = Helpers_create_element('p', { class_name: 'info-item' });
            progress_info_text_p.innerHTML = `<strong>${t('total_requirements_audited_label', {defaultValue: "Total requirements reviewed"})}:</strong> <span class="value">${progress_data.audited} / ${progress_data.total}</span>`;
            overall_progress_section.appendChild(progress_info_text_p);

            const overall_progress_bar = window.ProgressBarComponent.create(progress_data.audited, progress_data.total, {
                id: 'overall-audit-progress-bar',
            });
            overall_progress_section.appendChild(overall_progress_bar);
            plate_element.appendChild(overall_progress_section);
        }

        const section1 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section1.appendChild(Helpers_create_element('h2', { text_content: t('audit_info_title') }));
        const info_grid = Helpers_create_element('div', { class_name: 'info-grid' });

        const md = current_audit.auditMetadata || {};
        const rf_meta = current_audit.ruleFileContent.metadata || {};

        info_grid.appendChild(create_info_item('case_number', md.caseNumber));
        info_grid.appendChild(create_info_item('actor_name', md.actorName));
        if (md.actorLink && Helpers_add_protocol_if_missing && Helpers_escape_html) {
            const safe_link = Helpers_add_protocol_if_missing(md.actorLink);
            info_grid.appendChild(create_info_item('actor_link', `<a href="${Helpers_escape_html(safe_link)}" target="_blank" rel="noopener noreferrer">${Helpers_escape_html(md.actorLink)}</a>`, true));
        } else {
            info_grid.appendChild(create_info_item('actor_link', md.actorLink || null));
        }
        info_grid.appendChild(create_info_item('auditor_name', md.auditorName));
        info_grid.appendChild(create_info_item('rule_file_title', rf_meta.title));
        info_grid.appendChild(create_info_item('Version (Regelfil)', rf_meta.version));
        info_grid.appendChild(create_info_item('status', t(`audit_status_${current_audit.auditStatus}`)));

        if(Helpers_format_iso_to_local_datetime) {
            info_grid.appendChild(create_info_item('start_time', Helpers_format_iso_to_local_datetime(current_audit.startTime)));
            if (current_audit.endTime) {
                info_grid.appendChild(create_info_item('end_time', Helpers_format_iso_to_local_datetime(current_audit.endTime)));
            }
        }
        section1.appendChild(info_grid);

        if (md.internalComment) {
            const comment_header = Helpers_create_element('h3', { text_content: t('internal_comment'), style: 'font-size: 1rem; margin-top: 1rem; font-weight: 500;' });
            const comment_p = Helpers_create_element('p', { text_content: md.internalComment, style: 'white-space: pre-wrap; background-color: var(--input-background-color); padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);'});
            section1.appendChild(comment_header);
            section1.appendChild(comment_p);
        }
        plate_element.appendChild(section1);

        const section2 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section2.appendChild(Helpers_create_element('h2', { text_content: t('sample_list_title') }));
        if (sample_list_container_element && sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
            section2.appendChild(sample_list_container_element);
            sample_list_component_instance.render();
        } else {
            section2.appendChild(Helpers_create_element('p', {text_content: t('error_loading_sample_list_for_overview')}));
        }
        plate_element.appendChild(section2);

        const section3 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section3.appendChild(Helpers_create_element('h2', { text_content: t('audit_actions_title') }));
        
        const actions_div = Helpers_create_element('div', { class_name: 'audit-overview-actions' });
        const left_actions_group = Helpers_create_element('div', { class_name: 'action-group-left' });
        const right_actions_group = Helpers_create_element('div', { class_name: 'action-group-right' });

        const save_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            // ÄNDRAD ORDNING: Text först, sedan ikon
            html_content: `<span>${t('save_audit_to_file')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('save', ['currentColor'], 18) : '')
        });
        save_button.addEventListener('click', handle_save_audit_to_file);
        left_actions_group.appendChild(save_button);

        if (current_audit.auditStatus === 'in_progress') {
            const lock_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-warning'],
                // ÄNDRAD ORDNING: Text först, sedan ikon
                html_content: `<span>${t('lock_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('lock_audit', ['currentColor'], 18) : '')
            });
            lock_btn.addEventListener('click', handle_lock_audit);
            right_actions_group.appendChild(lock_btn);
        }

        if (current_audit.auditStatus === 'locked') {
            const unlock_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-secondary'],
                // ÄNDRAD ORDNING: Text först, sedan ikon
                html_content: `<span>${t('unlock_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('unlock_audit', ['currentColor'], 18) : '')
            });
            unlock_btn.addEventListener('click', handle_unlock_audit);
            left_actions_group.appendChild(unlock_btn);

            if(ExportLogic_export_to_csv) {
                const csv_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-info'],
                    // ÄNDRAD ORDNING: Text först, sedan ikon
                    html_content: `<span>${t('export_to_csv')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('export', ['currentColor'], 18) : '')
                });
                csv_btn.addEventListener('click', handle_export_csv);
                left_actions_group.appendChild(csv_btn);
            }
            if(ExportLogic_export_to_excel) {
                const excel_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-info'],
                    // ÄNDRAD ORDNING: Text först, sedan ikon
                    html_content: `<span>${t('export_to_excel')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('export', ['currentColor'], 18) : '')
                });
                excel_btn.addEventListener('click', handle_export_excel);
                left_actions_group.appendChild(excel_btn);
            }
        }
        
        if (left_actions_group.hasChildNodes()) actions_div.appendChild(left_actions_group);
        if (right_actions_group.hasChildNodes()) actions_div.appendChild(right_actions_group);
        
        if (actions_div.hasChildNodes()) section3.appendChild(actions_div);
        
        plate_element.appendChild(section3);
    }

    function destroy() {
        if (sample_list_component_instance && typeof sample_list_component_instance.destroy === 'function') {
            sample_list_component_instance.destroy();
        }
        sample_list_container_element = null;
        app_container_ref = null;
        router_ref = null;
        global_message_element_ref = null;
    }

    return { init, render, destroy };
})();