// file: js/components/RequirementAuditComponent.js
export const RequirementAuditComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_audit_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref; 

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_load_css;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_calculate_check_status, AuditLogic_calculate_requirement_status, AuditLogic_get_ordered_relevant_requirement_keys, AuditLogic_find_first_incomplete_requirement_key_for_sample;

    let global_message_element_ref;
    
    let current_sample_object_from_store = null;
    let current_requirement_object_from_store = null;
    let current_requirement_result_for_view = null; 

    let actual_observation_input, comment_to_auditor_input, comment_to_actor_input;
    let checks_ui_container_element = null;
    let requirement_status_display_element = null;

    let ordered_requirement_keys_for_sample = [];


    function get_t_internally() { /* ... som tidigare ... */ 
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
                return str + " (ReqAudit t not found)";
            };
    }

    function assign_globals_once() { /* ... som tidigare ... */ 
        if (Translation_t && Helpers_create_element && AuditLogic_calculate_check_status) return true;

        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("ReqAudit: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_get_current_iso_datetime_utc = window.Helpers.get_current_iso_datetime_utc;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_escape_html || !Helpers_get_current_iso_datetime_utc || !Helpers_load_css) {
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

    function handle_checks_container_click(event) { /* ... som tidigare ... */ 
        console.log("===> CLICK event fired!", event.target);

        const target_button = event.target.closest('button[data-action]');
        console.log("target_button:", target_button);

        if (!target_button) return;

        const action = target_button.dataset.action;
        console.log("action:", action);

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

        if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) {
            console.error("[RequirementAuditComponent] CRITICAL: StoreActionTypes.UPDATE_REQUIREMENT_RESULT was not passed to init or is undefined. Using fallback.");
            local_StoreActionTypes = { ...local_StoreActionTypes, UPDATE_REQUIREMENT_RESULT: 'UPDATE_REQUIREMENT_RESULT_ERROR_NO_ACTIONTYPES' };
        }
        
        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        
        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for RequirementAuditComponent:", error);
            }
        }
    }

    function load_and_prepare_view_data() {
        const current_global_state = local_getState();

        current_sample_object_from_store = null;
        current_requirement_object_from_store = null;
        current_requirement_result_for_view = null; 

        if (!current_global_state || !current_global_state.ruleFileContent ||
            !params_ref || !params_ref.sampleId || !params_ref.requirementId) {
            console.error("[RequirementAuditComponent] Missing global state, ruleFileContent, or params for loading data.");
            return false;
        }
        
        current_sample_object_from_store = current_global_state.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object_from_store) {
            console.error(`[RequirementAuditComponent] Sample with ID ${params_ref.sampleId} not found in store.`);
            return false;
        }
        
        if (!current_global_state.ruleFileContent.requirements) {
            console.error("[RequirementAuditComponent] ruleFileContent.requirements is missing from store.");
            return false;
        }
        
        const requirement_key_from_params = params_ref.requirementId; // Detta är det korrekta ID:t (UUID)
        current_requirement_object_from_store = current_global_state.ruleFileContent.requirements[requirement_key_from_params];
        
        if (!current_requirement_object_from_store) {
            console.error(`[RequirementAuditComponent] Requirement with ID/key "${requirement_key_from_params}" NOT FOUND in ruleFileContent.requirements.`);
            return false;
        }
        
        // **ÄNDRING HÄR:** Använd ALLTID requirement_key_from_params (som är UUID:t från URL:en)
        // för att slå upp resultatet i sample.requirementResults.
        // Detta är "Alternativ A" workaround.
        const requirement_id_for_results_lookup = requirement_key_from_params; 
        console.log(`[ReqAudit] Using "${requirement_id_for_results_lookup}" as key for requirementResults lookup.`);

        const result_from_store = (current_sample_object_from_store.requirementResults || {})[requirement_id_for_results_lookup];
        
        if (result_from_store) {
            current_requirement_result_for_view = JSON.parse(JSON.stringify(result_from_store));
        } else {
            current_requirement_result_for_view = {
                status: 'not_audited', actualObservation: '', commentToAuditor: '', commentToActor: '',
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
                if (current_requirement_result_for_view.checkResults[check_definition.id].status === undefined && AuditLogic_calculate_check_status) {
                     current_requirement_result_for_view.checkResults[check_definition.id].status = AuditLogic_calculate_check_status(
                        check_definition,
                        current_requirement_result_for_view.checkResults[check_definition.id].passCriteria || {},
                        current_requirement_result_for_view.checkResults[check_definition.id].overallStatus
                    );
                }
                if (current_requirement_result_for_view.checkResults[check_definition.id].passCriteria === undefined) {
                    current_requirement_result_for_view.checkResults[check_definition.id].passCriteria = {};
                }
            }
            (check_definition.passCriteria || []).forEach(pc_definition => {
                if (current_requirement_result_for_view.checkResults[check_definition.id].passCriteria[pc_definition.id] === undefined) {
                    current_requirement_result_for_view.checkResults[check_definition.id].passCriteria[pc_definition.id] = 'not_audited';
                }
            });
        });
        
        if (AuditLogic_get_ordered_relevant_requirement_keys) {
            ordered_requirement_keys_for_sample = AuditLogic_get_ordered_relevant_requirement_keys(current_global_state.ruleFileContent, current_sample_object_from_store);
        } else {
            ordered_requirement_keys_for_sample = [];
        }
        
        return true;
    }

    function auto_save_text_data() { 
        if (!current_requirement_result_for_view || !local_dispatch || !params_ref) {
            return;
        }

        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        let changed = false;

        if (actual_observation_input && modified_result_for_dispatch.actualObservation !== actual_observation_input.value) {
            modified_result_for_dispatch.actualObservation = actual_observation_input.value; 
            changed = true;
        }
        if (comment_to_auditor_input && modified_result_for_dispatch.commentToAuditor !== comment_to_auditor_input.value) {
            modified_result_for_dispatch.commentToAuditor = comment_to_auditor_input.value; 
            changed = true;
        }
        if (comment_to_actor_input && modified_result_for_dispatch.commentToActor !== comment_to_actor_input.value) {
            modified_result_for_dispatch.commentToActor = comment_to_actor_input.value; 
            changed = true;
        }

        if (changed) {
            if (Helpers_get_current_iso_datetime_utc) {
                modified_result_for_dispatch.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
            }
            
            if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) {
                console.error("[RequirementAuditComponent] local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT is undefined in auto_save!");
                if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update result is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
                payload: {
                    sampleId: params_ref.sampleId,
                    requirementId: params_ref.requirementId, // Använd ID från params (UUID)
                    newRequirementResult: modified_result_for_dispatch
                }
            });
        }
    }
    
    function handle_check_overall_status_change(check_id, new_overall_status_for_check) { 
        console.log("===> handle_check_overall_status_change", check_id, new_overall_status_for_check);
        const t = get_t_internally();

        if (!current_requirement_result_for_view || !current_requirement_result_for_view.checkResults || !current_requirement_result_for_view.checkResults[check_id] || !current_requirement_object_from_store) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_data_structure_pc'), 'error');
            return;
        }

        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        let check_result_to_modify = modified_result_for_dispatch.checkResults[check_id];
        const check_definition = current_requirement_object_from_store.checks.find(c => c.id === check_id);

        if (check_result_to_modify.overallStatus === new_overall_status_for_check) {
            check_result_to_modify.overallStatus = 'not_audited';
        } else {
            check_result_to_modify.overallStatus = new_overall_status_for_check;
        }

        if (check_result_to_modify.overallStatus === 'failed' && check_definition && check_definition.passCriteria) {
            check_definition.passCriteria.forEach(pc_def => {
                check_result_to_modify.passCriteria[pc_def.id] = 'passed';
            });
        }
        
        if (check_definition && AuditLogic_calculate_check_status) {
            check_result_to_modify.status = AuditLogic_calculate_check_status(
                check_definition,
                check_result_to_modify.passCriteria,
                check_result_to_modify.overallStatus 
            );
        }
        if (AuditLogic_calculate_requirement_status) {
            modified_result_for_dispatch.status = AuditLogic_calculate_requirement_status(current_requirement_object_from_store, modified_result_for_dispatch);
        }
        if (Helpers_get_current_iso_datetime_utc) modified_result_for_dispatch.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();

        if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) {
            console.error("[RequirementAuditComponent] local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT is undefined in handle_check_overall_status_change!");
             if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update result is missing.", "error");
            return;
        }
        console.log("Dispatchar:", {
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: {
                sampleId: params_ref.sampleId,
                requirementId: params_ref.requirementId,
                newRequirementResult: modified_result_for_dispatch
            }
        });
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: {
                sampleId: params_ref.sampleId,
                requirementId: params_ref.requirementId,
                newRequirementResult: modified_result_for_dispatch
            }
        });
        console.log("Dispatch skickad!");
        
    }

    function handle_pass_criterion_status_change(check_id, pc_id, new_pc_status) { 
        const t = get_t_internally();

        if (!current_requirement_result_for_view || !current_requirement_result_for_view.checkResults || 
            !current_requirement_result_for_view.checkResults[check_id] || 
            !current_requirement_result_for_view.checkResults[check_id].passCriteria ||
            !current_requirement_object_from_store) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_data_structure_pc'), 'error');
            return;
        }

        let modified_result_for_dispatch = JSON.parse(JSON.stringify(current_requirement_result_for_view));
        let check_result_to_modify = modified_result_for_dispatch.checkResults[check_id];

        if (check_result_to_modify.overallStatus === 'failed') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('cannot_change_criteria_if_check_not_compliant'), 'warning');
            return;
        }
        if (check_result_to_modify.overallStatus === 'not_audited') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_set_check_status_first', {defaultValue: "Please set the main check status first."}), 'warning');
            return;
        }

        if (check_result_to_modify.passCriteria[pc_id] === new_pc_status) {
            check_result_to_modify.passCriteria[pc_id] = 'not_audited';
        } else {
            check_result_to_modify.passCriteria[pc_id] = new_pc_status;
        }
        
        const check_definition = current_requirement_object_from_store.checks.find(c => c.id === check_id);
        if (check_definition && AuditLogic_calculate_check_status) {
             check_result_to_modify.status = AuditLogic_calculate_check_status(
                check_definition, 
                check_result_to_modify.passCriteria, 
                check_result_to_modify.overallStatus
            );
        }
        if (AuditLogic_calculate_requirement_status) {
            modified_result_for_dispatch.status = AuditLogic_calculate_requirement_status(current_requirement_object_from_store, modified_result_for_dispatch);
        }
        if (Helpers_get_current_iso_datetime_utc) modified_result_for_dispatch.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();

        if (!local_StoreActionTypes || !local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT) {
            console.error("[RequirementAuditComponent] local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT is undefined in handle_pass_criterion_status_change!");
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for update result is missing.", "error");
            return;
        }
        local_dispatch({
            type: local_StoreActionTypes.UPDATE_REQUIREMENT_RESULT,
            payload: {
                sampleId: params_ref.sampleId,
                requirementId: params_ref.requirementId, // Använd ID från params (UUID)
                newRequirementResult: modified_result_for_dispatch
            }
        });
    }

    function render_audit_section_internal(title_key, content_data, parent_element) { /* ... som tidigare ... */ 
        const t = get_t_internally();
        if (content_data && ((typeof content_data === 'string' && content_data.trim() !== '') || (Array.isArray(content_data) && content_data.length > 0))) {
            const section = Helpers_create_element('div', { class_name: 'audit-section' });
            section.appendChild(Helpers_create_element('h2', { text_content: t(title_key) }));
            if (Array.isArray(content_data)) {
                const ul = Helpers_create_element('ul');
                content_data.forEach(item_obj => {
                    const text_content = (typeof item_obj === 'object' && item_obj.text) ? item_obj.text : String(item_obj);
                    ul.appendChild(Helpers_create_element('li', { html_content: Helpers_escape_html(text_content).replace(/\n/g, '<br>') }));
                });
                section.appendChild(ul);
            } else {
                const p = Helpers_create_element('p');
                p.innerHTML = Helpers_escape_html(String(content_data)).replace(/\n/g, '<br>');
                section.appendChild(p);
            }
            parent_element.appendChild(section);
        }
    }
    function render_checks_section(container_element) { /* ... som tidigare ... */ 
        const t = get_t_internally();
        container_element.innerHTML = ''; 
        const current_global_state_for_render = local_getState();
        const is_audit_locked = current_global_state_for_render && current_global_state_for_render.auditStatus === 'locked';

        if (!current_requirement_object_from_store || !current_requirement_object_from_store.checks || current_requirement_object_from_store.checks.length === 0) {
            container_element.appendChild(Helpers_create_element('p', { class_name: 'text-muted', text_content: t('no_checks_for_this_requirement') }));
            return;
        }
        if (!current_requirement_result_for_view || !current_requirement_result_for_view.checkResults) {
            return;
        }

        current_requirement_object_from_store.checks.forEach(check_definition => {
            const check_wrapper = Helpers_create_element('div', { 
                class_name: 'check-item', 
                attributes: {'data-check-id': check_definition.id }
            });
            
            check_wrapper.appendChild(Helpers_create_element('h3', { class_name: 'check-condition-title', text_content: check_definition.condition }));

            const check_result_data_for_view = current_requirement_result_for_view.checkResults[check_definition.id];
            const overall_manual_status_for_check = check_result_data_for_view?.overallStatus || 'not_audited';

            if (!is_audit_locked) {
                const condition_actions_div = Helpers_create_element('div', { class_name: 'condition-actions' }); 
                const complies_button = Helpers_create_element('button', { 
                    class_name: ['button', 'button-success', 'button-small', overall_manual_status_for_check === 'passed' ? 'active' : ''],
                    attributes: { 
                        'aria-pressed': overall_manual_status_for_check === 'passed' ? 'true' : 'false',
                        'data-action': 'set-check-complies'
                    },
                    html_content: `<span>${t('check_complies')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('check_circle', ['currentColor'], 16) : '')
                });
                condition_actions_div.appendChild(complies_button);

                const not_complies_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small', overall_manual_status_for_check === 'failed' ? 'active' : ''],
                    attributes: { 
                        'aria-pressed': overall_manual_status_for_check === 'failed' ? 'true' : 'false',
                        'data-action': 'set-check-not-complies'
                    },
                    html_content: `<span>${t('check_does_not_comply')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('cancel', ['currentColor'], 16) : '')
                });
                condition_actions_div.appendChild(not_complies_button);
                check_wrapper.appendChild(condition_actions_div);
            }
            
            const calculated_check_status_for_display = check_result_data_for_view?.status || 'not_audited';
            const check_status_text = t(`audit_status_${calculated_check_status_for_display}`, {defaultValue: calculated_check_status_for_display});
            check_wrapper.appendChild(Helpers_create_element('p', {
                class_name: 'check-status-display',
                html_content: `<strong>${t('check_status')}:</strong> <span class="status-text status-${calculated_check_status_for_display}">${check_status_text}</span>`
            }));

            if (overall_manual_status_for_check === 'passed' && check_definition.passCriteria && check_definition.passCriteria.length > 0) {
                const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });
                check_definition.passCriteria.forEach(pc_def => {
                    const pc_item_li = Helpers_create_element('li', { 
                        class_name: 'pass-criterion-item', 
                        attributes: {'data-pc-id': pc_def.id }
                    });
                    pc_item_li.appendChild(Helpers_create_element('p', { class_name: 'pass-criterion-requirement', text_content: pc_def.requirement }));
                    
                    const current_pc_status = check_result_data_for_view?.passCriteria[pc_def.id] || 'not_audited';
                    const pc_status_text = t(`audit_status_${current_pc_status}`, {defaultValue: current_pc_status});
                    pc_item_li.appendChild(Helpers_create_element('div', { 
                        class_name: 'pass-criterion-status',
                        html_content: `<strong>${t('status')}:</strong> <span class="status-text status-${current_pc_status}">${pc_status_text}</span>`
                    }));

                    if (!is_audit_locked) {
                        const pc_actions_div = Helpers_create_element('div', { class_name: 'pass-criterion-actions' });
                        const passed_button = Helpers_create_element('button', {
                            class_name: ['button', 'button-success', 'button-small', current_pc_status === 'passed' ? 'active' : ''],
                            attributes: { 'data-action': 'set-pc-passed' },
                            html_content: `<span>${t('pass_criterion_approved')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('thumb_up', ['currentColor'], 16) : '')
                        });
                        pc_actions_div.appendChild(passed_button);
                        
                        const failed_button = Helpers_create_element('button', {
                            class_name: ['button', 'button-danger', 'button-small', current_pc_status === 'failed' ? 'active' : ''],
                            attributes: { 'data-action': 'set-pc-failed' },
                            html_content: `<span>${t('pass_criterion_failed')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('thumb_down', ['currentColor'], 16) : '')
                        });
                        pc_actions_div.appendChild(failed_button);
                        pc_item_li.appendChild(pc_actions_div);
                    }
                    pc_list.appendChild(pc_item_li);
                });
                check_wrapper.appendChild(pc_list);
            } else if (overall_manual_status_for_check === 'failed') { 
                check_wrapper.appendChild(Helpers_create_element('p', { 
                    class_name: 'text-muted', 
                    style: 'font-size: 0.9em; margin-top: 0.5rem; font-style: italic;',
                    text_content: t('check_marked_as_not_compliant_criteria_passed')
                }));
            }
            container_element.appendChild(check_wrapper);
        });
    }
    function get_current_requirement_index_in_ordered_list() { /* ... som tidigare ... */  
        if (!ordered_requirement_keys_for_sample || ordered_requirement_keys_for_sample.length === 0) {
            return -1;
        }
        return ordered_requirement_keys_for_sample.indexOf(params_ref.requirementId);
    }
    function navigate_to_requirement_by_index(index) { /* ... som tidigare ... */  
        if (current_sample_object_from_store && index >= 0 && index < ordered_requirement_keys_for_sample.length) {
            const new_requirement_key = ordered_requirement_keys_for_sample[index];
            router_ref('requirement_audit', { sampleId: current_sample_object_from_store.id, requirementId: new_requirement_key });
        }
    }
    function go_to_previous_requirement() { /* ... som tidigare ... */   
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index > 0) {
            navigate_to_requirement_by_index(current_index - 1);
        }
    }
    function go_to_next_requirement() { /* ... som tidigare ... */   
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index < ordered_requirement_keys_for_sample.length - 1) {
            navigate_to_requirement_by_index(current_index + 1);
        }
    }
    function find_next_unhandled_requirement_key() { /* ... som tidigare ... */  
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index === -1 || !current_sample_object_from_store || !current_requirement_object_from_store) return null;
        
        const current_global_state_nav = local_getState(); 

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
    function go_to_next_unhandled_requirement() { /* ... som tidigare ... */   
        const t = get_t_internally();
        const next_unhandled_key = find_next_unhandled_requirement_key();
        if (next_unhandled_key && current_sample_object_from_store) {
            router_ref('requirement_audit', { sampleId: current_sample_object_from_store.id, requirementId: next_unhandled_key });
        } else {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('all_requirements_handled_for_sample'), 'info');
        }
    }
    function render_navigation_buttons(is_top_or_bottom = 'bottom') { /* ... som tidigare ... */  
        const t = get_t_internally();
        const nav_buttons_div = Helpers_create_element('div', { class_name: 'audit-navigation-buttons' });
        nav_buttons_div.classList.add(is_top_or_bottom === 'top' ? 'top-nav' : 'bottom-nav');
        
        const nav_group_left = Helpers_create_element('div', { class_name: 'nav-group-left' });
        const nav_group_right = Helpers_create_element('div', { class_name: 'nav-group-right' });
        
        const back_to_list_btn = Helpers_create_element('button', { 
            class_name: 'button button-default',
            html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) : '') + `<span>${t('back_to_requirement_list')}</span>`
        });
        back_to_list_btn.addEventListener('click', () => router_ref('requirement_list', {sampleId: params_ref.sampleId}));
        nav_group_left.appendChild(back_to_list_btn);

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
                current_global_state_for_nav.ruleFileContent, 
                current_sample_object_from_store
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
        nav_buttons_div.appendChild(nav_group_left);
        if(nav_group_right.hasChildNodes()) nav_buttons_div.appendChild(nav_group_right);
        return nav_buttons_div;
    }

    function render() { /* ... som tidigare ... */  
        assign_globals_once();
        const t = get_t_internally();

        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) {
            console.error("[ReqAudit] Core dependencies for render are missing.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_audit_view')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        if (!load_and_prepare_view_data()) { 
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_loading_sample_or_requirement_data'), "error");
            const back_button = Helpers_create_element('button', {class_name: ['button', 'button-default'], text_content: t('back_to_requirement_list')});
            const sampleIdForBack = params_ref ? params_ref.sampleId : '';
            back_button.addEventListener('click', () => router_ref('requirement_list', { sampleId: sampleIdForBack }));
            app_container_ref.appendChild(back_button);
            return;
        }
        
        const req_for_render = current_requirement_object_from_store;
        const result_for_render = current_requirement_result_for_view;

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        }
        
        const header_div = Helpers_create_element('div', { class_name: 'requirement-audit-header' });
        header_div.appendChild(Helpers_create_element('h1', { text_content: req_for_render.title }));
        if (req_for_render.standardReference && req_for_render.standardReference.text) {
            const ref_p = Helpers_create_element('p', { class_name: 'standard-reference' });
            if (req_for_render.standardReference.url) {
                const link = Helpers_create_element('a', {
                    text_content: req_for_render.standardReference.text,
                    attributes: { href: req_for_render.standardReference.url, target: '_blank', rel: 'noopener noreferrer' }
                });
                ref_p.appendChild(link);
            } else {
                ref_p.textContent = req_for_render.standardReference.text;
            }
            header_div.appendChild(ref_p);
        }
        requirement_status_display_element = Helpers_create_element('p', { class_name: 'overall-requirement-status-display'});
        const overall_status_key = result_for_render?.status || 'not_audited'; 
        const overall_status_text = t(`audit_status_${overall_status_key}`, {defaultValue: overall_status_key});
        requirement_status_display_element.innerHTML = `<strong>${t('overall_requirement_status')}:</strong> <span class="status-text status-${overall_status_key}">${overall_status_text}</span>`;
        header_div.appendChild(requirement_status_display_element);
        plate_element.appendChild(header_div);

        render_audit_section_internal('requirement_expected_observation', req_for_render.expectedObservation, plate_element);
        render_audit_section_internal('requirement_instructions', req_for_render.instructions, plate_element);
        render_audit_section_internal('requirement_tips', req_for_render.tips, plate_element);
        render_audit_section_internal('requirement_exceptions', req_for_render.exceptions, plate_element);
        render_audit_section_internal('requirement_common_errors', req_for_render.commonErrors, plate_element);

        if (req_for_render.metadata) {
            const meta_section = Helpers_create_element('div', { class_name: 'audit-section' });
            meta_section.appendChild(Helpers_create_element('h2', { text_content: t('requirement_metadata_title') }));
            const grid = Helpers_create_element('div', { class_name: 'requirement-metadata-grid' });
            if(req_for_render.metadata.mainCategory && req_for_render.metadata.mainCategory.text) grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${t('main_category')}:</strong> ${Helpers_escape_html(req_for_render.metadata.mainCategory.text)}`}));
            if(req_for_render.metadata.subCategory && req_for_render.metadata.subCategory.text) grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${t('sub_category')}:</strong> ${Helpers_escape_html(req_for_render.metadata.subCategory.text)}`}));
            if (req_for_render.metadata.impact) {
                 const impact_text = req_for_render.metadata.impact.isCritical ? t('critical') : t('impact_normal');
                 grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${t('impact')}:</strong> ${impact_text}`}));
            }
            meta_section.appendChild(grid);
            plate_element.appendChild(meta_section);
        }

        plate_element.appendChild(render_navigation_buttons('top'));

        if (!checks_ui_container_element) {
            checks_ui_container_element = Helpers_create_element('div', { class_name: 'checks-container audit-section' });
        } else {
            checks_ui_container_element.innerHTML = '';
        }
        // Lägg alltid på eventlyssnaren (både första gången och vid återanvändning)
        checks_ui_container_element.removeEventListener('click', handle_checks_container_click);
        checks_ui_container_element.addEventListener('click', handle_checks_container_click);
        
        checks_ui_container_element.appendChild(Helpers_create_element('h2', { text_content: t('checks_title') }));
        render_checks_section(checks_ui_container_element); 
        plate_element.appendChild(checks_ui_container_element);

        const input_fields_container = Helpers_create_element('div', { class_name: 'input-fields-container audit-section' });
        input_fields_container.appendChild(Helpers_create_element('h2', { text_content: t('observations_and_comments_title')}));
        let fg, label;
        const current_global_state_for_render = local_getState(); 
        const is_audit_locked_for_render = current_global_state_for_render && current_global_state_for_render.auditStatus === 'locked';

        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'actualObservation'}, text_content: t('actual_observation')});
        actual_observation_input = Helpers_create_element('textarea', {id: 'actualObservation', class_name: 'form-control', attributes: {rows: '4'}});
        actual_observation_input.value = result_for_render.actualObservation || ''; 
        if (!is_audit_locked_for_render) {
            actual_observation_input.addEventListener('input', auto_save_text_data);
        } else {
            actual_observation_input.setAttribute('readonly', 'true');
            actual_observation_input.classList.add('readonly-textarea');
        }
        fg.appendChild(label); fg.appendChild(actual_observation_input);
        input_fields_container.appendChild(fg);

        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'commentToAuditor'}, text_content: t('comment_to_auditor')});
        comment_to_auditor_input = Helpers_create_element('textarea', {id: 'commentToAuditor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_auditor_input.value = result_for_render.commentToAuditor || ''; 
        if (!is_audit_locked_for_render) {
            comment_to_auditor_input.addEventListener('input', auto_save_text_data);
        } else {
            comment_to_auditor_input.setAttribute('readonly', 'true');
            comment_to_auditor_input.classList.add('readonly-textarea');
        }
        fg.appendChild(label); fg.appendChild(comment_to_auditor_input);
        input_fields_container.appendChild(fg);

        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'commentToActor'}, text_content: t('comment_to_actor')});
        comment_to_actor_input = Helpers_create_element('textarea', {id: 'commentToActor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_actor_input.value = result_for_render.commentToActor || ''; 
        if (!is_audit_locked_for_render) {
            comment_to_actor_input.addEventListener('input', auto_save_text_data);
        } else {
            comment_to_actor_input.setAttribute('readonly', 'true');
            comment_to_actor_input.classList.add('readonly-textarea');
        }
        fg.appendChild(label); fg.appendChild(comment_to_actor_input);
        input_fields_container.appendChild(fg);
        plate_element.appendChild(input_fields_container);

        plate_element.appendChild(render_navigation_buttons('bottom'));
    }

    function destroy() { 
        if (actual_observation_input) actual_observation_input.removeEventListener('input', auto_save_text_data);
        if (comment_to_auditor_input) comment_to_auditor_input.removeEventListener('input', auto_save_text_data);
        if (comment_to_actor_input) comment_to_actor_input.removeEventListener('input', auto_save_text_data);
        
        if (checks_ui_container_element) {
            checks_ui_container_element.removeEventListener('click', handle_checks_container_click);
            checks_ui_container_element = null;
        }

        current_sample_object_from_store = null; 
        current_requirement_object_from_store = null; 
        current_requirement_result_for_view = null;
        actual_observation_input = null; comment_to_auditor_input = null; comment_to_actor_input = null;
        global_message_element_ref = null; 
        requirement_status_display_element = null;
        ordered_requirement_keys_for_sample = [];
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
    }

    return {
        init,
        render,
        destroy
    };
})();