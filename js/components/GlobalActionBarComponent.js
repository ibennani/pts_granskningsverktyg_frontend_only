// js/components/GlobalActionBarComponent.js
import { SaveAuditButtonComponentFactory } from './SaveAuditButtonComponent.js';

export const GlobalActionBarComponentFactory = function () {
    'use-strict';

    const CSS_PATH = 'css/components/global_action_bar_component.css';
    let container_ref;

    // *** KORRIGERING: Ändra till ett enda beroendeobjekt ***
    let dependencies = {};

    let save_audit_button_component_instance = null;
    let save_audit_button_container_element = null;

    // *** KORRIGERING: init tar nu emot ett enda objekt med alla beroenden ***
    async function init(_container, _dependencies) {
        container_ref = _container;
        dependencies = _dependencies;

        if (dependencies.Helpers && dependencies.Helpers.load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await dependencies.Helpers.load_css(CSS_PATH);
            } catch (error) {
                console.warn("Failed to load CSS for GlobalActionBarComponent:", error);
            }
        }
        
        save_audit_button_container_element = dependencies.Helpers.create_element('div', { class_name: 'save-audit-button-container' });
        
        save_audit_button_component_instance = SaveAuditButtonComponentFactory(); 
        
        await save_audit_button_component_instance.init(
            save_audit_button_container_element,
            dependencies.getState,
            // *** KORRIGERING: Hämta SaveAuditLogic från beroendeobjektet ***
            dependencies.SaveAuditLogic.save_audit_to_json_file,
            dependencies.Translation.t,
            dependencies.NotificationComponent.show_global_message,
            dependencies.Helpers.create_element,
            dependencies.Helpers.get_icon_svg,
            dependencies.Helpers.load_css
        );
    }

    function render() {
        if (!container_ref) return;
        container_ref.innerHTML = '';

        // Hämta funktioner från beroendeobjektet för enklare åtkomst
        const { getState, Translation, Helpers } = dependencies;
        const t = Translation.t;

        const current_state = getState();
        const show_save_button = current_state && current_state.samples && current_state.samples.length > 0;

        const bar_element = Helpers.create_element('div', { class_name: 'global-action-bar' });

        const left_group = Helpers.create_element('div', { class_name: 'action-bar-group left' });
        if (show_save_button && save_audit_button_component_instance) {
            save_audit_button_component_instance.render();
            left_group.appendChild(save_audit_button_container_element);
        }
        bar_element.appendChild(left_group);

        const right_group = Helpers.create_element('div', { class_name: 'action-bar-group right' });
        
        const language_selector_container = Helpers.create_element('div', { class_name: 'language-selector-container' });
        const language_label = Helpers.create_element('label', {
            attributes: {for: `language-selector-${container_ref.id}`},
            text_content: t('language_switcher_label'),
            class_name: 'visually-hidden'
        });
        language_selector_container.appendChild(language_label);
        
        const language_selector = Helpers.create_element('select', {
            id: `language-selector-${container_ref.id}`,
            class_name: ['form-control', 'form-control-small']
        });
        const supported_languages = Translation.get_supported_languages();
        for (const lang_code in supported_languages) {
            const option = Helpers.create_element('option', { value: lang_code, text_content: supported_languages[lang_code] });
            language_selector.appendChild(option);
        }
        language_selector.value = Translation.get_current_language_code();
        language_selector.addEventListener('change', (event) => Translation.set_language(event.target.value));
        language_selector_container.appendChild(language_selector);
        right_group.appendChild(language_selector_container);
        
        const theme_toggle_button = Helpers.create_element('button', { 
            class_name: ['button', 'button-default'],
            attributes: { 'aria-live': 'polite' }
        });

        function update_theme_button_content(theme) {
            const icon_color = getComputedStyle(document.documentElement).getPropertyValue('--button-default-text').trim();
            if (theme === 'dark') {
                theme_toggle_button.innerHTML = `<span class="button-text">${t('light_mode')}</span>` + (Helpers.get_icon_svg ? Helpers.get_icon_svg('light_mode', [icon_color], 18) : '');
                theme_toggle_button.setAttribute('aria-label', t('light_mode'));
            } else {
                theme_toggle_button.innerHTML = `<span class="button-text">${t('dark_mode')}</span>` + (Helpers.get_icon_svg ? Helpers.get_icon_svg('dark_mode', [icon_color], 18) : '');
                theme_toggle_button.setAttribute('aria-label', t('dark_mode'));
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
        dependencies = {}; // Rensa beroenden
    }
    
    return {
        init,
        render,
        destroy
    };
};