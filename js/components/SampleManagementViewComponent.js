// js/components/SampleManagementViewComponent.js
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SampleListComponent } from './SampleListComponent.js';

const SampleManagementViewComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_management_view_component.css';
    let app_container_ref;
    let router_ref;

    // Store-funktioner och ActionTypes
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes; // Ska sättas från init

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_load_css;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;

    let add_sample_form_component_instance;
    let sample_list_component_instance;
    let add_sample_form_container_element;
    let sample_list_container_element;
    let toggle_form_button_element;
    let start_audit_button_ref; 

    let global_message_element_ref;
    let is_form_visible = false;
    let intro_text_element = null;
    let previously_focused_element_for_delete_confirm = null;


    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
                if (replacements && !replacements.defaultValue) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (SampleMgmt t not found)";
            };
    }

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return true;

        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("SampleManagementView: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_get_current_iso_datetime_utc = window.Helpers.get_current_iso_datetime_utc;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_escape_html || !Helpers_get_current_iso_datetime_utc || !Helpers_load_css) {
                 console.error("SampleManagementView: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleManagementView: Helpers module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
                console.error("SampleManagementView: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleManagementView: NotificationComponent module is missing!"); all_assigned = false; }
        return all_assigned;
    }

    async function init_sub_components() {
        if (!Helpers_create_element) { console.error("SampleManagementView: Helpers_create_element not available for init_sub_components."); return; }
        
        add_sample_form_container_element = Helpers_create_element('div', { id: 'add-sample-form-area' });
        sample_list_container_element = Helpers_create_element('div', { id: 'sample-list-area' });

        add_sample_form_component_instance = AddSampleFormComponent;
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.init === 'function') {
            // **VIKTIGT HÄR:** Skicka vidare StoreActionTypes till AddSampleFormComponent
            await add_sample_form_component_instance.init(
                add_sample_form_container_element, 
                on_sample_saved_or_updated_in_form,
                toggle_add_sample_form_visibility,
                local_getState,
                local_dispatch,
                local_StoreActionTypes // Skicka vidare den korrekta referensen
            );
        } else { console.error("SampleManagementView: AddSampleFormComponent is not correctly initialized or init function is missing."); }

        sample_list_component_instance = SampleListComponent;
        if (sample_list_component_instance && typeof sample_list_component_instance.init === 'function') {
            await sample_list_component_instance.init(
                sample_list_container_element, 
                handle_edit_sample_request_from_list,
                handle_delete_sample_request_from_list,
                router_ref,
                local_getState
                // dispatch och StoreActionTypes behövs inte av SampleListComponent just nu
            );
        } else { console.error("SampleManagementView: SampleListComponent is not correctly initialized or init function is missing."); }
    }

    function on_sample_saved_or_updated_in_form() {
        // console.log("[SampleManagementView] on_sample_saved_or_updated_in_form called.");
        toggle_add_sample_form_visibility(false);
        // Ingen explicit render() här, storen hanterar det.
        // Behöver dock säkerställa att "Starta granskning"-knappen uppdateras om antalet stickprov ändras från 0 till 1.
        // Detta bör lösas av att hela vyn renderas om av store-prenumerationen.
    }

    function handle_edit_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        // console.log("[SampleManagementView] handle_edit_sample_request_from_list for ID:", sample_id);
        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
            return;
        }
        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        toggle_add_sample_form_visibility(true, sample_id);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        // console.log("[SampleManagementView] handle_delete_sample_request_from_list for ID:", sample_id);
        const current_global_state = local_getState();

        if (current_global_state.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
            return;
        }

        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete && Helpers_escape_html ? Helpers_escape_html(sample_to_delete.description) : sample_id;

        previously_focused_element_for_delete_confirm = document.activeElement;

        if (confirm(t('confirm_delete_sample', {sampleName: sample_name_for_confirm }))) {
            // console.log("[SampleManagementView] Dispatching DELETE_SAMPLE for ID:", sample_id);
            if (!local_StoreActionTypes || !local_StoreActionTypes.DELETE_SAMPLE) {
                console.error("[SampleManagementView] local_StoreActionTypes.DELETE_SAMPLE is undefined!");
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for delete is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.DELETE_SAMPLE,
                payload: { sampleId: sample_id }
            });
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_deleted_successfully', {sampleName: sample_name_for_confirm}), "success");
            
            if (is_form_visible && add_sample_form_component_instance && add_sample_form_component_instance.current_editing_sample_id === sample_id) {
                toggle_add_sample_form_visibility(false);
            }
        } else {
            if (previously_focused_element_for_delete_confirm) {
                previously_focused_element_for_delete_confirm.focus();
                previously_focused_element_for_delete_confirm = null;
            }
        }
    }

    function toggle_add_sample_form_visibility(show, sample_id_to_edit = null) {
        const t = get_t_internally();
        is_form_visible = !!show;
        const current_global_state = local_getState();
        const is_readonly = current_global_state.auditStatus !== 'not_started';

        if (is_readonly && is_form_visible) {
            is_form_visible = false; 
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
        }

        if (add_sample_form_container_element && sample_list_container_element && Helpers_get_icon_svg && t) {
            if (is_form_visible) {
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                if (toggle_form_button_element) { 
                    toggle_form_button_element.innerHTML = `<span>${t('show_existing_samples')}</span>` + (Helpers_get_icon_svg('list', ['currentColor'], 18) || '');
                }
                if (intro_text_element) intro_text_element.setAttribute('hidden', 'true');
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') {
                     add_sample_form_component_instance.render(sample_id_to_edit); 
                } else { console.error("[SampleManagementView/toggle] AddSampleFormComponent.render is not a function or instance is null"); }
                 const first_input = add_sample_form_container_element.querySelector('input, select, textarea');
                if (first_input) first_input.focus();

            } else { 
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                if (toggle_form_button_element) { 
                    toggle_form_button_element.innerHTML = `<span>${t('add_new_sample')}</span>` + (Helpers_get_icon_svg('add', ['currentColor'], 18) || '');
                }
                if (intro_text_element && !is_readonly) intro_text_element.removeAttribute('hidden');
                else if (intro_text_element && is_readonly) intro_text_element.setAttribute('hidden', 'true');

                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                     sample_list_component_instance.render(); 
                } else { console.error("[SampleManagementView/toggle] SampleListComponent.render is not a function or instance is null"); }
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function' && !sample_id_to_edit) {
                    add_sample_form_component_instance.render(null); 
                }
                if(previously_focused_element_for_delete_confirm) { 
                    previously_focused_element_for_delete_confirm.focus();
                    previously_focused_element_for_delete_confirm = null;
                } else if (toggle_form_button_element) { 
                    toggle_form_button_element.focus();
                }
            }
        } else {
            // console.warn("[SampleManagementView/toggle] Core elements for toggle_add_sample_form_visibility might be missing.");
        }
    }

    function handle_start_audit() {
        const t = get_t_internally();
        // console.log("[SampleManagementView] handle_start_audit called.");
        const current_global_state = local_getState();

        if (!current_global_state || !t || !Helpers_get_current_iso_datetime_utc || !local_dispatch || !NotificationComponent_show_global_message || !router_ref) {
            console.error("[SampleManagementView/handle_start_audit] Kritiska beroenden saknas!");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_cannot_start_audit_deps_missing'), "error");
            return;
        }

        if (current_global_state.samples && current_global_state.samples.length > 0 && current_global_state.auditStatus === 'not_started') {
            // console.log("[SampleManagementView] Dispatching SET_AUDIT_STATUS to 'in_progress'.");
            if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
                console.error("[SampleManagementView] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for start audit is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.SET_AUDIT_STATUS,
                payload: { status: 'in_progress' } 
            });
            NotificationComponent_show_global_message(t('audit_started_successfully'), "success");
            setTimeout(() => {
                if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
                router_ref('audit_overview');
            }, 500);
        } else if (current_global_state.auditStatus !== 'not_started') {
            NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
        } else {
            NotificationComponent_show_global_message(t('error_no_samples_to_start_audit'), "warning");
        }
    }

    // **VIKTIG ÄNDRING HÄR:** Ta emot _StoreActionTypes
    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes; // Spara den medskickade referensen

        if (!local_StoreActionTypes) {
            console.error("[SampleManagementViewComponent] CRITICAL: StoreActionTypes was not passed to init or is undefined. Using fallback.");
            local_StoreActionTypes = { 
                SET_AUDIT_STATUS: 'SET_AUDIT_STATUS_ERROR', // Sätt unika fallback-strängar
                DELETE_SAMPLE: 'DELETE_SAMPLE_ERROR',
                // Dessa behövs för att skicka vidare till AddSampleFormComponent
                ADD_SAMPLE: 'ADD_SAMPLE_ERROR', 
                UPDATE_SAMPLE: 'UPDATE_SAMPLE_ERROR'
            };
        }

        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        } else {
            // console.error("SampleManagementView: NotificationComponent_get_global_message_element_reference is not available post assign_globals!");
        }

        await init_sub_components();

        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                }
            }
            catch (error) { console.warn("Failed to load CSS for SampleManagementViewComponent:", error); }
        }
        // console.log("[SampleManagementViewComponent] Init complete.");
    }

    function render() {
        assign_globals_once();
        // console.log("[SampleManagementViewComponent] Rendering. is_form_visible:", is_form_visible);
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t || !local_getState) {
            //  console.error("SampleManagementView: Core dependencies missing for render. Has init completed successfully?");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_sample_management_view_deps_missing')}</p>`;
            return;
        }
        app_container_ref.innerHTML = ''; 
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate sample-management-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }

        const current_global_state = local_getState();
        if (current_global_state.auditStatus !== 'not_started') {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
            const go_to_overview_btn = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                text_content: t('back_to_audit_overview')
            });
            go_to_overview_btn.addEventListener('click', () => router_ref('audit_overview'));
            plate_element.appendChild(go_to_overview_btn);
            return; 
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('sample_management_title') }));

        intro_text_element = Helpers_create_element('p', {
            class_name: 'view-intro-text',
            text_content: t('add_samples_intro_message')
        });
        plate_element.appendChild(intro_text_element);
        if ((current_global_state.samples && current_global_state.samples.length === 0) || is_form_visible) {
            intro_text_element.setAttribute('hidden', 'true');
        }
        
        if (is_form_visible && global_message_element_ref && NotificationComponent_show_global_message &&
            (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim())) {
            NotificationComponent_show_global_message(t('add_sample_form_intro'), "info");
       }

        const top_actions_div = Helpers_create_element('div', { class_name: 'sample-management-actions' });
        toggle_form_button_element = Helpers_create_element('button', { class_name: ['button', 'button-default'] });
        toggle_form_button_element.addEventListener('click', () => {
            toggle_add_sample_form_visibility(!is_form_visible, 
                is_form_visible && add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null
            );
        });
        top_actions_div.appendChild(toggle_form_button_element);
        plate_element.appendChild(top_actions_div);

        if (add_sample_form_container_element) {
            plate_element.appendChild(add_sample_form_container_element);
        } else { console.error("[SampleManagementView] add_sample_form_container_element is undefined before append in render!"); }
        
        if (sample_list_container_element) {
            plate_element.appendChild(sample_list_container_element);
        } else { console.error("[SampleManagementView] sample_list_container_element is undefined before append in render!"); }

        const bottom_actions_div = Helpers_create_element('div', {
            class_name: ['form-actions', 'space-between-groups'],
            style: 'margin-top: 2rem; width: 100%;'
        });
        const left_group_bottom = Helpers_create_element('div', { class_name: 'action-group-left' });
        const right_group_bottom = Helpers_create_element('div', { class_name: 'action-group-right' });
        
        start_audit_button_ref = null; 
        if (current_global_state.samples && current_global_state.samples.length > 0) {
            start_audit_button_ref = Helpers_create_element('button', {
                id: 'start-audit-main-btn',
                class_name: ['button', 'button-success'],
                html_content: `<span>${t('start_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('check_circle_green_yellow', ['var(--button-success-text)', 'var(--button-success-hover-bg)'], 18) : '')
            });
            start_audit_button_ref.addEventListener('click', handle_start_audit);
            right_group_bottom.appendChild(start_audit_button_ref);
        }
        
        bottom_actions_div.appendChild(left_group_bottom); 
        if (right_group_bottom.hasChildNodes()) { 
            bottom_actions_div.appendChild(right_group_bottom);
            plate_element.appendChild(bottom_actions_div);
        }
        
        let should_form_be_visible_initially = is_form_visible; 
        if (!current_global_state.samples || current_global_state.samples.length === 0) {
            should_form_be_visible_initially = true; 
        }
        toggle_add_sample_form_visibility(should_form_be_visible_initially, 
            add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null);
    }

    function destroy() {
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.destroy === 'function') {
            add_sample_form_component_instance.destroy();
        }
        if (sample_list_component_instance && typeof sample_list_component_instance.destroy === 'function') {
            sample_list_component_instance.destroy();
        }
        add_sample_form_container_element = null; sample_list_container_element = null;
        toggle_form_button_element = null; 
        start_audit_button_ref = null;
        global_message_element_ref = null;
        intro_text_element = null;
        is_form_visible = false; 
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        previously_focused_element_for_delete_confirm = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const SampleManagementViewComponent = SampleManagementViewComponent_internal;