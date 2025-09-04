// js/main.js

import { UploadViewComponent } from './components/UploadViewComponent.js';
import { MetadataViewComponent } from './components/MetadataViewComponent.js';
import { SampleManagementViewComponent } from './components/SampleManagementViewComponent.js';
import { SampleFormViewComponent } from './components/SampleFormViewComponent.js';
import { ConfirmSampleEditViewComponent } from './components/ConfirmSampleEditViewComponent.js'; // NY IMPORT
import { AuditOverviewComponent } from './components/AuditOverviewComponent.js';
import { RequirementListComponent } from './components/RequirementListComponent.js';
import { RequirementAuditComponent } from './components/RequirementAuditComponent.js';
import { UpdateRulefileViewComponent } from './components/UpdateRulefileViewComponent.js'; 
import { RestoreSessionViewComponent } from './components/RestoreSessionViewComponent.js'; 

import { GlobalActionBarComponentFactory } from './components/GlobalActionBarComponent.js';

import { getState, dispatch, subscribe, initState, StoreActionTypes, StoreInitialState, loadStateFromLocalStorage, clearAutosavedState, forceSaveStateToLocalStorage } from './state.js';
window.getState = getState;
window.dispatch = dispatch;
window.Store = { getState, dispatch, subscribe, StoreActionTypes, StoreInitialState, clearAutosavedState, forceSaveStateToLocalStorage };
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
    
    const top_action_bar_instance = GlobalActionBarComponentFactory();
    const bottom_action_bar_instance = GlobalActionBarComponentFactory();

    function get_t_fallback() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;
    }

    function updatePageTitle(viewName, params = {}) {
        const t = get_t_fallback();
        const title_suffix = ` | ${t('app_title_suffix')}`;
        let title_prefix = t('app_title');
        const current_state = getState();

        try {
            switch (viewName) {
                case 'upload':
                    title_prefix = t('start_or_load_audit_title');
                    break;
                case 'metadata':
                    title_prefix = t('enter_metadata_title');
                    break;
                case 'sample_management':
                    title_prefix = t('manage_samples_title');
                    break;
                case 'sample_form':
                    title_prefix = params.editSampleId ? t('edit_sample') : t('add_new_sample');
                    break;
                case 'confirm_sample_edit': // NYTT CASE
                    title_prefix = t('sample_edit_confirm_dialog_title');
                    break;
                case 'audit_overview':
                    title_prefix = t('audit_overview_title');
                    break;
                case 'requirement_list':
                    title_prefix = t('requirement_list_title_suffix');
                    break;
                case 'update_rulefile':
                    title_prefix = t('update_rulefile_title');
                    break;
                case 'restore_session':
                    title_prefix = t('restore_session_title');
                    break;
                case 'requirement_audit':
                    const requirement = current_state?.ruleFileContent?.requirements?.[params.requirementId];
                    const requirementTitle = requirement?.title;
                    const prefix = (current_state?.auditStatus === 'locked') ? t('view_prefix') : t('edit_prefix');
                    if (requirementTitle) {
                        title_prefix = `${prefix} ${requirementTitle}`;
                    } else {
                        title_prefix = t('audit_requirement_title');
                    }
                    break;
                default:
                    break;
            }
        } catch (e) {
            console.error("Error building page title:", e);
        }
        
        document.title = `${title_prefix}${title_suffix}`;
    }

    function update_app_chrome_texts() {
        const t = get_t_fallback();
        if (!window.Translation || typeof window.Translation.t !== 'function') {
            console.warn("[Main.js] update_app_chrome_texts: Translation.t is not available.");
            return;
        }
        if (top_action_bar_instance && typeof top_action_bar_instance.render === 'function') { top_action_bar_instance.render(); }
        if (bottom_action_bar_instance && typeof bottom_action_bar_instance.render === 'function') { bottom_action_bar_instance.render(); }
    }

    async function init_global_components() {
        if (!window.Translation || !window.Helpers || !window.NotificationComponent || !window.SaveAuditLogic) {
            console.error("[Main.js] init_global_components: Core dependencies not available!");
            return;
        }
        const common_deps = {
            getState: getState,
            dispatch: dispatch,
            StoreActionTypes: StoreActionTypes,
            Translation: window.Translation,
            Helpers: window.Helpers,
            NotificationComponent: window.NotificationComponent,
            SaveAuditLogic: window.SaveAuditLogic
        };
        await top_action_bar_instance.init(top_action_bar_container, common_deps);
        await bottom_action_bar_instance.init(bottom_action_bar_container, common_deps);
    }
    
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

        updatePageTitle(view_name_to_render, params_to_render);

        // NY VY TILLAGD I LISTAN
        const views_without_bottom_bar = ['upload', 'restore_session', 'sample_form', 'confirm_sample_edit'];
        top_action_bar_instance.render();
        if (views_without_bottom_bar.includes(view_name_to_render)) {
            bottom_action_bar_container.style.display = 'none';
        } else {
            bottom_action_bar_container.style.display = '';
            bottom_action_bar_instance.render();
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
        // NYTT CASE I SWITCH-SATSEN
        switch (view_name_to_render) {
            case 'upload': ComponentClass = UploadViewComponent; break;
            case 'metadata': ComponentClass = MetadataViewComponent; break;
            case 'sample_management': ComponentClass = SampleManagementViewComponent; break;
            case 'sample_form': ComponentClass = SampleFormViewComponent; break;
            case 'confirm_sample_edit': ComponentClass = ConfirmSampleEditViewComponent; break; // NY RAD
            case 'audit_overview': ComponentClass = AuditOverviewComponent; break;
            case 'requirement_list': ComponentClass = RequirementListComponent; break;
            case 'requirement_audit': ComponentClass = RequirementAuditComponent; break;
            case 'update_rulefile': ComponentClass = UpdateRulefileViewComponent; break; 
            case 'restore_session': ComponentClass = RestoreSessionViewComponent; break;
            default:
                console.error(`[Main.js] View "${view_name_to_render}" not found in render_view switch.`);
                app_container.innerHTML = `<h1>${t("error_loading_view_details")}</h1><p>${t("error_view_not_found", {viewName: local_helpers_escape_html(view_name_to_render)})}</p>`;
                set_focus_to_h1();
                return;
        }

        try {
            current_view_component_instance = ComponentClass; 
            
            if (!current_view_component_instance || typeof current_view_component_instance.init !== 'function' || typeof current_view_component_instance.render !== 'function') {
                throw new Error("Component is invalid or missing required methods.");
            }

            if (view_name_to_render === 'restore_session') {
                await current_view_component_instance.init(
                    app_container, 
                    params_to_render.on_restore, 
                    params_to_render.on_discard, 
                    params_to_render.autosaved_state
                );
            } else {
                await current_view_component_instance.init(
                    app_container, 
                    navigate_and_set_hash, 
                    params_to_render,
                    getState, 
                    dispatch,
                    StoreActionTypes,
                    subscribe
                );
            }
            
            current_view_component_instance.render();
            set_focus_to_h1(); 

        } catch (error) {
            console.error(`[Main.js] CATCH BLOCK: Error during view ${view_name_to_render} lifecycle:`, error);
            const view_name_escaped_for_error = local_helpers_escape_html(view_name_to_render);
            if(app_container) app_container.innerHTML = `<h1>${t("error_loading_view_details")}</h1><p>${t("error_loading_view", {viewName: view_name_escaped_for_error, errorMessage: error.message})}</p>`;
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
        updatePageTitle(current_view_name_rendered, JSON.parse(current_view_params_rendered_json));
        if (current_view_component_instance && typeof current_view_component_instance.render === 'function') {
            current_view_component_instance.render();
        }
    }
    
    async function start_normal_session() {
        await init_global_components(); 
        if (window.ScoreManager?.init) { window.ScoreManager.init(subscribe, getState, dispatch, StoreActionTypes); }
        if (window.MarkdownToolbar?.init) { window.MarkdownToolbar.init(); }
        document.addEventListener('languageChanged', on_language_changed_event);
        window.addEventListener('hashchange', handle_hash_change);
        window.addEventListener('beforeunload', () => {
            const current_state = getState();
            if (window.Store && typeof window.Store.forceSaveStateToLocalStorage === 'function') {
                window.Store.forceSaveStateToLocalStorage(current_state);
            }
        });
        subscribe((new_state) => { 
            top_action_bar_instance.render();
            const views_without_bottom_bar = ['upload', 'restore_session', 'sample_form', 'confirm_sample_edit'];
            if (!views_without_bottom_bar.includes(current_view_name_rendered)) {
                bottom_action_bar_instance.render();
            }
            updatePageTitle(current_view_name_rendered, JSON.parse(current_view_params_rendered_json));
            const hash = window.location.hash.substring(1);
            const [view_name_from_hash,] = hash.split('?');
            if (current_view_name_rendered === view_name_from_hash && 
                current_view_component_instance && typeof current_view_component_instance.render === 'function') {
                // Avstå från att rendera om det är confirm-vyn, för att undvika att tappa state
                if (current_view_name_rendered !== 'confirm_sample_edit') {
                    current_view_component_instance.render();
                }
            }
        });
        if (window.NotificationComponent?.clear_global_message) { window.NotificationComponent.clear_global_message(); }
        handle_hash_change(); 
        update_app_chrome_texts();
    } 

    async function init_app() { 
        set_initial_theme();
        await window.Translation.ensure_initial_load();
        initState();

        // Rensa eventuella gamla "staged" ändringar om sidan laddas om
        dispatch({ type: StoreActionTypes.CLEAR_STAGED_SAMPLE_CHANGES });

        const active_session_state = getState();
        if (active_session_state && active_session_state.ruleFileContent) {
            console.log("[Main.js] Active session found in sessionStorage. Starting normally.");
            await start_normal_session();
        } else {
            const autosaved_payload = loadStateFromLocalStorage();
            if (autosaved_payload) {
                console.log("[Main.js] No active session, but found backup in localStorage. Prompting user.");
                const on_restore = () => {
                    dispatch({ type: StoreActionTypes.LOAD_AUDIT_FROM_FILE, payload: autosaved_payload.auditState });
                    clearAutosavedState(); 
                    if (window.NotificationComponent) window.NotificationComponent.show_global_message(get_t_fallback()('autosave_restored_successfully'), 'success');
                    if (autosaved_payload.lastKnownHash && autosaved_payload.lastKnownHash !== '#') {
                        window.location.hash = autosaved_payload.lastKnownHash;
                    } else {
                        window.location.hash = '#audit_overview';
                    }
                    start_normal_session(); 
                };
                const on_discard = async () => {
                    clearAutosavedState();
                    await start_normal_session(); 
                };
                await init_global_components();
                update_app_chrome_texts();
                render_view('restore_session', { 
                    autosaved_state: autosaved_payload.auditState,
                    on_restore, 
                    on_discard 
                });
            } else {
                console.log("[Main.js] No active session, no backup. Starting fresh.");
                await start_normal_session();
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init_app().catch(err => console.error("Error during app initialization (from DOMContentLoaded):", err));
        });
    } else {
        init_app().catch(err => console.error("Error during app initialization (direct call):", err));
    }

})();