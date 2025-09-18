// js/components/EditRulefileMainViewComponent.js

export const EditRulefileMainViewComponent = (function () {
    'use-strict';

    let app_container_ref;
    let router_ref;

    let local_getState;
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg;
    let NotificationComponent_get_global_message_element_reference;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
    }

    async function init(_app_container, _router_cb, _params, _getState) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
    }

    function render() {
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate' });
        
        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) {
            plate_element.appendChild(global_message_element);
        }

        const current_state = local_getState();
        const rulefile_title = current_state?.ruleFileContent?.metadata?.title || t('unknown_rulefile');

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('edit_rulefile_title') }));
        plate_element.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('edit_rulefile_intro', { rulefileTitle: rulefile_title }) }));

        const button_group = Helpers_create_element('div', { class_name: 'button-group', style: 'flex-direction: column; align-items: flex-start; gap: 1rem;' });
        
        const edit_reqs_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            html_content: `<span>${t('edit_rulefile_requirements_button')}</span>` + Helpers_get_icon_svg('list')
        });
        edit_reqs_button.addEventListener('click', () => router_ref('rulefile_requirements'));
        
        const edit_meta_button = Helpers_create_element('button', {
            class_name: ['button', 'button-secondary'],
            html_content: `<span>${t('edit_rulefile_metadata_button')}</span>` + Helpers_get_icon_svg('edit')
        });
        // TODO: Peka denna till rätt vy när den är skapad. För nu är den inaktiv.
        edit_meta_button.setAttribute('aria-disabled', 'true');
        edit_meta_button.style.cursor = 'not-allowed';
        edit_meta_button.title = t('feature_not_implemented_yet');
        
        button_group.append(edit_reqs_button, edit_meta_button);
        plate_element.appendChild(button_group);

        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 3rem; justify-content: space-between;' });

        const back_button = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            html_content: `<span>${t('back_to_start_view')}</span>` + Helpers_get_icon_svg('arrow_back')
        });
        back_button.addEventListener('click', () => router_ref('upload'));
        
        const save_button = Helpers_create_element('button', {
            class_name: ['button', 'button-success'],
            html_content: `<span>${t('save_and_download_rulefile')}</span>` + Helpers_get_icon_svg('save')
        });
        save_button.setAttribute('aria-disabled', 'true');
        save_button.style.cursor = 'not-allowed';
        save_button.title = t('feature_not_implemented_yet');

        actions_div.append(back_button, save_button);
        plate_element.appendChild(actions_div);

        app_container_ref.appendChild(plate_element);
    }

    function destroy() {
        app_container_ref.innerHTML = '';
    }

    return { init, render, destroy };
})();