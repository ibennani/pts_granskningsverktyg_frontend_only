// js/components/ConfirmDeleteRequirementViewComponent.js

export const ConfirmDeleteRequirementViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/confirm_delete_requirement_view_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css, Helpers_escape_html;
    let NotificationComponent_show_global_message, NotificationComponent_get_global_message_element_reference;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_load_css = window.Helpers.load_css;
        Helpers_escape_html = window.Helpers.escape_html;
        NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        
        await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
    }

    function handle_confirm_delete() {
        const t = Translation_t;
        const requirement_id = params_ref?.id;
        
        if (!requirement_id) {
            NotificationComponent_show_global_message(t('error_internal'), 'error');
            router_ref('rulefile_requirements');
            return;
        }

        local_dispatch({
            type: local_StoreActionTypes.DELETE_REQUIREMENT_DEFINITION,
            payload: { requirementId: requirement_id }
        });

        // Spara information för fokushantering *innan* vi navigerar
        sessionStorage.setItem('focusOnH1AfterLoad', 'true');
        
        NotificationComponent_show_global_message(t('rulefile_requirement_deleted'), 'success');
        router_ref('rulefile_requirements');
    }

    function handle_cancel_delete() {
        const requirement_id = params_ref?.id;
        
        // Spara information om vilken knapp som ska få fokus
        if (requirement_id) {
            sessionStorage.setItem('focusAfterLoad', `button[data-action="delete-req"][data-requirement-id="${requirement_id}"]`);
        }
        
        router_ref('rulefile_requirements');
    }

    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate' });
        
        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) {
            plate_element.appendChild(global_message_element);
        }

        const requirement_id = params_ref?.id;
        const current_state = local_getState();
        const requirement = current_state?.ruleFileContent?.requirements[requirement_id];

        if (!requirement) {
            plate_element.appendChild(Helpers_create_element('h1', { text_content: t('error_internal') }));
            plate_element.appendChild(Helpers_create_element('p', { text_content: t('error_loading_sample_or_requirement_data') }));
            app_container_ref.appendChild(plate_element);
            return;
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('rulefile_confirm_delete_title') }));
        
        const warning_box = Helpers_create_element('div', { class_name: 'warning-box' });
        warning_box.innerHTML = `
            <p>${t('rulefile_confirm_delete_intro', { requirementTitle: `<strong>${Helpers_escape_html(requirement.title)}</strong>` })}</p>
            <p>${t('rulefile_confirm_delete_warning')}</p>
        `;
        plate_element.appendChild(warning_box);

        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem;' });

        const confirm_button = Helpers_create_element('button', {
            class_name: ['button', 'button-danger'],
            html_content: `<span>${t('rulefile_confirm_delete_button')}</span>` + Helpers_get_icon_svg('delete')
        });
        confirm_button.addEventListener('click', handle_confirm_delete);

        const cancel_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t('cancel_and_return_to_list')}</span>`
        });
        cancel_button.addEventListener('click', handle_cancel_delete);

        actions_div.append(cancel_button, confirm_button);
        plate_element.appendChild(actions_div);

        app_container_ref.appendChild(plate_element);
    }

    function destroy() {
        app_container_ref.innerHTML = '';
    }

    return { init, render, destroy };
})();