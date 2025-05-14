export const RequirementListComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_component.css'; // Antagen CSS-sökväg
    let app_container_ref;
    let router_ref;
    let params_ref; // För sampleId

    // Globala referenser
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_get_relevant_requirements_for_sample, AuditLogic_calculate_requirement_status;
    let RequirementCardComponent_create; // Antag att RequirementCardComponent är tillgänglig globalt eller importerad

    let global_message_element_ref;
    let current_sample_object = null;
    let relevant_requirements = [];
    let requirements_by_category = {};

    // Helper function to safely get the translation function
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
            // ... (resten av Helpers funktioner)
        } else { console.error("ReqList: Helpers module is missing!"); all_assigned = false; }

        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
        } else { console.error("ReqList: State module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
        } else { console.error("ReqList: NotificationComponent module is missing!"); all_assigned = false; }

        if (window.AuditLogic) {
            AuditLogic_get_relevant_requirements_for_sample = window.AuditLogic.get_relevant_requirements_for_sample;
            AuditLogic_calculate_requirement_status = window.AuditLogic.calculate_requirement_status;
        } else { console.error("ReqList: AuditLogic module is missing!"); all_assigned = false; }

        if (window.RequirementCardComponent && typeof window.RequirementCardComponent.create === 'function') {
            RequirementCardComponent_create = window.RequirementCardComponent.create;
        } else { console.warn("ReqList: RequirementCardComponent.create is not available. Cards will not render."); }


        return all_assigned;
    }

    function load_data() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit();
        if (!current_audit || !params_ref || !params_ref.sampleId) {
            current_sample_object = null;
            relevant_requirements = [];
            console.error("ReqList: Current audit or sampleId missing in load_data.");
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
            const main_cat_key = req.metadata?.mainCategory?.id || 'uncategorized';
            const main_cat_text = req.metadata?.mainCategory?.text || t('uncategorized', {defaultValue: 'Uncategorized'});

            if (!requirements_by_category[main_cat_key]) {
                requirements_by_category[main_cat_key] = {
                    text: main_cat_text,
                    subCategories: {}
                };
            }

            const sub_cat_key = req.metadata?.subCategory?.id || 'default_sub';
            const sub_cat_text = req.metadata?.subCategory?.text || t('other_requirements', {defaultValue: 'Other Requirements'});


            if (!requirements_by_category[main_cat_key].subCategories[sub_cat_key]) {
                requirements_by_category[main_cat_key].subCategories[sub_cat_key] = {
                    text: sub_cat_text,
                    requirements: []
                };
            }
            requirements_by_category[main_cat_key].subCategories[sub_cat_key].requirements.push(req);
        });
    }


    function create_navigation_bar(is_bottom = false) {
        const t = get_t_internally();
        if (!Helpers_create_element || !Helpers_get_icon_svg || !t) return null;
        const nav_bar = Helpers_create_element('div', { class_name: 'requirements-navigation-bar' });
        if (is_bottom) nav_bar.classList.add('bottom');

        const current_audit = State_getCurrentAudit();
        const back_button_text_key = (current_audit && current_audit.auditStatus === 'in_progress') ?
                                    'back_to_audit_overview' :
                                    'back_to_sample_management';
        const target_view = (current_audit && current_audit.auditStatus === 'in_progress') ?
                           'audit_overview' :
                           'sample_management';

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
            try { await Helpers_load_css(CSS_PATH); }
            catch (error) { console.warn("Failed to load CSS for RequirementListComponent:", error); }
        }
    }

    function render() {
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t || !State_getCurrentAudit || !AuditLogic_calculate_requirement_status) {
            console.error("RequirementListComponent: Core dependencies missing for render.");
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_list_view')}</p>`; // ANVÄNDER i18n
            return;
        }

        if (!load_data()) { // Ladda/uppdatera data först
            if (app_container_ref) app_container_ref.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList'})}</p>`; // Generisk felnyckel
            // Eventuellt, visa en "gå tillbaka"-knapp
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
        
        // Top navigation bar
        const top_nav_bar = create_navigation_bar();
        if (top_nav_bar) plate_element.appendChild(top_nav_bar);


        // Header
        const header_div = Helpers_create_element('div', { class_name: 'requirement-list-header' });
        header_div.appendChild(Helpers_create_element('h1', { text_content: current_sample_object.description || t('undefined_description', {defaultValue: "Undefined Sample"}) }));
        const sample_info_p = Helpers_create_element('p', { class_name: 'sample-info-display' });
        sample_info_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(current_sample_object.pageType)}`;
        header_div.appendChild(sample_info_p);
        plate_element.appendChild(header_div);


        // Requirements content
        const content_div = Helpers_create_element('div', { class_name: 'requirements-list-content' });
        if (relevant_requirements.length === 0) {
            content_div.appendChild(Helpers_create_element('p', { text_content: t('no_relevant_requirements_for_sample') }));
        } else {
            Object.values(requirements_by_category).forEach(main_cat => {
                const main_cat_group = Helpers_create_element('div', {class_name: 'category-group'});
                main_cat_group.appendChild(Helpers_create_element('h2', {class_name: 'main-category-title', text_content: main_cat.text}));

                Object.values(main_cat.subCategories).forEach(sub_cat => {
                    main_cat_group.appendChild(Helpers_create_element('h3', {class_name: 'sub-category-title', text_content: sub_cat.text}));
                    const req_ul = Helpers_create_element('ul', {class_name: 'requirement-items-ul'});
                    sub_cat.requirements.forEach(req => {
                        const req_result = current_sample_object.requirementResults ? current_sample_object.requirementResults[req.id] : null;
                        const status = req_result ? AuditLogic_calculate_requirement_status(req, req_result) : 'not_audited';

                        if (RequirementCardComponent_create) {
                            const card_element = RequirementCardComponent_create(req, current_sample_object.id, status, router_ref);
                            req_ul.appendChild(card_element);
                        } else { // Fallback om kortkomponenten inte laddats
                            const li = Helpers_create_element('li', {class_name: 'requirement-item'});
                            li.appendChild(Helpers_create_element('h4', {class_name: 'requirement-title', text_content: req.title}));
                            if (req.standardReference && req.standardReference.text) {
                                const ref_p = Helpers_create_element('p', {class_name: 'requirement-reference'});
                                if (req.standardReference.url) {
                                    ref_p.appendChild(Helpers_create_element('a', {href: req.standardReference.url, text_content: req.standardReference.text, attributes: {target: '_blank'}}));
                                } else {
                                    ref_p.textContent = req.standardReference.text;
                                }
                                li.appendChild(ref_p);
                            }
                            li.appendChild(Helpers_create_element('p', {text_content: `${t('status')}: ${t('audit_status_' + status)}`}));
                            li.addEventListener('click', () => router_ref('requirement_audit', { sampleId: current_sample_object.id, requirementId: req.id }));
                            req_ul.appendChild(li);
                        }
                    });
                    main_cat_group.appendChild(req_ul);
                });
                content_div.appendChild(main_cat_group);
            });
        }
        plate_element.appendChild(content_div);
        
        // Bottom navigation bar
        const bottom_nav_bar = create_navigation_bar(true);
        if (bottom_nav_bar) plate_element.appendChild(bottom_nav_bar);

    }

    function destroy() {
        app_container_ref = null;
        router_ref = null;
        params_ref = null;
        global_message_element_ref = null;
        current_sample_object = null;
        relevant_requirements = [];
        requirements_by_category = {};
    }

    return { init, render, destroy };
})();