// js/components/FinalConfirmUpdatesViewComponent.js

export const FinalConfirmUpdatesViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/final_confirm_updates_view_component.css';

    let app_container_ref;
    let router_ref;
    
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_load_css;
    let NotificationComponent_get_global_message_element_reference;

    let plate_element_ref;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_load_css = window.Helpers?.load_css;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
    }
    
    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (Helpers_load_css) {
            try {
                await Helpers_load_css(CSS_PATH);
            } catch (error) {
                console.warn('[FinalConfirmUpdatesViewComponent] Unable to load CSS', error);
            }
        }
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

        const hero_section = Helpers_create_element('section', { class_name: ['section', 'final-confirm-hero'] });
        const heading = Helpers_create_element('h1', {
            attributes: { tabindex: '-1' },
            text_content: t('final_confirm_updates_title')
        });
        hero_section.appendChild(heading);
        plate_element_ref.appendChild(hero_section);

        const summary_section = Helpers_create_element('section', { class_name: ['section', 'final-confirm-summary'] });
        const summary_row = Helpers_create_element('div', { class_name: 'final-confirm-summary-row' });
        summary_row.appendChild(Helpers_create_element('p', { text_content: t('final_confirm_updates_intro', { count: total_count }) }));
        summary_section.appendChild(summary_row);
        plate_element_ref.appendChild(summary_section);

        const actions_section = Helpers_create_element('section', { class_name: ['section', 'final-confirm-actions-section'] });
        const actions_div = Helpers_create_element('div', { class_name: ['form-actions', 'final-confirm-actions'] });

        const confirm_button = Helpers_create_element('button', {
            class_name: ['button', 'button--success'],
            text_content: t('final_confirm_updates_confirm_button')
        });
        confirm_button.addEventListener('click', handle_confirm);

        const return_list_button = Helpers_create_element('button', {
            class_name: ['button', 'button--secondary'],
            text_content: t('final_confirm_updates_return_list_button')
        });
        return_list_button.addEventListener('click', handle_return_to_list);
        
        const return_overview_button = Helpers_create_element('button', {
            class_name: ['button', 'button--danger'],
            text_content: t('final_confirm_updates_return_overview_button')
        });
        return_overview_button.addEventListener('click', handle_return_to_overview);

        actions_div.append(confirm_button, return_list_button, return_overview_button);
        actions_section.appendChild(actions_div);
        plate_element_ref.appendChild(actions_section);
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