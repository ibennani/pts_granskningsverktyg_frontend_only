// js/components/GlobalActionBarComponent.js
import { SaveAuditButtonComponentFactory } from './SaveAuditButtonComponent.js'; // Ändrad import

export const GlobalActionBarComponentFactory = function () {
    'use-strict';

    const CSS_PATH = 'css/components/global_action_bar_component.css';
    let container_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let Translation_t;
    let Translation_set_language;
    let Translation_get_current_language_code;
    let Translation_get_supported_languages;
    let Helpers_create_element;
    let Helpers_get_icon_svg;
    let Helpers_load_css;
    let NotificationComponent_show_global_message;

    let save_audit_button_component_instance = null;
    let save_audit_button_container_element = null;

    async function init(
        _container,
        _getState, _dispatch, _StoreActionTypes,
        _Translation, _Helpers, _NotificationComponent
    ) {
        container_ref = _container;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        Translation_t = _Translation.t;
        Translation_set_language = _Translation.set_language;
        Translation_get_current_language_code = _Translation.get_current_language_code;
        Translation_get_supported_languages = _Translation.get_supported_languages;

        Helpers_create_element = _Helpers.create_element;
        Helpers_get_icon_svg = _Helpers.get_icon_svg;
        Helpers_load_css = _Helpers.load_css;
        
        NotificationComponent_show_global_message = _NotificationComponent.show_global_message;

        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await Helpers_load_css(CSS_PATH);
            } catch (error) {
                console.warn("Failed to load CSS for GlobalActionBarComponent:", error);
            }
        }
        
        save_audit_button_container_element = Helpers_create_element('div', { class_name: 'save-audit-button-container' });
        
        // Skapa en ny, unik instans av SaveAuditButtonComponent
        save_audit_button_component_instance = SaveAuditButtonComponentFactory(); 
        
        await save_audit_button_component_instance.init(
            save_audit_button_container_element,
            local_getState,
            window.SaveAuditLogic.save_audit_to_json_file,
            Translation_t,
            NotificationComponent_show_global_message,
            Helpers_create_element,
            Helpers_get_icon_svg,
            Helpers_load_css
        );
    }

    function render() {
        if (!container_ref) return;
        container_ref.innerHTML = '';

        const current_state = local_getState();
        const show_save_button = current_state && current_state.samples && current_state.samples.length > 0;

        const bar_element = Helpers_create_element('div', { class_name: 'global-action-bar' });

        const left_group = Helpers_create_element('div', { class_name: 'action-bar-group left' });
        if (show_save_button && save_audit_button_component_instance) {
            save_audit_button_component_instance.render();
            left_group.appendChild(save_audit_button_container_element);
        }
        bar_element.appendChild(left_group);

        const right_group = Helpers_create_element('div', { class_name: 'action-bar-group right' });
        
        const language_selector_container = Helpers_create_element('div', { class_name: 'language-selector-container' });
        const language_label = Helpers_create_element('label', {
            attributes: {for: `language-selector-${container_ref.id}`},
            text_content: Translation_t('language_switcher_label'),
            class_name: 'visually-hidden'
        });
        language_selector_container.appendChild(language_label);
        
        const language_selector = Helpers_create_element('select', {
            id: `language-selector-${container_ref.id}`,
            class_name: ['form-control', 'form-control-small']
        });
        const supported_languages = Translation_get_supported_languages();
        for (const lang_code in supported_languages) {
            const option = Helpers_create_element('option', { value: lang_code, text_content: supported_languages[lang_code] });
            language_selector.appendChild(option);
        }
        language_selector.value = Translation_get_current_language_code();
        language_selector.addEventListener('change', (event) => Translation_set_language(event.target.value));
        language_selector_container.appendChild(language_selector);
        right_group.appendChild(language_selector_container);
        
        const theme_toggle_button = Helpers_create_element('button', { 
            class_name: ['button', 'button-default'],
            attributes: { 'aria-live': 'polite' }
        });

        function update_theme_button_content(theme) {
            const icon_color = getComputedStyle(document.documentElement).getPropertyValue('--button-default-text').trim();
            if (theme === 'dark') {
                theme_toggle_button.innerHTML = `<span class="button-text">${Translation_t('light_mode')}</span>` + (Helpers_get_icon_svg('light_mode', [icon_color], 18) || '');
                theme_toggle_button.setAttribute('aria-label', Translation_t('light_mode'));
            } else {
                theme_toggle_button.innerHTML = `<span class="button-text">${Translation_t('dark_mode')}</span>` + (Helpers_get_icon_svg('dark_mode', [icon_color], 18) || '');
                theme_toggle_button.setAttribute('aria-label', Translation_t('dark_mode'));
            }
        }

        function set_theme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme_preference', theme);
            update_theme_button_content(theme);
        }

        theme_toggle_button.addEventListener('click', () => {
            const current_theme = document.documentElement.getAttribute('data-theme') || 'light';
            set_theme(current_theme === 'dark' ? 'light' : 'dark');
        });

        const current_theme = document.documentElement.getAttribute('data-theme') || 'light';
        update_theme_button_content(current_theme);
        right_group.appendChild(theme_toggle_button);

        bar_element.appendChild(right_group);
        container_ref.appendChild(bar_element);
    }

    function destroy() {
        if (container_ref) container_ref.innerHTML = '';
        if (save_audit_button_component_instance) {
            save_audit_button_component_instance.destroy();
        }
    }
    
    return {
        init,
        render,
        destroy
    };
};