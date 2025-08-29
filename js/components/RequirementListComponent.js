// js/components/RequirementListComponent.js
import { RequirementListToolbarComponent } from './RequirementListToolbarComponent.js';

export const RequirementListComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_load_css, Helpers_add_protocol_if_missing, Helpers_natural_sort;
    let NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    let AuditLogic_get_relevant_requirements_for_sample, AuditLogic_calculate_requirement_status, AuditLogic_calculate_check_status;

    let global_message_element_ref;
    let content_div_for_delegation = null;

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
            Helpers_natural_sort = window.Helpers.natural_sort;
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
    
    function handle_toolbar_change(new_toolbar_state) {
        local_dispatch({
            type: local_StoreActionTypes.SET_UI_FILTER_SETTINGS,
            payload: new_toolbar_state 
        });
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
        
        plate_element_ref.appendChild(Helpers_create_element('div', { class_name: 'requirement-list-header' }));

        const toolbar_container_element = Helpers_create_element('div', { id: 'requirement-list-toolbar-container' });
        plate_element_ref.appendChild(toolbar_container_element);
        
        toolbar_component_instance = RequirementListToolbarComponent;
        
        const current_state_for_init = local_getState();
        const current_ui_settings = current_state_for_init.uiSettings?.requirementListFilter || {
            searchText: '',
            sortBy: 'default',
            status: { passed: true, failed: true, partially_audited: true, not_audited: true, updated: true }
        };

        await toolbar_component_instance.init(
            toolbar_container_element,
            handle_toolbar_change,
            current_ui_settings,
            { t: Translation_t },
            { create_element: Helpers_create_element, load_css: Helpers_load_css }
        );

        content_div_for_delegation = Helpers_create_element('div', { class_name: 'requirements-list-content' });
        content_div_for_delegation.addEventListener('click', handle_requirement_list_click);
        plate_element_ref.appendChild(content_div_for_delegation);

        const bottom_nav_bar = create_navigation_bar(true);
        if (bottom_nav_bar) plate_element_ref.appendChild(bottom_nav_bar);

        app_container_ref.appendChild(plate_element_ref);
        is_dom_initialized = true;
    }

    function _populate_dynamic_content() {
        const t = get_t_internally();
        const current_global_state = local_getState();
        
        const filter_settings = current_global_state.uiSettings?.requirementListFilter;
        if (toolbar_component_instance) {
             toolbar_component_instance.render();
        }

        const current_sample_object = current_global_state.samples.find(s => s.id === params_ref.sampleId);

        // --- START PÅ KORREKT HEADER-LOGIK (som ska vara kvar) ---
        const header_div = plate_element_ref.querySelector('.requirement-list-header');
        header_div.innerHTML = '';
        
        const actor_name = current_global_state.auditMetadata?.actorName || '';
        const sample_description = current_sample_object.description || t('undefined_description');
        const title_text = (actor_name.trim() !== '') ? `${actor_name.trim()}: ${sample_description}` : sample_description;

        const h1 = Helpers_create_element('h1');
        if (current_sample_object.url) {
            h1.appendChild(Helpers_create_element('a', {
                href: Helpers_add_protocol_if_missing(current_sample_object.url),
                text_content: title_text,
                attributes: { target: '_blank', rel: 'noopener noreferrer' }
            }));
        } else {
            h1.textContent = title_text;
        }
        header_div.appendChild(h1);
        
        const sample_type_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-page-type' });
        sample_type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(current_sample_object.pageType)}`;
        header_div.appendChild(sample_type_p);
        
        const all_relevant_requirements = AuditLogic_get_relevant_requirements_for_sample(current_global_state.ruleFileContent, current_sample_object);
        const total_relevant_requirements = all_relevant_requirements.length;
        const audited_requirements_count = all_relevant_requirements.filter(req => {
            const status = AuditLogic_calculate_requirement_status(req, (current_sample_object.requirementResults || {})[req.key]);
            return status === 'passed' || status === 'failed';
        }).length;
        
        const sample_audit_status_p = Helpers_create_element('p', { class_name: 'sample-info-display sample-audit-progress' });
        sample_audit_status_p.innerHTML = `<strong>${t('requirements_audited_for_sample')}:</strong> ${audited_requirements_count}/${total_relevant_requirements}`;
        header_div.appendChild(sample_audit_status_p);

        if (window.ProgressBarComponent) {
            header_div.appendChild(window.ProgressBarComponent.create(audited_requirements_count, total_relevant_requirements, {}));
        }
        // --- SLUT PÅ HEADER-LOGIK ---

        // Filtrering (oförändrad)
        const search_term = (filter_settings.searchText || '').toLowerCase();
        const active_status_filters = Object.keys(filter_settings.status).filter(key => filter_settings.status[key]);

        const filtered_requirements = all_relevant_requirements.filter(req => {
            const result = (current_sample_object.requirementResults || {})[req.key];
            const display_status = result?.needsReview ? 'updated' : AuditLogic_calculate_requirement_status(req, result);
            if (!active_status_filters.includes(display_status)) return false;

            if (search_term) {
                const searchable_content = [
                    req.title, req.expectedObservation, req.instructions, req.tips, 
                    req.exceptions, req.commonErrors, req.standardReference?.text
                ].flat().filter(Boolean).map(item => (typeof item === 'object' ? item.text : String(item))).join(' ').toLowerCase();
                return searchable_content.includes(search_term);
            }
            return true;
        });
        
        // --- DEN NYA SORTERINGSLOGIKEN (som också ska vara kvar) ---
        const sorted_requirements = [...filtered_requirements];
        const sort_function = {
            'ref_desc': (a, b) => Helpers_natural_sort(b.standardReference?.text || 'Z', a.standardReference?.text || 'Z'),
            'title_asc': (a, b) => (a.title || '').localeCompare(b.title || ''),
            'title_desc': (a, b) => (b.title || '').localeCompare(a.title || ''),
            'updated_first': (a, b) => {
                const resA = (current_sample_object.requirementResults || {})[a.key];
                const resB = (current_sample_object.requirementResults || {})[b.key];
                const isAUpdated = resA?.needsReview === true ? 0 : 1;
                const isBUpdated = resB?.needsReview === true ? 0 : 1;
                if (isAUpdated !== isBUpdated) {
                    return isAUpdated - isBUpdated;
                }
                return Helpers_natural_sort(a.standardReference?.text || 'Z', b.standardReference?.text || 'Z');
            },
            'default': (a, b) => Helpers_natural_sort(a.standardReference?.text || 'Z', b.standardReference?.text || 'Z')
        };
        sorted_requirements.sort(sort_function[filter_settings.sortBy] || sort_function['default']);
        // --- SLUT PÅ SORTERINGSLOGIK ---

        // Rendera listan (oförändrad)
        content_div_for_delegation.innerHTML = '';
        if (sorted_requirements.length === 0) {
            content_div_for_delegation.appendChild(Helpers_create_element('p', { text_content: t('no_requirements_match_filter') }));
        } else {
            const req_ul = Helpers_create_element('ul', { class_name: 'requirement-items-ul' });
            sorted_requirements.forEach(req => req_ul.appendChild(create_requirement_list_item(req, current_sample_object)));
            content_div_for_delegation.appendChild(req_ul);
        }
    }

    async function render() {
        assign_globals_once();
        
        if (!is_dom_initialized) {
            await _initialRender();
        }
        _populate_dynamic_content();
    }

    function create_requirement_list_item(req, sample) {
        const t = get_t_internally();
        const req_result = (sample.requirementResults || {})[req.key];
        const display_status = req_result?.needsReview ? 'updated' : AuditLogic_calculate_requirement_status(req, req_result);

        const li = Helpers_create_element('li', { class_name: 'requirement-item compact-twoline' });
        
        // **ÄNDRING HÄR:** Byt ut <h4> mot en <div>.
        const title_row_div = Helpers_create_element('div', { class_name: 'requirement-title-container' });
        
        const title_button = Helpers_create_element('button', {
            class_name: 'list-title-button',
            text_content: req.title,
            attributes: { 'data-requirement-id': req.key }
        });
        
        title_row_div.appendChild(title_button);
        li.appendChild(title_row_div);

        // (Resten av funktionen är densamma)
        const details_row_div = Helpers_create_element('div', { class_name: 'requirement-details-row' });
        const status_indicator_wrapper = Helpers_create_element('span', { class_name: 'requirement-status-indicator-wrapper' });
        const status_icon_class = `status-icon-${display_status.replace('_', '-')}`;
        const status_text = t(display_status === 'updated' ? 'status_updated' : `audit_status_${display_status}`);
        const status_icon_title = t(display_status === 'updated' ? 'status_updated_needs_review' : `audit_status_${display_status}`);

        status_indicator_wrapper.append(
            Helpers_create_element('span', { class_name: ['status-icon-indicator', status_icon_class], attributes: { 'aria-hidden': 'true', title: status_icon_title } }),
            Helpers_create_element('span', { class_name: display_status === 'updated' ? 'status-text-updated' : '', text_content: ` ${status_text}` })
        );
        details_row_div.appendChild(status_indicator_wrapper);

        const total_checks = req.checks?.length || 0;
        const audited_checks = req_result?.checkResults ? Object.values(req_result.checkResults).filter(res => res.status === 'passed' || res.status === 'failed').length : 0;
        details_row_div.appendChild(Helpers_create_element('span', { class_name: 'requirement-checks-info', text_content: `(${audited_checks}/${total_checks} ${t('checks_short')})` }));
        
        if (req.standardReference?.text) {
            details_row_div.appendChild(req.standardReference.url 
                ? Helpers_create_element('a', { class_name: 'list-reference-link', text_content: req.standardReference.text, attributes: { href: req.standardReference.url, target: '_blank', rel: 'noopener noreferrer' } })
                : Helpers_create_element('span', { class_name: 'list-reference-text', text_content: req.standardReference.text })
            );
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
    }

    return { init, render, destroy };
})();