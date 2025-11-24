// js/components/SampleManagementViewComponent.js
import { SampleListComponent } from './SampleListComponent.js';

export const SampleManagementViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_management_view_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css, Helpers_escape_html;
    let NotificationComponent_show_global_message, NotificationComponent_get_global_message_element_reference;

    // Förenklat: Vi behöver inte längre instansiering av formulärkomponenten här
    let sample_list_component_instance;
    let sample_list_container_element;
    let global_message_element_ref;
    let plate_element_ref;

    // Förenklat: Dessa state-variabler behövs inte längre i denna komponent
    // let is_form_visible = false;
    // let current_editing_sample_id = null;
    let previously_focused_element = null;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_load_css = window.Helpers?.load_css;
        Helpers_escape_html = window.Helpers?.escape_html;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        
        await init_sub_components();
        await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
    }

    async function init_sub_components() {
        sample_list_container_element = Helpers_create_element('div', { id: 'sample-list-area-smv', class_name: ['sample-list'] });

        // Förenklat: Vi initierar bara listkomponenten nu
        sample_list_component_instance = SampleListComponent;
        await sample_list_component_instance.init(
            sample_list_container_element,
            { 
                on_edit: handle_edit_sample_request_from_list,
                on_delete: handle_delete_sample_request_from_list
            },
            router_ref, 
            local_getState
        );
    }
    
    // Ändrad logik: Navigera till den dedikerade formulärvyn
    function handle_edit_sample_request_from_list(sample_id) {
        router_ref('sample_form', { editSampleId: sample_id });
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = Translation_t;
        const current_state = local_getState();
        if (current_state.samples.length <= 1) {
            NotificationComponent_show_global_message(t('error_cannot_delete_last_sample'), "warning");
            return;
        }

        const sample_to_delete = current_state.samples.find(s => s.id === sample_id);
        const sample_name = Helpers_escape_html(sample_to_delete.description);
        previously_focused_element = document.activeElement;

        if (confirm(t('confirm_delete_sample', { sampleName: sample_name }))) {
            local_dispatch({ type: local_StoreActionTypes.DELETE_SAMPLE, payload: { sampleId: sample_id } });
            // Vi behöver inte längre rendera om manuellt, state-uppdateringen triggar det
        } else {
            previously_focused_element?.focus();
        }
    }

    function handle_start_audit() {
        local_dispatch({ type: local_StoreActionTypes.SET_AUDIT_STATUS, payload: { status: 'in_progress' } });
        router_ref('audit_overview');
    }

    function render() {
        assign_globals_once();
        const t = Translation_t;
        const current_state = local_getState();

        if (!plate_element_ref || !app_container_ref.contains(plate_element_ref)) {
            app_container_ref.innerHTML = '';
            plate_element_ref = Helpers_create_element('div', { class_name: ['content-plate', 'sample-management-section'] });
            app_container_ref.appendChild(plate_element_ref);
        }

        plate_element_ref.innerHTML = '';

        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
            plate_element_ref.appendChild(global_message_element_ref);
        }

        const hero_section = Helpers_create_element('section', { class_name: ['section', 'sample-management-hero'] });
        hero_section.appendChild(Helpers_create_element('h1', { text_content: t('sample_management_title') }));
        hero_section.appendChild(Helpers_create_element('p', {
            class_name: 'view-intro-text',
            text_content: t('add_samples_intro_message')
        }));
        plate_element_ref.appendChild(hero_section);

        const top_actions_section = Helpers_create_element('section', {
            class_name: ['section', 'sample-management-actions-section']
        });
        const top_actions_div = Helpers_create_element('div', { class_name: ['form-actions', 'sample-management-actions'] });
        const add_button = Helpers_create_element('button', {
            class_name: ['button', 'button--primary'],
            html_content: `<span>${t('add_new_sample')}</span>` + Helpers_get_icon_svg('add')
        });
        add_button.addEventListener('click', () => router_ref('sample_form'));
        top_actions_div.appendChild(add_button);
        top_actions_section.appendChild(top_actions_div);
        plate_element_ref.appendChild(top_actions_section);

        sample_list_component_instance.render();
        const list_section = Helpers_create_element('section', { class_name: ['section', 'sample-management-list-section'] });
        list_section.appendChild(sample_list_container_element);
        plate_element_ref.appendChild(list_section);

        const bottom_actions_section = Helpers_create_element('section', {
            class_name: ['section', 'sample-management-actions-section', 'sample-management-bottom-actions']
        });
        const bottom_actions_div = Helpers_create_element('div', {
            class_name: ['form-actions', 'sample-management-actions']
        });

        const back_to_metadata_btn = Helpers_create_element('button', {
            class_name: ['button', 'button--secondary'],
            html_content: `<span>${t('back_to_metadata')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back') : '')
        });
        back_to_metadata_btn.addEventListener('click', () => router_ref('metadata'));
        bottom_actions_div.appendChild(back_to_metadata_btn);

        if (current_state.samples.length > 0) {
            const start_audit_button = Helpers_create_element('button', {
                class_name: ['button', 'button--success'],
                html_content: `<span>${t('start_audit')}</span>` + Helpers_get_icon_svg('check_circle')
            });
            start_audit_button.addEventListener('click', handle_start_audit);
            bottom_actions_div.appendChild(start_audit_button);
        }

        bottom_actions_section.appendChild(bottom_actions_div);
        plate_element_ref.appendChild(bottom_actions_section);
    }

    function destroy() {
        // Förenklat: behöver inte längre förstöra formulärkomponenten
        sample_list_component_instance?.destroy();
        plate_element_ref = null;
        previously_focused_element = null;
    }

    return { init, render, destroy };
})();