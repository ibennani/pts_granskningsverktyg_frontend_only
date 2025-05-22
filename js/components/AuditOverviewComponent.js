// file: js/components/AuditOverviewComponent.js
import { SampleListComponent } from './SampleListComponent.js';
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SaveAuditButtonComponent } from './SaveAuditButtonComponent.js'; // <-- NY IMPORT

const AuditOverviewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/audit_overview_component.css';
    let app_container_ref;
    let router_ref;

    // Store-funktioner och ActionTypes
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes; 

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_format_iso_to_local_datetime, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_add_protocol_if_missing, Helpers_load_css;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    // ExportLogic_save_audit_to_json_file tas bort härifrån, då den logiken nu ligger i SaveAuditLogic
    let ExportLogic_export_to_csv, ExportLogic_export_to_excel;
    let AuditLogic_calculate_overall_audit_progress;

    let global_message_element_ref;
    let sample_list_component_instance;
    let sample_list_container_element;

    let add_sample_form_component_instance = null;
    let add_sample_form_container_element = null;
    let is_add_sample_form_visible = false;
    let add_sample_button_ref = null;

    let save_audit_button_component_instance = null; // <-- NY
    let save_audit_button_container_element = null;  // <-- NY

    let previously_focused_element = null;


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

    function assign_globals_once() {
        // Ta bort ExportLogic_save_audit_to_json_file från villkoret
        if (Translation_t && Helpers_create_element && AuditLogic_calculate_overall_audit_progress && ExportLogic_export_to_csv) return true;

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
            // ExportLogic_save_audit_to_json_file tas bort här
            if (!ExportLogic_export_to_csv || !ExportLogic_export_to_excel) { // Kontrollera bara de som är kvar
                 console.warn("AuditOverview: One or more ExportLogic functions (CSV/Excel) are missing. Export functionality may be impaired.");
            }
        } else { console.warn("AuditOverview: ExportLogic module not found on window. CSV/Excel export functionality will be missing."); }


        if (window.AuditLogic && window.AuditLogic.calculate_overall_audit_progress) {
            AuditLogic_calculate_overall_audit_progress = window.AuditLogic.calculate_overall_audit_progress;
        } else {
            console.error("AuditOverview: AuditLogic.calculate_overall_audit_progress is missing!"); all_assigned = false;
        }
        return all_assigned;
    }

    function handle_sample_saved_or_updated_in_form() {
        toggle_add_sample_form(false);
    }

    function handle_edit_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'in_progress') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('cannot_edit_sample_audit_not_in_progress', {defaultValue: "Cannot edit sample: Audit not in progress."}), "warning");
            return;
        }
        if (NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        toggle_add_sample_form(true, sample_id);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        const current_global_state = local_getState();

        if (current_global_state.auditStatus !== 'in_progress') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('cannot_delete_sample_audit_not_in_progress', {defaultValue: "Cannot delete sample: Audit not in progress."}), "warning");
            return;
        }
        if (current_global_state.samples.length <= 1) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_cannot_delete_last_sample'), "warning");
            return;
        }

        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete ? Helpers_escape_html(sample_to_delete.description) : sample_id;

        previously_focused_element = document.activeElement;

        if (confirm(t('confirm_delete_sample', { sampleName: sample_name_for_confirm }))) {
            if (!local_StoreActionTypes || !local_StoreActionTypes.DELETE_SAMPLE) {
                console.error("[AuditOverview] local_StoreActionTypes.DELETE_SAMPLE is undefined!");
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for delete sample is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.DELETE_SAMPLE,
                payload: { sampleId: sample_id }
            });
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_deleted_successfully', { sampleName: sample_name_for_confirm }), "success");
            if (is_add_sample_form_visible && add_sample_form_component_instance && add_sample_form_component_instance.current_editing_sample_id === sample_id) {
                toggle_add_sample_form(false);
            }
        } else {
            if (previously_focused_element) {
                previously_focused_element.focus();
                previously_focused_element = null;
            }
        }
    }

    function toggle_add_sample_form(show, sample_id_to_edit = null) {
        const t = get_t_internally();
        is_add_sample_form_visible = !!show;

        if (add_sample_form_container_element && sample_list_container_element && add_sample_button_ref) {
            if (is_add_sample_form_visible) {
                previously_focused_element = document.activeElement;
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                add_sample_button_ref.innerHTML = `<span>${t('show_existing_samples')}</span>` + (Helpers_get_icon_svg('list', ['currentColor'], 18) || '');

                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') {
                    add_sample_form_component_instance.render(sample_id_to_edit);
                } else {
                    console.error("AuditOverview: AddSampleFormComponent instance or render method is missing in toggle_add_sample_form (show).");
                }
                const first_input = add_sample_form_container_element.querySelector('input, select, textarea');
                if (first_input) first_input.focus();

            } else {
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                add_sample_button_ref.innerHTML = `<span>${t('add_new_sample')}</span>` + (Helpers_get_icon_svg('add', ['currentColor'], 18) || '');

                if (previously_focused_element) {
                    previously_focused_element.focus();
                    previously_focused_element = null;
                } else if (add_sample_button_ref) {
                    add_sample_button_ref.focus();
                }
                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                    sample_list_component_instance.render();
                }
            }
        }
    }

    function handle_lock_audit() {
        const t = get_t_internally();
        if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
            console.error("[AuditOverview] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for lock audit is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.SET_AUDIT_STATUS,
            payload: { status: 'locked' }
        });
        if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_locked_successfully'), 'success');
    }

    function handle_unlock_audit() {
        const t = get_t_internally();
        if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
            console.error("[AuditOverview] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for unlock audit is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.SET_AUDIT_STATUS,
            payload: { status: 'in_progress' }
        });
        if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_unlocked_successfully'), 'success');
    }

    // handle_save_audit_to_file() tas bort här

    function handle_export_csv() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', {status: current_global_state.auditStatus}), 'warning');
            return;
        }
        if (ExportLogic_export_to_csv) {
            ExportLogic_export_to_csv(current_global_state);
        } else {
            console.error("AuditOverview: ExportLogic_export_to_csv is not available.");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_export_function_missing', {defaultValue: "Export function is missing."}), 'error');
        }
    }
    function handle_export_excel() {
        const t = get_t_internally();
        const current_global_state = local_getState();
         if (current_global_state.auditStatus !== 'locked') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', {status: current_global_state.auditStatus}), 'warning');
            return;
        }
        if (ExportLogic_export_to_excel) {
            ExportLogic_export_to_excel(current_global_state);
        } else {
            console.error("AuditOverview: ExportLogic_export_to_excel is not available.");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_export_function_missing', {defaultValue: "Export function is missing."}), 'error');
        }
    }

    function create_info_item(label_key, value, is_html = false) {
        const t = get_t_internally();
        const p = Helpers_create_element('p');
        const strong = Helpers_create_element('strong', { text_content: t(label_key) + ':' });
        p.appendChild(strong); p.appendChild(document.createTextNode(' '));
        if (value || typeof value === 'number' || typeof value === 'boolean') {
            if (is_html) {
                const span = Helpers_create_element('span', { class_name: 'value' });
                span.innerHTML = value; // Notera: is_html förutsätter att 'value' är säker HTML
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
            await sample_list_component_instance.init(
                sample_list_container_element,
                handle_edit_sample_request_from_list,
                handle_delete_sample_request_from_list,
                router_ref,
                local_getState
            );
        } else {
            console.error("AuditOverview: SampleListComponent is not correctly initialized or its init function is missing.");
        }

        add_sample_form_container_element = Helpers_create_element('div', { id: 'overview-add-sample-form-area' });
        add_sample_form_container_element.setAttribute('hidden', 'true');
        add_sample_form_component_instance = AddSampleFormComponent;
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.init === 'function') {
            await add_sample_form_component_instance.init(
                add_sample_form_container_element,
                handle_sample_saved_or_updated_in_form,
                () => toggle_add_sample_form(false),
                local_getState,
                local_dispatch,
                local_StoreActionTypes
            );
        } else {
             console.error("AuditOverview: AddSampleFormComponent is not correctly initialized or its init function is missing.");
        }

        // Initiera den nya SaveAuditButtonComponent
        save_audit_button_container_element = Helpers_create_element('div', { id: 'save-audit-button-area-overview' }); // Unikt ID om det behövs
        save_audit_button_component_instance = SaveAuditButtonComponent;
        if (save_audit_button_component_instance && typeof save_audit_button_component_instance.init === 'function') {
            if (!window.SaveAuditLogic || typeof window.SaveAuditLogic.save_audit_to_json_file !== 'function') {
                console.error("AuditOverview: SaveAuditLogic or save_audit_to_json_file is missing globally!");
            } else {
                 await save_audit_button_component_instance.init(
                    save_audit_button_container_element,
                    local_getState,
                    window.SaveAuditLogic.save_audit_to_json_file,
                    Translation_t,
                    NotificationComponent_show_global_message,
                    Helpers_create_element,
                    Helpers_get_icon_svg,
                    Helpers_load_css
                );
            }
        } else {
            console.error("AuditOverview: SaveAuditButtonComponent is not correctly initialized or its init function is missing.");
        }
    }

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router;

        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes) {
            console.error("[AuditOverviewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined.");
            local_StoreActionTypes = {
                SET_AUDIT_STATUS: 'SET_AUDIT_STATUS_ERROR',
                DELETE_SAMPLE: 'DELETE_SAMPLE_ERROR',
                ADD_SAMPLE: 'ADD_SAMPLE_ERROR',
                UPDATE_SAMPLE: 'UPDATE_SAMPLE_ERROR'
            };
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
        assign_globals_once();
        const t = get_t_internally();

        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) {
            console.error("AuditOverview: Core dependencies missing for render.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_overview', {defaultValue: "Could not render the overview."})}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t("error_no_active_audit", {defaultValue: "Error: No active audit to display."}), "error");
            const go_to_upload_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
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
        if (is_add_sample_form_visible && NotificationComponent_show_global_message &&
            global_message_element_ref && (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim() ||
            (!global_message_element_ref.classList.contains('message-error') && !global_message_element_ref.classList.contains('message-warning')))
        ) {
            NotificationComponent_show_global_message(t('add_sample_form_intro'), "info");
        }


        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_overview_title') }));

        if (AuditLogic_calculate_overall_audit_progress && window.ProgressBarComponent) {
            const progress_data = AuditLogic_calculate_overall_audit_progress(current_global_state);
            const overall_progress_section = Helpers_create_element('section', { class_name: 'audit-overview-section overall-progress-section' });
            overall_progress_section.appendChild(Helpers_create_element('h2', { text_content: t('overall_audit_progress_title', {defaultValue: "Overall Audit Progress"}) }));
            const progress_info_text_p = Helpers_create_element('p', { class_name: 'info-item' });
            progress_info_text_p.innerHTML = `<strong>${t('total_requirements_audited_label', {defaultValue: "Total requirements reviewed"})}:</strong> <span class="value">${progress_data.audited} / ${progress_data.total}</span>`;
            overall_progress_section.appendChild(progress_info_text_p);
            const overall_progress_bar = window.ProgressBarComponent.create(progress_data.audited, progress_data.total, { id: 'overall-audit-progress-bar' });
            overall_progress_section.appendChild(overall_progress_bar);
            plate_element.appendChild(overall_progress_section);
        }

        const section1 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section1.appendChild(Helpers_create_element('h2', { text_content: t('audit_info_title') }));
        const info_grid = Helpers_create_element('div', { class_name: 'info-grid' });
        const md = current_global_state.auditMetadata || {};
        const rf_meta = current_global_state.ruleFileContent.metadata || {};

        info_grid.appendChild(create_info_item('case_number', md.caseNumber));
        info_grid.appendChild(create_info_item('actor_name', md.actorName));
        if (md.actorLink && Helpers_add_protocol_if_missing && Helpers_escape_html) {
            const safe_link = Helpers_add_protocol_if_missing(md.actorLink);
            const escaped_actor_link_for_text = Helpers_escape_html(md.actorLink);
            const escaped_safe_link_for_href = Helpers_escape_html(safe_link);
            const link_html = `<a href="${escaped_safe_link_for_href}" target="_blank" rel="noopener noreferrer">${escaped_actor_link_for_text}</a>`;
            info_grid.appendChild(create_info_item('actor_link', link_html, true));
        } else {
            info_grid.appendChild(create_info_item('actor_link', md.actorLink || null));
        }
        info_grid.appendChild(create_info_item('auditor_name', md.auditorName));
        info_grid.appendChild(create_info_item('rule_file_title', rf_meta.title));
        info_grid.appendChild(create_info_item('Version (Regelfil)', rf_meta.version));
        info_grid.appendChild(create_info_item('status', t(`audit_status_${current_global_state.auditStatus}`)));
        if(Helpers_format_iso_to_local_datetime) {
            info_grid.appendChild(create_info_item('start_time', Helpers_format_iso_to_local_datetime(current_global_state.startTime)));
            if (current_global_state.endTime) {
                info_grid.appendChild(create_info_item('end_time', Helpers_format_iso_to_local_datetime(current_global_state.endTime)));
            }
        }

        section1.appendChild(info_grid);
        if (md.internalComment) {
            const comment_header = Helpers_create_element('h3', { text_content: t('internal_comment'), style: 'font-size: 1rem; margin-top: 1rem; font-weight: 500;' });
            const comment_p = Helpers_create_element('p', {
                text_content: md.internalComment,
                style: 'white-space: pre-wrap; background-color: var(--input-background-color); padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);'
            });
            section1.appendChild(comment_header);
            section1.appendChild(comment_p);
        }
        plate_element.appendChild(section1);

        const section2 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        const sample_management_header_div = Helpers_create_element('div', {style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;"});
        const number_of_samples = current_global_state.samples ? current_global_state.samples.length : 0;
        const sample_list_title_text = t('sample_list_title_with_count', { count: number_of_samples });
        sample_management_header_div.appendChild(Helpers_create_element('h2', { text_content: sample_list_title_text, style: "margin-bottom: 0.5rem;" }));

        add_sample_button_ref = null;
        if (current_global_state.auditStatus === 'in_progress') {
            add_sample_button_ref = Helpers_create_element('button', {
                class_name: ['button', 'button-default', 'button-small'],
            });
            add_sample_button_ref.addEventListener('click', () => {
                toggle_add_sample_form(!is_add_sample_form_visible);
            });
            sample_management_header_div.appendChild(add_sample_button_ref);
        }
        section2.appendChild(sample_management_header_div);

        if(add_sample_form_container_element) {
            section2.appendChild(add_sample_form_container_element);
        } else { console.error("AuditOverview: add_sample_form_container_element är null vid render!"); }

        if (sample_list_container_element) {
            section2.appendChild(sample_list_container_element);
            if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                sample_list_component_instance.render();
            } else {
                 console.error("AuditOverview: SampleListComponent instans eller render-metod saknas!");
                 sample_list_container_element.appendChild(Helpers_create_element('p', {text_content: t('error_loading_sample_list_for_overview')}));
            }
        } else {
            console.error("AuditOverview: sample_list_container_element är null vid render!");
            section2.appendChild(Helpers_create_element('p', {text_content: t('error_loading_sample_list_for_overview')}));
        }
        plate_element.appendChild(section2);

        toggle_add_sample_form(is_add_sample_form_visible,
            is_add_sample_form_visible && add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null);

        const section3 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section3.appendChild(Helpers_create_element('h2', { text_content: t('audit_actions_title') }));
        const actions_div = Helpers_create_element('div', { class_name: 'audit-overview-actions' });
        const left_actions_group = Helpers_create_element('div', { class_name: 'action-group-left' });
        const right_actions_group = Helpers_create_element('div', { class_name: 'action-group-right' });

        // Använd den nya SaveAuditButtonComponent
        if (save_audit_button_container_element && save_audit_button_component_instance && typeof save_audit_button_component_instance.render === 'function') {
            left_actions_group.appendChild(save_audit_button_container_element);
            save_audit_button_component_instance.render();
        } else {
            console.warn("[AuditOverview Render] Save audit button container or instance not ready to be rendered into actions.");
        }

        if (current_global_state.auditStatus === 'in_progress') {
            const lock_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-warning'],
                html_content: `<span>${t('lock_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('lock_audit', ['currentColor'], 18) : '')
            });
            lock_btn.addEventListener('click', handle_lock_audit);
            right_actions_group.appendChild(lock_btn);
        }
        if (current_global_state.auditStatus === 'locked') {
            const unlock_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-secondary'],
                html_content: `<span>${t('unlock_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('unlock_audit', ['currentColor'], 18) : '')
            });
            unlock_btn.addEventListener('click', handle_unlock_audit);
            left_actions_group.appendChild(unlock_btn); // Lägg till i vänstra gruppen för konsekvens

            if(ExportLogic_export_to_csv) {
                const csv_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-default'],
                    html_content: `<span>${t('export_to_csv')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('export', ['currentColor'], 18) : '')
                });
                csv_btn.addEventListener('click', handle_export_csv);
                left_actions_group.appendChild(csv_btn);
            }
            if(ExportLogic_export_to_excel) {
                const excel_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-default'],
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
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.destroy === 'function') {
            add_sample_form_component_instance.destroy();
        }
        if (save_audit_button_component_instance && typeof save_audit_button_component_instance.destroy === 'function') {
            save_audit_button_component_instance.destroy(); // <-- NYTT
        }
        sample_list_container_element = null;
        add_sample_form_container_element = null;
        save_audit_button_container_element = null; // <-- NYTT
        sample_list_component_instance = null;
        add_sample_form_component_instance = null;
        save_audit_button_component_instance = null; // <-- NYTT
        is_add_sample_form_visible = false;
        add_sample_button_ref = null;
        previously_focused_element = null;
        global_message_element_ref = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
    }

    return { init, render, destroy };
})();

export const AuditOverviewComponent = AuditOverviewComponent_internal;