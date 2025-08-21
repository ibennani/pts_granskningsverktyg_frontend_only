// js/components/RequirementListToolbarComponent.js
export const RequirementListToolbarComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_list_toolbar_component.css';
    let container_ref;
    
    let on_change_callback;
    let initial_state;
    let Translation_t;
    let Helpers_create_element;
    let Helpers_load_css;

    let component_state;
    let search_debounce_timer;

    async function init(_container, _on_change_cb, _initial_state, _Translation, _Helpers) {
        container_ref = _container;
        on_change_callback = _on_change_cb;
        initial_state = _initial_state;
        Translation_t = _Translation.t;
        Helpers_create_element = _Helpers.create_element;
        Helpers_load_css = _Helpers.load_css;

        // *** NY LOGIK: Se till att filterobjektet innehåller den nya nyckeln ***
        const default_filters = {
            searchText: '',
            status: { passed: true, failed: true, partially_audited: true, not_audited: true, updated: true } // Lägg till 'updated'
        };
        component_state = { ..._initial_state };
        component_state.filters = { ...default_filters, ..._initial_state.filters };
        if (component_state.filters.status.updated === undefined) {
            component_state.filters.status.updated = true; // Sätt default om den saknas
        }
        
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
        if (!checkbox || checkbox.type !== 'checkbox') return;

        const status_key = checkbox.dataset.status;
        const is_checked = checkbox.checked;

        if (status_key === 'all') {
            component_state.filters.status.passed = is_checked;
            component_state.filters.status.failed = is_checked;
            component_state.filters.status.partially_audited = is_checked;
            component_state.filters.status.not_audited = is_checked;
            component_state.filters.status.updated = is_checked; // *** Uppdatera "all" att inkludera den nya ***
        } else {
            component_state.filters.status[status_key] = is_checked;
        }

        const all_individual_checked = 
            component_state.filters.status.passed &&
            component_state.filters.status.failed &&
            component_state.filters.status.partially_audited &&
            component_state.filters.status.not_audited &&
            component_state.filters.status.updated; // *** Lägg till den nya här också ***
        
        // Synka "Visa alla"-checkboxen
        const all_checkbox = document.getElementById('status-filter-all');
        if (all_checkbox) {
            all_checkbox.checked = all_individual_checked;
        }

        // Eftersom vi inte längre gör en fullständig omritning vid varje ändring, behöver vi inte oroa oss för fokus.
        // Vi skickar bara callbacken.
        if (on_change_callback) on_change_callback(component_state);
    }

    function handle_sort_change(event) {
        component_state.sortBy = event.target.value;
        if (on_change_callback) on_change_callback(component_state);
    }

    function toggle_status_filter_panel(event) {
        event.stopPropagation();
        const panel = document.getElementById('status-filter-panel-smv');
        if (panel) {
            const is_hidden = panel.hasAttribute('hidden');
            if (is_hidden) {
                panel.removeAttribute('hidden');
                // Spara fokus så vi kan återställa det om panelen stängs
                const focusedElement = document.activeElement;
                document.addEventListener('click', (e) => close_status_filter_panel_on_outside_click(e, focusedElement), { once: true });
            } else {
                panel.setAttribute('hidden', 'true');
            }
        }
    }

    function close_status_filter_panel_on_outside_click(event, elementToFocus) {
        const panel = document.getElementById('status-filter-panel-smv');
        const button = document.getElementById('status-filter-toggle-btn');
        if (panel && !panel.hasAttribute('hidden') && button && !panel.contains(event.target) && !button.contains(event.target)) {
            panel.setAttribute('hidden', 'true');
            // Återställ fokus till knappen som öppnade panelen
            if (elementToFocus && typeof elementToFocus.focus === 'function') {
                elementToFocus.focus();
            }
        } else if (panel && !panel.hasAttribute('hidden')) {
            // Om klicket var inuti panelen, sätt upp en ny lyssnare.
            document.addEventListener('click', (e) => close_status_filter_panel_on_outside_click(e, elementToFocus), { once: true });
        }
    }

    function render() {
        if (!container_ref || !Helpers_create_element || !Translation_t) {
            console.error("ToolbarComponent: Cannot render, core dependencies missing.");
            return;
        }
        
        const focusedElementId = document.activeElement?.id;
        const searchInputValue = (focusedElementId === 'req-list-search') ? document.activeElement.value : component_state.filters.searchText;
        const searchSelectionStart = (focusedElementId === 'req-list-search') ? document.activeElement.selectionStart : null;
        const searchSelectionEnd = (focusedElementId === 'req-list-search') ? document.activeElement.selectionEnd : null;

        container_ref.innerHTML = '';
        const t = Translation_t;

        const toolbar = Helpers_create_element('div', { class_name: 'requirements-list-toolbar' });

        // Söksektion
        const search_group = Helpers_create_element('div', { class_name: 'toolbar-group search-group' });
        const search_label = Helpers_create_element('label', { attributes: { for: 'req-list-search' }, text_content: t('search_in_help_texts_label') });
        const search_input = Helpers_create_element('input', { id: 'req-list-search', class_name: 'form-control', attributes: { type: 'search', placeholder: t('search_placeholder_default') }, value: searchInputValue });
        search_input.addEventListener('input', handle_search_input);
        search_group.append(search_label, search_input);

        // Filtersektion
        const filter_group = Helpers_create_element('div', { class_name: 'toolbar-group status-filter-group' });
        const filter_label = Helpers_create_element('label', { attributes: { for: 'status-filter-toggle-btn' }, text_content: t('filter_by_status_label') });
        const filter_button = Helpers_create_element('button', { id: 'status-filter-toggle-btn', class_name: 'button button-default', text_content: t('status_filter_button_text') });
        filter_button.addEventListener('click', toggle_status_filter_panel);
        
        const filter_panel = Helpers_create_element('div', { id: 'status-filter-panel-smv', class_name: 'status-filter-panel' });
        filter_panel.setAttribute('hidden', 'true');
        
        const status_types = ['passed', 'failed', 'partially_audited', 'not_audited'];
        const all_statuses_checked = status_types.every(status => component_state.filters.status[status]) && component_state.filters.status.updated;

        const all_wrapper = Helpers_create_element('div', { class_name: 'form-check all-check' });
        const all_input = Helpers_create_element('input', { id: 'status-filter-all', class_name: 'form-check-input', attributes: { type: 'checkbox', 'data-status': 'all' } });
        all_input.checked = all_statuses_checked;
        const all_label_el = Helpers_create_element('label', { attributes: { for: 'status-filter-all' }, text_content: t('show_all') });
        all_wrapper.append(all_input, all_label_el);
        filter_panel.appendChild(all_wrapper);

        filter_panel.appendChild(Helpers_create_element('hr'));

        status_types.forEach(status => {
            const wrapper = Helpers_create_element('div', { class_name: 'form-check' });
            const input = Helpers_create_element('input', { id: `status-filter-${status}`, class_name: 'form-check-input', attributes: { type: 'checkbox', 'data-status': status } });
            input.checked = component_state.filters.status[status];
            const label_el = Helpers_create_element('label', { attributes: { for: `status-filter-${status}` }, text_content: t(`audit_status_${status}`) });
            wrapper.append(input, label_el);
            filter_panel.appendChild(wrapper);
        });
        
        // *** NY KOD: Lägg till "Uppdaterade"-checkboxen ***
        const updated_wrapper = Helpers_create_element('div', { class_name: 'form-check' });
        const updated_input = Helpers_create_element('input', { id: `status-filter-updated`, class_name: 'form-check-input', attributes: { type: 'checkbox', 'data-status': 'updated' } });
        updated_input.checked = component_state.filters.status.updated;
        const updated_label_el = Helpers_create_element('label', { attributes: { for: `status-filter-updated` }, text_content: t('filter_option_updated', { defaultValue: "Updated" }) });
        updated_wrapper.append(updated_input, updated_label_el);
        filter_panel.appendChild(updated_wrapper);
        // *** SLUT PÅ NY KOD ***

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
        
        if (focusedElementId) {
            const elementToFocus = document.getElementById(focusedElementId);
            if (elementToFocus) {
                elementToFocus.focus();
                if (focusedElementId === 'req-list-search' && searchSelectionStart !== null) {
                    elementToFocus.setSelectionRange(searchSelectionStart, searchSelectionEnd);
                }
            }
        }
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