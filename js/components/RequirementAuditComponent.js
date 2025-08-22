// js/components/RequirementAuditComponent.js
export const RequirementAuditComponent = (function () { 

    const CSS_PATH = 'css/components/requirement_audit_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;
    
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_load_css, Helpers_sanitize_and_linkify_html, Helpers_add_protocol_if_missing;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_calculate_check_status, AuditLogic_calculate_requirement_status, AuditLogic_get_ordered_relevant_requirement_keys, AuditLogic_find_first_incomplete_requirement_key_for_sample;
    
    let global_message_element_ref;
    
    let current_sample_object_from_store = null;
    let current_requirement_object_from_store = null;
    let current_requirement_result_for_view = null;
    
    let plate_element_ref = null;
    let header_div_ref = null;
    let requirement_title_element_ref = null;
    let sample_context_text_element_ref = null; 
    let standard_reference_element_ref = null;
    let audited_page_link_element_ref = null;
    let requirement_status_display_element = null;
    let checks_ui_container_element = null;
    let comment_to_auditor_input, comment_to_actor_input;
    let input_fields_container_ref = null;
    let top_nav_buttons_container_ref = null;
    let bottom_nav_buttons_container_ref = null;
    
    let instructions_section_ref = null;
    let expected_observation_section_ref = null;
    let tips_section_ref = null;
    let exceptions_section_ref = null;
    let common_errors_section_ref = null;
    let metadata_section_ref = null;
    
    let ordered_requirement_keys_for_sample = [];
    let is_dom_initialized = false;
    let debounceTimerObservation = {}; 
    let debounceTimerComments; 
    
    let last_focused_element_info = null;
    
    function get_t_internally() { 
        if (Translation_t) return Translation_t;
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;
    }
    function assign_globals_once() { 
        if (Translation_t && Helpers_create_element && AuditLogic_calculate_check_status) return true;
        let all_assigned = true;
        if (window.Translation?.t) { Translation_t = window.Translation.t; }
        else { console.error("ReqAudit: Translation.t is missing!"); all_assigned = false; }
        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_get_current_iso_datetime_utc = window.Helpers.get_current_iso_datetime_utc;
            Helpers_load_css = window.Helpers.load_css;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_sanitize_and_linkify_html = window.Helpers.sanitize_and_linkify_html;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_escape_html || !Helpers_get_current_iso_datetime_utc || !Helpers_load_css || !Helpers_sanitize_and_linkify_html || !Helpers_add_protocol_if_missing) {
                 console.error("ReqAudit: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqAudit: Helpers module is missing!"); all_assigned = false; }
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
             if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
                console.error("ReqAudit: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqAudit: NotificationComponent module is missing!"); all_assigned = false; }
        if (window.AuditLogic) {
            AuditLogic_calculate_check_status = window.AuditLogic.calculate_check_status;
            AuditLogic_calculate_requirement_status = window.AuditLogic.calculate_requirement_status;
            AuditLogic_get_ordered_relevant_requirement_keys = window.AuditLogic.get_ordered_relevant_requirement_keys;
            AuditLogic_find_first_incomplete_requirement_key_for_sample = window.AuditLogic.find_first_incomplete_requirement_key_for_sample;
             if (!AuditLogic_calculate_check_status || !AuditLogic_calculate_requirement_status || !AuditLogic_get_ordered_relevant_requirement_keys || !AuditLogic_find_first_incomplete_requirement_key_for_sample) {
                console.error("ReqAudit: One or more AuditLogic functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqAudit: AuditLogic module is missing!"); all_assigned = false; }
        return all_assigned;
     }
    
     function _sync_dom_to_internal_state() {
        if (!current_requirement_result_for_view || !plate_element_ref) return;
    
        if (comment_to_auditor_input) {
            current_requirement_result_for_view.commentToAuditor = comment_to_auditor_input.value;
        }
        if (comment_to_actor_input) {
            current_requirement_result_for_view.commentToActor = comment_to_actor_input.value;
        }
    
        const all_pc_textareas = plate_element_ref.querySelectorAll('.pc-observation-detail-textarea');
        all_pc_textareas.forEach(textarea => {
            const pc_item = textarea.closest('.pass-criterion-item[data-pc-id]');
            const check_item = textarea.closest('.check-item[data-check-id]');
            if (pc_item && check_item) {
                const check_id = check_item.dataset.checkId;
                const pc_id = pc_item.dataset.pcId;
                
                if (current_requirement_result_for_view.checkResults?.[check_id]?.passCriteria?.[pc_id]) {
                    current_requirement_result_for_view.checkResults[check_id].passCriteria[pc_id].observationDetail = textarea.value;
                }
            }
        });
    }
    
    function save_focus_state() { 
        const activeEl = document.activeElement;
        if (activeEl && activeEl !== document.body) {
            last_focused_element_info = {
                id: activeEl.id,
                tagName: activeEl.tagName,
                checkId: activeEl.closest('.check-item') ? activeEl.closest('.check-item').dataset.checkId : null,
                pcId: activeEl.closest('.pass-criterion-item') ? activeEl.closest('.pass-criterion-item').dataset.pcId : null,
                action: activeEl.dataset ? activeEl.dataset.action : null,
                isPcObservationTextarea: activeEl.classList && activeEl.classList.contains('pc-observation-detail-textarea'),
                selectionStart: typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null,
                selectionEnd: typeof activeEl.selectionEnd === 'number' ? activeEl.selectionEnd : null
            };
        } else {
            last_focused_element_info = null;
        }
    }
    function restore_focus_state() { 
        if (!last_focused_element_info || !plate_element_ref) return;
        let elementToFocus = null;
    
        if (last_focused_element_info.id && document.getElementById(last_focused_element_info.id)) {
            elementToFocus = document.getElementById(last_focused_element_info.id);
        } else if (last_focused_element_info.isPcObservationTextarea && last_focused_element_info.checkId && last_focused_element_info.pcId) {
            const checkItemContext = plate_element_ref.querySelector(`.check-item[data-check-id="${last_focused_element_info.checkId}"]`);
            if (checkItemContext) {
                const pcItemContext = checkItemContext.querySelector(`.pass-criterion-item[data-pc-id="${last_focused_element_info.pcId}"]`);
                if (pcItemContext) {
                    elementToFocus = pcItemContext.querySelector('.pc-observation-detail-textarea');
                }
            }
        } else if (last_focused_element_info.action) { 
            let selector = `button[data-action="${last_focused_element_info.action}"]`;
            if (last_focused_element_info.checkId) {
                 let checkItemContext = plate_element_ref.querySelector(`.check-item[data-check-id="${last_focused_element_info.checkId}"]`);
                 if (checkItemContext) {
                    if (last_focused_element_info.pcId) {
                        const pcItemContext = checkItemContext.querySelector(`.pass-criterion-item[data-pc-id="${last_focused_element_info.pcId}"]`);
                        if(pcItemContext) elementToFocus = pcItemContext.querySelector(selector);
                    } else {
                        elementToFocus = checkItemContext.querySelector(selector);
                    }
                 }
            }
            if (!elementToFocus) { 
                 elementToFocus = plate_element_ref.querySelector(selector);
            }
        } else if (last_focused_element_info.tagName === 'TEXTAREA') {
            if (comment_to_auditor_input && last_focused_element_info.id === comment_to_auditor_input.id) {
                elementToFocus = comment_to_auditor_input;
            } else if (comment_to_actor_input && last_focused_element_info.id === comment_to_actor_input.id) {
                elementToFocus = comment_to_actor_input;
            }
        }
    
        if (elementToFocus && typeof elementToFocus.focus === 'function') {
            setTimeout(() => {
                elementToFocus.focus();
                if (last_focused_element_info.selectionStart !== null &&
                    typeof elementToFocus.setSelectionRange === 'function') {
                    try {
                        elementToFocus.setSelectionRange(last_focused_element_info.selectionStart, last_focused_element_info.selectionEnd);
                    } catch (e) { /* Ignorera fel om det inte går */ }
                }
                last_focused_element_info = null;
            }, 0);
        } else {
            last_focused_element_info = null;
        }
     }
    function handle_checks_container_click(event) { 
        const target_button = event.target.closest('button[data-action]');
        if (!target_button) return;
        save_focus_state();
        const action = target_button.dataset.action;
        const check_item_element = target_button.closest('.check-item[data-check-id]');
        const pc_item_element = target_button.closest('.pass-criterion-item[data-pc-id]');
        if (!check_item_element) return;
        const check_id = check_item_element.dataset.checkId;
        if (action === 'set-check-complies') {
            handle_check_overall_status_change(check_id, 'passed');
        } else if (action === 'set-check-not-complies') {
            handle_check_overall_status_change(check_id, 'failed');
        } else if (pc_item_element) {
            const pc_id = pc_item_element.dataset.pcId;
            if (action === 'set-pc-passed') {
                handle_pass_criterion_status_change(check_id, pc_id, 'passed');
            } else if (action === 'set-pc-failed') {
                handle_pass_criterion_status_change(check_id, pc_id, 'failed');
            }
        }
     }
    async function init(_app_container, _router, _params, _getState, _dispatch, _StoreActionTypes) { 
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router;
        params_ref = _params;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes; 
        if (!local_StoreActionTypes?.UPDATE_REQUIREMENT_RESULT) {
            console.error("[RequirementAuditComponent] CRITICAL: StoreActionTypes.UPDATE_REQUIREMENT_RESULT was not passed to init or is undefined. Using fallback.");
            local_StoreActionTypes = { ...local_StoreActionTypes, UPDATE_REQUIREMENT_RESULT: 'UPDATE_REQUIREMENT_RESULT_ERROR_NO_ACTIONTYPES' };
        }
        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await Helpers_load_css(CSS_PATH);
            } catch (error) { console.warn("Failed to load CSS for RequirementAuditComponent:", error); }
        }
        is_dom_initialized = false;
    }
    
    function load_and_prepare_view_data() {
        const current_global_state = local_getState();
        current_sample_object_from_store = null;
        current_requirement_object_from_store = null;
        current_requirement_result_for_view = null; 
    
        if (!current_global_state?.ruleFileContent || !params_ref?.sampleId || !params_ref?.requirementId) {
            return false;
        }
        
        current_sample_object_from_store = current_global_state.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object_from_store) return false;
        
        if (!current_global_state.ruleFileContent.requirements) return false;
        
        const requirement_key_from_params = params_ref.requirementId;
        current_requirement_object_from_store = current_global_state.ruleFileContent.requirements[requirement_key_from_params];
        
        if (!current_requirement_object_from_store) return false;
        
        const requirement_id_for_results_lookup = requirement_key_from_params; 
        const result_from_store = (current_sample_object_from_store.requirementResults || {})[requirement_id_for_results_lookup];
        
        if (result_from_store) {
            current_requirement_result_for_view = JSON.parse(JSON.stringify(result_from_store));
            if (current_requirement_result_for_view.hasOwnProperty('actualObservation')) { 
                delete current_requirement_result_for_view.actualObservation;
            }
        } else {
            current_requirement_result_for_view = {
                status: 'not_audited', commentToAuditor: '', commentToActor: '',
                lastStatusUpdate: null, checkResults: {}
            };
        }
    
        (current_requirement_object_from_store.checks || []).forEach(check_definition => {
            if (!current_requirement_result_for_view.checkResults[check_definition.id]) {
                current_requirement_result_for_view.checkResults[check_definition.id] = { 
                    status: 'not_audited', 
                    overallStatus: 'not_audited', 
                    passCriteria: {} 
                };
            } else {
                if (current_requirement_result_for_view.checkResults[check_definition.id].overallStatus === undefined) {
                    current_requirement_result_for_view.checkResults[check_definition.id].overallStatus = 'not_audited';
                }
                const check_res_obj = current_requirement_result_for_view.checkResults[check_definition.id];
                if (AuditLogic_calculate_check_status) { 
                    const newly_calculated_check_status = AuditLogic_calculate_check_status(
                        check_definition,
                        check_res_obj.passCriteria || {},
                        check_res_obj.overallStatus
                    );
    
                    if (check_res_obj.status !== newly_calculated_check_status) {
                        check_res_obj.status = newly_calculated_check_status;
                    }
                }
                if (current_requirement_result_for_view.checkResults[check_definition.id].passCriteria === undefined) {
                    current_requirement_result_for_view.checkResults[check_definition.id].passCriteria = {};
                }
            }
            (check_definition.passCriteria || []).forEach(pc_definition => {
                const pc_data = current_requirement_result_for_view.checkResults[check_definition.id].passCriteria[pc_definition.id];
                if (typeof pc_data === 'string' || pc_data === undefined || pc_data === null) {
                    current_requirement_result_for_view.checkResults[check_definition.id].passCriteria[pc_definition.id] = {
                        status: typeof pc_data === 'string' ? pc_data : 'not_audited',
                        observationDetail: ''
                    };
                } else if (typeof pc_data === 'object') { 
                    if (pc_data.status === undefined) pc_data.status = 'not_audited';
                    if (pc_data.observationDetail === undefined) pc_data.observationDetail = '';
                }
            });
        });
        
        if (AuditLogic_calculate_requirement_status) {
            current_requirement_result_for_view.status = AuditLogic_calculate_requirement_status(
                current_requirement_object_from_store, 
                current_requirement_result_for_view
            );
        }
    
        if (AuditLogic_get_ordered_relevant_requirement_keys) {
            ordered_requirement_keys_for_sample = AuditLogic_get_ordered_relevant_requirement_keys(current_global_state.ruleFileContent, current_sample_object_from_store);
        } else {
            ordered_requirement_keys_for_sample = [];
        }
        
        return true;
    }
    
    function debounced_auto_save_comments() {
        clearTimeout(debounceTimerComments);
        debounceTimerComments = setTimeout(() => {
            auto_save_general_comments();
        }, 400);
    }
    
    function auto_save_general_comments() { 
        save_focus_state(); 
        if (!current_requirement_result_for_view || !local_dispatch || !params_ref) return;
        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        let changed = false;
        if (comment_to_auditor_input && modified_result_for_dispatch.commentToAuditor !== comment_to_auditor_input.value) {
            modified_result_for_dispatch.commentToAuditor = comment_to_auditor_input.value; 
            changed = true;
        }
        if (comment_to_actor_input && modified_result_for_dispatch.commentToActor !== comment_to_actor_input.value) {
            modified_result_for_dispatch.commentToActor = comment_to_actor_input.value; 
            changed = true;
        }
        if (changed) {
            if (Helpers_get_current_iso_datetime_utc) modified_result_for_dispatch.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
            if (!local_StoreActionTypes?.UPDATE_REQUIREMENT_RESULT) {
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update result is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
                payload: {
                    sampleId: params_ref.sampleId,
                    requirementId: params_ref.requirementId,
                    newRequirementResult: modified_result_for_dispatch
                }
            });
        }
    }
    
    function debounced_auto_save_pc_observation(check_id, pc_id) {
        const key = `${check_id}-${pc_id}`;
        clearTimeout(debounceTimerObservation[key]);
        debounceTimerObservation[key] = setTimeout(() => {
            auto_save_pc_observation_detail(check_id, pc_id);
        }, 400);
    }
    
    function auto_save_pc_observation_detail(check_id, pc_id) {
        save_focus_state();
        if (!current_requirement_result_for_view || !local_dispatch || !params_ref ||
            !current_requirement_result_for_view.checkResults?.[check_id]?.passCriteria?.[pc_id]) {
            return;
        }
        const textarea_id = `pc-observation-${check_id}-${pc_id}`;
        const textarea_element = document.getElementById(textarea_id);
        if (!textarea_element) return;
    
        const new_detail_text = textarea_element.value;
        if (current_requirement_result_for_view.checkResults[check_id].passCriteria[pc_id].observationDetail === new_detail_text) {
            return; 
        }
        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        if (!modified_result_for_dispatch.checkResults[check_id].passCriteria[pc_id]) {
            modified_result_for_dispatch.checkResults[check_id].passCriteria[pc_id] = { status: 'not_audited', observationDetail: '' };
        }
        modified_result_for_dispatch.checkResults[check_id].passCriteria[pc_id].observationDetail = new_detail_text;
        if (Helpers_get_current_iso_datetime_utc) modified_result_for_dispatch.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
    
        if (!local_StoreActionTypes?.UPDATE_REQUIREMENT_RESULT) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update result is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: {
                sampleId: params_ref.sampleId,
                requirementId: params_ref.requirementId,
                newRequirementResult: modified_result_for_dispatch
            }
        });
    }
    
    function handle_check_overall_status_change(check_id, new_overall_status_for_check_button_click) { 
        _sync_dom_to_internal_state();
        const t = get_t_internally();
        save_focus_state(); 
        if (!current_requirement_result_for_view?.checkResults?.[check_id] || !current_requirement_object_from_store) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_data_structure_pc'), 'error');
            return;
        }
        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        
        // KORRIGERING: Ta bort needsReview-flaggan när en ändring görs
        delete modified_result_for_dispatch.needsReview;

        let check_result_to_modify = modified_result_for_dispatch.checkResults[check_id];
        const check_definition = current_requirement_object_from_store.checks.find(c => c.id === check_id);
    
        if (check_result_to_modify.overallStatus === new_overall_status_for_check_button_click) {
            check_result_to_modify.overallStatus = 'not_audited';
        } else {
            check_result_to_modify.overallStatus = new_overall_status_for_check_button_click;
        }
    
        if (check_result_to_modify.overallStatus === 'failed' && check_definition?.passCriteria) {
            check_definition.passCriteria.forEach(pc_def => {
                 if(!check_result_to_modify.passCriteria[pc_def.id]) { 
                    check_result_to_modify.passCriteria[pc_def.id] = { status: 'passed', observationDetail: '' };
                 } else { 
                    check_result_to_modify.passCriteria[pc_def.id].status = 'passed';
                 }
            });
        }
        
        if (check_definition && AuditLogic_calculate_check_status) {
            check_result_to_modify.status = AuditLogic_calculate_check_status(
                check_definition, check_result_to_modify.passCriteria, check_result_to_modify.overallStatus 
            );
        }
        if (AuditLogic_calculate_requirement_status) {
            modified_result_for_dispatch.status = AuditLogic_calculate_requirement_status(current_requirement_object_from_store, modified_result_for_dispatch);
        }
        if (Helpers_get_current_iso_datetime_utc) modified_result_for_dispatch.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
        
        if (!local_StoreActionTypes?.UPDATE_REQUIREMENT_RESULT) { if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update result is missing.", "error"); return; }
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: { sampleId: params_ref.sampleId, requirementId: params_ref.requirementId, newRequirementResult: modified_result_for_dispatch }
        });
     }
    
     function handle_pass_criterion_status_change(check_id, pc_id, new_pc_status) { 
        _sync_dom_to_internal_state();
        const t = get_t_internally();
        save_focus_state(); 
        if (!current_requirement_result_for_view?.checkResults?.[check_id]?.passCriteria || !current_requirement_object_from_store) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_data_structure_pc'), 'error');
            return;
        }
        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        
        // KORRIGERING: Ta bort needsReview-flaggan när en ändring görs
        delete modified_result_for_dispatch.needsReview;

        let check_result_to_modify = modified_result_for_dispatch.checkResults[check_id];
        if (check_result_to_modify.overallStatus === 'failed') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('cannot_change_criteria_if_check_not_compliant'), 'warning');
            return;
        }
        if (check_result_to_modify.overallStatus === 'not_audited') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_set_check_status_first', {defaultValue: "Please set the main check status first."}), 'warning');
            return;
        }
        
        if (typeof check_result_to_modify.passCriteria[pc_id] !== 'object' || check_result_to_modify.passCriteria[pc_id] === null) {
            check_result_to_modify.passCriteria[pc_id] = { status: 'not_audited', observationDetail: '' };
        }
    
        const old_pc_status = check_result_to_modify.passCriteria[pc_id].status;
    
        if (old_pc_status === new_pc_status) {
            check_result_to_modify.passCriteria[pc_id].status = 'not_audited';
        } else {
            check_result_to_modify.passCriteria[pc_id].status = new_pc_status;
        }
    
        if (check_result_to_modify.passCriteria[pc_id].status === 'failed' && 
            (!check_result_to_modify.passCriteria[pc_id].observationDetail || check_result_to_modify.passCriteria[pc_id].observationDetail.trim() === '')) {
            
            const check_definition = current_requirement_object_from_store.checks.find(c => c.id === check_id);
            if (check_definition && check_definition.passCriteria) {
                const pc_definition = check_definition.passCriteria.find(pc => pc.id === pc_id);
                if (pc_definition && pc_definition.failureStatementTemplate) {
                    check_result_to_modify.passCriteria[pc_id].observationDetail = pc_definition.failureStatementTemplate;
                }
            }
        }
        
        const check_definition = current_requirement_object_from_store.checks.find(c => c.id === check_id);
        if (check_definition && AuditLogic_calculate_check_status) {
            check_result_to_modify.status = AuditLogic_calculate_check_status(
                check_definition, check_result_to_modify.passCriteria, check_result_to_modify.overallStatus
            );
        }
        if (AuditLogic_calculate_requirement_status) {
            modified_result_for_dispatch.status = AuditLogic_calculate_requirement_status(current_requirement_object_from_store, modified_result_for_dispatch);
        }
        if (Helpers_get_current_iso_datetime_utc) modified_result_for_dispatch.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
        
        if (!local_StoreActionTypes?.UPDATE_REQUIREMENT_RESULT) { if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update result is missing.", "error"); return; }
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: { sampleId: params_ref.sampleId, requirementId: params_ref.requirementId, newRequirementResult: modified_result_for_dispatch }
        });
    }
    
    function render_audit_section_internal(title_key, content_data, section_ref, parent_element, custom_class_name = '') {
        const t = get_t_internally();
        const has_content = content_data && ((typeof content_data === 'string' && content_data.trim() !== '') || (Array.isArray(content_data) && content_data.length > 0));
        if (has_content) {
            if (!section_ref || !parent_element.contains(section_ref)) {
                 console.error("Internal logic error: section_ref is missing for render_audit_section_internal but content exists.");
                 return null;
            }
            section_ref.removeAttribute('hidden');
            let h2_element = section_ref.querySelector('h2');
            if (!h2_element) {
                h2_element = Helpers_create_element('h2');
                section_ref.prepend(h2_element);
            }
            h2_element.textContent = t(title_key);
    
            let content_element = section_ref.querySelector('ul') || section_ref.querySelector('p');
            const expected_tag = Array.isArray(content_data) ? 'UL' : 'P';
            if (!content_element || content_element.tagName !== expected_tag) {
                if(content_element) content_element.remove();
                content_element = Helpers_create_element(expected_tag.toLowerCase());
                section_ref.appendChild(content_element);
            }
    
            content_element.innerHTML = ''; 
            if (Array.isArray(content_data)) {
                content_data.forEach(item_obj => {
                    const text_content = (typeof item_obj === 'object' && item_obj.text) ? item_obj.text : String(item_obj);
                    const sanitized_html = Helpers_sanitize_and_linkify_html(text_content).replace(/\n/g, '<br>');
                    content_element.appendChild(Helpers_create_element('li', { html_content: sanitized_html }));
                });
            } else {
                const sanitized_html = Helpers_sanitize_and_linkify_html(String(content_data)).replace(/\n/g, '<br>');
                content_element.innerHTML = sanitized_html;
            }
        } else if (section_ref) {
            section_ref.setAttribute('hidden', 'true');
            section_ref.innerHTML = '';
        }
        return section_ref;
    }
    
    
    function get_current_requirement_index_in_ordered_list() { 
        if (!ordered_requirement_keys_for_sample || ordered_requirement_keys_for_sample.length === 0 || !params_ref || !params_ref.requirementId) {
            return -1;
        }
        return ordered_requirement_keys_for_sample.indexOf(params_ref.requirementId);
    }
    
    function navigate_to_requirement_by_index(index) { 
        save_focus_state();
        if (current_sample_object_from_store && index >= 0 && index < ordered_requirement_keys_for_sample.length) {
            const new_requirement_key = ordered_requirement_keys_for_sample[index];
            if (router_ref) {
                router_ref('requirement_audit', { sampleId: current_sample_object_from_store.id, requirementId: new_requirement_key });
            }
        }
    }
    
    function go_to_previous_requirement() {  
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index > 0) {
            navigate_to_requirement_by_index(current_index - 1);
        }
    }
    
    function go_to_next_requirement() {  
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index !== -1 && current_index < ordered_requirement_keys_for_sample.length - 1) {
            navigate_to_requirement_by_index(current_index + 1);
        }
    }
    
    function find_next_unhandled_requirement_key() { 
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index === -1 || !current_sample_object_from_store || !current_requirement_object_from_store || !local_getState || !AuditLogic_calculate_requirement_status) {
             return null;
        }
        
        const current_global_state_nav = local_getState(); 
        if (!current_global_state_nav?.ruleFileContent?.requirements) return null;
    
        for (let i = current_index + 1; i < ordered_requirement_keys_for_sample.length; i++) {
            const req_key = ordered_requirement_keys_for_sample[i];
            const req_def = current_global_state_nav.ruleFileContent.requirements[req_key];
            const req_res = current_sample_object_from_store.requirementResults ? current_sample_object_from_store.requirementResults[req_key] : null;
            if (req_def) { 
                const status = AuditLogic_calculate_requirement_status(req_def, req_res);
                if (status === 'not_audited' || status === 'partially_audited') {
                    return req_key;
                }
            }
        }
        for (let i = 0; i < current_index; i++) { 
            const req_key = ordered_requirement_keys_for_sample[i];
            const req_def = current_global_state_nav.ruleFileContent.requirements[req_key];
            const req_res = current_sample_object_from_store.requirementResults ? current_sample_object_from_store.requirementResults[req_key] : null;
            if (req_def) {
                const status = AuditLogic_calculate_requirement_status(req_def, req_res);
                if (status === 'not_audited' || status === 'partially_audited') {
                    return req_key;
                }
            }
        }
        return null; 
    }
    
    function go_to_next_unhandled_requirement() {   
        save_focus_state();
        const t = get_t_internally();
        const next_unhandled_key = find_next_unhandled_requirement_key();
        if (next_unhandled_key && current_sample_object_from_store && router_ref) {
            router_ref('requirement_audit', { sampleId: current_sample_object_from_store.id, requirementId: next_unhandled_key });
        } else {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('all_requirements_handled_for_sample'), 'info');
        }
    }

    function handle_confirm_reviewed_status() {
        if (!current_requirement_result_for_view || !local_dispatch || !params_ref) return;

        let modified_result = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        delete modified_result.needsReview;

        if (Helpers_get_current_iso_datetime_utc) {
            modified_result.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
        }

        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: {
                sampleId: params_ref.sampleId,
                requirementId: params_ref.requirementId,
                newRequirementResult: modified_result
            }
        });

        router_ref('requirement_list', { sampleId: params_ref.sampleId });
    }
    
    function render_checks_section(container_element) { 
        const t = get_t_internally();
        const current_global_state_for_render = local_getState();
        const is_audit_locked = current_global_state_for_render?.auditStatus === 'locked';
        if (!current_requirement_object_from_store?.checks?.length) { container_element.innerHTML = `<p class="text-muted">${t('no_checks_for_this_requirement')}</p>`; return; }
        if (!current_requirement_result_for_view?.checkResults) { container_element.innerHTML = ''; return; }
        
        let checks_title_element = container_element.querySelector('h2');
        if (!checks_title_element) {
            checks_title_element = Helpers_create_element('h2');
            container_element.prepend(checks_title_element);
        }
        checks_title_element.textContent = t('checks_title');
    
        current_requirement_object_from_store.checks.forEach(check_definition => {
            let check_wrapper = container_element.querySelector(`.check-item[data-check-id="${check_definition.id}"]`);
            const check_result_data_for_view = current_requirement_result_for_view.checkResults[check_definition.id];
            const calculated_check_status_for_display = check_result_data_for_view?.status || 'not_audited';
    
            if (!check_wrapper) {
                check_wrapper = Helpers_create_element('div', { attributes: {'data-check-id': check_definition.id }});
                container_element.appendChild(check_wrapper);
            }
            check_wrapper.className = `check-item status-${calculated_check_status_for_display}`;
            
            check_wrapper.innerHTML = ''; 
            
            check_wrapper.appendChild(Helpers_create_element('h3', { class_name: 'check-condition-title', text_content: check_definition.condition }));
            
            const overall_manual_status_for_check = check_result_data_for_view?.overallStatus || 'not_audited';
    
            if (!is_audit_locked) { 
                const condition_actions_div = Helpers_create_element('div', { class_name: 'condition-actions' }); 
                const complies_button = Helpers_create_element('button', { 
                    class_name: ['button', 'button-success', 'button-small', overall_manual_status_for_check === 'passed' ? 'active' : ''],
                    attributes: { 'aria-pressed': overall_manual_status_for_check === 'passed' ? 'true' : 'false', 'data-action': 'set-check-complies', 'id': `check-${check_definition.id}-complies-btn` },
                    html_content: `<span>${t('check_complies')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('check_circle', ['currentColor'], 16) : '')
                });
                condition_actions_div.appendChild(complies_button);
                const not_complies_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small', overall_manual_status_for_check === 'failed' ? 'active' : ''],
                    attributes: { 'aria-pressed': overall_manual_status_for_check === 'failed' ? 'true' : 'false', 'data-action': 'set-check-not-complies', 'id': `check-${check_definition.id}-not-complies-btn` },
                    html_content: `<span>${t('check_does_not_comply')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('cancel', ['currentColor'], 16) : '')
                });
                condition_actions_div.appendChild(not_complies_button);
                check_wrapper.appendChild(condition_actions_div);
            }
            
            const check_status_text = t(`audit_status_${calculated_check_status_for_display}`, {defaultValue: calculated_check_status_for_display});
            check_wrapper.appendChild(Helpers_create_element('p', { class_name: 'check-status-display', html_content: `<strong>${t('check_status')}:</strong> <span class="status-text status-${calculated_check_status_for_display}">${check_status_text}</span>`}));
    
            if (overall_manual_status_for_check === 'passed' && check_definition.passCriteria?.length) {
                const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });
                check_definition.passCriteria.forEach(pc_def => {
                    const pc_item_li = Helpers_create_element('li', { class_name: 'pass-criterion-item', attributes: {'data-pc-id': pc_def.id }});
                    pc_item_li.appendChild(Helpers_create_element('p', { class_name: 'pass-criterion-requirement', text_content: pc_def.requirement }));
                    
                    const pc_data_for_view = check_result_data_for_view?.passCriteria[pc_def.id] || {status: 'not_audited', observationDetail: ''};
                    const current_pc_status = pc_data_for_view.status;
                                        
                    const pc_status_text = t(`audit_status_${current_pc_status}`, {defaultValue: current_pc_status});
                    pc_item_li.appendChild(Helpers_create_element('div', { class_name: 'pass-criterion-status', html_content: `<strong>${t('status')}:</strong> <span class="status-text status-${current_pc_status}">${pc_status_text}</span>`}));
    
                    if (!is_audit_locked) { 
                        const pc_actions_div = Helpers_create_element('div', { class_name: 'pass-criterion-actions' });
                        const passed_button = Helpers_create_element('button', {
                            class_name: ['button', 'button-success', 'button-small', current_pc_status === 'passed' ? 'active' : ''],
                            attributes: { 'data-action': 'set-pc-passed', 'id': `pc-${check_definition.id}-${pc_def.id}-passed-btn` },
                            html_content: `<span>${t('pass_criterion_approved')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('thumb_up', ['currentColor'], 16) : '')
                        });
                        pc_actions_div.appendChild(passed_button);
                        const failed_button = Helpers_create_element('button', {
                            class_name: ['button', 'button-danger', 'button-small', current_pc_status === 'failed' ? 'active' : ''],
                            attributes: { 'data-action': 'set-pc-failed', 'id': `pc-${check_definition.id}-${pc_def.id}-failed-btn` },
                            html_content: `<span>${t('pass_criterion_failed')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('thumb_down', ['currentColor'], 16) : '')
                        });
                        pc_actions_div.appendChild(failed_button);
                        pc_item_li.appendChild(pc_actions_div);
                    }
    
                    const observation_detail_wrapper = Helpers_create_element('div', {
                        class_name: 'pc-observation-detail-wrapper form-group'
                    });
                    observation_detail_wrapper.hidden = (current_pc_status !== 'failed');
                    
                    const observation_label_id = `pc-observation-label-${check_definition.id}-${pc_def.id}`;
                    observation_detail_wrapper.appendChild(Helpers_create_element('label', {
                        attributes: { for: `pc-observation-${check_definition.id}-${pc_def.id}` },
                        text_content: t('pc_observation_detail_label'), 
                        id: observation_label_id
                    }));
                    
                    const textarea_id = `pc-observation-${check_definition.id}-${pc_def.id}`;
                    let observation_textarea = document.getElementById(textarea_id); 
    
                    if (!observation_textarea) { 
                        observation_textarea = Helpers_create_element('textarea', {
                            id: textarea_id,
                            class_name: 'form-control pc-observation-detail-textarea',
                            attributes: { rows: '4', 'aria-labelledby': observation_label_id }
                        });
                        if (!is_audit_locked) {
                            observation_textarea.addEventListener('input', () => debounced_auto_save_pc_observation(check_definition.id, pc_def.id));
                        }
                    }
                    
                    observation_textarea.value = pc_data_for_view.observationDetail || '';
                    observation_textarea.readOnly = is_audit_locked;
                    
                    if (window.Helpers?.init_auto_resize_for_textarea) {
                        window.Helpers.init_auto_resize_for_textarea(observation_textarea);
                    }
                    
                    observation_detail_wrapper.appendChild(observation_textarea);
                    pc_item_li.appendChild(observation_detail_wrapper);
                    pc_list.appendChild(pc_item_li);
                });
                check_wrapper.appendChild(pc_list);
            } else if (overall_manual_status_for_check === 'failed') { 
                check_wrapper.appendChild(Helpers_create_element('p', { class_name: 'text-muted', style: 'font-size: 0.9em; margin-top: 0.5rem; font-style: italic;', text_content: t('check_marked_as_not_compliant_criteria_passed')}));
            }
        });
    }
    function render_navigation_buttons(nav_container_element) { 
        const t = get_t_internally();
        nav_container_element.innerHTML = ''; 
        const nav_group_left = Helpers_create_element('div', { class_name: 'nav-group-left' });
        const nav_group_right = Helpers_create_element('div', { class_name: 'nav-group-right' });
        const back_to_list_btn = Helpers_create_element('button', {
            class_name: 'button button-default',
            html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) : '') + `<span>${t('back_to_requirement_list')}</span>`
        });
        back_to_list_btn.addEventListener('click', () => { save_focus_state(); router_ref('requirement_list', { sampleId: params_ref.sampleId }); });
        nav_group_left.appendChild(back_to_list_btn);

        if (current_requirement_result_for_view?.needsReview === true) {
            const current_status = current_requirement_result_for_view.status;
            let button_text_key = 'confirm_status_and_return';
            let button_class = 'button-secondary'; // Grå som standard
            if (current_status === 'passed') {
                button_text_key = 'confirm_status_passed';
                button_class = 'button-success'; // Grön
            } else if (current_status === 'failed') {
                button_text_key = 'confirm_status_failed';
                button_class = 'button-danger'; // Röd
            }
            
            const confirm_reviewed_button = Helpers_create_element('button', {
                class_name: ['button', button_class],
                html_content: `<span>${t(button_text_key)}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('check', ['currentColor'], 18) : '')
            });
            confirm_reviewed_button.addEventListener('click', handle_confirm_reviewed_status);
            nav_group_left.appendChild(confirm_reviewed_button);
        }

        const current_global_state_for_nav = local_getState();
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_global_state_for_nav && current_global_state_for_nav.auditStatus !== 'locked') {
            if (current_index > 0) {
                const temp_prev_req_btn = Helpers_create_element('button', { 
                    class_name: 'button button-secondary',
                    html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) : '') + `<span>${t('previous_requirement')}</span>`
                });
                temp_prev_req_btn.addEventListener('click', go_to_previous_requirement);
                nav_group_right.appendChild(temp_prev_req_btn);
            }
            if (current_index < ordered_requirement_keys_for_sample.length - 1) {
                const temp_next_req_btn = Helpers_create_element('button', { 
                    class_name: 'button button-secondary',
                    html_content: `<span>${t('next_requirement')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) : '')
                });
                temp_next_req_btn.addEventListener('click', go_to_next_requirement);
                nav_group_right.appendChild(temp_next_req_btn);
            }
            const next_unhandled_key = AuditLogic_find_first_incomplete_requirement_key_for_sample(
                current_global_state_for_nav.ruleFileContent, current_sample_object_from_store
            );
            if (next_unhandled_key !== null) {
                const temp_next_unhandled_btn = Helpers_create_element('button', { 
                    class_name: 'button button-primary',
                    html_content: `<span>${t('next_unhandled_requirement')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward_alt', ['currentColor'], 18) : '')
                });
                temp_next_unhandled_btn.addEventListener('click', go_to_next_unhandled_requirement);
                nav_group_right.appendChild(temp_next_unhandled_btn);
            }
        }
        nav_container_element.appendChild(nav_group_left);
        if (nav_group_right.hasChildNodes()) nav_container_element.appendChild(nav_group_right);
    }
    
    function _initialRender() {
        const t = get_t_internally();
        app_container_ref.innerHTML = '';
        is_dom_initialized = true;
    
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        app_container_ref.appendChild(plate_element_ref);
    
        if (global_message_element_ref) {
            plate_element_ref.appendChild(global_message_element_ref);
        }
    
        header_div_ref = Helpers_create_element('div', { class_name: 'requirement-audit-header' });
        sample_context_text_element_ref = Helpers_create_element('p', { style: 'font-weight: 500; color: var(--text-color-muted); margin-bottom: 0.3rem; margin-top: 0;' });
        requirement_title_element_ref = Helpers_create_element('h1');
        standard_reference_element_ref = Helpers_create_element('p', { class_name: 'standard-reference' });
        audited_page_link_element_ref = Helpers_create_element('p', { class_name: 'audited-page-link' });
        requirement_status_display_element = Helpers_create_element('p', { class_name: 'overall-requirement-status-display' });
        header_div_ref.append(sample_context_text_element_ref, requirement_title_element_ref, standard_reference_element_ref, audited_page_link_element_ref, requirement_status_display_element);
        plate_element_ref.appendChild(header_div_ref);
    
        expected_observation_section_ref = Helpers_create_element('div', {class_name: 'audit-section'});
        instructions_section_ref = Helpers_create_element('div', {class_name: 'audit-section'});
        tips_section_ref = Helpers_create_element('div', {class_name: 'audit-section'});
        exceptions_section_ref = Helpers_create_element('div', {class_name: 'audit-section'});
        common_errors_section_ref = Helpers_create_element('div', {class_name: 'audit-section'});
        metadata_section_ref = Helpers_create_element('div', {class_name: 'audit-section'});
        plate_element_ref.append(expected_observation_section_ref, instructions_section_ref, tips_section_ref, exceptions_section_ref, common_errors_section_ref, metadata_section_ref);
    
        top_nav_buttons_container_ref = Helpers_create_element('div', { class_name: 'audit-navigation-buttons top-nav' });
        plate_element_ref.appendChild(top_nav_buttons_container_ref);
    
        checks_ui_container_element = Helpers_create_element('div', { class_name: 'checks-container audit-section' });
        checks_ui_container_element.addEventListener('click', handle_checks_container_click);
        plate_element_ref.appendChild(checks_ui_container_element);
    
        input_fields_container_ref = Helpers_create_element('div', { class_name: 'input-fields-container audit-section' });
        input_fields_container_ref.appendChild(Helpers_create_element('h2', { text_content: t('observations_and_comments_title') }));
    
        let fg1 = Helpers_create_element('div', { class_name: 'form-group' });
        let label1 = Helpers_create_element('label', { attributes: { for: 'commentToAuditor' }, text_content: t('comment_to_auditor') });
        comment_to_auditor_input = Helpers_create_element('textarea', { id: 'commentToAuditor', class_name: 'form-control', attributes: { rows: '4' } });
        comment_to_auditor_input.addEventListener('input', debounced_auto_save_comments);
        fg1.append(label1, comment_to_auditor_input);
    
        let fg2 = Helpers_create_element('div', { class_name: 'form-group' });
        let label2 = Helpers_create_element('label', { attributes: { for: 'commentToActor' }, text_content: t('comment_to_actor') });
        comment_to_actor_input = Helpers_create_element('textarea', { id: 'commentToActor', class_name: 'form-control', attributes: { rows: '4' } });
        comment_to_actor_input.addEventListener('input', debounced_auto_save_comments);
        fg2.append(label2, comment_to_actor_input);
    
        input_fields_container_ref.append(fg1, fg2);
        plate_element_ref.appendChild(input_fields_container_ref);
    
        bottom_nav_buttons_container_ref = Helpers_create_element('div', { class_name: 'audit-navigation-buttons bottom-nav' });
        plate_element_ref.appendChild(bottom_nav_buttons_container_ref);
    }
    
    function _populateDOMWithData() { 
        const t = get_t_internally();
        const req_for_render = current_requirement_object_from_store;
        const result_for_render = current_requirement_result_for_view;
        const current_global_state_for_render = local_getState();
        const is_audit_locked_for_render = current_global_state_for_render?.auditStatus === 'locked';
    
        if (!plate_element_ref || !requirement_title_element_ref || !comment_to_auditor_input || !comment_to_actor_input) {
            is_dom_initialized = false; 
            console.error("Attempted to populate DOM but essential elements were not found. Re-rendering.");
            render();
            return;
        }
    
        if (NotificationComponent_clear_global_message && global_message_element_ref &&
            !global_message_element_ref.classList.contains('message-error') &&
            !global_message_element_ref.classList.contains('message-warning')) {
            NotificationComponent_clear_global_message();
        }
    
        const needs_review = result_for_render?.needsReview === true;
        if (needs_review && NotificationComponent_show_global_message) {
            NotificationComponent_show_global_message(t('requirement_updated_needs_review', { defaultValue: "This requirement has been updated since last review. Please verify your assessment." }), 'info');
        }
    
        requirement_title_element_ref.textContent = req_for_render.title;
    
        if (sample_context_text_element_ref) {
            const actor_name = current_global_state_for_render.auditMetadata?.actorName || '';
            const sample_description = current_sample_object_from_store?.description || '';
            let context_text = sample_description;
    
            if (actor_name.trim() !== '') {
                context_text = `${actor_name.trim()}: ${sample_description}`;
            }
    
            sample_context_text_element_ref.textContent = context_text;
        }
    
        standard_reference_element_ref.innerHTML = '';
        if (req_for_render.standardReference?.text) {
            const label_strong = Helpers_create_element('strong', { 
                text_content: t('requirement_standard_reference_label', { defaultValue: "Reference:" }) 
            });
            standard_reference_element_ref.appendChild(label_strong);
            standard_reference_element_ref.appendChild(document.createTextNode(' '));
            if (req_for_render.standardReference.url) { 
                const link = Helpers_create_element('a', { 
                    text_content: req_for_render.standardReference.text, 
                    attributes: { href: req_for_render.standardReference.url, target: '_blank', rel: 'noopener noreferrer' } 
                });
                standard_reference_element_ref.appendChild(link); 
            } else { 
                standard_reference_element_ref.appendChild(document.createTextNode(req_for_render.standardReference.text));
            }
        }
    
        audited_page_link_element_ref.innerHTML = '';
        if (current_sample_object_from_store.url) {
            const label_strong = Helpers_create_element('strong', {
                text_content: t('audited_page_label', { defaultValue: "Granskad sida:" })
            });
            audited_page_link_element_ref.appendChild(label_strong);
            audited_page_link_element_ref.appendChild(document.createTextNode(' '));
        
            const actor_name = current_global_state_for_render.auditMetadata?.actorName || '';
            const sample_description = current_sample_object_from_store?.description || '';
            const context_text = (actor_name.trim() !== '') ? `${actor_name.trim()}: ${sample_description}` : sample_description;
        
            const safe_url = Helpers_add_protocol_if_missing(current_sample_object_from_store.url);
            const link = Helpers_create_element('a', {
                text_content: context_text,
                attributes: { href: safe_url, target: '_blank', rel: 'noopener noreferrer' }
            });
            audited_page_link_element_ref.appendChild(link);
            audited_page_link_element_ref.removeAttribute('hidden');
        } else {
            audited_page_link_element_ref.setAttribute('hidden', 'true');
        }
    
    
        const overall_status_key = result_for_render?.status || 'not_audited';
        const overall_status_text = t(`audit_status_${overall_status_key}`, {defaultValue: overall_status_key});
        requirement_status_display_element.innerHTML = `<strong>${t('overall_requirement_status')}:</strong> <span class="status-text status-${overall_status_key}">${overall_status_text}</span>`;
        
        expected_observation_section_ref = render_audit_section_internal('requirement_expected_observation', req_for_render.expectedObservation, expected_observation_section_ref, plate_element_ref, 'expected-observation-section');
        instructions_section_ref = render_audit_section_internal('requirement_instructions', req_for_render.instructions, instructions_section_ref, plate_element_ref);
        
        tips_section_ref = render_audit_section_internal('requirement_tips', req_for_render.tips, tips_section_ref, plate_element_ref);
        exceptions_section_ref = render_audit_section_internal('requirement_exceptions', req_for_render.exceptions, exceptions_section_ref, plate_element_ref);
        common_errors_section_ref = render_audit_section_internal('requirement_common_errors', req_for_render.commonErrors, common_errors_section_ref, plate_element_ref); 
        if (req_for_render.metadata) { 
            if (!metadata_section_ref || !plate_element_ref.contains(metadata_section_ref)) {
                metadata_section_ref = Helpers_create_element('div', { class_name: 'audit-section' });
                let insert_after_node = common_errors_section_ref;
                if (!insert_after_node || !plate_element_ref.contains(insert_after_node)) {
                    const info_sections = [exceptions_section_ref, tips_section_ref, instructions_section_ref, expected_observation_section_ref];
                    for (let i = 0; i < info_sections.length; i++) { if (info_sections[i] && plate_element_ref.contains(info_sections[i])) { insert_after_node = info_sections[i]; break; } }
                }
                if (insert_after_node && plate_element_ref.contains(insert_after_node)) { if (insert_after_node.nextSibling) plate_element_ref.insertBefore(metadata_section_ref, insert_after_node.nextSibling); else plate_element_ref.appendChild(metadata_section_ref); } 
                else { const insert_before_main_content = top_nav_buttons_container_ref || checks_ui_container_element; if (insert_before_main_content && plate_element_ref.contains(insert_before_main_content)) plate_element_ref.insertBefore(metadata_section_ref, insert_before_main_content); else plate_element_ref.appendChild(metadata_section_ref); }
            }
            metadata_section_ref.innerHTML = ''; 
            metadata_section_ref.appendChild(Helpers_create_element('h2', { text_content: t('requirement_metadata_title') }));
            const metadata_list_ul = Helpers_create_element('ul', { class_name: 'requirement-metadata-list' });
            if(req_for_render.metadata.mainCategory?.text) { const li = Helpers_create_element('li'); li.innerHTML = `<strong>${t('main_category')}:</strong> ${Helpers_escape_html(req_for_render.metadata.mainCategory.text)}`; metadata_list_ul.appendChild(li); }
            if(req_for_render.metadata.subCategory?.text) { const li = Helpers_create_element('li'); li.innerHTML = `<strong>${t('sub_category')}:</strong> ${Helpers_escape_html(req_for_render.metadata.subCategory.text)}`; metadata_list_ul.appendChild(li); }
            if (req_for_render.metadata.impact) { const impact_text = req_for_render.metadata.impact.isCritical ? t('critical') : t('impact_normal'); const li = Helpers_create_element('li'); li.innerHTML = `<strong>${t('impact')}:</strong> ${impact_text}`; metadata_list_ul.appendChild(li); }
            metadata_section_ref.appendChild(metadata_list_ul);
        } else if (metadata_section_ref && plate_element_ref.contains(metadata_section_ref)) { metadata_section_ref.remove(); metadata_section_ref = null; }
        
        render_navigation_buttons(top_nav_buttons_container_ref);
        render_navigation_buttons(bottom_nav_buttons_container_ref);
        
        render_checks_section(checks_ui_container_element); 
        
        comment_to_auditor_input.value = result_for_render.commentToAuditor || '';
        comment_to_actor_input.value = result_for_render.commentToActor || '';
        
        if (window.Helpers?.init_auto_resize_for_textarea) {
            window.Helpers.init_auto_resize_for_textarea(comment_to_auditor_input);
            window.Helpers.init_auto_resize_for_textarea(comment_to_actor_input);
        }
    
        [comment_to_auditor_input, comment_to_actor_input].forEach(input => {
            input.readOnly = is_audit_locked_for_render;
            input.classList.toggle('readonly-textarea', is_audit_locked_for_render);
        });
        
        restore_focus_state();
    }
    
    async function render() { 
        assign_globals_once();
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) {
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_audit_view')}</p>`;
            return;
        }
        if (!load_and_prepare_view_data()) { 
            app_container_ref.innerHTML = '';
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_loading_sample_or_requirement_data'), "error");
            const back_button = Helpers_create_element('button', {class_name: ['button', 'button-default'], text_content: t('back_to_requirement_list')});
            const sampleIdForBack = params_ref ? params_ref.sampleId : '';
            back_button.addEventListener('click', () => { save_focus_state(); router_ref('requirement_list', { sampleId: sampleIdForBack }); });
            app_container_ref.appendChild(back_button);
            is_dom_initialized = false;
            return;
        }
    
        if (!is_dom_initialized || !plate_element_ref || !document.body.contains(plate_element_ref)) {
            await _initialRender();
        }
        
        _populateDOMWithData();
    }
    
    
    function destroy() { 
        clearTimeout(debounceTimerComments); 
        Object.values(debounceTimerObservation).forEach(clearTimeout); 
        debounceTimerObservation = {};
        if (comment_to_auditor_input) comment_to_auditor_input.removeEventListener('input', debounced_auto_save_comments);
        if (comment_to_actor_input) comment_to_actor_input.removeEventListener('input', debounced_auto_save_comments);
        if (checks_ui_container_element) {
            checks_ui_container_element.removeEventListener('click', handle_checks_container_click);
        }
        plate_element_ref = null; header_div_ref = null; requirement_title_element_ref = null;
        sample_context_text_element_ref = null;
        standard_reference_element_ref = null; 
        audited_page_link_element_ref = null;
        requirement_status_display_element = null;
        checks_ui_container_element = null; 
        comment_to_auditor_input = null; comment_to_actor_input = null; 
        input_fields_container_ref = null; top_nav_buttons_container_ref = null;
        bottom_nav_buttons_container_ref = null; instructions_section_ref = null;
        expected_observation_section_ref = null; tips_section_ref = null;
        exceptions_section_ref = null; common_errors_section_ref = null;
        metadata_section_ref = null;
        current_sample_object_from_store = null; 
        current_requirement_object_from_store = null; 
        current_requirement_result_for_view = null;
        ordered_requirement_keys_for_sample = [];
        is_dom_initialized = false; 
        last_focused_element_info = null;
    }
    
    return {
        init,
        render,
        destroy
    };
    
    })();