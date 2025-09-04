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
        plate_element_ref.appendChild(Helpers_create_element('h1', { text_content: title_text }));
        
        const intro_text_key = (audit_status === 'not_started') ? 'add_samples_intro_message' : 'add_sample_form_new_intro';
        plate_element_ref.appendChild(Helpers_create_element('p', { 
            class_name: 'view-intro-text', 
            text_content: t(intro_text_key) 
        }));

        // Rendera formulärkomponenten inuti vår nya vy
        add_sample_form_component_instance.render(sample_id_to_edit);
        plate_element_ref.appendChild(add_sample_form_container_element);

        // Lägg till en nedre navigationsrad med "Tillbaka"-knapp
        const bottom_actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem; justify-content: flex-start;' });
        
        const return_button_text_key = (audit_status === 'not_started') ? 'back_to_sample_management' : 'back_to_audit_overview';
        
        const return_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t(return_button_text_key)}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('arrow_back') : '')
        });
        return_button.addEventListener('click', discard_and_return);
        bottom_actions_div.appendChild(return_button);
        plate_element_ref.appendChild(bottom_actions_div);
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