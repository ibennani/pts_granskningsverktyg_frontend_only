// file: js/components/RequirementAuditComponent.js
export const RequirementAuditComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_audit_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;

    // --- Globala referenser ---
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_calculate_check_status, AuditLogic_calculate_requirement_status, AuditLogic_get_ordered_relevant_requirement_keys;

    // --- Lokala variabler för komponenten ---
    let global_message_element_ref;
    let current_sample_object = null;
    let current_requirement_object = null;
    let current_requirement_result = null;

    let actual_observation_input, comment_to_auditor_input, comment_to_actor_input;
    let checks_ui_container_element = null;
    let requirement_status_display_element = null;

    let prev_req_button_top, next_req_button_top, next_unhandled_button_top;
    let prev_req_button_bottom, next_req_button_bottom, next_unhandled_button_bottom;
    let ordered_requirement_keys_for_sample = [];


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
                return str + " (ReqAudit t not found)";
            };
    }

    function assign_globals() {
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

        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
            if (!State_getCurrentAudit || !State_setCurrentAudit) {
                 console.error("ReqAudit: One or more State functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqAudit: State module is missing!"); all_assigned = false; }

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
             if (!AuditLogic_calculate_check_status || !AuditLogic_calculate_requirement_status || !AuditLogic_get_ordered_relevant_requirement_keys) {
                console.error("ReqAudit: One or more AuditLogic functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqAudit: AuditLogic module is missing!"); all_assigned = false; }

        return all_assigned;
    }

    async function init(_app_container, _router, _params) {
        if (!assign_globals()) {
            console.error("RequirementAuditComponent: Failed to assign global dependencies in init.");
        }
        app_container_ref = _app_container;
        router_ref = _router;
        params_ref = _params;

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

    function load_data_and_ensure_results_structure() {
        const current_audit = State_getCurrentAudit();

        if (!current_audit || !current_audit.ruleFileContent ||
            !params_ref || !params_ref.sampleId || !params_ref.requirementId) {
            current_sample_object = null; current_requirement_object = null; current_requirement_result = null;
            return false;
        }
        current_sample_object = current_audit.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object) {
            current_requirement_object = null; current_requirement_result = null;
            return false;
        }
        if (!current_audit.ruleFileContent.requirements) {
            current_requirement_object = null; current_requirement_result = null;
            return false;
        }
        current_requirement_object = current_audit.ruleFileContent.requirements[params_ref.requirementId];
        if (!current_requirement_object) {
            current_requirement_result = null;
            return false;
        }
        
        if (!current_sample_object.requirementResults) current_sample_object.requirementResults = {};
        if (!current_sample_object.requirementResults[current_requirement_object.id]) {
            current_sample_object.requirementResults[current_requirement_object.id] = {
                status: 'not_audited', actualObservation: '', commentToAuditor: '', commentToActor: '',
                lastStatusUpdate: null, checkResults: {}
            };
        }
        current_requirement_result = current_sample_object.requirementResults[current_requirement_object.id];

        (current_requirement_object.checks || []).forEach(check => {
            if (!current_requirement_result.checkResults[check.id]) {
                current_requirement_result.checkResults[check.id] = { 
                    status: 'not_audited',          // Beräknad status från passCriteria (och overallStatus)
                    overallStatus: 'not_audited',   // Status från "Stämmer"/"Stämmer inte" - default 'not_audited'
                    passCriteria: {} 
                };
            } else {
                // Säkerställ att properties finns om checkResults[check.id] laddas från äldre sparfiler
                if (current_requirement_result.checkResults[check.id].overallStatus === undefined) {
                    current_requirement_result.checkResults[check.id].overallStatus = 'not_audited'; // Default
                }
                if (current_requirement_result.checkResults[check.id].status === undefined) {
                    // Beräkna initial status om den saknas, baserat på nuvarande overallStatus och passCriteria
                     const check_definition = current_requirement_object.checks.find(c => c.id === check.id);
                     if(check_definition && AuditLogic_calculate_check_status){
                        current_requirement_result.checkResults[check.id].status = AuditLogic_calculate_check_status(
                            check_definition,
                            current_requirement_result.checkResults[check.id].passCriteria || {},
                            current_requirement_result.checkResults[check.id].overallStatus
                        );
                     } else {
                        current_requirement_result.checkResults[check.id].status = 'not_audited';
                     }
                }
                if (current_requirement_result.checkResults[check.id].passCriteria === undefined) {
                    current_requirement_result.checkResults[check.id].passCriteria = {};
                }
            }
            // Initiera passCriteria-statusar om de inte finns
            (check.passCriteria || []).forEach(pc => {
                if (current_requirement_result.checkResults[check.id].passCriteria[pc.id] === undefined) {
                    current_requirement_result.checkResults[check.id].passCriteria[pc.id] = 'not_audited';
                }
            });
        });
        
        if (AuditLogic_get_ordered_relevant_requirement_keys) {
            ordered_requirement_keys_for_sample = AuditLogic_get_ordered_relevant_requirement_keys(current_audit.ruleFileContent, current_sample_object);
        } else {
            ordered_requirement_keys_for_sample = [];
            console.error("[ReqAudit] AuditLogic.get_ordered_relevant_requirement_keys is not available!");
        }

        State_setCurrentAudit(current_audit);
        return true;
    }

    function auto_save_text_data() {
        if (!current_requirement_result || !State_setCurrentAudit || !State_getCurrentAudit) return;
        let changed = false;
        if (actual_observation_input && current_requirement_result.actualObservation !== actual_observation_input.value) {
            current_requirement_result.actualObservation = actual_observation_input.value; changed = true;
        }
        if (comment_to_auditor_input && current_requirement_result.commentToAuditor !== comment_to_auditor_input.value) {
            current_requirement_result.commentToAuditor = comment_to_auditor_input.value; changed = true;
        }
        if (comment_to_actor_input && current_requirement_result.commentToActor !== comment_to_actor_input.value) {
            current_requirement_result.commentToActor = comment_to_actor_input.value; changed = true;
        }

        if (changed) {
            if (Helpers_get_current_iso_datetime_utc) {
                current_requirement_result.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
            }
            const current_audit = State_getCurrentAudit();
            State_setCurrentAudit(current_audit);
        }
    }
    
    function handle_check_overall_status_change(check_id, new_overall_status) {
        const t = get_t_internally();
        if (!current_requirement_result ||
            !current_requirement_result.checkResults ||
            !current_requirement_result.checkResults[check_id]) {
            console.error("[ReqAudit] handle_check_overall_status_change: Invalid data structure for check ID:", check_id);
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_data_structure_pc'), 'error');
            return;
        }

        const check_result_obj = current_requirement_result.checkResults[check_id];
        const check_definition_from_rulefile = current_requirement_object.checks.find(c => c.id === check_id);

        if (check_result_obj.overallStatus === new_overall_status) {
            check_result_obj.overallStatus = 'not_audited'; // Toggle off
        } else {
            check_result_obj.overallStatus = new_overall_status;
        }

        // Om "Stämmer inte" (failed) väljs för hela kontrollpunkten:
        if (check_result_obj.overallStatus === 'failed') {
            if (check_definition_from_rulefile && check_definition_from_rulefile.passCriteria) {
                check_definition_from_rulefile.passCriteria.forEach(pc => {
                    if (!check_result_obj.passCriteria) { 
                        check_result_obj.passCriteria = {};
                    }
                    check_result_obj.passCriteria[pc.id] = 'passed'; // Markera alla underliggande som godkända
                });
            }
        }
        // Om overallStatus ändras från 'passed' till 'not_audited', behålls ifyllda passCriteria-värden.

        if (check_definition_from_rulefile && AuditLogic_calculate_check_status) {
            check_result_obj.status = AuditLogic_calculate_check_status(
                check_definition_from_rulefile,
                check_result_obj.passCriteria,
                check_result_obj.overallStatus 
            );
        }

        if (Helpers_get_current_iso_datetime_utc) {
            current_requirement_result.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
        }
        const current_audit_for_save = State_getCurrentAudit();
        State_setCurrentAudit(current_audit_for_save);

        if (checks_ui_container_element) {
            render_checks_section(checks_ui_container_element);
        }
        
        if (requirement_status_display_element && AuditLogic_calculate_requirement_status) {
            const new_req_status = AuditLogic_calculate_requirement_status(current_requirement_object, current_requirement_result);
            if (current_requirement_result.status !== new_req_status) {
                current_requirement_result.status = new_req_status;
                const audit_after_req_status_change = State_getCurrentAudit();
                State_setCurrentAudit(audit_after_req_status_change);
            }
            const overall_status_text = t(`audit_status_${new_req_status}`, {defaultValue: new_req_status});
            requirement_status_display_element.innerHTML = `<strong>${t('overall_requirement_status')}:</strong> <span class="status-text status-${new_req_status}">${overall_status_text}</span>`;
        }
    }

    function handle_pass_criterion_status_change(check_id, pc_id, new_status) {
        const t = get_t_internally();
        if (!current_requirement_result ||
            !current_requirement_result.checkResults ||
            !current_requirement_result.checkResults[check_id] ||
            !current_requirement_result.checkResults[check_id].passCriteria) {
            console.error("[ReqAudit] handle_pass_criterion_status_change: Invalid data structure.");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_data_structure_pc'), 'error');
            return;
        }

        const check_result_obj = current_requirement_result.checkResults[check_id];
        
        // Förhindra ändring av passkriterier om kontrollpunkten är markerad som "Stämmer inte"
        if (check_result_obj.overallStatus === 'failed') {
            if (NotificationComponent_show_global_message) {
                NotificationComponent_show_global_message(t('cannot_change_criteria_if_check_not_compliant', {defaultValue: "Criteria cannot be changed when the control point is marked 'Does not comply'."}), 'warning');
            }
            return;
        }
        // Förhindra även ändring om overallStatus är 'not_audited' (eftersom listan inte visas)
        // Detta bör dock inte kunna hända eftersom knapparna inte renderas då.
        if (check_result_obj.overallStatus === 'not_audited') {
             console.warn("[ReqAudit] Attempted to change pass criterion while overall check status is not_audited. This should not happen.");
            return;
        }


        if (check_result_obj.passCriteria[pc_id] === new_status) {
            check_result_obj.passCriteria[pc_id] = 'not_audited';
        } else {
            check_result_obj.passCriteria[pc_id] = new_status;
        }

        const check_object_from_rulefile = current_requirement_object.checks.find(c => c.id === check_id);
        if (check_object_from_rulefile && AuditLogic_calculate_check_status) {
             check_result_obj.status = AuditLogic_calculate_check_status(
                check_object_from_rulefile,
                check_result_obj.passCriteria,
                check_result_obj.overallStatus 
            );
        }

        if (AuditLogic_calculate_requirement_status) {
            const calculated_req_status = AuditLogic_calculate_requirement_status(
                current_requirement_object,
                current_requirement_result
            );
            current_requirement_result.status = calculated_req_status;
        }

        if (Helpers_get_current_iso_datetime_utc) {
            current_requirement_result.lastStatusUpdate = Helpers_get_current_iso_datetime_utc();
        }
        const current_audit_for_save = State_getCurrentAudit();
        State_setCurrentAudit(current_audit_for_save);

        if (checks_ui_container_element) {
            render_checks_section(checks_ui_container_element);
        }
        if (requirement_status_display_element) {
            const overall_status_text = t(`audit_status_${current_requirement_result.status}`, {defaultValue: current_requirement_result.status});
            requirement_status_display_element.innerHTML = `<strong>${t('overall_requirement_status')}:</strong> <span class="status-text status-${current_requirement_result.status}">${overall_status_text}</span>`;
        }
    }

    function render_audit_section_internal(title_key, content_data, parent_element) {
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

    function render_checks_section(container_element) {
        const t = get_t_internally();
        container_element.innerHTML = ''; 
        const current_audit_state = State_getCurrentAudit();
        const is_audit_locked = current_audit_state && current_audit_state.auditStatus === 'locked';

        if (!current_requirement_object || !current_requirement_object.checks || current_requirement_object.checks.length === 0) {
            container_element.appendChild(Helpers_create_element('p', { class_name: 'text-muted', text_content: t('no_checks_for_this_requirement') }));
            return;
        }

        current_requirement_object.checks.forEach(check => {
            const check_wrapper = Helpers_create_element('div', { class_name: 'check-item', attributes: {'data-check-id': check.id }});
            
            const title_element = Helpers_create_element('h3', { class_name: 'check-condition-title', text_content: check.condition });
            check_wrapper.appendChild(title_element);

            const check_result_data = current_requirement_result.checkResults[check.id];
            const overall_manual_status_for_check = check_result_data?.overallStatus || 'not_audited'; // Default 'not_audited'

            if (!is_audit_locked) {
                const condition_actions_div = Helpers_create_element('div', { class_name: 'condition-actions' }); 

                const complies_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-success', 'button-small', overall_manual_status_for_check === 'passed' ? 'active' : ''],
                    attributes: { 'aria-pressed': overall_manual_status_for_check === 'passed' ? 'true' : 'false' },
                    html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('check', ['currentColor'], 16) : '') + `<span>${t('check_complies')}</span>`
                });
                complies_button.addEventListener('click', () => handle_check_overall_status_change(check.id, 'passed'));
                condition_actions_div.appendChild(complies_button);

                const not_complies_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small', overall_manual_status_for_check === 'failed' ? 'active' : ''],
                    attributes: { 'aria-pressed': overall_manual_status_for_check === 'failed' ? 'true' : 'false' },
                    html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('close', ['currentColor'], 16) : '') + `<span>${t('check_does_not_comply')}</span>`
                });
                not_complies_button.addEventListener('click', () => handle_check_overall_status_change(check.id, 'failed'));
                condition_actions_div.appendChild(not_complies_button);
                
                check_wrapper.appendChild(condition_actions_div);
            }
            
            const calculated_check_status_for_display = check_result_data?.status || 'not_audited';
            const check_status_text_key = `audit_status_${calculated_check_status_for_display}`;
            const check_status_text = t(check_status_text_key, {defaultValue: calculated_check_status_for_display});
            check_wrapper.appendChild(Helpers_create_element('p', {
                class_name: 'check-status-display',
                html_content: `<strong>${t('check_status')}:</strong> <span class="status-text status-${calculated_check_status_for_display}">${check_status_text}</span>`
            }));

            // Visa passCriteria-listan ENDAST om "Stämmer" (overallStatus === 'passed') är valt
            if (overall_manual_status_for_check === 'passed') {
                if (check.passCriteria && check.passCriteria.length > 0) {
                    const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });
                    check.passCriteria.forEach(pc => {
                        const pc_item_li = Helpers_create_element('li', { class_name: 'pass-criterion-item', attributes: {'data-pc-id': pc.id } });
                        pc_item_li.appendChild(Helpers_create_element('p', { class_name: 'pass-criterion-requirement', text_content: pc.requirement }));
                        
                        const current_pc_status = check_result_data?.passCriteria[pc.id] || 'not_audited';
                        const pc_status_text = t(`audit_status_${current_pc_status}`, {defaultValue: current_pc_status});
                        const status_display_div = Helpers_create_element('div', { class_name: 'pass-criterion-status' });
                        status_display_div.innerHTML = `<strong>${t('status')}:</strong> <span class="status-text status-${current_pc_status}">${pc_status_text}</span>`;
                        pc_item_li.appendChild(status_display_div);

                        if (!is_audit_locked) {
                            const pc_actions_div = Helpers_create_element('div', { class_name: 'pass-criterion-actions' });
                            const passed_button = Helpers_create_element('button', {
                                class_name: ['button', 'button-success', 'button-small', current_pc_status === 'passed' ? 'active' : ''],
                                html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('thumb_up', ['currentColor'], 16) : '') + `<span>${t('pass_criterion_approved')}</span>`
                            });
                            passed_button.addEventListener('click', () => handle_pass_criterion_status_change(check.id, pc.id, 'passed'));
                            pc_actions_div.appendChild(passed_button);
                            
                            const failed_button = Helpers_create_element('button', {
                                class_name: ['button', 'button-danger', 'button-small', current_pc_status === 'failed' ? 'active' : ''],
                                html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('thumb_down', ['currentColor'], 16) : '') + `<span>${t('pass_criterion_failed')}</span>`
                            });
                            failed_button.addEventListener('click', () => handle_pass_criterion_status_change(check.id, pc.id, 'failed'));
                            pc_actions_div.appendChild(failed_button);
                            pc_item_li.appendChild(pc_actions_div);
                        }
                        pc_list.appendChild(pc_item_li);
                    });
                    check_wrapper.appendChild(pc_list);
                }
            } else if (overall_manual_status_for_check === 'failed') { 
                const info_text_key = 'check_marked_as_not_compliant_criteria_passed';
                const info_text_default = "Kontrollpunkten är markerad som 'Stämmer inte'; underliggande kriterier har automatiskt markerats som godkända och visas ej.";
                const info_p = Helpers_create_element('p', { 
                    class_name: 'text-muted', 
                    style: 'font-size: 0.9em; margin-top: 0.5rem; font-style: italic;',
                    text_content: t(info_text_key, {defaultValue: info_text_default})
                });
                check_wrapper.appendChild(info_p);
            }
            // Om overall_manual_status_for_check === 'not_audited' (default), visas inget för passCriteria
            
            container_element.appendChild(check_wrapper);
        });
    }

    function get_current_requirement_index_in_ordered_list() {
        if (!ordered_requirement_keys_for_sample || ordered_requirement_keys_for_sample.length === 0) {
            return -1;
        }
        return ordered_requirement_keys_for_sample.indexOf(params_ref.requirementId);
    }

    function navigate_to_requirement_by_index(index) {
        if (index >= 0 && index < ordered_requirement_keys_for_sample.length) {
            const new_requirement_key = ordered_requirement_keys_for_sample[index];
            router_ref('requirement_audit', { sampleId: current_sample_object.id, requirementId: new_requirement_key });
        } else {
            console.warn("[ReqAudit] Attempted to navigate to an out-of-bounds index:", index);
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
        if (current_index < ordered_requirement_keys_for_sample.length - 1) {
            navigate_to_requirement_by_index(current_index + 1);
        }
    }

    function find_next_unhandled_requirement_key() {
        const current_index = get_current_requirement_index_in_ordered_list();
        if (current_index === -1) return null;

        for (let i = current_index + 1; i < ordered_requirement_keys_for_sample.length; i++) {
            const req_key = ordered_requirement_keys_for_sample[i];
            const req_result = current_sample_object.requirementResults[req_key];
            if (!req_result || req_result.status === 'not_audited' || req_result.status === 'partially_audited') {
                return req_key;
            }
        }
        for (let i = 0; i < current_index; i++) {
            const req_key = ordered_requirement_keys_for_sample[i];
            const req_result = current_sample_object.requirementResults[req_key];
            if (!req_result || req_result.status === 'not_audited' || req_result.status === 'partially_audited') {
                return req_key;
            }
        }
        return null;
    }

    function go_to_next_unhandled_requirement() {
        const t = get_t_internally();
        const next_unhandled_key = find_next_unhandled_requirement_key();
        if (next_unhandled_key) {
            router_ref('requirement_audit', { sampleId: current_sample_object.id, requirementId: next_unhandled_key });
        } else {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('all_requirements_handled_for_sample'), 'info');
        }
    }
    
    function render_navigation_buttons(is_top_or_bottom = 'bottom') {
        const t = get_t_internally();
        const nav_buttons_div = Helpers_create_element('div', { class_name: 'audit-navigation-buttons' });
        nav_buttons_div.classList.add(is_top_or_bottom === 'top' ? 'top-nav' : 'bottom-nav');

        const nav_group_left = Helpers_create_element('div', { class_name: 'nav-group-left' });
        const nav_group_right = Helpers_create_element('div', { class_name: 'nav-group-right' });

        const back_to_list_btn = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) : '') + `<span>${t('back_to_requirement_list')}</span>`
        });
        back_to_list_btn.addEventListener('click', () => router_ref('requirement_list', {sampleId: params_ref.sampleId}));
        nav_group_left.appendChild(back_to_list_btn);

        const current_audit_state = State_getCurrentAudit();
        const current_index = get_current_requirement_index_in_ordered_list();

        if (current_audit_state && current_audit_state.auditStatus !== 'locked') {
            const temp_prev_req_btn = Helpers_create_element('button', { class_name: ['button', 'button-secondary'], html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) : '') + `<span>${t('previous_requirement')}</span>`});
            temp_prev_req_btn.addEventListener('click', go_to_previous_requirement);
            if (current_index <= 0) {
                temp_prev_req_btn.disabled = true;
                temp_prev_req_btn.classList.add('button-disabled');
            }
            nav_group_right.appendChild(temp_prev_req_btn);
            if (is_top_or_bottom === 'top') prev_req_button_top = temp_prev_req_btn; else prev_req_button_bottom = temp_prev_req_btn;


            const temp_next_req_btn = Helpers_create_element('button', { class_name: ['button', 'button-secondary'], html_content: `<span>${t('next_requirement')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) : '') });
            temp_next_req_btn.addEventListener('click', go_to_next_requirement);
            if (current_index >= ordered_requirement_keys_for_sample.length - 1) {
                temp_next_req_btn.disabled = true;
                temp_next_req_btn.classList.add('button-disabled');
            }
            nav_group_right.appendChild(temp_next_req_btn);
            if (is_top_or_bottom === 'top') next_req_button_top = temp_next_req_btn; else next_req_button_bottom = temp_next_req_btn;


            const temp_next_unhandled_btn = Helpers_create_element('button', { class_name: ['button', 'button-primary'], html_content: `<span>${t('next_unhandled_requirement')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward_alt', ['currentColor'], 18) : '') });
            temp_next_unhandled_btn.addEventListener('click', go_to_next_unhandled_requirement);
            if (find_next_unhandled_requirement_key() === null) {
                temp_next_unhandled_btn.disabled = true;
                temp_next_unhandled_btn.classList.add('button-disabled');
            }
            nav_group_right.appendChild(temp_next_unhandled_btn);
            if (is_top_or_bottom === 'top') next_unhandled_button_top = temp_next_unhandled_btn; else next_unhandled_button_bottom = temp_next_unhandled_btn;
        }

        nav_buttons_div.appendChild(nav_group_left);
        if(nav_group_right.hasChildNodes()) nav_buttons_div.appendChild(nav_group_right);
        return nav_buttons_div;
    }

    function render() {
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t) {
            console.error("[ReqAudit] Core dependencies for render are missing.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_audit_view')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';

        const data_loaded_successfully = load_data_and_ensure_results_structure();
        if (!data_loaded_successfully) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_loading_sample_or_requirement_data'), "error");
            const back_button = Helpers_create_element('button', {class_name: ['button', 'button-default'], text_content: t('back_to_requirement_list')});
            back_button.addEventListener('click', () => router_ref('requirement_list', { sampleId: params_ref ? params_ref.sampleId : '' }));
            app_container_ref.appendChild(back_button);
            return;
        }
        
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        }

        const req = current_requirement_object;
        if (!req) {
            console.error("[ReqAudit] current_requirement_object is null/undefined after successful data load. Aborting further render.");
            plate_element.innerHTML = `<p>${t('error_loading_sample_or_requirement_data')}</p>`;
            return;
        }
        
        const header_div = Helpers_create_element('div', { class_name: 'requirement-audit-header' });
        header_div.appendChild(Helpers_create_element('h1', { text_content: req.title }));
        if (req.standardReference && req.standardReference.text) {
            const ref_p = Helpers_create_element('p', { class_name: 'standard-reference' });
            if (req.standardReference.url) {
                const link = Helpers_create_element('a', {
                    text_content: req.standardReference.text,
                    attributes: { href: req.standardReference.url, target: '_blank', rel: 'noopener noreferrer' }
                });
                ref_p.appendChild(link);
            } else {
                ref_p.textContent = req.standardReference.text;
            }
            header_div.appendChild(ref_p);
        }
        requirement_status_display_element = Helpers_create_element('p', { class_name: 'overall-requirement-status-display'});
        const overall_status_key = current_requirement_result?.status || 'not_audited';
        const overall_status_text = t(`audit_status_${overall_status_key}`, {defaultValue: overall_status_key});
        requirement_status_display_element.innerHTML = `<strong>${t('overall_requirement_status')}:</strong> <span class="status-text status-${overall_status_key}">${overall_status_text}</span>`;
        header_div.appendChild(requirement_status_display_element);
        plate_element.appendChild(header_div);

        render_audit_section_internal('requirement_expected_observation', req.expectedObservation, plate_element);
        render_audit_section_internal('requirement_instructions', req.instructions, plate_element);
        render_audit_section_internal('requirement_tips', req.tips, plate_element);
        render_audit_section_internal('requirement_exceptions', req.exceptions, plate_element);
        render_audit_section_internal('requirement_common_errors', req.commonErrors, plate_element);

        if (req.metadata) {
            const meta_section = Helpers_create_element('div', { class_name: 'audit-section' });
            meta_section.appendChild(Helpers_create_element('h2', { text_content: t('requirement_metadata_title') }));
            const grid = Helpers_create_element('div', { class_name: 'requirement-metadata-grid' });
            if(req.metadata.mainCategory && req.metadata.mainCategory.text) grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${t('main_category')}:</strong> ${Helpers_escape_html(req.metadata.mainCategory.text)}`}));
            if(req.metadata.subCategory && req.metadata.subCategory.text) grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${t('sub_category')}:</strong> ${Helpers_escape_html(req.metadata.subCategory.text)}`}));
            if (req.metadata.impact) {
                 const impact_text = req.metadata.impact.isCritical ? t('critical') : t('impact_normal');
                 grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${t('impact')}:</strong> ${impact_text}`}));
            }
            meta_section.appendChild(grid);
            plate_element.appendChild(meta_section);
        }

        plate_element.appendChild(render_navigation_buttons('top'));

        checks_ui_container_element = Helpers_create_element('div', { class_name: 'checks-container audit-section' });
        checks_ui_container_element.appendChild(Helpers_create_element('h2', { text_content: t('checks_title') }));
        render_checks_section(checks_ui_container_element); 
        plate_element.appendChild(checks_ui_container_element);

        const input_fields_container = Helpers_create_element('div', { class_name: 'input-fields-container audit-section' });
        input_fields_container.appendChild(Helpers_create_element('h2', { text_content: t('observations_and_comments_title')}));
        let fg, label;
        const current_audit_state_for_render = State_getCurrentAudit(); 
        const is_audit_locked_for_render = current_audit_state_for_render && current_audit_state_for_render.auditStatus === 'locked';

        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'actualObservation'}, text_content: t('actual_observation')});
        actual_observation_input = Helpers_create_element('textarea', {id: 'actualObservation', class_name: 'form-control', attributes: {rows: '4'}});
        actual_observation_input.value = current_requirement_result.actualObservation || '';
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
        comment_to_auditor_input.value = current_requirement_result.commentToAuditor || '';
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
        comment_to_actor_input.value = current_requirement_result.commentToActor || '';
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

        current_sample_object = null; current_requirement_object = null; current_requirement_result = null;
        actual_observation_input = null; comment_to_auditor_input = null; comment_to_actor_input = null;
        app_container_ref = null; router_ref = null; params_ref = null;
        global_message_element_ref = null; checks_ui_container_element = null; requirement_status_display_element = null;
        ordered_requirement_keys_for_sample = [];
        prev_req_button_top = null; next_req_button_top = null; next_unhandled_button_top = null;
        prev_req_button_bottom = null; next_req_button_bottom = null; next_unhandled_button_bottom = null;
    }


    return {
        init,
        render,
        destroy
    };
})();