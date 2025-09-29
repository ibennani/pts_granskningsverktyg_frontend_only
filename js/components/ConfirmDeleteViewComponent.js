// js/components/ConfirmDeleteViewComponent.js

export const ConfirmDeleteViewComponent = (function () {
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

    function get_config_for_delete_type(type, state, params) {
        const { reqId, checkId, pcId } = params;
        const requirement = state?.ruleFileContent?.requirements[reqId];

        switch (type) {
            case 'requirement':
                return {
                    isValid: !!requirement,
                    titleKey: 'rulefile_confirm_delete_title',
                    introKey: 'rulefile_confirm_delete_intro',
                    warningKey: 'rulefile_confirm_delete_warning',
                    itemText: requirement?.title,
                    itemContext: { requirementTitle: `<strong>${Helpers_escape_html(requirement?.title)}</strong>` },
                    dispatchAction: {
                        type: local_StoreActionTypes.DELETE_REQUIREMENT_DEFINITION,
                        payload: { requirementId: reqId }
                    },
                    returnRoute: 'rulefile_requirements',
                    focusOnSuccess: 'h1',
                    focusOnCancelSelector: `button[data-action="delete-req"][data-requirement-id="${reqId}"]`
                };
            case 'check':
                const check = requirement?.checks.find(c => c.id === checkId);
                return {
                    isValid: !!check,
                    titleKey: 'confirm_delete_check_title',
                    introKey: 'confirm_delete_check_intro',
                    itemText: check?.condition,
                    dispatchAction: {
                        type: local_StoreActionTypes.DELETE_CHECK_FROM_REQUIREMENT,
                        payload: { requirementId: reqId, checkId: checkId }
                    },
                    returnRoute: 'rulefile_edit_requirement',
                    returnParams: { id: reqId },
                    focusOnSuccess: '#checks-section-heading',
                    focusOnCancelSelector: `.check-item-edit[data-check-id="${checkId}"] button[data-action="delete-check"]`
                };
            case 'criterion':
                const parentCheck = requirement?.checks.find(c => c.id === checkId);
                const criterion = parentCheck?.passCriteria.find(pc => pc.id === pcId);
                return {
                    isValid: !!criterion,
                    titleKey: 'confirm_delete_criterion_title',
                    introKey: 'confirm_delete_criterion_intro',
                    itemText: criterion?.requirement,
                    dispatchAction: {
                        type: local_StoreActionTypes.DELETE_CRITERION_FROM_CHECK,
                        payload: { requirementId: reqId, checkId: checkId, passCriterionId: pcId }
                    },
                    returnRoute: 'rulefile_edit_requirement',
                    returnParams: { id: reqId },
                    focusOnSuccess: '#checks-section-heading',
                    focusOnCancelSelector: `.pc-item-edit[data-pc-id="${pcId}"] button[data-action="delete-pass-criterion"]`
                };
            default:
                return { isValid: false };
        }
    }

    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate' });
        
        const deleteType = params_ref?.type;
        const config = get_config_for_delete_type(deleteType, local_getState(), params_ref);

        if (!config.isValid) {
            plate_element.appendChild(Helpers_create_element('h1', { text_content: t('error_internal') }));
            plate_element.appendChild(Helpers_create_element('p', { text_content: t('error_loading_sample_or_requirement_data') }));
            app_container_ref.appendChild(plate_element);
            return;
        }

        const handle_confirm = () => {
            local_dispatch(config.dispatchAction);
            if (config.focusOnSuccess === 'h1') {
                sessionStorage.setItem('focusOnH1AfterLoad', 'true');
            } else {
                sessionStorage.setItem('focusAfterLoad', config.focusOnSuccess); 
            }
            router_ref(config.returnRoute, config.returnParams || {});
        };

        const handle_cancel = () => {
            sessionStorage.setItem('focusAfterLoad', config.focusOnCancelSelector);
            router_ref(config.returnRoute, config.returnParams || {});
        };
        
        plate_element.appendChild(Helpers_create_element('h1', { text_content: t(config.titleKey) }));
        
        const warning_box = Helpers_create_element('div', { class_name: 'warning-box' });
        let introHTML = `<p>${t(config.introKey, config.itemContext || {})}</p>`;
        if (config.itemText) {
            introHTML += `<blockquote>${Helpers_escape_html(config.itemText)}</blockquote>`;
        }
        if (config.warningKey) {
            introHTML += `<p>${t(config.warningKey)}</p>`;
        }
        warning_box.innerHTML = introHTML;
        plate_element.appendChild(warning_box);

        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem;' });

        const confirm_button = Helpers_create_element('button', {
            class_name: ['button', 'button-danger'],
            html_content: `<span>${t('rulefile_confirm_delete_button')}</span>` + Helpers_get_icon_svg('delete')
        });
        confirm_button.addEventListener('click', handle_confirm);

        const cancel_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t('cancel_and_return_to_list')}</span>`
        });
        cancel_button.addEventListener('click', handle_cancel);

        actions_div.append(confirm_button, cancel_button);
        plate_element.appendChild(actions_div);

        app_container_ref.appendChild(plate_element);
    }

    function destroy() {
        app_container_ref.innerHTML = '';
    }

    return { init, render, destroy };
})();