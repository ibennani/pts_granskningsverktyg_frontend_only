// js/components/RequirementListToolbarComponent.js
export const RequirementListToolbarComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_toolbar_component.css';
    let container_ref;
    
    // Callbacks och dependencies från föräldern
    let on_change_callback;
    let initial_state;
    let Translation_t;
    let Helpers_create_element;
    let Helpers_load_css;

    // Komponentens interna state
    let component_state;
    let search_debounce_timer;

    async function init(_container, _on_change_cb, _initial_state, _Translation, _Helpers) {
        container_ref = _container;
        on_change_callback = _on_change_cb;
        initial_state = _initial_state;
        Translation_t = _Translation.t;
        Helpers_create_element = _Helpers.create_element;
        Helpers_load_css = _Helpers.load_css;

        // Sätt initialt state, antingen från föräldern eller default
        component_state = { ...initial_state };

        if (Helpers_load_css && CSS_PATH) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await Helpers_load_css(CSS_PATH);
            } catch (error) {
                console.warn("Failed to load CSS for RequirementListToolbarComponent:", error);
            }
        }
    }

    function handle_search_input(event) {
        clearTimeout(search_debounce_timer);
        search_debounce_timer = setTimeout(() => {
            component_state.filters.searchText = event.target.value;
            if (on_change_callback) on_change_callback(component_state);
        }, 300);
    }

    function handle_status_filter_change(event) {
        const checkbox = event.target;
        const status_key = checkbox.dataset.status;
        const is_checked = checkbox.checked;

        if (status_key === 'all') {
            Object.keys(component_state.filters.status).forEach(key => {
                component_state.filters.status[key] = is_checked;
            });
        } else {
            component_state.filters.status[status_key] = is_checked;
            const all_individual_checked = Object.keys(component_state.filters.status)
                .every(key => key === 'all' || component_state.filters.status[key]);
            component_state.filters.status.all = all_individual_checked;
        }
        if (on_change_callback) on_change_callback(component_state);
    }

    function handle_sort_change(event) {
        component_state.sortBy = event.target.value;
        if (on_change_callback) on_change_callback(component_state);
    }

    function toggle_status_filter_panel(event) {
        event.stopPropagation();
        component_state.isStatusFilterPanelOpen = !component_state.isStatusFilterPanelOpen;
        const panel = document.getElementById('status-filter-panel-smv');
        if (panel) {
            panel.hidden = !component_state.isStatusFilterPanelOpen;
            if (component_state.isStatusFilterPanelOpen) {
                document.addEventListener('click', close_status_filter_panel_on_outside_click, { once: true });
            }
        }
    }

    function close_status_filter_panel_on_outside_click(event) {
        const panel = document.getElementById('status-filter-panel-smv');
        const button = document.getElementById('status-filter-toggle-btn');
        if (component_state.isStatusFilterPanelOpen && panel && button && !panel.contains(event.target) && !button.contains(event.target)) {
            component_state.isStatusFilterPanelOpen = false;
            panel.hidden = true;
        } else if (component_state.isStatusFilterPanelOpen) {
            // Om klicket var inne i panelen, lägg till lyssnaren igen
            document.addEventListener('click', close_status_filter_panel_on_outside_click, { once: true });
        }
    }

    function render() {
        if (!container_ref || !Helpers_create_element || !Translation_t) {
            console.error("ToolbarComponent: Cannot render, core dependencies missing.");
            return;
        }
        container_ref.innerHTML = '';
        const t = Translation_t;

        const toolbar = Helpers_create_element('div', { class_name: 'requirements-list-toolbar' });

        // Söksektion
        const search_group = Helpers_create_element('div', { class_name: 'toolbar-group search-group' });
        const search_label = Helpers_create_element('label', { attributes: { for: 'req-list-search' }, text_content: t('search_in_help_texts_label') });
        const search_input = Helpers_create_element('input', { id: 'req-list-search', class_name: 'form-control', attributes: { type: 'search' }, value: component_state.filters.searchText });
        search_input.addEventListener('input', handle_search_input);
        search_group.append(search_label, search_input);

        // Filtersektion
        const filter_group = Helpers_create_element('div', { class_name: 'toolbar-group status-filter-group' });
        const filter_label = Helpers_create_element('label', { attributes: { for: 'status-filter-toggle-btn' }, text_content: t('filter_by_status_label') });
        const filter_button = Helpers_create_element('button', { id: 'status-filter-toggle-btn', class_name: 'button button-default', text_content: t('status_filter_button_text') });
        filter_button.addEventListener('click', toggle_status_filter_panel);
        
        const filter_panel = Helpers_create_element('div', { id: 'status-filter-panel-smv', class_name: 'status-filter-panel' });
        filter_panel.hidden = !component_state.isStatusFilterPanelOpen;
        
        const status_types = ['passed', 'failed', 'partially_audited', 'not_audited'];
        
        // "Visa alla" checkbox
        const all_wrapper = Helpers_create_element('div', { class_name: 'form-check all-check' });
        const all_input = Helpers_create_element('input', { id: 'status-filter-all', class_name: 'form-check-input', attributes: { type: 'checkbox', 'data-status': 'all' } });
        all_input.checked = component_state.filters.status.all;
        const all_label = Helpers_create_element('label', { attributes: { for: 'status-filter-all' }, text_content: t('show_all') });
        all_wrapper.append(all_input, all_label);
        filter_panel.appendChild(all_wrapper);

        // Separator
        filter_panel.appendChild(Helpers_create_element('hr'));

        // Individuella statusar
        status_types.forEach(status => {
            const wrapper = Helpers_create_element('div', { class_name: 'form-check' });
            const input = Helpers_create_element('input', { id: `status-filter-${status}`, class_name: 'form-check-input', attributes: { type: 'checkbox', 'data-status': status } });
            input.checked = component_state.filters.status[status];
            const label = Helpers_create_element('label', { attributes: { for: `status-filter-${status}` }, text_content: t(`audit_status_${status}`) });
            wrapper.append(input, label);
            filter_panel.appendChild(wrapper);
        });
        filter_panel.addEventListener('change', handle_status_filter_change);

        filter_group.append(filter_label, filter_button, filter_panel);
        
        // Sorteringssektion
        const sort_group = Helpers_create_element('div', { class_name: 'toolbar-group sort-group' });
        const sort_label = Helpers_create_element('label', { attributes: { for: 'req-list-sort' }, text_content: t('sort_by_label') });
        const sort_select = Helpers_create_element('select', { id: 'req-list-sort', class_name: 'form-control' });
        const sort_options = {
            'default': t('sort_option_default'),
            'title_asc': t('sort_option_title_asc'),
            'title_desc': t('sort_option_title_desc'),
            'ref_asc': t('sort_option_ref_asc'),
            'ref_desc': t('sort_option_ref_desc'),
            'status': t('sort_option_status')
        };
        for (const [value, text] of Object.entries(sort_options)) {
            sort_select.appendChild(Helpers_create_element('option', { value: value, text_content: text }));
        }
        sort_select.value = component_state.sortBy;
        sort_select.addEventListener('change', handle_sort_change);
        sort_group.append(sort_label, sort_select);

        toolbar.append(search_group, filter_group, sort_group);
        container_ref.appendChild(toolbar);
    }

    function destroy() {
        clearTimeout(search_debounce_timer);
        document.removeEventListener('click', close_status_filter_panel_on_outside_click);
        if (container_ref) container_ref.innerHTML = '';
        container_ref = null;
        on_change_callback = null;
    }

    return {
        init,
        render,
        destroy
    };
})();