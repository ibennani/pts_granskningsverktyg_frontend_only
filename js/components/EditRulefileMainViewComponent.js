// js/components/EditRulefileMainViewComponent.js

export const EditRulefileMainViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/edit_rulefile_main_view_component.css';

    let app_container_ref;
    let router_ref;

    let local_getState;
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css;
    let NotificationComponent_get_global_message_element_reference;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation.t;
        Helpers_create_element = window.Helpers.create_element;
        Helpers_get_icon_svg = window.Helpers.get_icon_svg;
        Helpers_load_css = window.Helpers.load_css;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
    }

    async function init(_app_container, _router_cb, _params, _getState) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;

        if (Helpers_load_css) {
            try {
                await Helpers_load_css(CSS_PATH);
            } catch (error) {
                console.warn('[EditRulefileMainViewComponent] Failed to load CSS', error);
            }
        }
    }

    function render() {
        const t = Translation_t;
        const rulefile_title = local_getState()?.ruleFileContent?.metadata?.title || t('unknown_rulefile');

        app_container_ref.innerHTML = '';
        const plate_element = Helpers_create_element('div', { class_name: ['content-plate', 'edit-rulefile-plate'] });

        const hero_section = Helpers_create_element('section', { class_name: ['section', 'edit-rulefile-hero'] });
        hero_section.appendChild(Helpers_create_element('h1', { text_content: t('edit_rulefile_title') }));
        hero_section.appendChild(Helpers_create_element('p', {
            class_name: 'view-intro-text',
            text_content: t('edit_rulefile_intro', { rulefileTitle: rulefile_title })
        }));

        const action_row = Helpers_create_element('div', { class_name: 'edit-rulefile-action-row' });
        const edit_reqs_button = Helpers_create_element('button', {
            class_name: ['button', 'button--primary'],
            attributes: { type: 'button' },
            html_content: `<span>${t('edit_rulefile_requirements_button')}</span>` + Helpers_get_icon_svg('list')
        });
        edit_reqs_button.addEventListener('click', () => router_ref('rulefile_requirements'));

        const edit_meta_button = Helpers_create_element('button', {
            class_name: ['button', 'button--secondary'],
            attributes: { type: 'button' },
            html_content: `<span>${t('edit_rulefile_metadata_button')}</span>` + Helpers_get_icon_svg('edit')
        });
        edit_meta_button.addEventListener('click', () => router_ref('rulefile_metadata'));

        action_row.append(edit_reqs_button, edit_meta_button);
        hero_section.appendChild(action_row);
        plate_element.appendChild(hero_section);

        const actions_section = Helpers_create_element('section', { class_name: ['section', 'edit-rulefile-actions-section'] });
        const actions_div = Helpers_create_element('div', { class_name: 'form-actions' });
        const back_button = Helpers_create_element('button', {
            class_name: ['button', 'button--secondary'],
            html_content: `<span>${t('back_to_start_view')}</span>` + Helpers_get_icon_svg('arrow_back')
        });
        back_button.addEventListener('click', () => router_ref('upload'));

        actions_div.append(back_button);
        actions_section.appendChild(actions_div);
        plate_element.appendChild(actions_section);

        app_container_ref.appendChild(plate_element);
    }

    function destroy() {
        app_container_ref.innerHTML = '';
    }

    return { init, render, destroy };
})();
