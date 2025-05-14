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
    let AuditLogic_calculate_check_status, AuditLogic_calculate_requirement_status;
    // --- Slut på globala referenser ---

    let global_message_element_ref;
    let current_sample_object = null;
    let current_requirement_object = null;
    let current_requirement_result = null;

    let actual_observation_input, comment_to_auditor_input, comment_to_actor_input;
    let checks_ui_container_element = null;
    let requirement_status_display_element = null;


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
             if (!AuditLogic_calculate_check_status || !AuditLogic_calculate_requirement_status) {
                console.error("ReqAudit: One or more AuditLogic functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqAudit: AuditLogic module is missing!"); all_assigned = false; }

        return all_assigned;
    }

    async function init(_app_container, _router, _params) {
        console.log("[ReqAudit] Init started");
        if (!assign_globals()) {
            console.error("RequirementAuditComponent: Failed to assign global dependencies in init.");
        }
        app_container_ref = _app_container;
        router_ref = _router;
        params_ref = _params;

        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        console.log("[ReqAudit] Globals assigned, params set:", JSON.parse(JSON.stringify(_params || {})));

        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                    console.log("[ReqAudit] CSS loaded:", CSS_PATH);
                } else {
                    console.log("[ReqAudit] CSS already loaded:", CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for RequirementAuditComponent:", error);
            }
        }
        console.log("[ReqAudit] Init finished");
    }

    function load_data_and_ensure_results_structure() {
        console.log("[ReqAudit] load_data_and_ensure_results_structure START");
        const current_audit = State_getCurrentAudit();

        if (!current_audit) {
            console.error("[ReqAudit] load_data: current_audit is null or undefined.");
            current_sample_object = null; current_requirement_object = null; current_requirement_result = null;
            return false;
        }
        if (!current_audit.ruleFileContent) {
            console.error("[ReqAudit] load_data: current_audit.ruleFileContent is null or undefined.");
            current_sample_object = null; current_requirement_object = null; current_requirement_result = null;
            return false;
        }
        if (!params_ref || !params_ref.sampleId || !params_ref.requirementId) {
            console.error("[ReqAudit] load_data: Missing sampleId or requirementId in params_ref.", params_ref);
            current_sample_object = null; current_requirement_object = null; current_requirement_result = null;
            return false;
        }

        current_sample_object = current_audit.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object) {
            console.error(`[ReqAudit] load_data: Sample with ID ${params_ref.sampleId} not found.`);
            current_requirement_object = null; current_requirement_result = null;
            return false;
        }

        if (!current_audit.ruleFileContent.requirements) {
            console.error("[ReqAudit] load_data: ruleFileContent.requirements is missing!");
            current_requirement_object = null; current_requirement_result = null;
            return false;
        }
        current_requirement_object = current_audit.ruleFileContent.requirements[params_ref.requirementId];
        if (!current_requirement_object) {
            console.error(`[ReqAudit] load_data: Requirement with ID ${params_ref.requirementId} not found in ruleFile.`);
            current_requirement_result = null;
            return false;
        }
        console.log("[ReqAudit] load_data: current_requirement_object loaded:", current_requirement_object.id);


        if (!current_sample_object.requirementResults) current_sample_object.requirementResults = {};
        if (!current_sample_object.requirementResults[current_requirement_object.id]) {
            console.log(`[ReqAudit] Initializing requirementResults for req ID: ${current_requirement_object.id}`);
            current_sample_object.requirementResults[current_requirement_object.id] = {
                status: 'not_audited', actualObservation: '', commentToAuditor: '', commentToActor: '',
                lastStatusUpdate: null, checkResults: {}
            };
        }
        current_requirement_result = current_sample_object.requirementResults[current_requirement_object.id];
        console.log("[ReqAudit] load_data: current_requirement_result obtained/initialized.");


        (current_requirement_object.checks || []).forEach(check => {
            if (!current_requirement_result.checkResults[check.id]) {
                console.log(`[ReqAudit] Initializing checkResults for check ID: ${check.id}`);
                current_requirement_result.checkResults[check.id] = { status: 'not_audited', passCriteria: {} };
            }
            (check.passCriteria || []).forEach(pc => {
                if (current_requirement_result.checkResults[check.id].passCriteria[pc.id] === undefined) {
                    console.log(`[ReqAudit] Initializing passCriteria status for pc ID: ${pc.id} under check ID: ${check.id}`);
                    current_requirement_result.checkResults[check.id].passCriteria[pc.id] = 'not_audited';
                }
            });
        });
        State_setCurrentAudit(current_audit); // Save potentially initialized structures
        console.log("[ReqAudit] load_data_and_ensure_results_structure END - Success");
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
            // console.log("Autosaved text data and updated timestamp.");
        }
    }

    function handle_pass_criterion_status_change(check_id, pc_id, new_status) {
        const t = get_t_internally();
        if (!current_requirement_result ||
            !current_requirement_result.checkResults ||
            !current_requirement_result.checkResults[check_id] ||
            !current_requirement_result.checkResults[check_id].passCriteria) {
            console.error("[ReqAudit] handle_pass_criterion_status_change: Invalid data structure for updating pass criterion status.");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_data_structure_pc'), 'error');
            return;
        }

        if (current_requirement_result.checkResults[check_id].passCriteria[pc_id] === new_status) {
            new_status = 'not_audited';
        }
        current_requirement_result.checkResults[check_id].passCriteria[pc_id] = new_status;

        const check_object_from_rulefile = current_requirement_object.checks.find(c => c.id === check_id);
        if (check_object_from_rulefile && AuditLogic_calculate_check_status) {
            const calculated_check_status = AuditLogic_calculate_check_status(
                check_object_from_rulefile,
                current_requirement_result.checkResults[check_id].passCriteria
            );
            current_requirement_result.checkResults[check_id].status = calculated_check_status;
        } else {
            console.warn("[ReqAudit] Could not find check object or AuditLogic.calculate_check_status to recalculate check status.");
        }

        if (AuditLogic_calculate_requirement_status) {
            const calculated_req_status = AuditLogic_calculate_requirement_status(
                current_requirement_object,
                current_requirement_result
            );
            current_requirement_result.status = calculated_req_status;
        } else {
            console.warn("[ReqAudit] Could not find AuditLogic.calculate_requirement_status to recalculate requirement status.");
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
            check_wrapper.appendChild(Helpers_create_element('h3', { class_name: 'check-condition-title', text_content: check.condition }));

            const check_status_in_result = current_requirement_result.checkResults[check.id]?.status || 'not_audited';
            const check_status_text = t(`audit_status_${check_status_in_result}`, {defaultValue: check_status_in_result});
            check_wrapper.appendChild(Helpers_create_element('p', {
                class_name: 'check-status-display',
                html_content: `<strong>${t('check_status')}:</strong> <span class="status-text status-${check_status_in_result}">${check_status_text}</span>`
            }));

            if (check.passCriteria && check.passCriteria.length > 0) {
                const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });
                check.passCriteria.forEach(pc => {
                    const pc_item_li = Helpers_create_element('li', { class_name: 'pass-criterion-item', attributes: {'data-pc-id': pc.id } });
                    pc_item_li.appendChild(Helpers_create_element('p', { class_name: 'pass-criterion-requirement', text_content: pc.requirement }));

                    const current_pc_status = current_requirement_result.checkResults[check.id]?.passCriteria[pc.id] || 'not_audited';
                    const pc_status_text = t(`audit_status_${current_pc_status}`, {defaultValue: current_pc_status});

                    const status_display_div = Helpers_create_element('div', { class_name: 'pass-criterion-status' });
                    status_display_div.innerHTML = `<strong>${t('status')}:</strong> <span class="status-text status-${current_pc_status}">${pc_status_text}</span>`;
                    pc_item_li.appendChild(status_display_div);

                    if (!is_audit_locked) {
                        const pc_actions_div = Helpers_create_element('div', { class_name: 'pass-criterion-actions' });

                        const passed_button = Helpers_create_element('button', {
                            class_name: ['button', 'button-success', 'button-small', current_pc_status === 'passed' ? 'active' : ''],
                            html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('check_circle_green_yellow', ['currentColor', 'var(--success-color-light)'], 16) : '') + `<span>${t('pass_criterion_approved')}</span>`
                        });
                        passed_button.addEventListener('click', () => handle_pass_criterion_status_change(check.id, pc.id, 'passed'));
                        pc_actions_div.appendChild(passed_button);

                        const failed_button = Helpers_create_element('button', {
                            class_name: ['button', 'button-danger', 'button-small', current_pc_status === 'failed' ? 'active' : ''],
                            html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('cancel_circle_red_pink', ['currentColor', 'var(--danger-color-light)'], 16) : '') + `<span>${t('pass_criterion_failed')}</span>`
                        });
                        failed_button.addEventListener('click', () => handle_pass_criterion_status_change(check.id, pc.id, 'failed'));
                        pc_actions_div.appendChild(failed_button);
                        pc_item_li.appendChild(pc_actions_div);
                    }
                    pc_list.appendChild(pc_item_li);
                });
                check_wrapper.appendChild(pc_list);
            }
            container_element.appendChild(check_wrapper);
        });
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
        // ---- FELSÖKNINGSLOGG FÖR NAVIGERINSKNAPPAR ----
        console.log(`[ReqAudit] render_navigation_buttons (${is_top_or_bottom}): current_audit_state exists:`, !!current_audit_state);
        if (current_audit_state) {
            console.log(`[ReqAudit] render_navigation_buttons (${is_top_or_bottom}): auditStatus = "${current_audit_state.auditStatus}"`);
        }
        // ---- SLUT FELSÖKNINGSLOGG ----

        if (current_audit_state && current_audit_state.auditStatus !== 'locked') {
            console.log(`[ReqAudit] render_navigation_buttons (${is_top_or_bottom}): Rendering navigation buttons (not locked).`);
            const prev_req_btn = Helpers_create_element('button', { class_name: ['button', 'button-secondary'], html_content: (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) : '') + `<span>${t('previous_requirement')}</span>`});
            prev_req_btn.addEventListener('click', () => NotificationComponent_show_global_message(t('todo_previous_requirement'), 'info'));
            nav_group_right.appendChild(prev_req_btn);

            const next_req_btn = Helpers_create_element('button', { class_name: ['button', 'button-secondary'], html_content: `<span>${t('next_requirement')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) : '') });
            next_req_btn.addEventListener('click', () => NotificationComponent_show_global_message(t('todo_next_requirement'), 'info'));
            nav_group_right.appendChild(next_req_btn);

            const next_unhandled_btn = Helpers_create_element('button', { class_name: ['button', 'button-primary'], html_content: `<span>${t('next_unhandled_requirement')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_forward_alt', ['currentColor'], 18) : '') });
            next_unhandled_btn.addEventListener('click', () => NotificationComponent_show_global_message(t('todo_next_unhandled_requirement'), 'info'));
            nav_group_right.appendChild(next_unhandled_btn);
        } else {
            console.log(`[ReqAudit] render_navigation_buttons (${is_top_or_bottom}): NOT rendering navigation buttons (audit locked or state missing).`);
        }

        nav_buttons_div.appendChild(nav_group_left);
        if(nav_group_right.hasChildNodes()) nav_buttons_div.appendChild(nav_group_right);
        return nav_buttons_div;
    }

    function render() {
        console.log("[ReqAudit] render START"); // Loggning: Start av render
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t) {
            console.error("[ReqAudit] Core dependencies for render are missing (app_container_ref, Helpers_create_element, or t).");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_audit_view')}</p>`;
            return;
        }
        app_container_ref.innerHTML = '';
        
        console.log("[ReqAudit] Calling load_data_and_ensure_results_structure...");
        const data_loaded_successfully = load_data_and_ensure_results_structure();
        console.log("[ReqAudit] load_data_and_ensure_results_structure returned:", data_loaded_successfully);

        if (!data_loaded_successfully) {
            console.error("[ReqAudit] Data loading failed. Aborting render.");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_loading_sample_or_requirement_data'), "error");
            const back_button = Helpers_create_element('button', {class_name: ['button', 'button-default'], text_content: t('back_to_requirement_list')});
            back_button.addEventListener('click', () => router_ref('requirement_list', { sampleId: params_ref ? params_ref.sampleId : '' }));
            app_container_ref.appendChild(back_button);
            return;
        }
        console.log("[ReqAudit] Data loaded. Proceeding with plate_element creation.");

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        app_container_ref.appendChild(plate_element);
        console.log("[ReqAudit] Plate element appended.");

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        }
        console.log("[ReqAudit] Global message handled.");

        const req = current_requirement_object;
        if (!req) { // Extra säkerhetskoll
            console.error("[ReqAudit] current_requirement_object is null/undefined after successful data load. Aborting further render.");
            plate_element.innerHTML = `<p>${t('error_loading_sample_or_requirement_data')}</p>`;
            return;
        }
        console.log("[ReqAudit] Rendering header for requirement:", req.id);

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
        // Säkerställ att current_requirement_result och dess status finns
        const overall_status_key = current_requirement_result?.status || 'not_audited';
        const overall_status_text = t(`audit_status_${overall_status_key}`, {defaultValue: overall_status_key});
        requirement_status_display_element.innerHTML = `<strong>${t('overall_requirement_status')}:</strong> <span class="status-text status-${overall_status_key}">${overall_status_text}</span>`;
        header_div.appendChild(requirement_status_display_element);
        plate_element.appendChild(header_div);
        console.log("[ReqAudit] Header div appended.");

        render_audit_section_internal('requirement_expected_observation', req.expectedObservation, plate_element);
        console.log("[ReqAudit] Rendered expected_observation.");
        render_audit_section_internal('requirement_instructions', req.instructions, plate_element);
        console.log("[ReqAudit] Rendered instructions.");
        render_audit_section_internal('requirement_tips', req.tips, plate_element);
        console.log("[ReqAudit] Rendered tips.");
        render_audit_section_internal('requirement_exceptions', req.exceptions, plate_element);
        console.log("[ReqAudit] Rendered exceptions.");
        render_audit_section_internal('requirement_common_errors', req.commonErrors, plate_element);
        console.log("[ReqAudit] Rendered common_errors.");

        if (req.metadata) {
            console.log("[ReqAudit] Rendering metadata section.");
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
            console.log("[ReqAudit] Metadata section rendered.");
        }

        console.log("[ReqAudit] About to call render_navigation_buttons (top)");
        plate_element.appendChild(render_navigation_buttons('top'));
        console.log("[ReqAudit] Called render_navigation_buttons (top)");

        checks_ui_container_element = Helpers_create_element('div', { class_name: 'checks-container audit-section' });
        checks_ui_container_element.appendChild(Helpers_create_element('h2', { text_content: t('checks_title') }));
        console.log("[ReqAudit] Rendering checks section...");
        render_checks_section(checks_ui_container_element);
        plate_element.appendChild(checks_ui_container_element);
        console.log("[ReqAudit] Checks section rendered.");

        console.log("[ReqAudit] Rendering input fields container...");
        const input_fields_container = Helpers_create_element('div', { class_name: 'input-fields-container audit-section' });
        input_fields_container.appendChild(Helpers_create_element('h2', { text_content: t('observations_and_comments_title')}));
        let fg, label;

        const current_audit_state = State_getCurrentAudit();
        const is_audit_locked = current_audit_state && current_audit_state.auditStatus === 'locked';
        console.log("[ReqAudit] is_audit_locked:", is_audit_locked);

        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'actualObservation'}, text_content: t('actual_observation')});
        actual_observation_input = Helpers_create_element('textarea', {id: 'actualObservation', class_name: 'form-control', attributes: {rows: '4'}});
        actual_observation_input.value = current_requirement_result.actualObservation || '';
        if (!is_audit_locked) {
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
        if (!is_audit_locked) {
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
        if (!is_audit_locked) {
            comment_to_actor_input.addEventListener('input', auto_save_text_data);
        } else {
            comment_to_actor_input.setAttribute('readonly', 'true');
            comment_to_actor_input.classList.add('readonly-textarea');
        }
        fg.appendChild(label); fg.appendChild(comment_to_actor_input);
        input_fields_container.appendChild(fg);
        plate_element.appendChild(input_fields_container);
        console.log("[ReqAudit] Input fields container rendered.");

        console.log("[ReqAudit] About to call render_navigation_buttons (bottom)");
        plate_element.appendChild(render_navigation_buttons('bottom'));
        console.log("[ReqAudit] Called render_navigation_buttons (bottom)");
        console.log("[ReqAudit] render END");
    }

    function destroy() {
        console.log("[ReqAudit] destroy called");
        if (actual_observation_input) actual_observation_input.removeEventListener('input', auto_save_text_data);
        if (comment_to_auditor_input) comment_to_auditor_input.removeEventListener('input', auto_save_text_data);
        if (comment_to_actor_input) comment_to_actor_input.removeEventListener('input', auto_save_text_data);

        current_sample_object = null; current_requirement_object = null; current_requirement_result = null;
        actual_observation_input = null; comment_to_auditor_input = null; comment_to_actor_input = null;
        app_container_ref = null; router_ref = null; params_ref = null;
        global_message_element_ref = null; checks_ui_container_element = null; requirement_status_display_element = null;
    }

    return {
        init,
        render,
        destroy
    };
})();