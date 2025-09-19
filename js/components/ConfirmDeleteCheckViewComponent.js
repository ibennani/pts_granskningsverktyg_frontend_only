// js/components/ConfirmDeleteCheckViewComponent.js

export const ConfirmDeleteCheckViewComponent = (function () {
    'use-strict';

    let app_container_ref;
    let router_ref;
    let params_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_escape_html = window.Helpers.escape_html;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        params_ref = _params;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
    }

    function handle_confirm_delete() {
        const { reqId, checkId } = params_ref;
        
        local_dispatch({
            type: local_StoreActionTypes.DELETE_CHECK_FROM_REQUIREMENT,
            payload: { requirementId: reqId, checkId: checkId }
        });
        
        router_ref('rulefile_edit_requirement', { id: reqId });
    }

    function handle_cancel_delete() {
        router_ref('rulefile_edit_requirement', { id: params_ref.reqId });
    }

    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate' });
        
        const { reqId, checkId } = params_ref;
        const current_state = local_getState();
        const requirement = current_state?.ruleFileContent?.requirements[reqId];
        const check = requirement?.checks.find(c => c.id === checkId);

        if (!check) {
            plate_element.appendChild(Helpers_create_element('h1', { text_content: t('error_internal') }));
            app_container_ref.appendChild(plate_element);
            return;
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('confirm_delete_check_title') }));
        
        const warning_box = Helpers_create_element('div', { class_name: 'warning-box' });
        warning_box.innerHTML = `<p>${t('confirm_delete_check_intro')}</p><blockquote>${Helpers_escape_html(check.condition)}</blockquote>`;
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