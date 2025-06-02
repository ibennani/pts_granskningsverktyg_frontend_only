// js/main.js

// Importer för vyer som hanteras direkt av main.js router
import { UploadViewComponent } from './components/UploadViewComponent.js';
import { MetadataViewComponent } from './components/MetadataViewComponent.js';
import { SampleManagementViewComponent } from './components/SampleManagementViewComponent.js';
import { AuditOverviewComponent } from './components/AuditOverviewComponent.js';
import { RequirementListComponent } from './components/RequirementListComponent.js';
import { RequirementAuditComponent } from './components/RequirementAuditComponent.js';

// Importera från den nya storen
import { getState, dispatch, subscribe, StoreActionTypes, StoreInitialState } from './state.js'; 

(function () {
    'use-strict';

    const app_container = document.getElementById('app-container');
    if (!app_container) {
        console.error("[Main.js] CRITICAL: app_container element not found in DOM!");
        document.body.innerHTML = "<p style='color:red; font-weight:bold;'>Application Error: App container not found. Check HTML and script load order.</p>";
        return;
    }

    let current_view_component_instance = null;
    let current_view_name_rendered = null;
    let current_view_params_rendered_json = "{}"; 

    // === Variabler för UI-kontroller, se till att de är deklarerade i detta scope ===
    let theme_toggle_button_element = null;
    let language_selector_element = null;
    let language_label_element = null; // Om du använder en synlig label utanför select

    function get_t_fallback() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (Main t not found)";
            };
    }

    function update_app_chrome_texts() {
        const t = get_t_fallback();
        if (!window.Translation || typeof window.Translation.t !== 'function') {
            console.warn("[Main.js] update_app_chrome_texts: Translation.t is not available.");
            return;
        }
        document.title = t('app_title');
        
        // Uppdatera temaknappens text/ikon
        if (theme_toggle_button_element && typeof theme_toggle_button_element.updateContent === 'function') { // Kolla om updateContent-funktionen finns
            const current_theme = document.documentElement.getAttribute('data-theme') || 'light';
            theme_toggle_button_element.updateContent(current_theme); // Anropa den sparade funktionen
        } else if (theme_toggle_button_element) {
            // Fallback om updateContent inte är satt, försök återskapa logiken här (mindre idealiskt)
             const current_theme = document.documentElement.getAttribute('data-theme') || 'light';
             let icon_svg_string;
             let button_label_text;
             let icon_color_val = getComputedStyle(document.documentElement).getPropertyValue('--button-default-text').trim();
             if (!icon_color_val || icon_color_val === "initial" || icon_color_val === "inherit" || icon_color_val === "") {
                 icon_color_val = (current_theme === 'dark') ? 'var(--text-color)' : 'var(--text-color)';
             }
             if (current_theme === 'dark') {
                 icon_svg_string = window.Helpers.get_icon_svg('light_mode', [icon_color_val], 18);
                 button_label_text = t('light_mode');
             } else {
                 icon_svg_string = window.Helpers.get_icon_svg('dark_mode', [icon_color_val], 18);
                 button_label_text = t('dark_mode');
             }
             theme_toggle_button_element.innerHTML = `<span> ${button_label_text}</span>` + (icon_svg_string || '');
        }


        // Uppdatera språkval och dess label
        if (language_selector_element && typeof Translation.get_supported_languages === 'function' && typeof Translation.get_current_language_code === 'function') {
            const supported_languages = Translation.get_supported_languages();
            // Behåll nuvarande val, men uppdatera texten i option-elementen om de kan ha ändrats (ovanligt men säkrast)
            Array.from(language_selector_element.options).forEach(option => {
                if (supported_languages[option.value]) {
                    option.textContent = supported_languages[option.value];
                }
            });
            language_selector_element.value = Translation.get_current_language_code(); // Säkerställ att rätt värde är valt
            if(language_label_element) language_label_element.textContent = t('language_switcher_label');
        }
    }

    function init_ui_controls() {
        const t = get_t_fallback();
        if (!window.Translation || typeof window.Translation.t !== 'function' || !window.Helpers || typeof window.Helpers.create_element !== 'function') {
            console.error("[Main.js] init_ui_controls: Core dependencies (Translation or Helpers) not available!");
            return;
        }
        
        let controls_wrapper = document.body.querySelector('.global-controls');
        if (controls_wrapper) {
            controls_wrapper.innerHTML = ''; // Rensa om den redan finns, för att undvika dubbletter vid het omladdning
        } else {
            controls_wrapper = Helpers.create_element('div', { class_name: 'global-controls'});
            document.body.appendChild(controls_wrapper); // Lägg till i body om den inte finns
        }


        const language_selector_container = Helpers.create_element('div', { class_name: 'language-selector-container' });
        language_label_element = Helpers.create_element('label', {
            attributes: {for: 'language-selector'},
            text_content: t('language_switcher_label'), // Kommer att uppdateras av update_app_chrome_texts
            class_name: 'visually-hidden' // Dölj visuellt, men tillgänglig för skärmläsare
        });
        language_selector_container.appendChild(language_label_element);

        language_selector_element = Helpers.create_element('select', {
            id: 'language-selector',
            class_name: ['form-control', 'form-control-small'] // Använd globala klasser
        });

        if (typeof Translation.get_supported_languages === 'function' && typeof Translation.get_current_language_code === 'function' && typeof Translation.set_language === 'function') {
            const supported_languages = Translation.get_supported_languages();
            for (const lang_code in supported_languages) {
                const option = Helpers.create_element('option', { value: lang_code, text_content: supported_languages[lang_code] });
                language_selector_element.appendChild(option);
            }
            language_selector_element.value = Translation.get_current_language_code();
            language_selector_element.addEventListener('change', async (event) => {
                if (window.NotificationComponent && typeof window.NotificationComponent.clear_global_message === 'function') NotificationComponent.clear_global_message();
                const selected_lang_code = event.target.value;
                await Translation.set_language(selected_lang_code); // Detta kommer att trigga 'languageChanged'-eventet
            });
        } else { console.error("[Main.js] Translation module functions missing for language selector."); }
        
        language_selector_container.appendChild(language_selector_element);
        controls_wrapper.appendChild(language_selector_container);

        theme_toggle_button_element = Helpers.create_element('button', { 
            id: 'theme-toggle', 
            class_name: ['button', 'button-default'] // Använd globala klasser
        });

        // Spara en funktion på knappen för att kunna uppdatera dess innehåll
        theme_toggle_button_element.updateContent = function(theme) {
            const t_local = get_t_fallback(); // Använd intern fallback om Translation inte är redo
            if (!this || !window.Helpers || !window.Helpers.get_icon_svg) return;
            
            let icon_svg_string;
            let button_label_text;
            // Försök hämta dynamiskt från CSS, annars fallback
            let icon_color_val = getComputedStyle(document.documentElement).getPropertyValue('--button-default-text').trim();
            if (!icon_color_val || icon_color_val === "initial" || icon_color_val === "inherit" || icon_color_val === "") {
                icon_color_val = (theme === 'dark') ? '#eafaf9' : '#21867c'; // Fallback-färger
            }

            if (theme === 'dark') {
                icon_svg_string = Helpers.get_icon_svg('light_mode', [icon_color_val], 18);
                button_label_text = t_local('light_mode');
            } else {
                icon_svg_string = Helpers.get_icon_svg('dark_mode', [icon_color_val], 18);
                button_label_text = t_local('dark_mode');
            }
            this.innerHTML = `<span> ${button_label_text}</span>` + (icon_svg_string || '');
        };
        
        function set_theme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme_preference', theme);
            if (theme_toggle_button_element && typeof theme_toggle_button_element.updateContent === 'function') {
                theme_toggle_button_element.updateContent(theme);
            }
        }

        theme_toggle_button_element.addEventListener('click', () => {
            const current_theme_val = document.documentElement.getAttribute('data-theme') || 'light';
            set_theme(current_theme_val === 'dark' ? 'light' : 'dark');
        });
        controls_wrapper.appendChild(theme_toggle_button_element);

        // Sätt initialt tema och knappinnehåll
        const saved_theme_val = localStorage.getItem('theme_preference');
        const initial_theme_val = saved_theme_val || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        set_theme(initial_theme_val); // Detta kommer också att anropa updateContent på knappen

        console.log("[Main.js] UI Controls (language/theme) initialized and added to DOM.");
    }


    function navigate_and_set_hash(target_view_name, target_params = {}) {
        const target_hash_part = target_params && Object.keys(target_params).length > 0 ?
            `${target_view_name}?${new URLSearchParams(target_params).toString()}` :
            target_view_name;
        const new_hash = `#${target_hash_part}`;

        if (window.location.hash === new_hash) {
            render_view(target_view_name, target_params);
        } else {
            window.location.hash = new_hash;
        }
    }

    async function render_view(view_name_to_render, params_to_render = {}) {
        const t = get_t_fallback();
        if (!window.Translation || typeof window.Translation.t !== 'function' || !window.Helpers || !window.Helpers.escape_html) {
            console.error("[Main.js] render_view: Core dependencies missing!");
            if(app_container) app_container.innerHTML = `<p>${t('critical_error_system_render_view_failed')}</p>`;
            return;
        }
        
        current_view_name_rendered = view_name_to_render;
        current_view_params_rendered_json = JSON.stringify(params_to_render);

        if (!app_container) { console.error("[Main.js] App container not found in render_view!"); return; }
        
        if (current_view_component_instance && typeof current_view_component_instance.destroy === 'function') {
            current_view_component_instance.destroy();
        }
        app_container.innerHTML = ''; 
        current_view_component_instance = null;

        let ComponentClass;
        switch (view_name_to_render) {
            case 'upload': ComponentClass = UploadViewComponent; break;
            case 'metadata': ComponentClass = MetadataViewComponent; break;
            case 'sample_management': ComponentClass = SampleManagementViewComponent; break;
            case 'audit_overview': ComponentClass = AuditOverviewComponent; break;
            case 'requirement_list': ComponentClass = RequirementListComponent; break;
            case 'requirement_audit': ComponentClass = RequirementAuditComponent; break;
            default:
                console.error(`[Main.js] View "${view_name_to_render}" not found in render_view switch.`);
                app_container.innerHTML = `<p>${t("error_view_not_found", {viewName: Helpers_escape_html(view_name_to_render)})}</p>`;
                return;
        }

        try {
            current_view_component_instance = ComponentClass; 
            
            if (!current_view_component_instance || typeof current_view_component_instance.init !== 'function' || typeof current_view_component_instance.render !== 'function') {
                console.error(`[Main.js] Component for view ${view_name_to_render} is UNDEFINED or not a valid component object.`);
                app_container.innerHTML = `<p>${t("error_component_load", {viewName: Helpers_escape_html(view_name_to_render)})}</p>`;
                return;
            }

            await current_view_component_instance.init(
                app_container, 
                navigate_and_set_hash, 
                params_to_render,
                getState, 
                dispatch,
                StoreActionTypes,
                subscribe // Skicka med subscribe här
            );
            current_view_component_instance.render();

        } catch (error) {
            console.error(`[Main.js] CATCH BLOCK: Error during view ${view_name_to_render} lifecycle:`, error);
            if(app_container) app_container.innerHTML = `<p>${t("error_loading_view", {viewName: Helpers_escape_html(view_name_to_render), errorMessage: error.message})}</p>`;
            if (window.NotificationComponent && typeof window.NotificationComponent.show_global_message === 'function') {
                NotificationComponent.show_global_message(t("error_loading_view_details", {viewName: view_name_to_render}), 'error');
            }
        }
    }

    function handle_hash_change() { 
        const hash = window.location.hash.substring(1);
        const [view_name_from_hash, ...param_pairs] = hash.split('?');
        const params = {};
        if (param_pairs.length > 0) {
            const query_string = param_pairs.join('?');
            const url_params = new URLSearchParams(query_string);
            for (const [key, value] of url_params) { params[key] = value; }
         }

        let target_view = 'upload';
        let target_params = params;
        
        const current_global_state = getState();

        if (view_name_from_hash) {
            target_view = view_name_from_hash;
        } else if (current_global_state && current_global_state.ruleFileContent) {
            target_view = 'audit_overview';
            target_params = {};
        }
        
        const new_params_json = JSON.stringify(target_params);
        if (current_view_name_rendered !== target_view || current_view_params_rendered_json !== new_params_json) {
            render_view(target_view, target_params);
        }
    }

    function on_language_changed_event() { 
        update_app_chrome_texts();
        if (current_view_name_rendered) {
            const hash = window.location.hash.substring(1);
            const [, ...param_pairs] = hash.split('?');
            const params_for_rerender = {};
            if (param_pairs.length > 0) {
                const query_string = param_pairs.join('?');
                const url_params = new URLSearchParams(query_string);
                for (const [key, value] of url_params) { params_for_rerender[key] = value; }
            }
            render_view(current_view_name_rendered, params_for_rerender);
        }
    }
    
    async function init_app() { 
        const t_init = get_t_fallback();

        if (window.Translation && typeof window.Translation.ensure_initial_load === 'function') {
            await window.Translation.ensure_initial_load();
        } else {
            console.error("[Main.js] CRITICAL: Translation module or ensure_initial_load not found!");
            if(app_container) app_container.innerHTML = `<p>${t_init('critical_error_language_system_init_failed')}</p>`;
            return;
        }

        // const { t } = Translation; // 't' är redan tillgänglig via get_t_fallback() om Translation är laddat
        document.title = get_t_fallback()('app_title');

        if (window.NotificationComponent && typeof window.NotificationComponent.init === 'function') {
            await NotificationComponent.init();
        } else {
            console.error("[Main.js] NotificationComponent is not available or not initialized correctly.");
        }

        // === init_ui_controls() MÅSTE ANROPAS FÖR ATT KONTROLLERNA SKA SKAPAS ===
        init_ui_controls();
        
        document.addEventListener('languageChanged', on_language_changed_event);
        window.addEventListener('hashchange', handle_hash_change);

        if (window.NotificationComponent && typeof NotificationComponent.clear_global_message === 'function') {
            NotificationComponent.clear_global_message();
        }
        handle_hash_change(); 
        update_app_chrome_texts(); 
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init_app().catch(err => console.error("Error during app initialization (from DOMContentLoaded):", err));
        });
    } else {
        init_app().catch(err => console.error("Error during app initialization (direct call):", err));
    }

})();