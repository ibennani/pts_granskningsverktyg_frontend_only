// js/components/RulefileRequirementsListComponent.js
import { RequirementListToolbarComponent } from './RequirementListToolbarComponent.js';

export const RulefileRequirementsListComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/rulefile_requirements_list_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let local_subscribe_func; // *** NY ***

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_load_css, Helpers_natural_sort;
    let NotificationComponent_get_global_message_element_reference;

    let global_message_element_ref;
    let content_div_for_delegation = null;
    let toolbar_component_instance = null;
    let is_dom_initialized = false;
    let plate_element_ref = null;
    let unsubscribe_from_store_function = null; // *** NY ***

    const SORT_OPTIONS = [
        { value: 'ref_asc', textKey: 'sort_option_ref_asc_natural', defaultValue: 'Reference (Ascending)' },
        { value: 'ref_desc', textKey: 'sort_option_ref_desc_natural', defaultValue: 'Reference (Descending)' },
        { value: 'title_asc', textKey: 'sort_option_title_asc', defaultValue: 'Title (A-Z)' },
        { value: 'title_desc', textKey: 'sort_option_title_desc', defaultValue: 'Title (Z-A)' }
    ];

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_escape_html = window.Helpers.escape_html;
        Helpers_load_css = window.Helpers.load_css;
        Helpers_natural_sort = window.Helpers.natural_sort;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
    }

    function handle_list_click(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const requirementId = button.dataset.requirementId;
        const action = button.dataset.action;

        switch (action) {
            case 'view-req':
                router_ref('rulefile_view_requirement', { id: requirementId });
                break;
            case 'edit-req':
                router_ref('rulefile_edit_requirement', { id: requirementId });
                break;
            case 'delete-req':
                // *** KORRIGERING AV FELAKTIGT VY-NAMN ***
                router_ref('confirm_delete', { type: 'requirement', reqId: requirementId });
                break;
        }
    }

    function handle_toolbar_change(new_toolbar_state) {
        local_dispatch({
            type: local_StoreActionTypes.SET_UI_FILTER_SETTINGS,
            payload: new_toolbar_state
        });
    }

    // *** NY FUNKTION FÖR ATT HANTERA STATE-UPPDATERINGAR ***
    function handle_state_update() {
        if (is_dom_initialized) {
            _populate_dynamic_content();
        }
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes, _subscribe) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        local_subscribe_func = _subscribe; // *** NY ***

        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }

        await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
        
        // *** NYTT: Starta prenumerationen ***
        if (typeof local_subscribe_func === 'function') {
            unsubscribe_from_store_function = local_subscribe_func(handle_state_update);
        }
        
        is_dom_initialized = false;
    }

    async function _initialRender() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate' });
        
        if (global_message_element_ref) {
            plate_element_ref.appendChild(global_message_element_ref);
        }

        plate_element_ref.appendChild(Helpers_create_element('h1', { id: 'rulefile-list-h1', attributes: { tabindex: '-1' }, text_content: t('rulefile_edit_requirements_title') }));
        plate_element_ref.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('rulefile_edit_requirements_intro') }));

        const toolbar_container_element = Helpers_create_element('div', { id: 'rulefile-list-toolbar-container' });
        plate_element_ref.appendChild(toolbar_container_element);
        
        toolbar_component_instance = RequirementListToolbarComponent;
        
        let current_state_for_init = local_getState();
        let current_ui_settings = current_state_for_init.uiSettings?.requirementListFilter || {};
        
        const valid_sort_values = SORT_OPTIONS.map(opt => opt.value);
        if (!current_ui_settings.sortBy || !valid_sort_values.includes(current_ui_settings.sortBy)) {
            local_dispatch({
                type: local_StoreActionTypes.SET_UI_FILTER_SETTINGS,
                payload: { sortBy: 'ref_asc' }
            });
            current_state_for_init = local_getState();
            current_ui_settings = current_state_for_init.uiSettings.requirementListFilter;
        }

        const initial_toolbar_state = {
            searchText: current_ui_settings.searchText || '',
            sortBy: current_ui_settings.sortBy,
            status: {} 
        };

        await toolbar_component_instance.init(
            toolbar_container_element,
            handle_toolbar_change,
            initial_toolbar_state,
            { t: Translation_t },
            { create_element: Helpers_create_element, load_css: Helpers_load_css },
            { showStatusFilter: false, sortOptions: SORT_OPTIONS }
        );

        content_div_for_delegation = Helpers_create_element('div', { class_name: 'requirements-list-content' });
        content_div_for_delegation.addEventListener('click', handle_list_click);
        plate_element_ref.appendChild(content_div_for_delegation);

        const bottom_actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem; justify-content: flex-start;' });
        const return_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t('back_to_edit_options')}</span>` + Helpers_get_icon_svg('arrow_back')
        });
        return_button.addEventListener('click', () => router_ref('edit_rulefile_main'));
        bottom_actions_div.appendChild(return_button);
        plate_element_ref.appendChild(bottom_actions_div);

        app_container_ref.appendChild(plate_element_ref);
        is_dom_initialized = true;
    }

    function _populate_dynamic_content() {
        const t = Translation_t;
        const current_global_state = local_getState();
        
        if (!current_global_state || !current_global_state.ruleFileContent) {
            content_div_for_delegation.innerHTML = `<p>${t('error_no_rulefile_loaded_for_metadata')}</p>`;
            return;
        }

        const filter_settings = current_global_state.uiSettings?.requirementListFilter;

        if (toolbar_component_instance) {
             toolbar_component_instance.render(filter_settings);
        }

        const search_term = (filter_settings.searchText || '').toLowerCase();
        
        const all_requirements = Object.values(current_global_state.ruleFileContent.requirements);

        const filtered_requirements = all_requirements.filter(req => {
            if (search_term) {
                const searchable_content = [
                    req.title, req.expectedObservation, req.instructions, req.tips, 
                    req.exceptions, req.commonErrors, req.standardReference?.text
                ].flat().filter(Boolean).map(item => (typeof item === 'object' ? item.text : String(item))).join(' ').toLowerCase();
                return searchable_content.includes(search_term);
            }
            return true;
        });
        
        const sorted_requirements = [...filtered_requirements];
        const sort_function = {
            'ref_asc': (a, b) => Helpers_natural_sort(a.standardReference?.text || 'Z', b.standardReference?.text || 'Z'),
            'ref_desc': (a, b) => Helpers_natural_sort(b.standardReference?.text || 'Z', a.standardReference?.text || 'Z'),
            'title_asc': (a, b) => (a.title || '').localeCompare(b.title || ''),
            'title_desc': (a, b) => (b.title || '').localeCompare(a.title || '')
        };
        sorted_requirements.sort(sort_function[filter_settings.sortBy] || sort_function['ref_asc']);

        content_div_for_delegation.innerHTML = '';
        if (sorted_requirements.length === 0) {
            content_div_for_delegation.appendChild(Helpers_create_element('p', { text_content: t('no_requirements_match_filter') }));
        } else {
            const req_ul = Helpers_create_element('ul', { class_name: 'item-list', style: 'list-style: none; padding: 0;' });
            sorted_requirements.forEach(req => req_ul.appendChild(_create_requirement_list_item(req)));
            content_div_for_delegation.appendChild(req_ul);
        }

        const focusSelector = sessionStorage.getItem('focusAfterLoad');
        if (focusSelector) {
            sessionStorage.removeItem('focusAfterLoad');
            const elementToFocus = plate_element_ref.querySelector(focusSelector);
            if (elementToFocus) {
                elementToFocus.focus();
                window.customFocusApplied = true;
            }
        } else if (sessionStorage.getItem('focusOnH1AfterLoad')) {
            sessionStorage.removeItem('focusOnH1AfterLoad');
            plate_element_ref.querySelector('#rulefile-list-h1')?.focus();
        }
    }
    
    function _create_requirement_list_item(req) {
        const t = Translation_t;
        const li = Helpers_create_element('li', { class_name: 'item-list-item', style: 'flex-direction: row; justify-content: space-between; align-items: center;' });

        const text_div = Helpers_create_element('div', { style: 'margin-right: 1rem; flex-grow: 1; min-width: 0;' });
        text_div.appendChild(Helpers_create_element('h3', { style: 'font-size: 1.1rem; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;', text_content: req.title, attributes: { title: req.title } }));
        text_div.appendChild(Helpers_create_element('p', { style: 'font-size: 0.9rem; color: var(--text-color-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;', text_content: req.standardReference?.text || '', attributes: { title: req.standardReference?.text || '' } }));

        const button_group = Helpers_create_element('div', { class_name: 'sample-actions-main', style: 'flex-shrink: 0;' });

        const view_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default', 'button-small'],
            attributes: { 'data-action': 'view-req', 'data-requirement-id': req.key, 'aria-label': `${t('view_prefix')} ${req.title}` },
            html_content: `<span>${t('view_prefix')}</span>` + Helpers_get_icon_svg('visibility', [], 16)
        });

        const edit_button = Helpers_create_element('button', {
            class_name: ['button', 'button-secondary', 'button-small'],
            attributes: { 'data-action': 'edit-req', 'data-requirement-id': req.key, 'aria-label': `${t('edit_prefix')} ${req.title}` },
            html_content: `<span>${t('edit_prefix')}</span>` + Helpers_get_icon_svg('edit', [], 16)
        });
        
        const delete_button = Helpers_create_element('button', {
            class_name: ['button', 'button-danger', 'button-small'],
            attributes: { 'data-action': 'delete-req', 'data-requirement-id': req.key, 'aria-label': `${t('delete_prefix')} ${req.title}` },
            html_content: `<span>${t('delete_prefix')}</span>` + Helpers_get_icon_svg('delete', [], 16)
        });

        button_group.append(view_button, edit_button, delete_button);
        li.append(text_div, button_group);
        return li;
    }

    async function render() {
        assign_globals_once();
        
        if (!is_dom_initialized) {
            await _initialRender();
        }
        _populate_dynamic_content();
    }

    function destroy() {
        // *** NYTT: Avsluta prenumerationen ***
        if (typeof unsubscribe_from_store_function === 'function') {
            unsubscribe_from_store_function();
            unsubscribe_from_store_function = null;
        }

        if (content_div_for_delegation) {
            content_div_for_delegation.removeEventListener('click', handle_list_click);
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