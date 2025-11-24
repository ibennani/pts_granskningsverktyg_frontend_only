// js/components/SampleFormViewComponent.js
import { AddSampleFormComponent } from './AddSampleFormComponent.js';

export const SampleFormViewComponent = (function () {
    'use-strict';

    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg;
    let NotificationComponent_get_global_message_element_reference;

    let add_sample_form_component_instance;
    let add_sample_form_container_element;
    let plate_element_ref;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
    }

    // Callback-funktion som skickas till formulärkomponenten
    // När formuläret sparas navigerar vi tillbaka till föregående vy
    function on_form_saved_or_updated() {
        const current_state = local_getState();
        const previous_view = (current_state.auditStatus === 'not_started') ? 'sample_management' : 'audit_overview';
        router_ref(previous_view);
    }
    
    // Funktion för "Släng ändringar och återgå"-knappen
    function discard_and_return() {
        const current_state = local_getState();
        const previous_view = (current_state.auditStatus === 'not_started') ? 'sample_management' : 'audit_overview';
        router_ref(previous_view);
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
    
        add_sample_form_container_element = Helpers_create_element('div', { id: 'add-sample-form-area-in-view' });
        
        add_sample_form_component_instance = AddSampleFormComponent;
        // Initiera formulärkomponenten och ge den våra callbacks
        await add_sample_form_component_instance.init(
            add_sample_form_container_element,
            on_form_saved_or_updated, 
            discard_and_return, // Denna callback används nu för "Släng och återgå"
            local_getState, 
            local_dispatch, 
            local_StoreActionTypes,
            router_ref // <-- DENNA RAD ÄR TILLAGD/ÄNDRAD
        );
    }

    function render() {
        assign_globals_once();
        const t = Translation_t;
        const sample_id_to_edit = params_ref?.editSampleId || null;
        const current_state = local_getState();
        const audit_status = current_state.auditStatus;

        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate' });
        app_container_ref.appendChild(plate_element_ref);

        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) {
            plate_element_ref.appendChild(global_message_element);
        }

        const title_text = sample_id_to_edit ? t('edit_sample') : t('add_new_sample');
        const hero_section = Helpers_create_element('section', { class_name: ['section', 'sample-form-hero'] });
        hero_section.appendChild(Helpers_create_element('h1', { text_content: title_text }));
        const intro_text_key = (audit_status === 'not_started') ? 'add_samples_intro_message' : 'add_sample_form_new_intro';
        hero_section.appendChild(Helpers_create_element('p', {
            class_name: 'view-intro-text',
            text_content: t(intro_text_key)
        }));
        plate_element_ref.appendChild(hero_section);

        // Render the form component inside the view wrapper
        add_sample_form_component_instance.render(sample_id_to_edit);
        const form_section = Helpers_create_element('section', { class_name: ['section', 'sample-form-form-section'] });
        form_section.appendChild(add_sample_form_container_element);
        plate_element_ref.appendChild(form_section);

        // Bottom navigation area
        const bottom_actions_section = Helpers_create_element('section', { class_name: ['section', 'sample-form-actions-section'] });
        const bottom_actions_div = Helpers_create_element('div', { class_name: 'form-actions sample-form-actions' });
        const return_button_text_key = (audit_status === 'not_started') ? 'back_to_sample_management' : 'back_to_audit_overview';
        const return_button = Helpers_create_element('button', {
            class_name: ['button', 'button--secondary'],
            html_content: `<span>${t(return_button_text_key)}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back') : '')
        });
        return_button.addEventListener('click', discard_and_return);
        bottom_actions_div.appendChild(return_button);
        bottom_actions_section.appendChild(bottom_actions_div);
        plate_element_ref.appendChild(bottom_actions_section);
    }

    function destroy() {
        if (add_sample_form_component_instance?.destroy) {
            add_sample_form_component_instance.destroy();
        }
        app_container_ref.innerHTML = '';
        plate_element_ref = null;
    }

    return { init, render, destroy };
})();