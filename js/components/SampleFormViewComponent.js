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
    let Helpers_create_element;
    let NotificationComponent_get_global_message_element_reference;

    let add_sample_form_component_instance;
    let add_sample_form_container_element;
    let plate_element_ref;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
    }

    // Callback-funktion som skickas till formulärkomponenten
    // När formuläret sparas navigerar vi tillbaka till översikten
    function on_form_saved_or_updated() {
        router_ref('audit_overview');
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
        // Initiera formulärkomponenten och ge den vår "tillbaka till översikten"-funktion som callback
        await add_sample_form_component_instance.init(
            add_sample_form_container_element,
            on_form_saved_or_updated, 
            () => router_ref('audit_overview'), // Även "visa lista"-knappen går tillbaka
            local_getState, 
            local_dispatch, 
            local_StoreActionTypes
        );
    }

    function render() {
        assign_globals_once();
        const t = Translation_t;
        const sample_id_to_edit = params_ref?.editSampleId || null;

        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate' });
        app_container_ref.appendChild(plate_element_ref);

        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) {
            plate_element_ref.appendChild(global_message_element);
        }

        // Sätt en dynamisk rubrik beroende på om vi redigerar eller lägger till
        const title_text = sample_id_to_edit ? t('edit_sample') : t('add_new_sample');
        plate_element_ref.appendChild(Helpers_create_element('h1', { text_content: title_text }));
        
        // Rendera formulärkomponenten inuti vår nya vy
        add_sample_form_component_instance.render(sample_id_to_edit);
        plate_element_ref.appendChild(add_sample_form_container_element);
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