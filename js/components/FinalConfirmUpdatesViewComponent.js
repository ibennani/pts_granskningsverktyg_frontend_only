// js/components/FinalConfirmUpdatesViewComponent.js

export const FinalConfirmUpdatesViewComponent = (function () {
    'use-strict';

    let app_container_ref;
    let router_ref;
    
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element;
    let NotificationComponent_get_global_message_element_reference;

    let plate_element_ref;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
    }
    
    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
    }

    function handle_confirm() {
        const t = Translation_t;
        local_dispatch({ type: local_StoreActionTypes.CONFIRM_ALL_REVIEWED_REQUIREMENTS });
        if (window.NotificationComponent) {
            window.NotificationComponent.show_global_message(t('all_updated_assessments_confirmed_toast'), 'success');
        }
        router_ref('audit_overview');
    }

    function handle_return_to_list() {
        router_ref('confirm_updates');
    }
    
    function handle_return_to_overview() {
        router_ref('audit_overview');
    }

    function render() {
        assign_globals_once();
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate' });
        app_container_ref.appendChild(plate_element_ref);

        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) {
            plate_element_ref.appendChild(global_message_element);
        }

        const state = local_getState();
        const total_count = state.samples.flatMap(s => Object.values(s.requirementResults || {})).filter(r => r.needsReview === true).length;

        plate_element_ref.appendChild(Helpers_create_element('h1', { text_content: t('final_confirm_updates_title') }));
        plate_element_ref.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('final_confirm_updates_intro', { count: total_count }) }));
        
        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: { marginTop: '1.5rem', justifyContent: 'flex-start' } });

        const confirm_button = Helpers_create_element('button', {
            class_name: ['button', 'button-success'],
            text_content: t('final_confirm_updates_confirm_button')
        });
        confirm_button.addEventListener('click', handle_confirm);

        const return_list_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            text_content: t('final_confirm_updates_return_list_button')
        });
        return_list_button.addEventListener('click', handle_return_to_list);
        
        const return_overview_button = Helpers_create_element('button', {
            class_name: ['button', 'button-danger'],
            text_content: t('final_confirm_updates_return_overview_button')
        });
        return_overview_button.addEventListener('click', handle_return_to_overview);

        actions_div.append(confirm_button, return_list_button, return_overview_button);
        plate_element_ref.appendChild(actions_div);
    }

    function destroy() {
        app_container_ref.innerHTML = '';
        plate_element_ref = null;
    }

    return {
        init,
        render,
        destroy
    };
})();