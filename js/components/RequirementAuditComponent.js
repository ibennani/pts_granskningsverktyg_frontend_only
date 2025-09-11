// js/components/RequirementAuditComponent.js

// Import the new sub-components
import { ChecklistHandler } from './requirement_audit/ChecklistHandler.js';
import { RequirementInfoSections } from './requirement_audit/RequirementInfoSections.js';
import { RequirementAuditNavigation } from './requirement_audit/RequirementAuditNavigation.js';

export const RequirementAuditComponent = (function () { 

    const CSS_PATH = 'css/components/requirement_audit_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;
    
    // State management dependencies
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    
    // Other dependencies
    let Translation_t;
    let Helpers_create_element, Helpers_load_css, Helpers_add_protocol_if_missing, Helpers_get_current_iso_datetime_utc;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_calculate_check_status, AuditLogic_calculate_requirement_status, AuditLogic_get_ordered_relevant_requirement_keys;
    
    // DOM references
    let plate_element_ref = null;
    let global_message_element_ref;
    let comment_to_auditor_input, comment_to_actor_input;
    let debounceTimerComments; 
    
    // Sub-component instances
    let checklist_handler_instance = null;
    let info_sections_instance = null;
    let top_navigation_instance = null;
    let bottom_navigation_instance = null;

    // Internal state for the view
    let current_sample = null;
    let current_requirement = null;
    let current_result = null;
    let ordered_requirement_keys = [];
    
    function assign_globals_once() { 
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_load_css = window.Helpers?.load_css;
        Helpers_add_protocol_if_missing = window.Helpers?.add_protocol_if_missing;
        Helpers_get_current_iso_datetime_utc = window.Helpers?.get_current_iso_datetime_utc;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_clear_global_message = window.NotificationComponent?.clear_global_message;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
        AuditLogic_calculate_check_status = window.AuditLogic?.calculate_check_status;
        AuditLogic_calculate_requirement_status = window.AuditLogic?.calculate_requirement_status;
        AuditLogic_get_ordered_relevant_requirement_keys = window.AuditLogic?.get_ordered_relevant_requirement_keys;
    }
    
    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) { 
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router;
        params_ref = _params;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes; 
        
        await Helpers_load_css(CSS_PATH);
    }
    
    function load_and_prepare_view_data() {
        const state = local_getState();
        if (!state?.ruleFileContent || !params_ref?.sampleId || !params_ref?.requirementId) return false;
        
        current_sample = state.samples.find(s => s.id === params_ref.sampleId);
        current_requirement = state.ruleFileContent.requirements[params_ref.requirementId];
        
        if (!current_sample || !current_requirement) return false;
        
        const result_from_store = (current_sample.requirementResults || {})[params_ref.requirementId];
        
        // Initialize or clone the result object
        current_result = result_from_store 
            ? JSON.parse(JSON.stringify(result_from_store)) 
            : { status: 'not_audited', commentToAuditor: '', commentToActor: '', lastStatusUpdate: null, checkResults: {} };

        // Ensure checkResults and passCriteria structures exist
        (current_requirement.checks || []).forEach(check_def => {
            if (!current_result.checkResults[check_def.id]) {
                current_result.checkResults[check_def.id] = { status: 'not_audited', overallStatus: 'not_audited', passCriteria: {} };
            }
            (check_def.passCriteria || []).forEach(pc_def => {
                const pc_data = current_result.checkResults[check_def.id].passCriteria[pc_def.id];
                if (typeof pc_data !== 'object' || pc_data === null) {
                    current_result.checkResults[check_def.id].passCriteria[pc_def.id] = {
                        status: typeof pc_data === 'string' ? pc_data : 'not_audited',
                        observationDetail: '',
                        timestamp: null
                    };
                }
            });
        });
        
        ordered_requirement_keys = AuditLogic_get_ordered_relevant_requirement_keys(state.ruleFileContent, current_sample, 'default');
        return true;
    }

    // --- CALLBACKS & EVENT HANDLERS ---
    
    function handle_checklist_status_change(change_info) {
        let modified_result = JSON.parse(JSON.stringify(current_result));
        const check_result = modified_result.checkResults[change_info.checkId];
        const check_definition = current_requirement.checks.find(c => c.id === change_info.checkId);

        if (change_info.type === 'check_overall_status_change') {
            check_result.overallStatus = check_result.overallStatus === change_info.newStatus ? 'not_audited' : change_info.newStatus;
        } else if (change_info.type === 'pc_status_change') {
            if (check_result.overallStatus !== 'passed') {
                NotificationComponent_show_global_message(Translation_t('error_set_check_status_first'), 'warning');
                return;
            }
            const pc_result = check_result.passCriteria[change_info.pcId];
            pc_result.status = pc_result.status === change_info.newStatus ? 'not_audited' : change_info.newStatus;
            
            // Auto-populate failure statement if applicable
            if (pc_result.status === 'failed' && (!pc_result.observationDetail || pc_result.observationDetail.trim() === '')) {
                const pc_def = check_definition.passCriteria.find(pc => pc.id === change_info.pcId);
                if (pc_def?.failureStatementTemplate) {
                    pc_result.observationDetail = pc_def.failureStatementTemplate;
                }
            }
        }
        
        dispatch_result_update(modified_result);
    }
    
    function debounced_save_comments() {
        clearTimeout(debounceTimerComments);
        debounceTimerComments = setTimeout(() => {
            const modified_result = JSON.parse(JSON.stringify(current_result));
            let changed = false;
            if (comment_to_auditor_input && modified_result.commentToAuditor !== comment_to_auditor_input.value) {
                modified_result.commentToAuditor = comment_to_auditor_input.value;
                changed = true;
            }
            if (comment_to_actor_input && modified_result.commentToActor !== comment_to_actor_input.value) {
                modified_result.commentToActor = comment_to_actor_input.value;
                changed = true;
            }
            if (changed) {
                dispatch_result_update(modified_result);
            }
        }, 3000);
    }

    function handle_autosave(change_info) {
        if (change_info.type === 'pc_observation') {
            const modified_result = JSON.parse(JSON.stringify(current_result));
            modified_result.checkResults[change_info.checkId].passCriteria[change_info.pcId].observationDetail = change_info.value;
            dispatch_result_update(modified_result);
        }
    }

    function dispatch_result_update(modified_result_object) {
        // Recalculate statuses before dispatching
        (current_requirement.checks || []).forEach(check_def => {
            const check_res = modified_result_object.checkResults[check_def.id];
            check_res.status = AuditLogic_calculate_check_status(check_def, check_res.passCriteria, check_res.overallStatus);
        });
        modified_result_object.status = AuditLogic_calculate_requirement_status(current_requirement, modified_result_object);
        modified_result_object.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();

        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: {
                sampleId: params_ref.sampleId,
                requirementId: params_ref.requirementId,
                newRequirementResult: modified_result_object
            }
        });
    }

    function handle_navigation(action) {
        const current_index = ordered_requirement_keys.indexOf(params_ref.requirementId);
        
        const navigate = (new_index) => {
            if (new_index >= 0 && new_index < ordered_requirement_keys.length) {
                router_ref('requirement_audit', { sampleId: params_ref.sampleId, requirementId: ordered_requirement_keys[new_index] });
            }
        };

        switch (action) {
            case 'back_to_list':
                router_ref('requirement_list', { sampleId: params_ref.sampleId });
                break;
            case 'previous':
                if (current_index > 0) navigate(current_index - 1);
                break;
            case 'next':
                if (current_index < ordered_requirement_keys.length - 1) navigate(current_index + 1);
                break;
            case 'next_unhandled':
                 const next_key = window.AuditLogic.find_first_incomplete_requirement_key_for_sample(local_getState().ruleFileContent, current_sample);
                 if (next_key) {
                     router_ref('requirement_audit', { sampleId: params_ref.sampleId, requirementId: next_key });
                 } else {
                     NotificationComponent_show_global_message(Translation_t('all_requirements_handled_for_sample'), 'info');
                 }
                break;
            case 'confirm_reviewed_status':
                let result = JSON.parse(JSON.stringify(current_result));
                delete result.needsReview;
                dispatch_result_update(result);
                router_ref('requirement_list', { sampleId: params_ref.sampleId });
                break;
        }
    }
    
    // --- RENDER FUNCTIONS ---

    function build_initial_dom() {
        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });

        if (global_message_element_ref) {
            plate_element_ref.appendChild(global_message_element_ref);
        }
        
        // Init sub-components
        const top_nav_container = Helpers_create_element('div', { class_name: 'audit-navigation-buttons top-nav' });
        top_navigation_instance = RequirementAuditNavigation;
        top_navigation_instance.init(top_nav_container, handle_navigation);
        
        const info_sections_container = Helpers_create_element('div');
        info_sections_instance = RequirementInfoSections;
        info_sections_instance.init(info_sections_container);

        const checklist_container = Helpers_create_element('div', { class_name: 'checks-container audit-section' });
        checklist_handler_instance = ChecklistHandler;
        checklist_handler_instance.init(checklist_container, { onStatusChange: handle_checklist_status_change, onAutosave: handle_autosave });

        const bottom_nav_container = Helpers_create_element('div', { class_name: 'audit-navigation-buttons bottom-nav' });
        bottom_navigation_instance = RequirementAuditNavigation;
        bottom_navigation_instance.init(bottom_nav_container, handle_navigation);

        plate_element_ref.append(
            Helpers_create_element('div', { class_name: 'requirement-audit-header' }),
            top_nav_container,
            info_sections_container,
            checklist_container,
            build_comment_fields(),
            bottom_nav_container
        );
        app_container_ref.appendChild(plate_element_ref);
    }
    
    function build_comment_fields() {
        const t = Translation_t;
        const container = Helpers_create_element('div', { class_name: 'input-fields-container audit-section' });
        container.appendChild(Helpers_create_element('h2', { text_content: t('observations_and_comments_title') }));
    
        const fg1 = Helpers_create_element('div', { class_name: 'form-group' });
        fg1.innerHTML = `<label for="commentToAuditor">${t('comment_to_auditor')}</label>`;
        comment_to_auditor_input = Helpers_create_element('textarea', { id: 'commentToAuditor', class_name: 'form-control', attributes: { rows: '4' } });
        comment_to_auditor_input.addEventListener('input', debounced_save_comments);
        fg1.appendChild(comment_to_auditor_input);

        const fg2 = Helpers_create_element('div', { class_name: 'form-group' });
        fg2.innerHTML = `<label for="commentToActor">${t('comment_to_actor')}</label>`;
        comment_to_actor_input = Helpers_create_element('textarea', { id: 'commentToActor', class_name: 'form-control', attributes: { rows: '4' } });
        comment_to_actor_input.addEventListener('input', debounced_save_comments);
        fg2.appendChild(comment_to_actor_input);
        
        container.append(fg1, fg2);
        return container;
    }
    
    function populate_dom_with_data() {
        const t = Translation_t;
        const state = local_getState();
        const is_locked = state.auditStatus === 'locked';

        // Header
        const header = plate_element_ref.querySelector('.requirement-audit-header');
        header.innerHTML = '';
        header.append(
            Helpers_create_element('h1', { text_content: current_requirement.title }),
            create_header_paragraph('standard-reference', t('requirement_standard_reference_label'), current_requirement.standardReference),
            create_header_paragraph('audited-page-link', t('audited_page_label'), null, true), // Special handling
            create_header_paragraph('overall-requirement-status-display', t('overall_requirement_status')) // Special handling
        );
        
        // Navigation
        const nav_options = {
            is_audit_locked: is_locked,
            is_first_requirement: ordered_requirement_keys.indexOf(params_ref.requirementId) === 0,
            is_last_requirement: ordered_requirement_keys.indexOf(params_ref.requirementId) === ordered_requirement_keys.length - 1,
            sample_object: current_sample,
            rule_file_content: state.ruleFileContent,
            requirement_result: current_result
        };
        top_navigation_instance.render(nav_options);
        bottom_navigation_instance.render(nav_options);

        // Info Sections
        info_sections_instance.render(current_requirement, current_sample, state.ruleFileContent.metadata);

        // Checklist
        checklist_handler_instance.render(current_requirement, current_result, is_locked);
        
        // Comments
        comment_to_auditor_input.value = current_result.commentToAuditor || '';
        comment_to_actor_input.value = current_result.commentToActor || '';
        [comment_to_auditor_input, comment_to_actor_input].forEach(input => {
            input.readOnly = is_locked;
            input.classList.toggle('readonly-textarea', is_locked);
            if (window.Helpers?.init_auto_resize_for_textarea) {
                window.Helpers.init_auto_resize_for_textarea(input);
            }
        });
        
        // Notifications
        if (current_result?.needsReview === true) {
            NotificationComponent_show_global_message(t('requirement_updated_needs_review'), 'info');
        } else {
            NotificationComponent_clear_global_message();
        }
    }

    function create_header_paragraph(className, label, data, isSampleLink = false) {
        const p = Helpers_create_element('p', { class_name: className });
        p.appendChild(Helpers_create_element('strong', { text_content: `${label} ` }));
        
        if (isSampleLink) {
            const context_text = `${local_getState().auditMetadata?.actorName || ''}: ${current_sample.description}`;
            if (current_sample.url) {
                p.appendChild(Helpers_create_element('a', {
                    text_content: context_text,
                    attributes: { href: Helpers_add_protocol_if_missing(current_sample.url), target: '_blank' }
                }));
            } else {
                p.appendChild(document.createTextNode(context_text));
            }
        } else if (className === 'overall-requirement-status-display') {
            const status_key = current_result?.status || 'not_audited';
            const status_text = Translation_t(`audit_status_${status_key}`);
            const span = Helpers_create_element('span', { class_name: `status-text status-${status_key}`, text_content: status_text });
            p.appendChild(span);
        } else if (data?.text) {
            if (data.url) {
                p.appendChild(Helpers_create_element('a', {
                    text_content: data.text,
                    attributes: { href: Helpers_add_protocol_if_missing(data.url), target: '_blank' }
                }));
            } else {
                p.appendChild(document.createTextNode(data.text));
            }
        }
        return p;
    }
    
    function render() {
        if (!load_and_prepare_view_data()) {
            NotificationComponent_show_global_message(Translation_t('error_loading_sample_or_requirement_data'), "error");
            router_ref('audit_overview');
            return;
        }

        if (!plate_element_ref || !app_container_ref.contains(plate_element_ref)) {
            build_initial_dom();
        }
        
        populate_dom_with_data();
    }
    
    function destroy() { 
        clearTimeout(debounceTimerComments);
        checklist_handler_instance?.destroy();
        info_sections_instance?.destroy();
        top_navigation_instance?.destroy();
        bottom_navigation_instance?.destroy();
        if (app_container_ref) app_container_ref.innerHTML = '';
    }
    
    return { init, render, destroy };
})();