// Importera SampleListComponent
import { SampleListComponent } from './SampleListComponent.js';

export const AuditOverviewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/audit_overview_component.css';
    let app_container_ref;
    let router_ref;

    // Globala referenser tilldelas i init
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_format_iso_to_local_datetime, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_add_protocol_if_missing, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let ExportLogic_export_to_csv, ExportLogic_export_to_excel;

    let global_message_element_ref;
    let sample_list_component_instance;
    let sample_list_container_element;


    // Helper function to safely get the translation function
    function get_t_internally() {
        if (Translation_t) return Translation_t; // Om redan tilldelad via assign_globals
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
        if (window.Translation && window.Translation.t) Translation_t = window.Translation.t;
        else console.error("AuditOverview: Translation module not found on window.");
        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_format_iso_to_local_datetime = window.Helpers.format_iso_to_local_datetime;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_get_current_iso_datetime_utc = window.Helpers.get_current_iso_datetime_utc;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css; // Lade till denna

        } else console.error("AuditOverview: Helpers module not found on window.");
        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
        } else console.error("AuditOverview: State module not found on window.");
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
        } else console.error("AuditOverview: NotificationComponent module not found on window.");
        if (window.ExportLogic) {
            ExportLogic_export_to_csv = window.ExportLogic.export_to_csv;
            ExportLogic_export_to_excel = window.ExportLogic.export_to_excel;
        } // else console.warn("AuditOverview: ExportLogic module not found on window. Exports will not work.");
    }


    function handle_lock_audit() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (current_audit && current_audit.auditStatus === 'in_progress') {
            current_audit.auditStatus = 'locked';
            current_audit.endTime = Helpers_get_current_iso_datetime_utc();
            State_setCurrentAudit(current_audit);
            NotificationComponent_show_global_message(t('audit_locked_successfully'), 'success');
            render();
        }
    }
    function handle_unlock_audit() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (current_audit && current_audit.auditStatus === 'locked') {
            current_audit.auditStatus = 'in_progress';
            current_audit.endTime = null;
            State_setCurrentAudit(current_audit);
            NotificationComponent_show_global_message(t('audit_unlocked_successfully'), 'success');
            render();
        }
    }
    function handle_save_audit_to_file() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (!current_audit) { NotificationComponent_show_global_message(t('no_audit_data_to_save'), "error"); return; }
        try {
            const audit_json_string = JSON.stringify(current_audit, null, 2);
            const blob = new Blob([audit_json_string], { type: 'application/json;charset=utf-8;' });
            const rule_file_title_part = current_audit.ruleFileContent?.metadata?.title?.toLowerCase().replace(/[^a-z0-9\u00E5\u00E4\u00F6\u00C5\u00C4\u00D6]+/gi, '_').substring(0,30) || 'regelfil';
            const date_now = new Date();
            const date_string = `${date_now.getFullYear()}-${String(date_now.getMonth() + 1).padStart(2, '0')}-${String(date_now.getDate()).padStart(2, '0')}-${String(date_now.getHours()).padStart(2, '0')}-${String(date_now.getMinutes()).padStart(2, '0')}-${String(date_now.getSeconds()).padStart(2, '0')}`;
            const filename = `granskning_${rule_file_title_part}_${date_string}.json`;
            const link = Helpers_create_element("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); link.setAttribute("download", filename);
                link.style.visibility = 'hidden'; document.body.appendChild(link);
                link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
                NotificationComponent_show_global_message(t('audit_saved_as_file', {filename: filename}), "success");
            } else { NotificationComponent_show_global_message(t('browser_does_not_support_download'), "warning");}
        } catch (error) { console.error("Kunde inte serialisera eller spara granskningen:", error); NotificationComponent_show_global_message(t('error_saving_audit'), "error");}
    }
    function handle_export_csv() { if(ExportLogic_export_to_csv) ExportLogic_export_to_csv(State_getCurrentAudit()); else console.error("ExportLogic_export_to_csv not available."); }
    function handle_export_excel() { if(ExportLogic_export_to_excel) ExportLogic_export_to_excel(State_getCurrentAudit()); else console.error("ExportLogic_export_to_excel not available.");}

    function create_info_item(label_key, value, is_html = false) {
        const t = get_t_internally();
        const p = Helpers_create_element('p');
        const strong = Helpers_create_element('strong', { text_content: t(label_key) + ':' });
        p.appendChild(strong); p.appendChild(document.createTextNode(' '));
        if (value || typeof value === 'number' || typeof value === 'boolean') {
            if (is_html) { const span = Helpers_create_element('span', { class_name: 'value' }); span.innerHTML = value; p.appendChild(span); }
            else { p.appendChild(Helpers_create_element('span', { class_name: 'value', text_content: String(value) })); }
        } else { p.appendChild(Helpers_create_element('span', { class_name: 'value text-muted', text_content: '---' })); }
        const item_div = Helpers_create_element('div', { class_name: 'info-item'}); item_div.appendChild(p); return item_div;
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
        } else { console.error("AuditOverview: SampleListComponent is not correctly initialized."); }
    }

    async function init(_app_container, _router) {
        app_container_ref = _app_container;
        router_ref = _router;
        assign_globals();
        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        await init_sub_components();
        if (Helpers_load_css) { // Använd Helpers_load_css från assign_globals
            try { await Helpers_load_css(CSS_PATH); }
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
            const go_to_upload_btn = Helpers_create_element('button', { text_content: t('start_new_audit'), class_name: ['button', 'button-primary'], event_listeners: { click: () => router_ref('upload') } });
            app_container_ref.appendChild(go_to_upload_btn);
            return;
        }

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate audit-overview-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_overview_title') }));

        // --- Sektion 1: Granskningsinformation ---
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
        } else { info_grid.appendChild(create_info_item('actor_link', null)); }
        info_grid.appendChild(create_info_item('auditor_name', md.auditorName));

        info_grid.appendChild(create_info_item('rule_file_title', rf_meta.title));
        info_grid.appendChild(create_info_item('Version (Regelfil)', rf_meta.version)); // Nyckeln finns redan
        info_grid.appendChild(create_info_item('status', t(`audit_status_${current_audit.auditStatus}`))); // Nycklar som audit_status_in_progress finns

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


        // --- Sektion 2: Stickprovslista ---
        const section2 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section2.appendChild(Helpers_create_element('h2', { text_content: t('sample_list_title') }));
        if (sample_list_container_element) {
            section2.appendChild(sample_list_container_element);
            if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                sample_list_component_instance.render();
            }
        } else { section2.appendChild(Helpers_create_element('p', {text_content: t('error_loading_sample_list_for_overview')}));} // ANVÄNDER i18n
        plate_element.appendChild(section2);

        // --- Sektion 3: Åtgärdsknapprad ---
        const section3 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section3.appendChild(Helpers_create_element('h2', { text_content: t('audit_actions_title') }));
        const actions_div = Helpers_create_element('div', { class_name: 'audit-overview-actions' });

        const save_button = Helpers_create_element('button', { class_name: ['button', 'button-default'], html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('save', ['currentColor'], 18) : '') + `<span>${t('save_audit_to_file')}</span>` });
        save_button.addEventListener('click', handle_save_audit_to_file);
        actions_div.appendChild(save_button);

        if (current_audit.auditStatus === 'in_progress') {
            const lock_btn = Helpers_create_element('button', { class_name: ['button', 'button-warning'], html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('lock_audit', ['currentColor'], 18) : '') + `<span>${t('lock_audit')}</span>` });
            lock_btn.addEventListener('click', handle_lock_audit);
            actions_div.appendChild(lock_btn);
        }

        if (current_audit.auditStatus === 'locked') {
            const unlock_btn = Helpers_create_element('button', { class_name: ['button', 'button-secondary'], html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('unlock_audit', ['currentColor'], 18) : '') + `<span>${t('unlock_audit')}</span>` });
            unlock_btn.addEventListener('click', handle_unlock_audit);
            actions_div.appendChild(unlock_btn);

            if(ExportLogic_export_to_csv) {
                const csv_btn = Helpers_create_element('button', { class_name: ['button', 'button-info'], html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('export', ['currentColor'], 18) : '') + `<span>${t('export_to_csv')}</span>` });
                csv_btn.addEventListener('click', handle_export_csv);
                actions_div.appendChild(csv_btn);
            }
            if(ExportLogic_export_to_excel) {
                const excel_btn = Helpers_create_element('button', { class_name: ['button', 'button-info'], html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('export', ['currentColor'], 18) : '') + `<span>${t('export_to_excel')}</span>` });
                excel_btn.addEventListener('click', handle_export_excel);
                actions_div.appendChild(excel_btn);
            }
        }
        section3.appendChild(actions_div);
        plate_element.appendChild(section3);
    }

    function destroy() {
        if (sample_list_component_instance && typeof sample_list_component_instance.destroy === 'function') {
            sample_list_component_instance.destroy();
        }
        sample_list_container_element = null;
        // Nollställ andra referenser om nödvändigt
        app_container_ref = null;
        router_ref = null;
        global_message_element_ref = null;
    }

    return { init, render, destroy };
})();