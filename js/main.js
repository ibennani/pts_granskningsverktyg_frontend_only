// js/main.js

import './logic/rulefile_editor_logic.js'; // Import for side effects (to create window.RulefileEditorLogic)

import { UploadViewComponent } from './components/UploadViewComponent.js';
import { EditMetadataViewComponent } from './components/EditMetadataViewComponent.js'; 
import { SampleManagementViewComponent } from './components/SampleManagementViewComponent.js';
import { SampleFormViewComponent } from './components/SampleFormViewComponent.js';
import { ConfirmSampleEditViewComponent } from './components/ConfirmSampleEditViewComponent.js';
import { AuditOverviewComponent } from './components/AuditOverviewComponent.js';
import { RequirementListComponent } from './components/RequirementListComponent.js';
import { RequirementAuditComponent } from './components/RequirementAuditComponent.js';
import { UpdateRulefileViewComponent } from './components/UpdateRulefileViewComponent.js'; 
import { RestoreSessionViewComponent } from './components/RestoreSessionViewComponent.js'; 
import { ConfirmUpdatesViewComponent } from './components/ConfirmUpdatesViewComponent.js';
import { FinalConfirmUpdatesViewComponent } from './components/FinalConfirmUpdatesViewComponent.js';
import { RulefileEditorMainViewComponent } from './components/RulefileEditorMainViewComponent.js';

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
        return window.Translation?.t || ((key) => `**${key}**`);
    }

    function updatePageTitle(viewName, params = {}) {
        const t = get_t_fallback();
        const state = getState();
        const title_suffix = ` | ${t('app_title_suffix')}`;
        let title_prefix = t('app_title');

        if (state.appMode === 'edit') {
            title_prefix = t('rule_file_editor_mode');
        } else { // Audit mode or no mode
            try {
                switch (viewName) {
                    case 'upload': title_prefix = t('start_or_load_audit_title'); break;
                    case 'metadata': title_prefix = t('audit_metadata_title'); break;
                    case 'edit_metadata': title_prefix = t('edit_audit_metadata_title'); break;
                    case 'sample_management': title_prefix = t('manage_samples_title'); break;
                    case 'sample_form': title_prefix = params.editSampleId ? t('edit_sample') : t('add_new_sample'); break;
                    case 'confirm_sample_edit': title_prefix = t('sample_edit_confirm_dialog_title'); break;
                    case 'audit_overview': title_prefix = t('audit_overview_title'); break;
                    case 'requirement_list': title_prefix = t('requirement_list_title_suffix'); break;
                    case 'update_rulefile': title_prefix = t('update_rulefile_title'); break;
                    case 'restore_session': title_prefix = t('restore_session_title'); break;
                    case 'confirm_updates': title_prefix = t('handle_updated_assessments_title', {count: ''}).trim(); break;
                    case 'final_confirm_updates': title_prefix = t('final_confirm_updates_title'); break;
                    case 'requirement_audit':
                        const requirement = state?.ruleFileContent?.requirements?.[params.requirementId];
                        const prefix = (state?.auditStatus === 'locked') ? t('view_prefix') : t('edit_prefix');
                        title_prefix = requirement?.title ? `${prefix} ${requirement.title}` : t('requirement_audit_title');
                        break;
                }
            } catch (e) { console.error("Error building page title:", e); }
        }
        document.title = `${title_prefix}${title_suffix}`;
    }

    function update_app_chrome_texts() {
        if (!window.Translation || typeof window.Translation.t !== 'function') return;
        top_action_bar_instance?.render?.();
        bottom_action_bar_instance?.render?.();
    }

    async function init_global_components() {
        const common_deps = {
            getState, dispatch, StoreActionTypes,
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
        const prefers_dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', saved_theme || (prefers_dark ? 'dark' : 'light'));
    }

    function navigate_and_set_hash(target_view_name, target_params = {}) {
        const target_hash_part = target_params && Object.keys(target_params).length > 0
            ? `${target_view_name}?${new URLSearchParams(target_params).toString()}`
            : target_view_name;
        const new_hash = `#${target_hash_part}`;
        if (window.location.hash === new_hash) {
            current_view_component_instance?.render?.();
        } else {
            window.location.hash = new_hash; 
        }
    }

    function set_focus_to_h1() {
        setTimeout(() => {
            const h1_element = app_container?.querySelector('h1');
            if (h1_element) {
                h1_element.setAttribute('tabindex', '-1');
                h1_element.focus();
            }
        }, 100); 
    }

    async function render_view(view_name_to_render, params_to_render = {}) {
        const t = get_t_fallback();
        const state = getState();
        
        const audit_views = ['metadata', 'edit_metadata', 'sample_management', 'sample_form', 'confirm_sample_edit', 'audit_overview', 'requirement_list', 'requirement_audit', 'update_rulefile', 'confirm_updates', 'final_confirm_updates'];
        const edit_views = ['edit_rulefile_main'];

        if (state.appMode === 'audit' && edit_views.includes(view_name_to_render)) {
            console.warn(`Navigation blocked: Cannot access edit view "${view_name_to_render}" while in audit mode.`);
            navigate_and_set_hash('audit_overview');
            return;
        }
        if (state.appMode === 'edit' && audit_views.includes(view_name_to_render)) {
            console.warn(`Navigation blocked: Cannot access audit view "${view_name_to_render}" while in edit mode.`);
            navigate_and_set_hash('edit_rulefile_main');
            return;
        }

        updatePageTitle(view_name_to_render, params_to_render);

        const views_without_bottom_bar = ['upload', 'restore_session', 'sample_form', 'confirm_sample_edit', 'metadata', 'edit_metadata', ...edit_views];
        top_action_bar_instance.render();
        bottom_action_bar_container.style.display = views_without_bottom_bar.includes(view_name_to_render) ? 'none' : '';
        if (!views_without_bottom_bar.includes(view_name_to_render)) {
            bottom_action_bar_instance.render();
        }

        if (current_view_name_rendered === view_name_to_render && current_view_params_rendered_json === JSON.stringify(params_to_render)) {
            current_view_component_instance?.render?.(); 
            return;
        }
        
        current_view_name_rendered = view_name_to_render;
        current_view_params_rendered_json = JSON.stringify(params_to_render);

        current_view_component_instance?.destroy?.();
        app_container.innerHTML = ''; 
        current_view_component_instance = null;

        let ComponentClass;
        
        switch (view_name_to_render) {
            case 'upload': ComponentClass = UploadViewComponent; break;
            case 'metadata': case 'edit_metadata': ComponentClass = EditMetadataViewComponent; break;
            case 'sample_management': ComponentClass = SampleManagementViewComponent; break;
            case 'sample_form': ComponentClass = SampleFormViewComponent; break;
            case 'confirm_sample_edit': ComponentClass = ConfirmSampleEditViewComponent; break; 
            case 'audit_overview': ComponentClass = AuditOverviewComponent; break;
            case 'requirement_list': ComponentClass = RequirementListComponent; break;
            case 'requirement_audit': ComponentClass = RequirementAuditComponent; break;
            case 'update_rulefile': ComponentClass = UpdateRulefileViewComponent; break; 
            case 'restore_session': ComponentClass = RestoreSessionViewComponent; break;
            case 'confirm_updates': ComponentClass = ConfirmUpdatesViewComponent; break;
            case 'final_confirm_updates': ComponentClass = FinalConfirmUpdatesViewComponent; break;
            case 'edit_rulefile_main': ComponentClass = RulefileEditorMainViewComponent; break;
            default:
                console.error(`[Main.js] View "${view_name_to_render}" not found.`);
                app_container.innerHTML = `<h1>${t("error_loading_view_details")}</h1><p>${t("error_view_not_found", {viewName: window.Helpers.escape_html(view_name_to_render)})}</p>`;
                set_focus_to_h1();
                return;
        }

        try {
            current_view_component_instance = ComponentClass; 
            if (!current_view_component_instance?.init || !current_view_component_instance?.render) throw new Error("Component is invalid.");
            
            if (view_name_to_render === 'restore_session') {
                await current_view_component_instance.init(app_container, params_to_render.on_restore, params_to_render.on_discard, params_to_render.autosaved_state);
            } else {
                await current_view_component_instance.init(app_container, navigate_and_set_hash, params_to_render, getState, dispatch, StoreActionTypes, subscribe);
            }
            
            current_view_component_instance.render();
            set_focus_to_h1(); 
        } catch (error) {
            console.error(`[Main.js] Error during view ${view_name_to_render} lifecycle:`, error);
            app_container.innerHTML = `<h1>${t("error_loading_view_details")}</h1><p>${t("error_loading_view", {viewName: window.Helpers.escape_html(view_name_to_render), errorMessage: error.message})}</p>`;
            set_focus_to_h1();
        }
    }

    function handle_hash_change() { 
        const hash = window.location.hash.substring(1);
        const [view_name_from_hash, query_string] = hash.split('?');
        const params = query_string ? Object.fromEntries(new URLSearchParams(query_string)) : {};
        
        let target_view = 'upload';
        let target_params = params;
        const current_global_state = getState();

        if (view_name_from_hash) {
            target_view = view_name_from_hash;
        } else if (current_global_state.appMode === 'audit') {
            target_view = 'audit_overview';
        } else if (current_global_state.appMode === 'edit') {
            target_view = 'edit_rulefile_main';
        }

        render_view(target_view, target_params);
    }

    function on_language_changed_event() { 
        update_app_chrome_texts();
        updatePageTitle(current_view_name_rendered, JSON.parse(current_view_params_rendered_json));
        current_view_component_instance?.render?.();
    }
    
    async function start_normal_session() {
        await init_global_components(); 
        if (window.ScoreManager?.init) window.ScoreManager.init(subscribe, getState, dispatch, StoreActionTypes);
        if (window.MarkdownToolbar?.init) window.MarkdownToolbar.init();
        document.addEventListener('languageChanged', on_language_changed_event);
        window.addEventListener('hashchange', handle_hash_change);
        window.addEventListener('beforeunload', () => {
            if (window.Store?.forceSaveStateToLocalStorage) {
                window.Store.forceSaveStateToLocalStorage(getState());
            }
        });
        subscribe((new_state) => {
            update_app_chrome_texts();
            updatePageTitle(current_view_name_rendered, JSON.parse(current_view_params_rendered_json));
            const [view_name_from_hash] = window.location.hash.substring(1).split('?');
            if (current_view_name_rendered === view_name_from_hash) {
                current_view_component_instance?.render?.();
            }
        });
        window.NotificationComponent?.clear_global_message?.();
        handle_hash_change(); 
        update_app_chrome_texts();
    } 

    async function init_app() { 
        set_initial_theme();
        await window.Translation.ensure_initial_load();
        initState();

        dispatch({ type: StoreActionTypes.CLEAR_STAGED_SAMPLE_CHANGES });

        const active_session_state = getState();
        if (active_session_state && active_session_state.appMode) {
            console.log(`[Main.js] Active session found in mode: ${active_session_state.appMode}. Starting normally.`);
            await start_normal_session();
        } else {
            const autosaved_payload = loadStateFromLocalStorage();
            if (autosaved_payload) {
                console.log("[Main.js] No active session, but found backup. Prompting user.");
                const on_restore = () => {
                    dispatch({ type: StoreActionTypes.LOAD_AUDIT_FROM_FILE, payload: autosaved_payload.auditState });
                    clearAutosavedState(); 
                    if (window.NotificationComponent) window.NotificationComponent.show_global_message(get_t_fallback()('autosave_restored_successfully'), 'success');
                    window.location.hash = autosaved_payload.lastKnownHash || '#audit_overview';
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
            init_app().catch(err => console.error("Error during app initialization:", err));
        });
    } else {
        init_app().catch(err => console.error("Error during app initialization:", err));
    }

})();