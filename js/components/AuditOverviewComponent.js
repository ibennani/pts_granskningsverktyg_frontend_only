// file: js/components/AuditOverviewComponent.js
import { SampleListComponent } from './SampleListComponent.js';
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
// SaveAuditButtonComponent-importen tas bort
import { VardetalProgressBarComponent } from './VardetalProgressBarComponent.js';

const AuditOverviewComponent_internal = (function () {
    'use strict';

    const CSS_PATH = 'css/components/audit_overview_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let local_subscribe_func;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_format_iso_to_local_datetime, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_add_protocol_if_missing, Helpers_load_css;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let ExportLogic_export_to_csv, ExportLogic_export_to_excel;
    let AuditLogic_calculate_overall_audit_progress;

    let VardetalCalculator_calculate_current_vardetal_func;
    let VardetalCalculator_get_precalculated_data_store_func;
    let vardetal_progress_bar_component_instance = null;
    let vardetal_progress_bar_container_element = null;

    let global_message_element_ref;
    let sample_list_component_instance;
    let sample_list_container_element;

    let add_sample_form_component_instance = null;
    let add_sample_form_container_element = null;
    let is_add_sample_form_visible = false;
    let add_sample_button_ref = null;

    let previously_focused_element = null;
    let unsubscribe_from_store_function = null;
    const ACTIVE_VIEW_MARKER_CLASS = 'audit-overview-plate-active-marker';

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
        let all_assigned_check = true;

        if (window.Translation?.t) {
            Translation_t = window.Translation.t;
        } else {
            console.error("AuditOverview: window.Translation.t is missing!");
            Translation_t = (key, rep) => rep?.defaultValue || `**${key}**(T_FALLBACK_ASSIGN)`;
            all_assigned_check = false;
        }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_format_iso_to_local_datetime = window.Helpers.format_iso_to_local_datetime;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_get_current_iso_datetime_utc = window.Helpers.get_current_iso_datetime_utc;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg) {
                console.error("AuditOverview: Core Helper functions (create_element or get_icon_svg) are missing!");
                all_assigned_check = false;
            }
        } else { console.error("AuditOverview: window.Helpers module is missing!"); all_assigned_check = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_show_global_message) {
                console.error("AuditOverview: NotificationComponent.show_global_message is missing!");
                all_assigned_check = false;
            }
        } else { console.error("AuditOverview: window.NotificationComponent module is missing!"); all_assigned_check = false; }

        if (window.ExportLogic) {
            ExportLogic_export_to_csv = window.ExportLogic.export_to_csv;
            ExportLogic_export_to_excel = window.ExportLogic.export_to_excel;
        } else { console.warn("AuditOverview: window.ExportLogic module not found. Export functionality may be impaired."); }

        if (window.AuditLogic?.calculate_overall_audit_progress) {
            AuditLogic_calculate_overall_audit_progress = window.AuditLogic.calculate_overall_audit_progress;
        } else {
            console.error("AuditOverview: AuditLogic.calculate_overall_audit_progress is missing!");
            all_assigned_check = false;
        }

        if (window.VardetalCalculator) {
            VardetalCalculator_calculate_current_vardetal_func = window.VardetalCalculator.calculate_current_vardetal;
            VardetalCalculator_get_precalculated_data_store_func = window.VardetalCalculator.get_precalculated_data_store;
            if (!VardetalCalculator_calculate_current_vardetal_func || !VardetalCalculator_get_precalculated_data_store_func) {
                console.error("AuditOverview: One or more VardetalCalculator functions are missing!");
                all_assigned_check = false;
            }
        } else {
            console.error("AuditOverview: VardetalCalculator module not found on window!");
            all_assigned_check = false;
        }

        return all_assigned_check;
    }

    function handle_sample_saved_or_updated_in_form() {
        toggle_add_sample_form(false);
    }

    function handle_edit_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'in_progress') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('cannot_edit_sample_audit_not_in_progress', { defaultValue: "Cannot edit sample: Audit not in progress." }), "warning");
            return;
        }
        if (NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        toggle_add_sample_form(true, sample_id);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        const current_global_state = local_getState();

        if (current_global_state.auditStatus !== 'in_progress') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('cannot_delete_sample_audit_not_in_progress', { defaultValue: "Cannot delete sample: Audit not in progress." }), "warning");
            return;
        }
        if (current_global_state.samples.length <= 1) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_cannot_delete_last_sample', { defaultValue: "You cannot delete the last sample." }), "warning");
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
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for lock audit is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.SET_AUDIT_STATUS,
            payload: { status: 'locked' }
        });
        if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_locked_successfully'), 'success');
    }

    function handle_unlock_audit() {
        const t = get_t_internally();
        if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
            console.error("[AuditOverview] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for unlock audit is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.SET_AUDIT_STATUS,
            payload: { status: 'in_progress' }
        });
        if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_unlocked_successfully'), 'success');
    }

    function handle_export_csv() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', { status: current_global_state.auditStatus }), 'warning');
            return;
        }
        if (ExportLogic_export_to_csv) {
            ExportLogic_export_to_csv(current_global_state);
        } else {
            console.error("AuditOverview: ExportLogic_export_to_csv is not available.");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_export_function_missing', { defaultValue: "Export function is missing." }), 'error');
        }
    }
    function handle_export_excel() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', { status: current_global_state.auditStatus }), 'warning');
            return;
        }
        if (ExportLogic_export_to_excel) {
            ExportLogic_export_to_excel(current_global_state);
        } else {
            console.error("AuditOverview: ExportLogic_export_to_excel is not available.");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_export_function_missing', { defaultValue: "Export function is missing." }), 'error');
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
                span.innerHTML = value;
                p.appendChild(span);
            } else {
                p.appendChild(Helpers_create_element('span', { class_name: 'value', text_content: String(value) }));
            }
        } else {
            p.appendChild(Helpers_create_element('span', { class_name: 'value text-muted', text_content: '---' }));
        }
        const item_div = Helpers_create_element('div', { class_name: 'info-item' });
        item_div.appendChild(p);
        return item_div;
    }

    async function init_sub_components() {
        if (!Helpers_create_element || !Translation_t) {
            console.error("AuditOverview init_sub_components: Core dependencies (Helpers_create_element or Translation_t) missing. assign_globals_once() might not have run or failed in init().");
            return;
        }

        sample_list_container_element = Helpers_create_element('div', { id: 'overview-sample-list-area-container' });
        if (typeof SampleListComponent?.init === 'function') {
            sample_list_component_instance = SampleListComponent;
            await sample_list_component_instance.init(
                sample_list_container_element,
                handle_edit_sample_request_from_list,
                handle_delete_sample_request_from_list,
                router_ref,
                local_getState
            );
        } else {
            console.error("AuditOverview: SampleListComponent or its init function is missing.");
        }

        add_sample_form_container_element = Helpers_create_element('div', { id: 'overview-add-sample-form-area-container' });
        add_sample_form_container_element.setAttribute('hidden', 'true');
        if (typeof AddSampleFormComponent?.init === 'function') {
            add_sample_form_component_instance = AddSampleFormComponent;
            await add_sample_form_component_instance.init(
                add_sample_form_container_element,
                handle_sample_saved_or_updated_in_form,
                () => toggle_add_sample_form(false),
                local_getState,
                local_dispatch,
                local_StoreActionTypes
            );
        } else {
            console.error("AuditOverview: AddSampleFormComponent or its init function is missing.");
        }

        vardetal_progress_bar_container_element = Helpers_create_element('div', { class_name: 'vardetal-progress-bar-container' });
        if (typeof VardetalProgressBarComponent?.init === 'function') {
            vardetal_progress_bar_component_instance = VardetalProgressBarComponent;
            await vardetal_progress_bar_component_instance.init(
                vardetal_progress_bar_container_element,
                Helpers_create_element,
                Helpers_load_css,
                Translation_t
            );
        } else {
            console.error("AuditOverview: VardetalProgressBarComponent or its init function is missing. Vardetal progress bar will not be displayed properly.");
            vardetal_progress_bar_container_element = null;
        }
    }

    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes, _subscribe) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        local_subscribe_func = _subscribe;

        if (!local_StoreActionTypes) {
            console.error("[AuditOverviewComponent init] CRITICAL: Core StoreActionTypes missing for init.");
        }
        if (!local_StoreActionTypes.UPDATE_CALCULATED_VARDETAL) {
            console.warn("[AuditOverviewComponent init] StoreActionTypes.UPDATE_CALCULATED_VARDETAL is not defined.");
        }
        if (!local_StoreActionTypes.SET_PRECALCULATED_RULE_DATA) {
            console.warn("[AuditOverviewComponent init] StoreActionTypes.SET_PRECALCULATED_RULE_DATA is not defined.");
        }

        if (typeof NotificationComponent_get_global_message_element_reference === 'function') {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }

        await init_sub_components();

        if (typeof Helpers_load_css === 'function' && CSS_PATH) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                }
            }
            catch (error) { console.warn("Failed to load CSS for AuditOverviewComponent:", error); }
        }

        if (!unsubscribe_from_store_function && typeof local_subscribe_func === 'function') {
            unsubscribe_from_store_function = local_subscribe_func(handle_store_update);
        }
    }

    function render() {
        assign_globals_once();
        const t = get_t_internally();

        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) {
            console.error("AuditOverview: Core dependencies missing for render.");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_overview', { defaultValue: "Could not render the overview." })}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t("error_no_active_audit", { defaultValue: "Error: No active audit to display." }), "error");
            const go_to_upload_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                html_content: `<span>${t('start_new_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('start_new', ['currentColor'], 18) : ''),
                event_listeners: {
                    click: () => {
                        if (router_ref) router_ref('upload');
                        else alert('No router available');
                    }
                }
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
            overall_progress_section.appendChild(Helpers_create_element('h2', { text_content: t('overall_audit_progress_title', { defaultValue: "Overall Audit Progress" }) }));
            const progress_info_text_p = Helpers_create_element('p', { class_name: 'info-item' });
            progress_info_text_p.innerHTML = `<strong>${t('total_requirements_audited_label', { defaultValue: "Total requirements reviewed" })}:</strong> <span class="value">${progress_data.audited} / ${progress_data.total}</span>`;
            overall_progress_section.appendChild(progress_info_text_p);
            const overall_progress_bar = window.ProgressBarComponent.create(progress_data.audited, progress_data.total, { id: 'overall-audit-progress-bar' });
            overall_progress_section.appendChild(overall_progress_bar);
            plate_element.appendChild(overall_progress_section);

            // --- Sektion för Värdetal Progress Bar ---
            const vardetal_section = Helpers_create_element('section', { class_name: 'audit-overview-section vardetal-progress-section' });
            if (vardetal_progress_bar_container_element && vardetal_progress_bar_component_instance?.render) {
                vardetal_progress_bar_container_element.innerHTML = '';
                vardetal_section.appendChild(vardetal_progress_bar_container_element);
                const vardetal_value_from_state = current_global_state.auditCalculations?.currentVardetal;
                console.log("[AuditOverview RENDER] Vardetal från state för progressbar:", vardetal_value_from_state);

                vardetal_progress_bar_component_instance.render(
                    (vardetal_value_from_state !== null && vardetal_value_from_state !== undefined) ? vardetal_value_from_state : 0,
                    500,
                    { green_end: 9, yellow_end: 79 }
                );
            } else {
                vardetal_section.appendChild(Helpers_create_element('p', { text_content: t('score_progress_bar_could_not_be_loaded', { defaultValue: 'Score progress bar could not be loaded (check console for details).' }) }));
            }
            plate_element.appendChild(vardetal_section);
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
        info_grid.appendChild(create_info_item('version_rulefile', rf_meta.version)); // Bättre translation key!
        info_grid.appendChild(create_info_item('status', t(`audit_status_${current_global_state.auditStatus}`)));
        if (Helpers_format_iso_to_local_datetime) {
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
        const sample_management_header_div = Helpers_create_element('div', { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;" });
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

        if (add_sample_form_container_element) {
            section2.appendChild(add_sample_form_container_element);
        } else { console.error("AuditOverview: add_sample_form_container_element är null vid render!"); }

        if (sample_list_container_element) {
            section2.appendChild(sample_list_container_element);
            if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                sample_list_component_instance.render();
            } else {
                console.error("AuditOverview: SampleListComponent instans eller render-metod saknas!");
                sample_list_container_element.appendChild(Helpers_create_element('p', { text_content: t('error_loading_sample_list_for_overview') }));
            }
        } else {
            console.error("AuditOverview: sample_list_container_element är null vid render!");
            section2.appendChild(Helpers_create_element('p', { text_content: t('error_loading_sample_list_for_overview') }));
        }
        plate_element.appendChild(section2);

        toggle_add_sample_form(is_add_sample_form_visible,
            is_add_sample_form_visible && add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null);

        const section3 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section3.appendChild(Helpers_create_element('h2', { text_content: t('audit_actions_title') }));
        const actions_div = Helpers_create_element('div', { class_name: 'audit-overview-actions' });
        const left_actions_group = Helpers_create_element('div', { class_name: 'action-group-left' });
        const right_actions_group = Helpers_create_element('div', { class_name: 'action-group-right' });

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
            left_actions_group.appendChild(unlock_btn);

            if (ExportLogic_export_to_csv) {
                const csv_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-default'],
                    html_content: `<span>${t('export_to_csv')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('export', ['currentColor'], 18) : '')
                });
                csv_btn.addEventListener('click', handle_export_csv);
                left_actions_group.appendChild(csv_btn);
            }
            if (ExportLogic_export_to_excel) {
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
        if (app_container_ref?.classList) {
            app_container_ref.classList.remove(ACTIVE_VIEW_MARKER_CLASS);
        }

        if (unsubscribe_from_store_function) {
            unsubscribe_from_store_function();
            unsubscribe_from_store_function = null;
        }

        if (sample_list_component_instance?.destroy) sample_list_component_instance.destroy();
        if (add_sample_form_component_instance?.destroy) add_sample_form_component_instance.destroy();
        if (vardetal_progress_bar_component_instance?.destroy) vardetal_progress_bar_component_instance.destroy();

        sample_list_container_element = null;
        add_sample_form_container_element = null;
        vardetal_progress_bar_container_element = null;

        sample_list_component_instance = null;
        add_sample_form_component_instance = null;
        vardetal_progress_bar_component_instance = null;

        add_sample_button_ref = null;
        previously_focused_element = null;

        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        local_subscribe_func = null;
    }

    function handle_store_update(new_state) {
        if (!app_container_ref || !app_container_ref.classList.contains(ACTIVE_VIEW_MARKER_CLASS)) {
            return;
        }
        handle_store_update_for_vardetal_ui(new_state);
        console.log("==> handle_store_update_for_vardetal_ui, aktuellt vardetal i staten:", new_state.auditCalculations?.currentVardetal);
        console.log("dispatch av UPDATE_CALCULATED_VARDETAL med", new_state.auditCalculations?.currentVardetal); // Justerad log
    
        if (document.body.contains(app_container_ref)) {
            render();
        }
    }

    function handle_store_update_for_vardetal_ui(new_state_from_store) {
        console.log("===> AuditOverview: handle_store_update_for_vardetal_ui KÖRS", new_state_from_store.auditCalculations);
    
        if (typeof VardetalCalculator_calculate_current_vardetal_func !== 'function' ||
            typeof VardetalCalculator_get_precalculated_data_store_func !== 'function') {
            console.warn("[AuditOverview] VardetalCalculator functions not available. Cannot update vardetal.");
            if (local_dispatch && local_StoreActionTypes && local_StoreActionTypes.UPDATE_CALCULATED_VARDETAL &&
                new_state_from_store.auditCalculations?.currentVardetal !== null) {
                 local_dispatch({
                    type: local_StoreActionTypes.UPDATE_CALCULATED_VARDETAL,
                    payload: { vardetal: null }
                });
            }
            return; 
        }
    
        let precalculated_rule_data_for_calc = new_state_from_store.auditCalculations?.ruleData;
    
        if (!precalculated_rule_data_for_calc || !precalculated_rule_data_for_calc.weights_map) {
            precalculated_rule_data_for_calc = VardetalCalculator_get_precalculated_data_store_func();
    
            if (precalculated_rule_data_for_calc && precalculated_rule_data_for_calc.weights_map &&
                local_dispatch && local_StoreActionTypes && local_StoreActionTypes.SET_PRECALCULATED_RULE_DATA &&
                (!new_state_from_store.auditCalculations?.ruleData?.weights_map)) {
                local_dispatch({
                    type: local_StoreActionTypes.SET_PRECALCULATED_RULE_DATA,
                    payload: precalculated_rule_data_for_calc
                });
                return; 
            }
        }
    
        if (precalculated_rule_data_for_calc && precalculated_rule_data_for_calc.weights_map) {
            const calculated_vardetal = VardetalCalculator_calculate_current_vardetal_func(new_state_from_store, precalculated_rule_data_for_calc);
            const current_vardetal_in_state = new_state_from_store.auditCalculations?.currentVardetal;
    
            console.log(`[AuditOverview] Vardetal CALC: ${calculated_vardetal}, Vardetal IN STATE: ${current_vardetal_in_state}`);
    
            if (local_dispatch && local_StoreActionTypes && local_StoreActionTypes.UPDATE_CALCULATED_VARDETAL &&
                current_vardetal_in_state !== calculated_vardetal) {
                console.log(`[AuditOverview] Dispatching UPDATE_CALCULATED_VARDETAL with: ${calculated_vardetal}`);
                local_dispatch({
                    type: local_StoreActionTypes.UPDATE_CALCULATED_VARDETAL,
                    payload: { vardetal: calculated_vardetal }
                });
            }
        } else {
            if (local_dispatch && local_StoreActionTypes && local_StoreActionTypes.UPDATE_CALCULATED_VARDETAL &&
                new_state_from_store.auditCalculations?.currentVardetal !== null) {
                 local_dispatch({
                    type: local_StoreActionTypes.UPDATE_CALCULATED_VARDETAL,
                    payload: { vardetal: null }
                });
            }
        }
    }

    return { init, render, destroy };
})();

export const AuditOverviewComponent = AuditOverviewComponent_internal;