// file: js/components/RequirementListComponent.js

const RequirementListComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref; 

    let local_getState;
    let local_dispatch; 
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_load_css, Helpers_add_protocol_if_missing;
    let NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_get_relevant_requirements_for_sample, AuditLogic_calculate_requirement_status;

    let global_message_element_ref;
    let content_div_for_delegation = null;


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
                return str + " (ReqList t not found)";
            };
    }

    function assign_globals_once() { /* ... som tidigare ... */ 
        if (Translation_t && Helpers_create_element && AuditLogic_get_relevant_requirements_for_sample) return true;

        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("ReqList: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_load_css = window.Helpers.load_css;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_escape_html || !Helpers_load_css || !Helpers_add_protocol_if_missing) {
                 console.error("ReqList: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqList: Helpers module is missing!"); all_assigned = false; }


        if (window.NotificationComponent) {
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
                 console.error("ReqList: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqList: NotificationComponent module is missing!"); all_assigned = false; }

        if (window.AuditLogic) {
            AuditLogic_get_relevant_requirements_for_sample = window.AuditLogic.get_relevant_requirements_for_sample;
            AuditLogic_calculate_requirement_status = window.AuditLogic.calculate_requirement_status;
            if (!AuditLogic_get_relevant_requirements_for_sample || !AuditLogic_calculate_requirement_status) {
                 console.error("ReqList: One or more AuditLogic functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqList: AuditLogic module is missing!"); all_assigned = false; }

        return all_assigned;
    }
    
    function handle_requirement_list_click(event) { /* ... som tidigare ... */ 
        const target_button = event.target.closest('button.list-title-button[data-requirement-id]');
        
        if (target_button && router_ref && params_ref && params_ref.sampleId) {
            const requirement_id = target_button.dataset.requirementId;
            console.log(`[RequirementListComponent] Navigating to requirement_audit. Sample ID: ${params_ref.sampleId}, Requirement ID from button: "${requirement_id}"`);
            router_ref('requirement_audit', { sampleId: params_ref.sampleId, requirementId: requirement_id });
        }
    }

    function create_navigation_bar(is_bottom = false) { /* ... som tidigare ... */ 
        const t = get_t_internally();
        if (!Helpers_create_element || !Helpers_get_icon_svg || !t || !local_getState) return null;
        
        const nav_bar = Helpers_create_element('div', { class_name: 'requirements-navigation-bar' });
        if (is_bottom) nav_bar.classList.add('bottom');
        
        const current_global_state = local_getState();
        let back_button_text_key = 'back_to_sample_management'; 
        let target_view = 'sample_management'; 

        if (current_global_state && current_global_state.auditStatus !== 'not_started') {
            back_button_text_key = 'back_to_audit_overview';
            target_view = 'audit_overview';
        } else if (current_global_state && current_global_state.auditStatus === 'not_started') {
            back_button_text_key = 'back_to_sample_management';
            target_view = 'sample_management';
        }
        
        const back_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t(back_button_text_key)}</span>` + (Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) || '')
        });
        back_button.addEventListener('click', () => router_ref(target_view));
        nav_bar.appendChild(back_button);
        return nav_bar;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) { /* ... som tidigare ... */ 
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;

        local_getState = _getState;
        local_dispatch = _dispatch; 
        local_StoreActionTypes = _StoreActionTypes;

        if (!local_StoreActionTypes) {
            console.warn("[RequirementListComponent] StoreActionTypes was not passed to init or is undefined.");
            local_StoreActionTypes = {}; 
        }

        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await Helpers_load_css(CSS_PATH);
            }
            catch (error) { console.warn("Failed to load CSS for RequirementListComponent:", error); }
        }
    }

    function render() {
        assign_globals_once();
        const t = get_t_internally();

        const current_global_state = local_getState();
        // Logga hela statet FÖRSIKTIGT, det kan vara stort.
        // console.log("[ReqList RENDER START] Current global state snapshot for ReqList:", JSON.parse(JSON.stringify(current_global_state)));

        if (!app_container_ref || !Helpers_create_element || !t || !local_getState || !AuditLogic_calculate_requirement_status || !AuditLogic_get_relevant_requirements_for_sample) {
            console.error("RequirementListComponent: Core dependencies missing for render.");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_list_view')}</p>`;
            return;
        }

        if (!current_global_state || !current_global_state.ruleFileContent || !params_ref || !params_ref.sampleId) {
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList'})}</p>`;
            const back_button_nav = create_navigation_bar();
            if (back_button_nav && app_container_ref) app_container_ref.appendChild(back_button_nav);
            return;
        }

        const current_sample_object = current_global_state.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object) {
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList_SampleNotFound'})}</p>`;
            const back_button_nav_sample = create_navigation_bar();
            if (back_button_nav_sample && app_container_ref) app_container_ref.appendChild(back_button_nav_sample);
            return;
        }
        // Logga specifikt sample object
        // console.log("[ReqList RENDER] Current sample object for list:", JSON.parse(JSON.stringify(current_sample_object)));


        const relevant_requirements_list = AuditLogic_get_relevant_requirements_for_sample(current_global_state.ruleFileContent, current_sample_object);
        
        const requirements_by_category_map = {};
        // ... ( logiken för att bygga requirements_by_category_map som tidigare) ...
        if (relevant_requirements_list && relevant_requirements_list.length > 0) {
            relevant_requirements_list.forEach(req => {
                const main_cat_key_actual = req.metadata?.mainCategory?.id || 'uncategorized';
                const main_cat_text_for_grouping = req.metadata?.mainCategory?.text || t('uncategorized', {defaultValue: 'Uncategorized'});
                const main_cat_display_key = main_cat_text_for_grouping;

                if (!requirements_by_category_map[main_cat_display_key]) {
                    requirements_by_category_map[main_cat_display_key] = {
                        id: main_cat_key_actual,
                        text: main_cat_text_for_grouping,
                        subCategories: {}
                    };
                }

                const sub_cat_key_actual = req.metadata?.subCategory?.id || 'default_sub';
                const sub_cat_text_for_grouping = req.metadata?.subCategory?.text || t('other_requirements', {defaultValue: 'Other Requirements'});
                const sub_cat_display_key = sub_cat_text_for_grouping;

                if (!requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key]) {
                    requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key] = {
                        id: sub_cat_key_actual,
                        text: sub_cat_text_for_grouping,
                        requirements: []
                    };
                }
                requirements_by_category_map[main_cat_display_key].subCategories[sub_cat_display_key].requirements.push(req);
            });

            for (const main_cat_key in requirements_by_category_map) {
                for (const sub_cat_key in requirements_by_category_map[main_cat_key].subCategories) {
                    requirements_by_category_map[main_cat_key].subCategories[sub_cat_key].requirements.sort((a, b) => {
                        const title_a = a.title || '';
                        const title_b = b.title || '';
                        return title_a.localeCompare(title_b, undefined, { numeric: true, sensitivity: 'base' });
                    });
                }
            }
        }

        app_container_ref.innerHTML = '';
        // ... (resten av renderingen av plate, header, etc. som tidigare) ...
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-list-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if (NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        }
        
        const top_nav_bar = create_navigation_bar();
        if (top_nav_bar) plate_element.appendChild(top_nav_bar);

        const header_div = Helpers_create_element('div', { class_name: 'requirement-list-header' });
        header_div.appendChild(Helpers_create_element('h1', { text_content: current_sample_object.description || t('undefined_description', {defaultValue: "Undefined Sample"}) }));
        
        const sample_type_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-page-type' });
        sample_type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(current_sample_object.pageType)}`;
        header_div.appendChild(sample_type_p);

        let audited_requirements_count = 0;
        const total_relevant_requirements = relevant_requirements_list.length;
        relevant_requirements_list.forEach(req_obj_from_list => {
            // Använd det ID som är nyckeln i requirementResults, vilket bör vara req_obj_from_list.id (eller .key om det är så du har det)
            const result_key = req_obj_from_list.key || req_obj_from_list.id; 
            const result = current_sample_object.requirementResults ? current_sample_object.requirementResults[result_key] : null;
            const status = AuditLogic_calculate_requirement_status(req_obj_from_list, result);
            if (status === 'passed' || status === 'failed') {
                audited_requirements_count++;
            }
        });
        const sample_audit_status_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-audit-progress' });
        sample_audit_status_p.innerHTML = `<strong>${t('requirements_audited_for_sample', {defaultValue: 'Reviewed requirements'})}:</strong> ${audited_requirements_count}/${total_relevant_requirements}`;
        header_div.appendChild(sample_audit_status_p);

        if (window.ProgressBarComponent && typeof window.ProgressBarComponent.create === 'function') {
            const progress_bar = window.ProgressBarComponent.create(audited_requirements_count, total_relevant_requirements, {});
            header_div.appendChild(progress_bar);
        }
        
        plate_element.appendChild(header_div);

        if (!content_div_for_delegation) {
            content_div_for_delegation = Helpers_create_element('div', { class_name: 'requirements-list-content' });
            content_div_for_delegation.addEventListener('click', handle_requirement_list_click);
        } else {
            content_div_for_delegation.innerHTML = '';
        }

        if (relevant_requirements_list.length === 0) {
            content_div_for_delegation.appendChild(Helpers_create_element('p', { text_content: t('no_relevant_requirements_for_sample') }));
        } else {
            const sorted_main_category_keys = Object.keys(requirements_by_category_map).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            sorted_main_category_keys.forEach(main_cat_key => {
                const main_cat = requirements_by_category_map[main_cat_key];
                const main_cat_group = Helpers_create_element('div', {class_name: 'category-group'});
                main_cat_group.appendChild(Helpers_create_element('h2', {class_name: 'main-category-title', text_content: main_cat.text}));
                
                const sorted_sub_category_keys = Object.keys(main_cat.subCategories).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
                
                sorted_sub_category_keys.forEach(sub_cat_key => {
                    const sub_cat = main_cat.subCategories[sub_cat_key];
                    main_cat_group.appendChild(Helpers_create_element('h3', {class_name: 'sub-category-title', text_content: sub_cat.text}));
                    const req_ul = Helpers_create_element('ul', {class_name: 'requirement-items-ul'});
                    
                    sub_cat.requirements.forEach(req => {
                        // **ÄNDRING HÄR: Använd req.key (UUID) för att slå upp resultat**
                        const requirement_result_key = req.key; // Detta bör vara UUID:t
                        const req_result_object = current_sample_object.requirementResults ? current_sample_object.requirementResults[requirement_result_key] : null;
                        const status = AuditLogic_calculate_requirement_status(req, req_result_object);
                        
                        // **FÖRENKLAD LOGGNING för att undvika JSON.parse-fel**
                        console.log(`[ReqList RENDER ITEM] Req: "${req.title}", Result Key: "${requirement_result_key}", Has Result: ${!!req_result_object}, Calculated Status: "${status}"`);
                        if(req_result_object) {
                           // console.log("[ReqList RENDER ITEM] Result Object details:", req_result_object); // Logga separat om det behövs
                        }


                        const li = Helpers_create_element('li', {class_name: 'requirement-item compact-twoline'});
                        const title_row_div = Helpers_create_element('div', { class_name: 'requirement-title-row' });
                        const title_h_container = Helpers_create_element('h4', {class_name: 'requirement-title-container'});
                        
                        const requirementIdentifierForButton = req.key; // Använd konsekvent req.key för navigation
                        if (!requirementIdentifierForButton) {
                            console.warn(`[RequirementListComponent] Button: Requirement object is MISSING 'key'. Title: "${req.title}", ID: "${req.id}", Object:`, req);
                        }

                        const title_button = Helpers_create_element('button', {
                            class_name: 'list-title-button',
                            text_content: req.title,
                            attributes: {
                                'data-requirement-id': requirementIdentifierForButton 
                            }
                        });
                        title_h_container.appendChild(title_button);
                        title_row_div.appendChild(title_h_container);
                        li.appendChild(title_row_div);

                        // ... (resten av renderingslogiken för ett krav, som tidigare) ...
                        const details_row_div = Helpers_create_element('div', { class_name: 'requirement-details-row' });
                        const status_indicator_wrapper = Helpers_create_element('span', { class_name: 'requirement-status-indicator-wrapper' });
                        const status_indicator_span = Helpers_create_element('span', {
                           class_name: ['status-indicator', `status-${status}`],
                           attributes: { 'aria-hidden': 'true' }
                        });
                        status_indicator_wrapper.appendChild(status_indicator_span);
                        status_indicator_wrapper.appendChild(document.createTextNode(` ${t('audit_status_' + status, {defaultValue: status})}`));
                        details_row_div.appendChild(status_indicator_wrapper);

                        const total_checks_count = req.checks ? req.checks.length : 0;
                        let audited_checks_count = 0;
                        if (req_result_object && req_result_object.checkResults && req.checks) {
                             Object.keys(req_result_object.checkResults).forEach(check_id_from_data => {
                                const check_res_from_data = req_result_object.checkResults[check_id_from_data];
                                const check_definition_for_status = req.checks.find(c => c.id === check_id_from_data);
                                if (check_definition_for_status && window.AuditLogic && typeof window.AuditLogic.calculate_check_status === 'function') {
                                    const single_check_status = window.AuditLogic.calculate_check_status(
                                        check_definition_for_status,
                                        check_res_from_data.passCriteria || {},
                                        check_res_from_data.overallStatus || 'not_audited'
                                    );
                                    if (single_check_status === 'passed' || single_check_status === 'failed') {
                                        audited_checks_count++;
                                    }
                                }
                            });
                        }
                        const checks_info_span = Helpers_create_element('span', {
                            class_name: 'requirement-checks-info',
                            text_content: `(${audited_checks_count}/${total_checks_count} ${t('checks_short', {defaultValue: 'checks'})})`
                        });
                        details_row_div.appendChild(checks_info_span);

                        if (req.standardReference && req.standardReference.text) {
                            let reference_element;
                            if (req.standardReference.url) {
                                let url_to_use = req.standardReference.url;
                                if (Helpers_add_protocol_if_missing) {
                                    url_to_use = Helpers_add_protocol_if_missing(url_to_use);
                                }
                                reference_element = Helpers_create_element('a', {
                                    class_name: 'list-reference-link',
                                    text_content: req.standardReference.text,
                                    attributes: {
                                        href: url_to_use,
                                        target: '_blank',
                                        rel: 'noopener noreferrer'
                                    }
                                });
                            } else {
                                reference_element = Helpers_create_element('span', {
                                    class_name: 'list-reference-text',
                                    text_content: req.standardReference.text
                                });
                            }
                            details_row_div.appendChild(reference_element);
                        }
                        li.appendChild(details_row_div);
                        req_ul.appendChild(li);
                    });
                    main_cat_group.appendChild(req_ul);
                });
                content_div_for_delegation.appendChild(main_cat_group);
            });
        }
        plate_element.appendChild(content_div_for_delegation);
        
        const bottom_nav_bar = create_navigation_bar(true);
        if (bottom_nav_bar) plate_element.appendChild(bottom_nav_bar);
    }

    function destroy() { /* ... som tidigare ... */ 
        if (content_div_for_delegation) {
            content_div_for_delegation.removeEventListener('click', handle_requirement_list_click);
            content_div_for_delegation = null;
        }
        app_container_ref = null; router_ref = null; params_ref = null;
        global_message_element_ref = null; 
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
    }

    return { init, render, destroy };
})();

export const RequirementListComponent = RequirementListComponent_internal;