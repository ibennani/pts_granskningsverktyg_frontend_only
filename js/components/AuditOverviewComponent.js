// js/components/AuditOverviewComponent.js
import { SampleListComponent } from './SampleListComponent.js';
import { ScoreAnalysisComponent } from './ScoreAnalysisComponent.js';

export const AuditOverviewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/audit_overview_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let local_subscribe_func;

    // Dependencies
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_format_iso_to_local_datetime, Helpers_escape_html, Helpers_load_css, Helpers_add_protocol_if_missing;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let ExportLogic_export_to_csv, ExportLogic_export_to_excel;
    let AuditLogic_calculate_overall_audit_progress;
    
    // Sub-component instances and containers
    let global_message_element_ref;
    let sample_list_component_instance;
    let sample_list_container_element;
    
    let scoreAnalysisComponentInstance = null;
    let scoreAnalysisContainerElement = null;

    let previously_focused_element = null;
    let unsubscribe_from_store_function = null;
    
    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_format_iso_to_local_datetime = window.Helpers?.format_iso_to_local_datetime;
        Helpers_escape_html = window.Helpers?.escape_html;
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
        router_ref('sample_form', { editSampleId: sample_id });
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = Translation_t;
        const current_global_state = local_getState();

        if (current_global_state.samples.length <= 1) {
            NotificationComponent_show_global_message(t('error_cannot_delete_last_sample'), "warning");
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
            NotificationComponent_show_global_message(t('sample_deleted_successfully', { sampleName: sample_name_for_confirm }), "success");
        } else {
            if (previously_focused_element) {
                previously_focused_element.focus();
                previously_focused_element = null;
            }
        }
    }

    function handle_lock_audit() {
        const t = Translation_t;
        local_dispatch({ type: local_StoreActionTypes.SET_AUDIT_STATUS, payload: { status: 'locked' } });
        NotificationComponent_show_global_message(t('audit_locked_successfully'), 'success');
    }

    function handle_unlock_audit() {
        const t = Translation_t;
        local_dispatch({ type: local_StoreActionTypes.SET_AUDIT_STATUS, payload: { status: 'in_progress' } });
        NotificationComponent_show_global_message(t('audit_unlocked_successfully'), 'success');
    }

    function handle_export_csv() {
        const t = Translation_t;
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            NotificationComponent_show_global_message(t('audit_not_locked_for_export', { status: current_global_state.auditStatus }), 'warning');
            return;
        }
        ExportLogic_export_to_csv(current_global_state);
    }

    function handle_export_excel() {
        const t = Translation_t;
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'locked') {
            NotificationComponent_show_global_message(t('audit_not_locked_for_export', { status: current_global_state.auditStatus }), 'warning');
            return;
        }
        ExportLogic_export_to_excel(current_global_state);
    }

    function create_info_item(label_key, value, is_html = false) {
        const t = Translation_t;
        const item_div = Helpers_create_element('div', { class_name: 'info-item' });
        const strong = Helpers_create_element('strong', { text_content: t(label_key) });
        item_div.appendChild(strong);
        
        const p = Helpers_create_element('p', { class_name: 'value' });
        if (value || typeof value === 'number' || typeof value === 'boolean') {
            if (is_html) {
                p.innerHTML = value;
            } else {
                p.textContent = String(value);
            }
        } else {
            p.textContent = '---';
            p.classList.add('text-muted');
        }
        item_div.appendChild(p);
        return item_div;
    }

    async function init_sub_components() {
        assign_globals_once();
        
        sample_list_container_element = Helpers_create_element('div', { id: 'overview-sample-list-area-container' });
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
        
        scoreAnalysisContainerElement = Helpers_create_element('div', { id: 'score-analysis-component-container' });
        scoreAnalysisComponentInstance = ScoreAnalysisComponent;
        
        await scoreAnalysisComponentInstance.init(scoreAnalysisContainerElement, {
            Helpers: window.Helpers,
            Translation: window.Translation,
            getState: local_getState,
            ScoreCalculator: window.ScoreCalculator 
        });
    }

    function handle_store_update(new_state) {
        // Handled by main.js subscription
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
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        
        const current_global_state = local_getState();
        
        if (!current_global_state || !current_global_state.ruleFileContent) {
            NotificationComponent_show_global_message(t("error_no_active_audit"), "error");
            return;
        }

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate audit-overview-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }
        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('audit_overview_title') }));
        
        const dashboard_container = Helpers_create_element('div', { class_name: 'overview-dashboard' });

        const info_panel = Helpers_create_element('div', { class_name: ['dashboard-panel', 'info-panel'] });
        
        // --- START: MODIFICATION FOR EDIT BUTTON ---
        const info_panel_header = Helpers_create_element('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }
        });
        info_panel_header.appendChild(Helpers_create_element('h2', { 
            class_name: 'dashboard-panel__title',
            style: { marginBottom: '0', borderBottom: 'none' }, // Remove default styles
            text_content: t('audit_info_title') 
        }));

        if (current_global_state.auditStatus === 'in_progress') {
            const edit_metadata_button = Helpers_create_element('button', {
                class_name: ['button', 'button-default', 'button-small'],
                attributes: { 'aria-label': t('edit_audit_metadata_aria_label', {defaultValue: 'Edit audit information'}) },
                html_content: `<span>${t('edit_prefix')}</span>` + Helpers_get_icon_svg('edit', ['currentColor'], 16)
            });
            edit_metadata_button.addEventListener('click', () => router_ref('edit_metadata'));
            info_panel_header.appendChild(edit_metadata_button);
        }
        info_panel.appendChild(info_panel_header);
        // --- END: MODIFICATION FOR EDIT BUTTON ---
        
        const md = current_global_state.auditMetadata || {};
        const rf_meta = current_global_state.ruleFileContent.metadata || {};
        const lang_code = window.Translation.get_current_language_code();

        info_panel.appendChild(create_info_item('case_number', md.caseNumber));
        info_panel.appendChild(create_info_item('actor_name', md.actorName));
        if (md.actorLink) {
            const safe_link = Helpers_add_protocol_if_missing(md.actorLink);
            const link_html = `<a href="${Helpers_escape_html(safe_link)}" target="_blank" rel="noopener noreferrer">${Helpers_escape_html(md.actorLink)}</a>`;
            info_panel.appendChild(create_info_item('actor_link', link_html, true));
        } else {
            info_panel.appendChild(create_info_item('actor_link', null));
        }
        info_panel.appendChild(create_info_item('auditor_name', md.auditorName));
        info_panel.appendChild(create_info_item('rule_file_title', rf_meta.title));
        info_panel.appendChild(create_info_item('version_rulefile', rf_meta.version));
        info_panel.appendChild(create_info_item('status', t(`audit_status_${current_global_state.auditStatus}`)));
        info_panel.appendChild(create_info_item('start_time', Helpers_format_iso_to_local_datetime(current_global_state.startTime, lang_code)));
        if (current_global_state.endTime) {
            info_panel.appendChild(create_info_item('end_time', Helpers_format_iso_to_local_datetime(current_global_state.endTime, lang_code)));
        }
        
        if (md.internalComment) {
            const comment_item = create_info_item('internal_comment', md.internalComment);
            const comment_value_p = comment_item.querySelector('p.value');
            if (comment_value_p) {
                comment_value_p.classList.add('markdown-content');
                if (typeof marked !== 'undefined') {
                    comment_value_p.innerHTML = marked.parse(md.internalComment, { breaks: true });
                }
            }
            info_panel.appendChild(comment_item);
        }
        
        dashboard_container.appendChild(info_panel);

        const score_panel = Helpers_create_element('div', { class_name: ['dashboard-panel', 'score-panel'] });
        score_panel.appendChild(Helpers_create_element('h2', { 
            class_name: 'dashboard-panel__title',
            text_content: t('result_summary_and_deficiency_analysis', {defaultValue: "Result Summary & Deficiency Analysis"})
        }));
        
        if (scoreAnalysisComponentInstance) {
            score_panel.appendChild(scoreAnalysisContainerElement);
            scoreAnalysisComponentInstance.render();
        }
        dashboard_container.appendChild(score_panel);
        
        plate_element.appendChild(dashboard_container);
        
        if (AuditLogic_calculate_overall_audit_progress && window.ProgressBarComponent) {
            const overall_progress_section = Helpers_create_element('section', { class_name: 'audit-overview-section' });
            
            const progress_data = AuditLogic_calculate_overall_audit_progress(current_global_state);
            
            const progress_container = Helpers_create_element('div', { 
                class_name: 'info-item info-item--progress-container'
            });

            const text_wrapper = Helpers_create_element('div', { class_name: 'progress-text-wrapper' });
            const labelText = t('total_requirements_audited_label', {defaultValue: "Total requirements reviewed"});
            const valueText = `${progress_data.audited} / ${progress_data.total}`;
            text_wrapper.innerHTML = `<strong>${labelText}:</strong>&nbsp;<span class="value">${valueText}</span>`;
            
            const overall_progress_bar = window.ProgressBarComponent.create(
                progress_data.audited, 
                progress_data.total, 
                { id: 'overall-audit-progress-bar' }
            );

            progress_container.appendChild(text_wrapper);
            progress_container.appendChild(overall_progress_bar);

            overall_progress_section.appendChild(progress_container);
            plate_element.appendChild(overall_progress_section);
        }
        
        const section2 = Helpers_create_element('section', { class_name: 'audit-overview-section' });
        const sample_management_header_div = Helpers_create_element('div', { class_name: 'sample-list-header' });
        const number_of_samples = current_global_state.samples ? current_global_state.samples.length : 0;
        sample_management_header_div.appendChild(Helpers_create_element('h2', { text_content: t('sample_list_title_with_count', { count: number_of_samples }) }));
        if (current_global_state.auditStatus === 'in_progress') {
            const add_sample_button = Helpers_create_element('button', {
                class_name: ['button', 'button-default', 'button-small'],
                html_content: `<span>${t('add_new_sample')}</span>` + Helpers_get_icon_svg('add', ['currentColor'], 18)
            });
            add_sample_button.addEventListener('click', () => { router_ref('sample_form'); });
            sample_management_header_div.appendChild(add_sample_button);
        }
        section2.appendChild(sample_management_header_div);
        if (sample_list_container_element) {
            section2.appendChild(sample_list_container_element);
            sample_list_component_instance.render(); 
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
                html_content: `<span>${t('update_rulefile_button')}</span>` + Helpers_get_icon_svg('update', ['currentColor'], 18)
            });
            update_rulefile_btn.addEventListener('click', () => router_ref('update_rulefile'));
            left_actions_group.appendChild(update_rulefile_btn);
            const lock_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-warning'],
                html_content: `<span>${t('lock_audit')}</span>` + Helpers_get_icon_svg('lock_audit', ['currentColor'], 18)
            });
            lock_btn.addEventListener('click', handle_lock_audit);
            right_actions_group.appendChild(lock_btn);
        }
        if (current_global_state.auditStatus === 'locked') {
            const unlock_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-secondary'],
                html_content: `<span>${t('unlock_audit')}</span>` + Helpers_get_icon_svg('unlock_audit', ['currentColor'], 18)
            });
            unlock_btn.addEventListener('click', handle_unlock_audit);
            left_actions_group.appendChild(unlock_btn);
            if (ExportLogic_export_to_csv) {
                const csv_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-default'],
                    html_content: `<span>${t('export_to_csv')}</span>` + Helpers_get_icon_svg('export', ['currentColor'], 18)
                });
                csv_btn.addEventListener('click', handle_export_csv);
                left_actions_group.appendChild(csv_btn);
            }
            if (ExportLogic_export_to_excel) {
                const excel_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-default'],
                    html_content: `<span>${t('export_to_excel')}</span>` + Helpers_get_icon_svg('export', ['currentColor'], 18)
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
        if (unsubscribe_from_store_function) { 
            unsubscribe_from_store_function(); 
            unsubscribe_from_store_function = null; 
        }
        if (sample_list_component_instance?.destroy) sample_list_component_instance.destroy();
        
        if (scoreAnalysisComponentInstance?.destroy) {
            scoreAnalysisComponentInstance.destroy();
        }

        sample_list_container_element = null;
        sample_list_component_instance = null;
        scoreAnalysisContainerElement = null;
        scoreAnalysisComponentInstance = null;
        previously_focused_element = null;
    }

    return { init, render, destroy };
})();