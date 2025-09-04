// file: js/components/AuditOverviewComponent.js
import { SampleListComponent } from './SampleListComponent.js';
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

    let vardetal_progress_bar_component_instance = null;
    let vardetal_progress_bar_container_element = null;

    let global_message_element_ref;
    let sample_list_component_instance;
    let sample_list_container_element;
    
    let previously_focused_element = null;
    
    let unsubscribe_from_store_function = null;
    const ACTIVE_VIEW_MARKER_CLASS = 'audit-overview-plate-active-marker';

    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;
    }

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_format_iso_to_local_datetime = window.Helpers?.format_iso_to_local_datetime;
        Helpers_escape_html = window.Helpers?.escape_html;
        Helpers_get_current_iso_datetime_utc = window.Helpers?.get_current_iso_datetime_utc;
        Helpers_add_protocol_if_missing = window.Helpers?.add_protocol_if_missing;
        Helpers_load_css = window.Helpers?.load_css;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_clear_global_message = window.NotificationComponent?.clear_global_message;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
        ExportLogic_export_to_csv = window.ExportLogic?.export_to_csv;
        ExportLogic_export_to_excel = window.ExportLogic?.export_to_excel;
        AuditLogic_calculate_overall_audit_progress = window.AuditLogic?.calculate_overall_audit_progress;
    }

    function handle_edit_sample_request_from_list(sample_id) {
        // ÄNDRING: Navigera till den dedikerade formulärvyn
        router_ref('sample_form', { editSampleId: sample_id });
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        const current_global_state = local_getState();

        if (current_global_state.samples.length <= 1) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_cannot_delete_last_sample'), "warning");
            return;
        }

        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete ? Helpers_escape_html(sample_to_delete.description) : sample_id;

        previously_focused_element = document.activeElement;

        if (confirm(t('confirm_delete_sample', { sampleName: sample_name_for_confirm }))) {
            local_dispatch({
                type: local_StoreActionTypes.DELETE_SAMPLE,
                payload: { sampleId: sample_id }
            });
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_deleted_successfully', { sampleName: sample_name_for_confirm }), "success");
        } else {
            if (previously_focused_element) {
                previously_focused_element.focus();
                previously_focused_element = null;
            }
        }
    }

    function handle_lock_audit() {
        const t = get_t_internally();
        local_dispatch({ type: local_StoreActionTypes.SET_AUDIT_STATUS, payload: { status: 'locked' } });
        if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_locked_successfully'), 'success');
    }

    function handle_unlock_audit() {
        const t = get_t_internally();
        local_dispatch({ type: local_StoreActionTypes.SET_AUDIT_STATUS, payload: { status: 'in_progress' } });
        if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_unlocked_successfully'), 'success');
    }

    function handle_export_csv() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', { status: current_global_state.auditStatus }), 'warning');
            return;
        }
        ExportLogic_export_to_csv(current_global_state);
    }

    function handle_export_excel() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_not_locked_for_export', { status: current_global_state.auditStatus }), 'warning');
            return;
        }
        ExportLogic_export_to_excel(current_global_state);
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
        assign_globals_once();
        if (!Helpers_create_element || !Translation_t) {
            console.error("AuditOverview init_sub_components: Core dependencies missing.");
            return;
        }

        sample_list_container_element = Helpers_create_element('div', { id: 'overview-sample-list-area-container' });
        if (typeof SampleListComponent?.init === 'function') {
            sample_list_component_instance = SampleListComponent;
            await sample_list_component_instance.init(
                sample_list_container_element,
                { 
                    on_edit: handle_edit_sample_request_from_list,
                    on_delete: handle_delete_sample_request_from_list
                },
                router_ref,
                local_getState
            );
        } else {
            console.error("AuditOverview: SampleListComponent or its init function is missing.");
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
            console.error("AuditOverview: VardetalProgressBarComponent or its init function is missing.");
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
        
        global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        
        await init_sub_components();

        await Helpers_load_css(CSS_PATH).catch(error => console.warn("Failed to load CSS for AuditOverviewComponent:", error));

        if (!unsubscribe_from_store_function && typeof local_subscribe_func === 'function') {
            unsubscribe_from_store_function = local_subscribe_func(handle_store_update);
        }
    }

    function render() {
        assign_globals_once();
        const t = get_t_internally();

        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) {
            console.error("AuditOverview: Core dependencies missing for render.");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_overview')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';
        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t("error_no_active_audit"), "error");
            const go_to_upload_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                html_content: `<span>${t('start_new_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('start_new', ['currentColor'], 18) : ''),
                event_listeners: {
                    click: () => {
                        if (router_ref) router_ref('upload');
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
        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_overview_title') }));
        
        if (AuditLogic_calculate_overall_audit_progress && window.ProgressBarComponent) {
            const progress_data = AuditLogic_calculate_overall_audit_progress(current_global_state);
            const overall_progress_section = Helpers_create_element('section', { class_name: 'audit-overview-section overall-progress-section' });
            overall_progress_section.appendChild(Helpers_create_element('h2', { text_content: t('overall_audit_progress_title') }));
            const progress_info_text_p = Helpers_create_element('p', { class_name: 'info-item' });
            progress_info_text_p.innerHTML = `<strong>${t('total_requirements_audited_label')}:</strong> <span class="value">${progress_data.audited} / ${progress_data.total}</span>`;
            overall_progress_section.appendChild(progress_info_text_p);
            const overall_progress_bar = window.ProgressBarComponent.create(progress_data.audited, progress_data.total, { id: 'overall-audit-progress-bar' });
            overall_progress_section.appendChild(overall_progress_bar);
            plate_element.appendChild(overall_progress_section);

            const vardetal_section = Helpers_create_element('section', { class_name: 'audit-overview-section vardetal-progress-section' });
            if (vardetal_progress_bar_container_element && vardetal_progress_bar_component_instance?.render) {
                vardetal_progress_bar_container_element.innerHTML = '';
                vardetal_section.appendChild(vardetal_progress_bar_container_element);
                const vardetal_value_from_state = current_global_state.auditCalculations?.currentVardetal;
                vardetal_progress_bar_component_instance.render(
                    (vardetal_value_from_state !== null && vardetal_value_from_state !== undefined) ? vardetal_value_from_state : 0,
                    500,
                    { green_end: 9, yellow_end: 79 }
                );
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
        info_grid.appendChild(create_info_item('version_rulefile', rf_meta.version));
        info_grid.appendChild(create_info_item('status', t(`audit_status_${current_global_state.auditStatus}`)));
        if (Helpers_format_iso_to_local_datetime) {
            const lang_code = window.Translation.get_current_language_code();
            info_grid.appendChild(create_info_item('start_time', Helpers_format_iso_to_local_datetime(current_global_state.startTime, lang_code)));
            if (current_global_state.endTime) {
                info_grid.appendChild(create_info_item('end_time', Helpers_format_iso_to_local_datetime(current_global_state.endTime, lang_code)));
            }
        }
        section1.appendChild(info_grid);
        if (md.internalComment) {
            const comment_header = Helpers_create_element('h3', { text_content: t('internal_comment'), style: { 'font-size': '1rem', 'margin-top': '1rem', 'font-weight': '500' } });
            
            const comment_div = Helpers_create_element('div', {
                class_name: 'markdown-content',
                style: { 'background-color': 'var(--input-background-color)', 'padding': '0.75rem 1rem', 'border-radius': 'var(--border-radius)', 'border': '1px solid var(--border-color)' }
            });

            if (typeof marked !== 'undefined' && typeof window.Helpers.escape_html === 'function') {
                const renderer = new marked.Renderer();
                renderer.html = (html_token) => {
                    const text_to_escape = (typeof html_token === 'object' && html_token !== null && typeof html_token.text === 'string')
                        ? html_token.text
                        : String(html_token || '');
                    return window.Helpers.escape_html(text_to_escape);
                };
                renderer.link = (href, title, text) => `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                
                comment_div.innerHTML = marked.parse(md.internalComment, { renderer: renderer });
            } else {
                comment_div.textContent = md.internalComment;
            }

            section1.appendChild(comment_header);
            section1.appendChild(comment_div);
        }
        plate_element.appendChild(section1);

        const section2 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        const sample_management_header_div = Helpers_create_element('div', { class_name: 'sample-list-header' });
        const number_of_samples = current_global_state.samples ? current_global_state.samples.length : 0;
        const sample_list_title_text = t('sample_list_title_with_count', { count: number_of_samples });
        sample_management_header_div.appendChild(Helpers_create_element('h2', { text_content: sample_list_title_text }));

        if (current_global_state.auditStatus === 'in_progress') {
            const add_sample_button = Helpers_create_element('button', {
                class_name: ['button', 'button-default', 'button-small'],
                html_content: `<span>${t('add_new_sample')}</span>` + (Helpers_get_icon_svg('add', ['currentColor'], 18) || '')
            });
            // ÄNDRING: Navigera till den dedikerade formulärvyn
            add_sample_button.addEventListener('click', () => {
                router_ref('sample_form');
            });
            sample_management_header_div.appendChild(add_sample_button);
        }
        section2.appendChild(sample_management_header_div);

        if (sample_list_container_element) {
            section2.appendChild(sample_list_container_element);
            if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                sample_list_component_instance.render(); 
            }
        }
        plate_element.appendChild(section2);
        
        const section3 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        section3.appendChild(Helpers_create_element('h2', { text_content: t('audit_actions_title') }));
        const actions_div = Helpers_create_element('div', { class_name: 'audit-overview-actions' });
        const left_actions_group = Helpers_create_element('div', { class_name: 'action-group-left' });
        const right_actions_group = Helpers_create_element('div', { class_name: 'action-group-right' });
        if (current_global_state.auditStatus === 'in_progress') {
            const update_rulefile_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-default'],
                html_content: `<span>${t('update_rulefile_button')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('update', ['currentColor'], 18) : '')
            });
            update_rulefile_btn.addEventListener('click', () => router_ref('update_rulefile'));
            left_actions_group.appendChild(update_rulefile_btn);
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
        if (app_container_ref?.classList) { app_container_ref.classList.remove(ACTIVE_VIEW_MARKER_CLASS); }
        if (unsubscribe_from_store_function) { unsubscribe_from_store_function(); unsubscribe_from_store_function = null; }
        if (sample_list_component_instance?.destroy) sample_list_component_instance.destroy();
        if (vardetal_progress_bar_component_instance?.destroy) vardetal_progress_bar_component_instance.destroy();
        sample_list_container_element = null;
        vardetal_progress_bar_container_element = null;
        sample_list_component_instance = null;
        vardetal_progress_bar_component_instance = null;
        previously_focused_element = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        local_subscribe_func = null;
    }

    function handle_store_update(new_state) {
        // Vi behöver inte denna check längre, `subscribe` i main.js hanterar detta
        // if (!app_container_ref || !app_container_ref.classList.contains(ACTIVE_VIEW_MARKER_CLASS)) {
        //     return;
        // }
        // render anropas nu från main.js' subscribe istället
    }

    return { init, render, destroy };
})();

export const AuditOverviewComponent = AuditOverviewComponent_internal;