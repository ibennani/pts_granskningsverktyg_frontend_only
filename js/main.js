// js/main.js

// Importer för vyer som hanteras direkt av main.js router
import { UploadViewComponent } from './components/UploadViewComponent.js';
import { MetadataViewComponent } from './components/MetadataViewComponent.js';
import { SampleManagementViewComponent } from './components/SampleManagementViewComponent.js';
import { AuditOverviewComponent } from './components/AuditOverviewComponent.js';
import { RequirementListComponent } from './components/RequirementListComponent.js';
import { RequirementAuditComponent } from './components/RequirementAuditComponent.js';

// Importera den nya globala komponenten som en factory
import { GlobalActionBarComponentFactory } from './components/GlobalActionBarComponent.js';

// Importera från den nya storen
import { getState, dispatch, subscribe, StoreActionTypes, StoreInitialState } from './state.js'; 
window.getState = getState;
window.dispatch = dispatch;
window.Store = { getState, dispatch, subscribe, StoreActionTypes, StoreInitialState };
window.StoreActionTypes = StoreActionTypes;


(function () {
    'use-strict';

    const app_container = document.getElementById('app-container');
    const top_action_bar_container = document.getElementById('global-action-bar-top');
    const bottom_action_bar_container = document.getElementById('global-action-bar-bottom');

    if (!app_container || !top_action_bar_container || !bottom_action_bar_container) {
        console.error("[Main.js] CRITICAL: App container or action bar containers not found in DOM!");
        document.body.innerHTML = "<p style='color:red; font-weight:bold;'>Application Error: Core containers not found. Check HTML.</p>";
        return;
    }

    let current_view_component_instance = null;
    let current_view_name_rendered = null;
    let current_view_params_rendered_json = "{}"; 
    
    // Skapa två separata instanser av komponenten från factoryn
    const top_action_bar_instance = GlobalActionBarComponentFactory();
    const bottom_action_bar_instance = GlobalActionBarComponentFactory();

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
        
        if (top_action_bar_instance && typeof top_action_bar_instance.render === 'function') {
            top_action_bar_instance.render();
        }
        if (bottom_action_bar_instance && typeof bottom_action_bar_instance.render === 'function') {
            bottom_action_bar_instance.render();
        }
    }

    async function init_global_components() {
        if (!window.Translation || !window.Helpers || !window.NotificationComponent) {
            console.error("[Main.js] init_global_components: Core dependencies not available!");
            return;
        }

        await top_action_bar_instance.init(
            top_action_bar_container,
            getState, dispatch, StoreActionTypes,
            window.Translation, window.Helpers, window.NotificationComponent
        );
        await bottom_action_bar_instance.init(
            bottom_action_bar_container,
            getState, dispatch, StoreActionTypes,
            window.Translation, window.Helpers, window.NotificationComponent
        );
    }
    
    // NY FUNKTION för att sätta initialt tema
    function set_initial_theme() {
        const saved_theme = localStorage.getItem('theme_preference');
        if (saved_theme) {
            document.documentElement.setAttribute('data-theme', saved_theme);
        } else {
            const prefers_dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initial_theme = prefers_dark ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', initial_theme);
        }
    }


    function navigate_and_set_hash(target_view_name, target_params = {}) {
        const target_hash_part = target_params && Object.keys(target_params).length > 0 ?
            `${target_view_name}?${new URLSearchParams(target_params).toString()}` :
            target_view_name;
        const new_hash = `#${target_hash_part}`;

        if (window.location.hash === new_hash) {
            if (current_view_component_instance && typeof current_view_component_instance.render === 'function') {
                current_view_component_instance.render();
            }
        } else {
            window.location.hash = new_hash; 
        }
    }

    function set_focus_to_h1() {
        setTimeout(() => {
            if (app_container) {
                const h1_element = app_container.querySelector('h1');
                if (h1_element) {
                    if (h1_element.getAttribute('tabindex') === null) {
                        h1_element.setAttribute('tabindex', '-1');
                    }
                    h1_element.focus();
                }
            }
        }, 100); 
    }

    async function render_view(view_name_to_render, params_to_render = {}) {
        const t = get_t_fallback();
        const local_helpers_escape_html = (typeof window.Helpers !== 'undefined' && typeof window.Helpers.escape_html === 'function')
            ? window.Helpers.escape_html
            : (s) => s; 

        top_action_bar_instance.render();
        if (view_name_to_render !== 'upload') {
            bottom_action_bar_container.style.display = '';
            bottom_action_bar_instance.render();
        } else {
            bottom_action_bar_container.style.display = 'none';
        }

        if (current_view_name_rendered === view_name_to_render && 
            current_view_params_rendered_json === JSON.stringify(params_to_render) &&
            current_view_component_instance && typeof current_view_component_instance.render === 'function') {
            
            current_view_component_instance.render(); 
            return;
        }
        
        current_view_name_rendered = view_name_to_render;
        current_view_params_rendered_json = JSON.stringify(params_to_render);

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
                app_container.innerHTML = `<h1>${t("error_loading_view_details", {viewName: ""})}</h1><p>${t("error_view_not_found", {viewName: local_helpers_escape_html(view_name_to_render)})}</p>`;
                set_focus_to_h1();
                return;
        }

        try {
            current_view_component_instance = ComponentClass; 
            
            if (!current_view_component_instance || typeof current_view_component_instance.init !== 'function' || typeof current_view_component_instance.render !== 'function') {
                throw new Error("Component is invalid or missing required methods.");
            }

            await current_view_component_instance.init(
                app_container, 
                navigate_and_set_hash, 
                params_to_render,
                getState, 
                dispatch,
                StoreActionTypes,
                subscribe
            );
            current_view_component_instance.render();
            set_focus_to_h1(); 

        } catch (error) {
            console.error(`[Main.js] CATCH BLOCK: Error during view ${view_name_to_render} lifecycle:`, error);
            const view_name_escaped_for_error = local_helpers_escape_html(view_name_to_render);
            if(app_container) app_container.innerHTML = `<h1>${t("error_loading_view_details", {viewName: ""})}</h1><p>${t("error_loading_view", {viewName: view_name_escaped_for_error, errorMessage: error.message})}</p>`;
            set_focus_to_h1();
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
        
        render_view(target_view, target_params);
    }

    function on_language_changed_event() { 
        update_app_chrome_texts();
        if (current_view_component_instance && typeof current_view_component_instance.render === 'function') {
            current_view_component_instance.render();
        }
    }
    
    async function init_app() { 
        set_initial_theme(); // Sätt temat FÖRE något annat renderas
        
        const t_init = get_t_fallback();

        if (window.Translation && typeof window.Translation.ensure_initial_load === 'function') {
            await window.Translation.ensure_initial_load();
        } else {
            console.error("[Main.js] CRITICAL: Translation module or ensure_initial_load not found!");
            if(app_container) app_container.innerHTML = `<p>${t_init('critical_error_language_system_init_failed')}</p>`;
            return;
        }
        
        document.title = get_t_fallback()('app_title');

        if (window.NotificationComponent && typeof window.NotificationComponent.init === 'function') {
            await NotificationComponent.init();
        } else {
            console.error("[Main.js] NotificationComponent is not available or not initialized correctly.");
        }

        await init_global_components();
        
        document.addEventListener('languageChanged', on_language_changed_event);
        window.addEventListener('hashchange', handle_hash_change);

        if (window.NotificationComponent && typeof NotificationComponent.clear_global_message === 'function') {
            NotificationComponent.clear_global_message();
        }
        handle_hash_change();
        update_app_chrome_texts(); 

        subscribe((new_state, old_state) => { 
            top_action_bar_instance.render();
            if (current_view_name_rendered !== 'upload') {
                bottom_action_bar_instance.render();
            }

            const hash = window.location.hash.substring(1);
            const [view_name_from_hash,] = hash.split('?');
            if (current_view_name_rendered === view_name_from_hash && 
                current_view_component_instance && typeof current_view_component_instance.render === 'function') {
                current_view_component_instance.render();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init_app().catch(err => console.error("Error during app initialization (from DOMContentLoaded):", err));
        });
    } else {
        init_app().catch(err => console.error("Error during app initialization (direct call):", err));
    }

})();