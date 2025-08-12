// js/components/RequirementListComponent.js
import { RequirementListToolbarComponent } from './RequirementListToolbarComponent.js';

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
    let AuditLogic_get_relevant_requirements_for_sample, AuditLogic_calculate_requirement_status, AuditLogic_calculate_check_status;

    let global_message_element_ref;
    let content_div_for_delegation = null;

    let component_state = {
        filters: {
            searchText: '',
            status: { passed: true, failed: true, partially_audited: true, not_audited: true }
        },
        sortBy: 'default'
    };
    
    let toolbar_component_instance = null;
    let is_dom_initialized = false;
    let plate_element_ref = null;

    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;
    }

    function assign_globals_once() {
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
        } else { console.error("ReqList: Helpers module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
        } else { console.error("ReqList: NotificationComponent module is missing!"); all_assigned = false; }

        if (window.AuditLogic) {
            AuditLogic_get_relevant_requirements_for_sample = window.AuditLogic.get_relevant_requirements_for_sample;
            AuditLogic_calculate_requirement_status = window.AuditLogic.calculate_requirement_status;
            AuditLogic_calculate_check_status = window.AuditLogic.calculate_check_status;
            if (!AuditLogic_get_relevant_requirements_for_sample || !AuditLogic_calculate_requirement_status || !AuditLogic_calculate_check_status) {
                 console.error("ReqList: One or more AuditLogic functions are missing!"); all_assigned = false;
            }
        } else { console.error("ReqList: AuditLogic module is missing!"); all_assigned = false; }

        return all_assigned;
    }

    function handle_requirement_list_click(event) {
        const target_button = event.target.closest('button.list-title-button[data-requirement-id]');
        if (target_button && router_ref && params_ref && params_ref.sampleId) {
            const requirement_id = target_button.dataset.requirementId;
            router_ref('requirement_audit', { sampleId: params_ref.sampleId, requirementId: requirement_id });
        }
    }

    function create_navigation_bar(is_bottom = false) {
        const t = get_t_internally();
        if (!Helpers_create_element || !t || !local_getState) return null;

        const nav_bar = Helpers_create_element('div', { class_name: 'requirements-navigation-bar' });
        if (is_bottom) nav_bar.classList.add('bottom');

        const current_global_state = local_getState();
        let target_view = (current_global_state && current_global_state.auditStatus !== 'not_started') ? 'audit_overview' : 'sample_management';
        let back_button_text_key = (target_view === 'audit_overview') ? 'back_to_audit_overview' : 'back_to_sample_management';

        const back_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t(back_button_text_key)}</span>` + (Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) || '')
        });
        back_button.addEventListener('click', () => router_ref(target_view));
        nav_bar.appendChild(back_button);
        return nav_bar;
    }
    
    // --- FIX HÄR: Denna funktion anropar nu BARA _populate_dynamic_content ---
    // Den ritar INTE om hela vyn, vilket bevarar toolbar-komponentens DOM och state.
    function handle_toolbar_change(new_toolbar_state) {
        component_state = new_toolbar_state;
        _populate_dynamic_content(); 
    }

    function natural_sort(a, b) {
        const re = /(\d+)/g;
        const a_parts = String(a).split(re);
        const b_parts = String(b).split(re);
        const len = Math.max(a_parts.length, b_parts.length);
        for (let i = 0; i < len; i++) {
            const a_part = a_parts[i] || '';
            const b_part = b_parts[i] || '';
            const a_num = parseInt(a_part, 10);
            const b_num = parseInt(b_part, 10);
            if (!isNaN(a_num) && !isNaN(b_num)) {
                if (a_num < b_num) return -1;
                if (a_num > b_num) return 1;
            } else {
                if (a_part < b_part) return -1;
                if (a_part > b_part) return 1;
            }
        }
        return 0;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

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
        
        is_dom_initialized = false;
    }

    async function _initialRender() {
        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate requirement-list-plate' });
        
        if (global_message_element_ref) {
            plate_element_ref.appendChild(global_message_element_ref);
        }

        const top_nav_bar = create_navigation_bar();
        if (top_nav_bar) plate_element_ref.appendChild(top_nav_bar);
        
        const header_div = Helpers_create_element('div', { class_name: 'requirement-list-header' });
        plate_element_ref.appendChild(header_div);

        const toolbar_container_element = Helpers_create_element('div', { id: 'requirement-list-toolbar-container' });
        plate_element_ref.appendChild(toolbar_container_element);
        
        toolbar_component_instance = RequirementListToolbarComponent;
        await toolbar_component_instance.init(
            toolbar_container_element,
            handle_toolbar_change,
            component_state,
            { t: Translation_t },
            { create_element: Helpers_create_element, load_css: Helpers_load_css }
        );
        toolbar_component_instance.render();

        content_div_for_delegation = Helpers_create_element('div', { class_name: 'requirements-list-content' });
        content_div_for_delegation.addEventListener('click', handle_requirement_list_click);
        plate_element_ref.appendChild(content_div_for_delegation);

        const bottom_nav_bar = create_navigation_bar(true);
        if (bottom_nav_bar) plate_element_ref.appendChild(bottom_nav_bar);

        app_container_ref.appendChild(plate_element_ref);
        is_dom_initialized = true;
    }

    // --- FIX HÄR: Renamed from _populate_list_content to _populate_dynamic_content ---
    // Denna funktion uppdaterar NU BARA header och listan, inte hela vyn.
    function _populate_dynamic_content() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        const current_sample_object = current_global_state.samples.find(s => s.id === params_ref.sampleId);

        // Uppdatera header
        const header_div = plate_element_ref.querySelector('.requirement-list-header');
        header_div.innerHTML = '';
        const actor_name = current_global_state.auditMetadata?.actorName || '';
        const sample_description = current_sample_object.description || t('undefined_description');
        let title_text = (actor_name.trim() !== '') ? `${actor_name.trim()}: ${sample_description}` : sample_description;
        header_div.appendChild(Helpers_create_element('h1', { text_content: title_text }));
        const sample_type_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-page-type' });
        sample_type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(current_sample_object.pageType)}`;
        header_div.appendChild(sample_type_p);
        const all_relevant_requirements = AuditLogic_get_relevant_requirements_for_sample(current_global_state.ruleFileContent, current_sample_object);
        const total_relevant_requirements = all_relevant_requirements.length;
        let audited_requirements_count = 0;
        all_relevant_requirements.forEach(req => {
            const status = AuditLogic_calculate_requirement_status(req, (current_sample_object.requirementResults || {})[req.key]);
            if (status === 'passed' || status === 'failed') audited_requirements_count++;
        });
        const sample_audit_status_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-audit-progress' });
        sample_audit_status_p.innerHTML = `<strong>${t('requirements_audited_for_sample')}:</strong> ${audited_requirements_count}/${total_relevant_requirements}`;
        header_div.appendChild(sample_audit_status_p);
        if (window.ProgressBarComponent) {
            header_div.appendChild(window.ProgressBarComponent.create(audited_requirements_count, total_relevant_requirements, {}));
        }

        // Filtrera och sortera kraven
        const search_term = component_state.filters.searchText.toLowerCase();
        const filtered_requirements = all_relevant_requirements.filter(req => {
            const result = (current_sample_object.requirementResults || {})[req.key];
            const status = AuditLogic_calculate_requirement_status(req, result);
            if (!component_state.filters.status[status]) return false;
            if (search_term) {
                const searchable_content = [req.expectedObservation, ...(Array.isArray(req.instructions) ? req.instructions.map(i => i.text) : [req.instructions]), ...(Array.isArray(req.tips) ? req.tips : [req.tips]), ...(Array.isArray(req.exceptions) ? req.exceptions : [req.exceptions]), ...(Array.isArray(req.commonErrors) ? req.commonErrors : [req.commonErrors]), req.standardReference?.text].filter(Boolean).join(' ').toLowerCase();
                if (!searchable_content.includes(search_term)) return false;
            }
            return true;
        });

        const sorted_requirements = [...filtered_requirements];
        switch(component_state.sortBy) {
            case 'title_asc': sorted_requirements.sort((a, b) => a.title.localeCompare(b.title)); break;
            case 'title_desc': sorted_requirements.sort((a, b) => b.title.localeCompare(a.title)); break;
            case 'ref_asc': sorted_requirements.sort((a, b) => natural_sort(a.standardReference?.text || '', b.standardReference?.text || '')); break;
            case 'ref_desc': sorted_requirements.sort((a, b) => natural_sort(b.standardReference?.text || '', a.standardReference?.text || '')); break;
            case 'status':
                const status_order = { 'failed': 1, 'partially_audited': 2, 'not_audited': 3, 'passed': 4 };
                sorted_requirements.sort((a, b) => {
                    const status_a = AuditLogic_calculate_requirement_status(a, (current_sample_object.requirementResults || {})[a.key]);
                    const status_b = AuditLogic_calculate_requirement_status(b, (current_sample_object.requirementResults || {})[b.key]);
                    return (status_order[status_a] || 99) - (status_order[status_b] || 99);
                });
                break;
        }

        // Rendera listan
        content_div_for_delegation.innerHTML = '';
        if (sorted_requirements.length === 0) {
            content_div_for_delegation.appendChild(Helpers_create_element('p', { text_content: t('no_relevant_requirements_for_sample') }));
        } else if (component_state.sortBy === 'default') {
            const requirements_by_category_map = {};
            sorted_requirements.forEach(req => {
                const main_cat_text = req.metadata?.mainCategory?.text || t('uncategorized');
                if (!requirements_by_category_map[main_cat_text]) requirements_by_category_map[main_cat_text] = { text: main_cat_text, subCategories: {} };
                const sub_cat_text = req.metadata?.subCategory?.text || t('other_requirements');
                if (!requirements_by_category_map[main_cat_text].subCategories[sub_cat_text]) requirements_by_category_map[main_cat_text].subCategories[sub_cat_text] = { text: sub_cat_text, requirements: [] };
                requirements_by_category_map[main_cat_text].subCategories[sub_cat_text].requirements.push(req);
            });
            Object.keys(requirements_by_category_map).sort().forEach(main_cat_key => {
                const main_cat = requirements_by_category_map[main_cat_key];
                const main_cat_group = Helpers_create_element('div', {class_name: 'category-group'});
                main_cat_group.appendChild(Helpers_create_element('h2', {class_name: 'main-category-title', text_content: main_cat.text}));
                Object.keys(main_cat.subCategories).sort().forEach(sub_cat_key => {
                    const sub_cat = main_cat.subCategories[sub_cat_key];
                    main_cat_group.appendChild(Helpers_create_element('h3', {class_name: 'sub-category-title', text_content: sub_cat.text}));
                    const req_ul = Helpers_create_element('ul', {class_name: 'requirement-items-ul'});
                    sub_cat.requirements.sort((a,b) => a.title.localeCompare(b.title)).forEach(req => req_ul.appendChild(create_requirement_list_item(req, current_sample_object)));
                    main_cat_group.appendChild(req_ul);
                });
                content_div_for_delegation.appendChild(main_cat_group);
            });
        } else {
            const req_ul = Helpers_create_element('ul', { class_name: 'requirement-items-ul' });
            sorted_requirements.forEach(req => req_ul.appendChild(create_requirement_list_item(req, current_sample_object)));
            content_div_for_delegation.appendChild(req_ul);
        }
    }

    async function render() {
        assign_globals_once();
        const t = get_t_internally();

        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) {
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_requirement_list_view')}</p>`;
            return;
        }

        // --- FIX HÄR: Denna logik styr nu om hela DOM-strukturen ska byggas eller bara uppdateras ---
        if (!is_dom_initialized) {
            await _initialRender();
        }

        const current_global_state = local_getState();
        if (!current_global_state || !current_global_state.ruleFileContent || !params_ref || !params_ref.sampleId) {
            content_div_for_delegation.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList'})}</p>`;
            return;
        }

        const current_sample_object = current_global_state.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object) {
            content_div_for_delegation.innerHTML = `<p>${t('error_loading_data_for_view', {viewName: 'RequirementList_SampleNotFound'})}</p>`;
            return;
        }
        
        _populate_dynamic_content();
    }

    function create_requirement_list_item(req, sample) {
        const t = get_t_internally();
        const req_result_object = (sample.requirementResults || {})[req.key];
        const status = AuditLogic_calculate_requirement_status(req, req_result_object);

        const li = Helpers_create_element('li', { class_name: 'requirement-item compact-twoline' });
        const title_row_div = Helpers_create_element('div', { class_name: 'requirement-title-row' });
        const title_h_container = Helpers_create_element('h4', { class_name: 'requirement-title-container' });

        const title_button = Helpers_create_element('button', {
            class_name: 'list-title-button',
            text_content: req.title,
            attributes: { 'data-requirement-id': req.key }
        });
        title_h_container.appendChild(title_button);
        title_row_div.appendChild(title_h_container);
        li.appendChild(title_row_div);

        const details_row_div = Helpers_create_element('div', { class_name: 'requirement-details-row' });
        const status_indicator_wrapper = Helpers_create_element('span', { class_name: 'requirement-status-indicator-wrapper' });

        let status_specific_class = `status-icon-${status.replace('_', '-')}`;
        let status_icon_title = t(`audit_status_${status}`);

        const status_indicator_span_for_icon = Helpers_create_element('span', {
           class_name: ['status-icon-indicator', status_specific_class].join(' '),
           attributes: { 'aria-hidden': 'true', title: status_icon_title }
        });
        status_indicator_wrapper.append(status_indicator_span_for_icon, ` ${t('audit_status_' + status)}`);
        details_row_div.appendChild(status_indicator_wrapper);

        const total_checks_count = req.checks?.length || 0;
        let audited_checks_count = 0;
        if (req_result_object?.checkResults) {
            Object.keys(req_result_object.checkResults).forEach(check_id => {
                const check_def = req.checks.find(c => c.id === check_id);
                if (check_def) {
                    const check_res = req_result_object.checkResults[check_id];
                    const check_status = AuditLogic_calculate_check_status(check_def, check_res.passCriteria, check_res.overallStatus);
                    if (check_status === 'passed' || check_status === 'failed') audited_checks_count++;
                }
            });
        }
        details_row_div.appendChild(Helpers_create_element('span', {
            class_name: 'requirement-checks-info',
            text_content: `(${audited_checks_count}/${total_checks_count} ${t('checks_short')})`
        }));
        
        if (req.standardReference?.text) {
            const ref_text = req.standardReference.text;
            let ref_element;
            if (req.standardReference.url) {
                ref_element = Helpers_create_element('a', { class_name: 'list-reference-link', text_content: ref_text, attributes: { href: req.standardReference.url, target: '_blank', rel: 'noopener noreferrer' } });
            } else {
                ref_element = Helpers_create_element('span', { class_name: 'list-reference-text', text_content: ref_text });
            }
            details_row_div.appendChild(ref_element);
        }
        
        li.appendChild(details_row_div);
        return li;
    }


    function destroy() {
        if (content_div_for_delegation) {
            content_div_for_delegation.removeEventListener('click', handle_requirement_list_click);
            content_div_for_delegation = null;
        }
        if (toolbar_component_instance) {
            toolbar_component_instance.destroy();
            toolbar_component_instance = null;
        }
        
        is_dom_initialized = false;
        plate_element_ref = null;
        
        app_container_ref = null; router_ref = null; params_ref = null;
        global_message_element_ref = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
    }

    return { init, render, destroy };
})();

export const RequirementListComponent = RequirementListComponent_internal;