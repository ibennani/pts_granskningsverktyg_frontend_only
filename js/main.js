// Importer för vyer som hanteras direkt av main.js router
import { UploadViewComponent } from './components/UploadViewComponent.js';
import { MetadataViewComponent } from './components/MetadataViewComponent.js';
import { SampleManagementViewComponent } from './components/SampleManagementViewComponent.js';
import { AuditOverviewComponent } from './components/AuditOverviewComponent.js';
import { RequirementListComponent } from './components/RequirementListComponent.js';
import { RequirementAuditComponent } from './components/RequirementAuditComponent.js';

// Notera: AddSampleFormComponent och SampleListComponent importeras *inuti* SampleManagementViewComponent.js

console.log("[Main.js] Modules imported, IIFE about to execute.");

(function () {
    'use-strict';
    console.log("[Main.js] IIFE EXECUTING - TOP");
    
    const app_container = document.getElementById('app-container');
    if (!app_container) {
        console.error("[Main.js] CRITICAL: app_container element not found in DOM!");
        // Stoppa exekvering om grundläggande element saknas
        document.body.innerHTML = "<p style='color:red; font-weight:bold;'>Application Error: App container not found. Check HTML and script load order.</p>";
        return;
    }
    
    let current_view_component = null;
    let current_view_name = null; 
    let current_view_params = {}; 

    // UI Kontroll Element (globala för modulen)
    let theme_toggle_button_element = null;
    let language_selector_element = null;
    let language_label_element = null; 

    // Funktioner för att uppdatera UI-kontroller (titel, tema-knapp, språk-dropdown)
    function update_app_chrome_texts() {
        if (!window.Translation || typeof window.Translation.t !== 'function') {
            console.warn("[Main.js] update_app_chrome_texts: Translation.t is not available. Texts might not update.");
            return;
        }
        const { t } = Translation; 
        document.title = t('app_title');
        if (theme_toggle_button_element && theme_toggle_button_element.themeFunctions && 
            typeof theme_toggle_button_element.themeFunctions.updateContent === 'function') {
            const current_theme = document.documentElement.getAttribute('data-theme') || 'light';
            theme_toggle_button_element.themeFunctions.updateContent(current_theme);
        }
        if (language_selector_element) {
            const supported_languages = Translation.get_supported_languages();
            Array.from(language_selector_element.options).forEach(option => {
                if (supported_languages[option.value]) { 
                    option.textContent = supported_languages[option.value]; 
                }
            });
            language_selector_element.value = Translation.get_current_language_code();
        }
    }

    function init_ui_controls() { 
        if (!window.Translation || typeof window.Translation.t !== 'function' || !window.Helpers || typeof window.Helpers.create_element !== 'function') {
            console.error("[Main.js] init_ui_controls: Core dependencies (Translation or Helpers) not available!");
            return; 
        }
        const { t } = Translation; 
        const controls_wrapper = Helpers.create_element('div', { class_name: 'global-controls'});

        // --- Språkväljare ---
        const language_selector_container = Helpers.create_element('div', { class_name: 'language-selector-container' });
        language_label_element = Helpers.create_element('label', { 
            attributes: {for: 'language-selector'}, 
            text_content: t('language_switcher_label'), 
            class_name: 'visually-hidden' 
        });
        language_selector_container.appendChild(language_label_element);
        language_selector_element = Helpers.create_element('select', { 
            id: 'language-selector',
            class_name: ['form-control', 'form-control-small'] 
        });
        const supported_languages = Translation.get_supported_languages();
        for (const lang_code in supported_languages) {
            const option = Helpers.create_element('option', { value: lang_code, text_content: supported_languages[lang_code] });
            language_selector_element.appendChild(option);
        }
        language_selector_element.value = Translation.get_current_language_code();
        language_selector_element.addEventListener('change', async (event) => {
            if (window.NotificationComponent) NotificationComponent.clear_global_message(); 
            const selected_lang_code = event.target.value; 
            await Translation.set_language(selected_lang_code); 
        });
        language_selector_container.appendChild(language_selector_element);
        controls_wrapper.appendChild(language_selector_container);

        // --- Tema Toggle ---
        theme_toggle_button_element = Helpers.create_element('button', { id: 'theme-toggle', class_name: ['button', 'button-default'] });
        // Text och ikon sätts av set_theme_button_content
        
        function set_theme_button_content(theme) {
            const { t } = Translation; 
            theme_toggle_button_element.innerHTML = ''; 
            let icon_svg_string;
            let button_label_text;
            let icon_color_val = getComputedStyle(document.documentElement).getPropertyValue('--button-default-text').trim();
            if (!icon_color_val || icon_color_val === "initial" || icon_color_val === "inherit" || icon_color_val === "") {
                icon_color_val = (theme === 'dark') ? 'var(--text-color)' : 'var(--text-color)';
            }
            if (theme === 'dark') {
                icon_svg_string = Helpers.get_icon_svg('light_mode', [icon_color_val], 18);
                button_label_text = t('light_mode');
            } else {
                icon_svg_string = Helpers.get_icon_svg('dark_mode', [icon_color_val], 18);
                button_label_text = t('dark_mode');
            }
            theme_toggle_button_element.innerHTML = icon_svg_string; 
            const text_node = document.createTextNode(' ' + button_label_text); 
            theme_toggle_button_element.appendChild(text_node);
        }
        
        function set_theme(theme) { 
            document.documentElement.setAttribute('data-theme', theme); 
            localStorage.setItem('theme_preference', theme); 
            set_theme_button_content(theme); 
        }
        
        theme_toggle_button_element.themeFunctions = { updateContent: set_theme_button_content };
        
        theme_toggle_button_element.addEventListener('click', () => { 
            const current_theme_val = document.documentElement.getAttribute('data-theme') || 'light'; 
            set_theme(current_theme_val === 'dark' ? 'light' : 'dark'); 
        });
        controls_wrapper.appendChild(theme_toggle_button_element); 
        
        const saved_theme_val = localStorage.getItem('theme_preference'); 
        const initial_theme_val = saved_theme_val || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', initial_theme_val);
        set_theme_button_content(initial_theme_val); 
        
        const existing_controls = document.body.querySelector('.global-controls');
        if (existing_controls) existing_controls.remove();
        document.body.appendChild(controls_wrapper); 
    }

    async function navigate_to(view_name_nav, params_nav = {}) {
        if (!window.Translation || typeof window.Translation.t !== 'function' || !window.Helpers || !window.Helpers.escape_html) {
            console.error("[Main.js] navigate_to: Core dependencies (Translation or Helpers) not available!");
            if(app_container) app_container.innerHTML = "<p>System error in navigation. Check console.</p>";
            return;
        }
        const { t } = Translation; 
        console.log(`[Main.js] NAVIGATING TO: ${view_name_nav}, params:`, params_nav);
        
        current_view_name = view_name_nav; 
        current_view_params = params_nav;

        if (!app_container) { console.error("[Main.js] App container not found in navigate_to!"); return; }
        app_container.innerHTML = ''; 
        if (current_view_component && typeof current_view_component.destroy === 'function') {
            current_view_component.destroy();
        }
        current_view_component = null;
        let ComponentClass;
        switch (view_name_nav) {
            case 'upload': ComponentClass = UploadViewComponent; break;
            case 'metadata': ComponentClass = MetadataViewComponent; break;
            case 'sample_management': ComponentClass = SampleManagementViewComponent; break;
            case 'audit_overview': ComponentClass = AuditOverviewComponent; break;
            case 'requirement_list': ComponentClass = RequirementListComponent; break;
            case 'requirement_audit': ComponentClass = RequirementAuditComponent; break;
            default:
                console.error(`[Main.js] View "${view_name_nav}" not found in switch.`);
                app_container.innerHTML = `<p>${t("error_view_not_found", {viewName: Helpers.escape_html(view_name_nav)})}</p>`;
                return;
        }
        try {
            current_view_component = ComponentClass; 
            console.log(`[Main.js] Attempting to use ComponentClass for ${view_name_nav}:`, ComponentClass); 

            if (!current_view_component || typeof current_view_component.init !== 'function' || typeof current_view_component.render !== 'function') { 
                console.error(`[Main.js] ComponentClass for view ${view_name_nav} is UNDEFINED or not a valid component object.`);
                app_container.innerHTML = `<p>${t("error_component_load", {viewName: Helpers.escape_html(view_name_nav)})}</p>`;
                return;
            }
            
            console.log(`[Main.js] About to INIT view: ${view_name_nav}`); 
            await current_view_component.init(app_container, navigate_to, params_nav); 
            console.log(`[Main.js] FINISHED init for view: ${view_name_nav}`);
            
            console.log(`[Main.js] About to RENDER view: ${view_name_nav}`); 
            current_view_component.render();
            console.log(`[Main.js] FINISHED rendering view: ${view_name_nav}`); 
            if (app_container && app_container.innerHTML.trim() === '') { // Kontrollera att app_container finns
                console.warn(`[Main.js] WARNING: app_container is EMPTY after rendering ${view_name_nav}. Check component's render method.`); 
            }
        } catch (error) {
            console.error(`[Main.js] CATCH BLOCK: Error during view ${view_name_nav} lifecycle:`, error);
            if(app_container) app_container.innerHTML = `<p>${t("error_loading_view", {viewName: Helpers.escape_html(view_name_nav), errorMessage: error.message})}</p>`;
            if (window.NotificationComponent && typeof window.NotificationComponent.show_global_message === 'function') { 
                NotificationComponent.show_global_message(t("error_loading_view_details", {viewName: view_name_nav}), 'error');
            }
        }
    }

    function handle_hash_change() { 
        console.log("[Main.js] handle_hash_change CALLED. Current hash:", window.location.hash); 
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
        const current_audit = window.State ? State.getCurrentAudit() : null;
        if (view_name_from_hash) { 
            target_view = view_name_from_hash;
        } else if (current_audit && current_audit.ruleFileContent) { 
            target_view = 'audit_overview'; 
            target_params = {}; 
        }
        // console.log(`[Main.js] handle_hash_change determined target view: ${target_view}, params:`, target_params);
        navigate_to(target_view, target_params); 
    }
    
    function on_language_changed_event() {
        console.log("[Main.js] 'languageChanged' event handler triggered.");
        update_app_chrome_texts(); 
        if (current_view_name) {
            // console.log(`[Main.js] Re-rendering current view: ${current_view_name}`);
            navigate_to(current_view_name, current_view_params);
        } else {
            handle_hash_change();
        }
    }

    async function init_app() { 
        console.log("[Main.js] App Initializing... (inside init_app)");
        
        if (window.Translation && typeof window.Translation.ensure_initial_load === 'function') {
            await window.Translation.ensure_initial_load();
            console.log("[Main.js] Initial translations loaded.");
        } else { 
            console.error("[Main.js] CRITICAL: Translation module or ensure_initial_load not found!");
            if(app_container) app_container.innerHTML = "<p>Language system error. Check console.</p>";
            return; 
        }
        
        const { t } = Translation; 
        document.title = t('app_title');

        if (window.NotificationComponent && typeof window.NotificationComponent.init === 'function') {
            await NotificationComponent.init(); 
            console.log("[Main.js] NotificationComponent initialized.");
        } else { 
            console.error("[Main.js] NotificationComponent is not available or not initialized correctly.");
        }
        
        init_ui_controls(); 
        console.log("[Main.js] init_ui_controls completed.");
        // update_app_chrome_texts(); // Redan anropad från init_ui_controls (via set_theme) och on_language_changed_event
        
        document.addEventListener('languageChanged', on_language_changed_event); 
        window.addEventListener('hashchange', handle_hash_change);
        console.log("[Main.js] Event listeners added.");
        
        if (window.NotificationComponent && typeof NotificationComponent.clear_global_message === 'function') {
            NotificationComponent.clear_global_message();
        }
        console.log("[Main.js] Calling initial handle_hash_change to render first view.");
        handle_hash_change(); 
        
        console.log("[Main.js] App Initialized. (end of init_app)");
    }

    if (document.readyState === 'loading') {
        console.log("[Main.js] DOM not ready, adding DOMContentLoaded listener.");
        document.addEventListener('DOMContentLoaded', () => {
            console.log("[Main.js] DOMContentLoaded event fired.");
            init_app().catch(err => console.error("Error during app initialization (from DOMContentLoaded):", err));
        });
    } else {
        console.log("[Main.js] DOM already ready, calling init_app directly.");
        init_app().catch(err => console.error("Error during app initialization (direct call):", err));
    }

})();