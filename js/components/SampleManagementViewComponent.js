// js/components/SampleManagementViewComponent.js
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SampleListComponent } from './SampleListComponent.js';

const SampleManagementViewComponent_internal = (function () { // Start på IIFE, resultatet tilldelas här
    'use-strict';

    const CSS_PATH = 'css/components/sample_management_view_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    let local_subscribe_func; // För att spara subscribe-funktionen från main.js

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

    let unsubscribe_from_store_function = null; 
    const ACTIVE_VIEW_MARKER_CLASS = 'sample-management-view-active-marker';


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
            // Helpers_add_protocol_if_missing; // Denna används inte direkt i denna komponent, men bra att ha om det skulle behövas
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
        if (!Helpers_create_element || !Translation_t) {
            console.error("SampleManagementView: Core dependencies (Helpers or Translation) missing for init_sub_components.");
            return;
        }
        
        add_sample_form_container_element = Helpers_create_element('div', { id: 'add-sample-form-area-smv' }); 
        sample_list_container_element = Helpers_create_element('div', { id: 'sample-list-area-smv' }); 

        // Använd AddSampleFormComponent direkt, inte instansen
        if (AddSampleFormComponent && typeof AddSampleFormComponent.init === 'function') {
            add_sample_form_component_instance = AddSampleFormComponent; // Spara referensen om du behöver anropa andra metoder senare
            await add_sample_form_component_instance.init(
                add_sample_form_container_element, 
                on_sample_saved_or_updated_in_form,
                toggle_add_sample_form_visibility,
                local_getState,
                local_dispatch,
                local_StoreActionTypes
            );
        } else { console.error("SampleManagementView: AddSampleFormComponent or its init function is missing."); }

        // Använd SampleListComponent direkt
        if (SampleListComponent && typeof SampleListComponent.init === 'function') {
            sample_list_component_instance = SampleListComponent; // Spara referensen
            await sample_list_component_instance.init(
                sample_list_container_element, 
                handle_edit_sample_request_from_list,
                handle_delete_sample_request_from_list,
                router_ref,
                local_getState
            );
        } else { console.error("SampleManagementView: SampleListComponent or its init function is missing."); }
    }

    function on_sample_saved_or_updated_in_form() {
        toggle_add_sample_form_visibility(false);
    }

    function handle_edit_sample_request_from_list(sample_id) {
        const t = get_t_internally();
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
        const current_global_state = local_getState();

        if (current_global_state.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
            return;
        }

        if (current_global_state.samples.length <= 1) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_cannot_delete_last_sample'), "warning");
            return;
        }

        const sample_to_delete = current_global_state.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete && Helpers_escape_html ? Helpers_escape_html(sample_to_delete.description) : sample_id;
        previously_focused_element_for_delete_confirm = document.activeElement;

        if (confirm(t('confirm_delete_sample', {sampleName: sample_name_for_confirm }))) {
            if (!local_StoreActionTypes || !local_StoreActionTypes.DELETE_SAMPLE) {
                console.error("[SampleManagementView] local_StoreActionTypes.DELETE_SAMPLE is undefined!");
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for delete is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.DELETE_SAMPLE,
                payload: { sampleId: sample_id }
            });
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
        const is_readonly_mode = current_global_state.auditStatus !== 'not_started';

        if (is_readonly_mode && is_form_visible) {
            is_form_visible = false; 
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
        }
        
        if (add_sample_form_container_element && sample_list_container_element && toggle_form_button_element && Helpers_get_icon_svg) {
            if (is_form_visible) {
                if (!previously_focused_element_for_delete_confirm) { // Spara bara om inte redan satt av delete
                    previously_focused_element_for_delete_confirm = document.activeElement;
                }
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                toggle_form_button_element.innerHTML = `<span>${t('show_existing_samples')}</span>` + (Helpers_get_icon_svg('list', ['currentColor'], 18) || '');
                if (intro_text_element) intro_text_element.setAttribute('hidden', 'true');

                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') {
                     add_sample_form_component_instance.render(sample_id_to_edit); 
                }
                const first_input = add_sample_form_container_element.querySelector('input, select, textarea');
                if (first_input) first_input.focus();

            } else { 
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                toggle_form_button_element.innerHTML = `<span>${t('add_new_sample')}</span>` + (Helpers_get_icon_svg('add', ['currentColor'], 18) || '');
                if (intro_text_element && !is_readonly_mode) intro_text_element.removeAttribute('hidden');
                else if (intro_text_element) intro_text_element.setAttribute('hidden', 'true');
                
                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                     sample_list_component_instance.render(); 
                }
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
        }
    }

    function handle_start_audit() {
        const t = get_t_internally();
        const current_global_state = local_getState();

        if (!current_global_state || !t || !local_dispatch || !NotificationComponent_show_global_message ) {
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_cannot_start_audit_deps_missing'), "error");
            return;
        }

        if (current_global_state.samples && current_global_state.samples.length > 0 && current_global_state.auditStatus === 'not_started') {
            if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS) {
                console.error("[SampleManagementView] local_StoreActionTypes.SET_AUDIT_STATUS is undefined!");
                if (NotificationComponent_show_global_message) NotificationComponent_show_global_message("Internal error: Action type for start audit is missing.", "error");
                return;
            }
            local_dispatch({
                type: local_StoreActionTypes.SET_AUDIT_STATUS,
                payload: { status: 'in_progress' } 
            });
        } else if (current_global_state.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
        } else {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_no_samples_to_start_audit'), "warning");
        }
    }
    
    function handle_store_update(new_state) {
        if (!app_container_ref || !app_container_ref.classList.contains(ACTIVE_VIEW_MARKER_CLASS)) {
            return; 
        }
        render();
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes, _subscribe) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        local_subscribe_func = _subscribe;

        if (!local_StoreActionTypes || !local_StoreActionTypes.SET_AUDIT_STATUS || !local_StoreActionTypes.DELETE_SAMPLE || !local_StoreActionTypes.ADD_SAMPLE || !local_StoreActionTypes.UPDATE_SAMPLE) {
            console.error("[SampleManagementViewComponent] CRITICAL: Core StoreActionTypes missing for init.");
        }
        
        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        } else { console.error("SampleManagementView: NotificationComponent_get_global_message_element_reference not available!"); }

        await init_sub_components();

        if (Helpers_load_css && CSS_PATH) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) await Helpers_load_css(CSS_PATH);
            }
            catch (error) { console.warn("Failed to load CSS for SampleManagementViewComponent:", error); }
        }
        
        if (!unsubscribe_from_store_function && typeof local_subscribe_func === 'function') {
            unsubscribe_from_store_function = local_subscribe_func(handle_store_update);
        } else if (unsubscribe_from_store_function) { /* Redan prenumererad */ }
        else { console.warn("[SampleManagementViewComponent init] Could not subscribe to store: _subscribe function was not provided or is invalid."); }
    }

    function render() {
        assign_globals_once();
        const t = get_t_internally();
        const current_global_state = local_getState();

        if (!app_container_ref || !Helpers_create_element || !t || !current_global_state) {
            console.error("SampleManagementView: Core dependencies missing for render or no current_global_state.");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_sample_management_view_deps_missing')}</p>`;
            return;
        }
        
        let plate_element = app_container_ref.querySelector('.sample-management-view-plate');
        if (!plate_element) {
            app_container_ref.innerHTML = '';
            plate_element = Helpers_create_element('div', { class_name: 'content-plate sample-management-view-plate' });
            app_container_ref.appendChild(plate_element);
        } else {
            const temp_global_message = global_message_element_ref && plate_element.contains(global_message_element_ref) ? global_message_element_ref : null;
            plate_element.innerHTML = '';
            if (temp_global_message) plate_element.appendChild(temp_global_message);
        }
        app_container_ref.classList.add(ACTIVE_VIEW_MARKER_CLASS);


        if (global_message_element_ref && !plate_element.contains(global_message_element_ref)) {
            plate_element.insertBefore(global_message_element_ref, plate_element.firstChild);
        }
        
        if (current_global_state.auditStatus !== 'not_started') {
            if (NotificationComponent_show_global_message) {
                const previous_status_is_not_started = (current_global_state.samples.length > 0 && current_global_state.startTime !== null && current_global_state.endTime === null); // Enkel heuristik
                if (previous_status_is_not_started && current_global_state.auditStatus === 'in_progress') {
                    NotificationComponent_show_global_message(t('audit_started_successfully'), "success");
                } else {
                     NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
                }
            }
            if (router_ref) {
                setTimeout(() => router_ref('audit_overview'), 50); 
            }
            return; 
        }
        else if (NotificationComponent_clear_global_message && global_message_element_ref &&
                   !global_message_element_ref.classList.contains('message-error') &&
                   !global_message_element_ref.classList.contains('message-warning')) {
            NotificationComponent_clear_global_message();
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('sample_management_title') }));

        intro_text_element = plate_element.querySelector('.view-intro-text'); // Försök återanvända
        if (!intro_text_element) {
            intro_text_element = Helpers_create_element('p', {
                class_name: 'view-intro-text',
                text_content: t('add_samples_intro_message')
            });
        }
        // Lägg alltid till (eller lägg till igen om den togs bort av plate_element.innerHTML = '')
        // efter H1 om H1 finns, annars först.
        const h1_in_plate = plate_element.querySelector('h1');
        if (h1_in_plate && h1_in_plate.nextSibling) {
            plate_element.insertBefore(intro_text_element, h1_in_plate.nextSibling);
        } else if (h1_in_plate) {
            plate_element.appendChild(intro_text_element);
        } else {
            plate_element.insertBefore(intro_text_element, plate_element.firstChild);
        }
        
        let top_actions_div = plate_element.querySelector('.sample-management-actions');
        if (!top_actions_div) {
            top_actions_div = Helpers_create_element('div', { class_name: 'sample-management-actions' });
            plate_element.appendChild(top_actions_div); // Eller infoga på rätt plats
        } else {
            top_actions_div.innerHTML = '';
        }
        
        toggle_form_button_element = Helpers_create_element('button', { class_name: ['button', 'button-default'] });
        toggle_form_button_element.addEventListener('click', () => {
            toggle_add_sample_form_visibility(!is_form_visible, 
                add_sample_form_component_instance ? add_sample_form_component_instance.current_editing_sample_id : null
            );
        });
        top_actions_div.appendChild(toggle_form_button_element);

        if (add_sample_form_container_element && !plate_element.contains(add_sample_form_container_element)) {
            plate_element.appendChild(add_sample_form_container_element);
        }
        if (sample_list_container_element && !plate_element.contains(sample_list_container_element)) {
            plate_element.appendChild(sample_list_container_element);
        }
        
        const bottom_actions_div_id = 'smv-bottom-actions';
        let bottom_actions_div = plate_element.querySelector(`#${bottom_actions_div_id}`);
        if (bottom_actions_div) bottom_actions_div.remove(); 

        bottom_actions_div = Helpers_create_element('div', {
            id: bottom_actions_div_id,
            class_name: ['form-actions', 'space-between-groups'],
            style: 'margin-top: 2rem; width: 100%;'
        });
        const left_group_bottom = Helpers_create_element('div', { class_name: 'action-group-left' });
        const right_group_bottom = Helpers_create_element('div', { class_name: 'action-group-right' });
        
        start_audit_button_ref = null;
        if (current_global_state && current_global_state.samples && current_global_state.samples.length > 0 && current_global_state.auditStatus === 'not_started') {
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
        }
        if (left_group_bottom.hasChildNodes() || right_group_bottom.hasChildNodes()){
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
        if (app_container_ref?.classList) {
            app_container_ref.classList.remove(ACTIVE_VIEW_MARKER_CLASS);
        }
        if (unsubscribe_from_store_function) {
            unsubscribe_from_store_function();
            unsubscribe_from_store_function = null;
        }

        add_sample_form_component_instance?.destroy();
        sample_list_component_instance?.destroy();
        
        add_sample_form_container_element = null; 
        sample_list_container_element = null;
        toggle_form_button_element = null; 
        start_audit_button_ref = null;
        global_message_element_ref = null;
        intro_text_element = null;
        local_getState = null;
        local_dispatch = null;
        local_StoreActionTypes = null;
        local_subscribe_func = null;
        previously_focused_element_for_delete_confirm = null;
    }

    return {
        init,
        render,
        destroy
    };
})(); // SLUT på IIFE:n

// Korrekt export av den internt definierade komponenten
export const SampleManagementViewComponent = SampleManagementViewComponent_internal;