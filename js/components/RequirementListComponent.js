// file: js/components/RequirementListComponent.js
export const RequirementListComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref; // För sampleId

    // Globala referenser
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_load_css, Helpers_add_protocol_if_missing;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_get_relevant_requirements_for_sample, AuditLogic_calculate_requirement_status;
    // let RequirementCardComponent_create; // Kommenterar ut då vi inte använder den aktivt i denna vy längre

    let global_message_element_ref;
    let current_sample_object = null;
    let relevant_requirements = []; // Håller de faktiska kravobjekten
    let requirements_by_category = {};

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
                return str + " (ReqList t not found)";
            };
    }

    function assign_globals() {
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

        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
            if (!State_getCurrentAudit || !State_setCurrentAudit) {
                 console.error("ReqList: One or more State functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqList: State module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
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

        // RequirementCardComponent är inte aktivt använd i denna komponent just nu för att rendera listan.
        // if (window.RequirementCardComponent && typeof window.RequirementCardComponent.create === 'function') {
        //     RequirementCardComponent_create = window.RequirementCardComponent.create;
        // }
        return all_assigned;
    }

    function load_data() {
        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent || !params_ref || !params_ref.sampleId) {
            current_sample_object = null;
            relevant_requirements = [];
            console.error("ReqList: Current audit, ruleFileContent, or sampleId missing in load_data.");
            return false;
        }

        current_sample_object = current_audit.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object) {
            console.error(`ReqList: Sample with ID ${params_ref.sampleId} not found.`);
            relevant_requirements = [];
            return false;
        }

        if (AuditLogic_get_relevant_requirements_for_sample) {
            relevant_requirements = AuditLogic_get_relevant_requirements_for_sample(current_audit.ruleFileContent, current_sample_object);
        } else {
            relevant_requirements = [];
            console.error("ReqList: AuditLogic_get_relevant_requirements_for_sample is not available.");
        }
        prepare_requirement_data();
        return true;
    }

    function prepare_requirement_data() {
        const t = get_t_internally();
        requirements_by_category = {};
        if (!relevant_requirements || relevant_requirements.length === 0) return;

        relevant_requirements.forEach(req => {
            const main_cat_key_actual = req.metadata?.mainCategory?.id || 'uncategorized';
            const main_cat_text_for_grouping = req.metadata?.mainCategory?.text || t('uncategorized', {defaultValue: 'Uncategorized'});
            const main_cat_display_key = main_cat_text_for_grouping;

            if (!requirements_by_category[main_cat_display_key]) {
                requirements_by_category[main_cat_display_key] = {
                    id: main_cat_key_actual,
                    text: main_cat_text_for_grouping,
                    subCategories: {}
                };
            }

            const sub_cat_key_actual = req.metadata?.subCategory?.id || 'default_sub';
            const sub_cat_text_for_grouping = req.metadata?.subCategory?.text || t('other_requirements', {defaultValue: 'Other Requirements'});
            const sub_cat_display_key = sub_cat_text_for_grouping;

            if (!requirements_by_category[main_cat_display_key].subCategories[sub_cat_display_key]) {
                requirements_by_category[main_cat_display_key].subCategories[sub_cat_display_key] = {
                    id: sub_cat_key_actual,
                    text: sub_cat_text_for_grouping,
                    requirements: []
                };
            }
            requirements_by_category[main_cat_display_key].subCategories[sub_cat_display_key].requirements.push(req);
        });

        for (const main_cat_key in requirements_by_category) {
            for (const sub_cat_key in requirements_by_category[main_cat_key].subCategories) {
                requirements_by_category[main_cat_key].subCategories[sub_cat_key].requirements.sort((a, b) => {
                    const title_a = a.title || '';
                    const title_b = b.title || '';
                    return title_a.localeCompare(title_b);
                });
            }
        }
    }

    function create_navigation_bar(is_bottom = false) {
        const t = get_t_internally();
        if (!Helpers_create_element || !Helpers_get_icon_svg || !t) return null;
        const nav_bar = Helpers_create_element('div', { class_name: 'requirements-navigation-bar' });
        if (is_bottom) nav_bar.classList.add('bottom');
        const current_audit = State_getCurrentAudit();
        let back_button_text_key = 'back_to_sample_management';
        let target_view = 'sample_management';
        if (current_audit && current_audit.auditStatus !== 'not_started') {
            back_button_text_key = 'back_to_audit_overview';
            target_view = 'audit_overview';
        }
        const back_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: (Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) || '') + `<span>${t(back_button_text_key)}</span>`
        });
        back_button.addEventListener('click', () => router_ref(target_view));
        nav_bar.appendChild(back_button);
        return nav_bar;
    }

    async function init(_app_container, _router, _params) {
        if (!assign_globals()) {
            console.error("RequirementListComponent: Failed to assign global dependencies in init.");
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
                if (!link_tag) await Helpers_load_css(CSS_PATH);
            }
            catch (error) { console.warn("Failed to load CSS for RequirementListComponent:", error); }
        }
    }

    function render() {
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t || !State_getCurrentAudit || !AuditLogic_calculate_requirement_status) {
            console.error("RequirementListComponent: Core dependencies missing for render.");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_list_view')}</p>`;
            return;
        }
        if (!load_data()) {
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList'})}</p>`;
            const back_button = create_navigation_bar();
            if (back_button) app_container_ref.appendChild(back_button);
            return;
        }

        app_container_ref.innerHTML = '';
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
        
        // "Typ av sida"
        const sample_type_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-page-type' });
        sample_type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(current_sample_object.pageType)}`;
        header_div.appendChild(sample_type_p);

        // "Granskade krav"
        let audited_requirements_count = 0;
        const total_relevant_requirements = relevant_requirements.length; // Använd den redan filtrerade listan
        relevant_requirements.forEach(req_obj => {
            const result = current_sample_object.requirementResults ? current_sample_object.requirementResults[req_obj.id] : null;
            if (result && (result.status === 'passed' || result.status === 'failed')) {
                audited_requirements_count++;
            }
        });
        const sample_audit_status_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-audit-progress' });
        sample_audit_status_p.innerHTML = `<strong>${t('requirements_audited_for_sample', {defaultValue: 'Reviewed requirements'})}:</strong> ${audited_requirements_count}/${total_relevant_requirements}`;
        header_div.appendChild(sample_audit_status_p);

        // Lägg till ProgressBarComponent här
        if (window.ProgressBarComponent && typeof window.ProgressBarComponent.create === 'function') {
            const progress_bar = window.ProgressBarComponent.create(audited_requirements_count, total_relevant_requirements, {
                // label: t('overall_sample_progress_label') // Valfri, mer specifik etikett
            });
            header_div.appendChild(progress_bar);
        }
        
        plate_element.appendChild(header_div);

        const content_div = Helpers_create_element('div', { class_name: 'requirements-list-content' });
        if (relevant_requirements.length === 0) {
            content_div.appendChild(Helpers_create_element('p', { text_content: t('no_relevant_requirements_for_sample') }));
        } else {
            const sorted_main_category_keys = Object.keys(requirements_by_category).sort((a, b) => a.localeCompare(b));
            sorted_main_category_keys.forEach(main_cat_key => {
                const main_cat = requirements_by_category[main_cat_key];
                const main_cat_group = Helpers_create_element('div', {class_name: 'category-group'});
                main_cat_group.appendChild(Helpers_create_element('h2', {class_name: 'main-category-title', text_content: main_cat.text}));
                const sorted_sub_category_keys = Object.keys(main_cat.subCategories).sort((a, b) => a.localeCompare(b));
                sorted_sub_category_keys.forEach(sub_cat_key => {
                    const sub_cat = main_cat.subCategories[sub_cat_key];
                    main_cat_group.appendChild(Helpers_create_element('h3', {class_name: 'sub-category-title', text_content: sub_cat.text}));
                    const req_ul = Helpers_create_element('ul', {class_name: 'requirement-items-ul'});
                    sub_cat.requirements.forEach(req => { // Dessa är redan sorterade på titel inuti prepare_requirement_data
                        const req_result_object = current_sample_object.requirementResults ? current_sample_object.requirementResults[req.id] : null;
                        const status = AuditLogic_calculate_requirement_status(req, req_result_object);
                        
                        const li = Helpers_create_element('li', {class_name: 'requirement-item compact-twoline'});
                        const title_row_div = Helpers_create_element('div', { class_name: 'requirement-title-row' });
                        const title_h_container = Helpers_create_element('h4', {class_name: 'requirement-title-container'});
                        const title_button = Helpers_create_element('button', {
                            class_name: 'list-title-button',
                            text_content: req.title
                        });
                        title_button.addEventListener('click', () => {
                            router_ref('requirement_audit', { sampleId: current_sample_object.id, requirementId: req.key });
                        });
                        title_h_container.appendChild(title_button);
                        title_row_div.appendChild(title_h_container);
                        li.appendChild(title_row_div);

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
                        if (req_result_object && req_result_object.checkResults) {
                            audited_checks_count = Object.values(req_result_object.checkResults).filter(
                                check_res => check_res.status === 'passed' || check_res.status === 'failed'
                            ).length;
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
                content_div.appendChild(main_cat_group);
            });
        }
        plate_element.appendChild(content_div);
        const bottom_nav_bar = create_navigation_bar(true);
        if (bottom_nav_bar) plate_element.appendChild(bottom_nav_bar);
    }

    function destroy() {
        app_container_ref = null; router_ref = null; params_ref = null;
        global_message_element_ref = null; current_sample_object = null;
        relevant_requirements = []; requirements_by_category = {};
    }

    return { init, render, destroy };
})();