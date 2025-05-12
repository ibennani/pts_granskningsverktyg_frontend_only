import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SampleListComponent } from './SampleListComponent.js';

export const SampleManagementViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_management_view_component.css';
    let app_container_ref;
    let router_ref;
    
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_get_current_iso_datetime_utc, Helpers_load_css;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;

    let add_sample_form_component_instance;
    let sample_list_component_instance;
    let add_sample_form_container_element; 
    let sample_list_container_element;   
    let toggle_form_button_element; 
    let start_audit_button_element = null; 

    let global_message_element_ref;
    let is_form_visible = false;

    function assign_globals() {
        // console.log("[SampleManagementView/assign_globals] CALLED"); 
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

        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
             if (!State_getCurrentAudit || !State_setCurrentAudit) {
                console.error("SampleManagementView: One or more State functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleManagementView: State module is missing!"); all_assigned = false; }
        
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
            if (!NotificationComponent_show_global_message || !NotificationComponent_clear_global_message || !NotificationComponent_get_global_message_element_reference) {
                console.error("SampleManagementView: One or more NotificationComponent functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleManagementView: NotificationComponent module is missing!"); all_assigned = false; }
        // console.log("[SampleManagementView/assign_globals] COMPLETED, all_assigned:", all_assigned);
        return all_assigned;
    }

    async function init_sub_components() {
        // console.log("[SampleManagementView/init_sub_components] CALLED");
        if (!Helpers_create_element) { console.error("SampleManagementView: Helpers_create_element not available for init_sub_components."); return; }
        add_sample_form_container_element = Helpers_create_element('div', { id: 'add-sample-form-area' });
        sample_list_container_element = Helpers_create_element('div', { id: 'sample-list-area' });

        add_sample_form_component_instance = AddSampleFormComponent;
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.init === 'function') {
            // console.log("[SampleManagementView/init_sub_components] Initializing AddSampleFormComponent...");
            await add_sample_form_component_instance.init(add_sample_form_container_element, on_sample_saved, toggle_add_sample_form_visibility);
            // console.log("[SampleManagementView/init_sub_components] AddSampleFormComponent initialized.");
        } else { console.error("SampleManagement: AddSampleFormComponent är inte korrekt initierad."); }

        sample_list_component_instance = SampleListComponent;
        if (sample_list_component_instance && typeof sample_list_component_instance.init === 'function') {
            // console.log("[SampleManagementView/init_sub_components] Initializing SampleListComponent...");
            await sample_list_component_instance.init(sample_list_container_element, handle_edit_sample_request, handle_delete_sample_request, router_ref); 
            // console.log("[SampleManagementView/init_sub_components] SampleListComponent initialized.");
        } else { console.error("SampleManagement: SampleListComponent är inte korrekt initierad."); }
        // console.log("[SampleManagementView/init_sub_components] COMPLETED");
    }

    // --- JUSTERAD on_sample_saved ---
    function on_sample_saved() {
        console.log("[SampleManagementView] on_sample_saved CALLED");
        if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
            console.log("[SampleManagementView/on_sample_saved] Calling SampleListComponent.render()");
            sample_list_component_instance.render(); 
        }
        console.log("[SampleManagementView/on_sample_saved] Calling toggle_add_sample_form_visibility(false)");
        toggle_add_sample_form_visibility(false); // Dölj formulär, visa lista
        
        console.log("[SampleManagementView/on_sample_saved] Calling update_button_states()");
        update_button_states(); // Uppdatera knapparnas enabled/disabled status
        // Vi anropar INTE den yttre render() härifrån direkt längre.
        console.log("[SampleManagementView/on_sample_saved] FINISHED");
    }
    // --- SLUT JUSTERAD on_sample_saved ---
    
    function handle_edit_sample_request(sample_id) {
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (current_audit && current_audit.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('audit_already_started_or_locked'), "info");
            return;
        }
        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        toggle_add_sample_form_visibility(true, sample_id); 
    }

    function handle_delete_sample_request(sample_id) {
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (!current_audit || current_audit.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('audit_already_started_or_locked'), "info");
            return;
        }
        const sample_to_delete = current_audit.samples.find(s => s.id === sample_id);

        if (confirm(Translation_t('confirm_delete_sample', {sampleName: sample_to_delete && Helpers_escape_html ? Helpers_escape_html(sample_to_delete.description) : sample_id }))) {
            current_audit.samples = current_audit.samples.filter(s => s.id !== sample_id);
            if(State_setCurrentAudit) State_setCurrentAudit(current_audit);
            if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                sample_list_component_instance.render(); 
            }
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('sample_deleted_successfully', {sampleName: sample_to_delete && Helpers_escape_html ? Helpers_escape_html(sample_to_delete.description) : ''}), "success");
            
            // Anropa den yttre render() för att "Starta granskning"-knappen ska försvinna om det var sista
            if (typeof render === 'function') {
                 render();
            } else {
                console.error("[SampleManagementView] handle_delete_sample_request: render function is not defined in this scope for re-render!");
            }
        }
    }

    function toggle_add_sample_form_visibility(show, sample_id_to_edit = null) {
        // console.log(`[SampleManagementView/toggle] CALLED. show: ${show}, editing ID: ${sample_id_to_edit}`);
        is_form_visible = !!show; 
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        const is_readonly = current_audit && current_audit.auditStatus !== 'not_started';

        if (is_readonly && is_form_visible) { 
            is_form_visible = false; 
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(Translation_t('audit_already_started_or_locked'), "info");
        }

        if (add_sample_form_container_element && sample_list_container_element && toggle_form_button_element && Helpers_get_icon_svg && Translation_t) {
            if (is_form_visible) { 
                // console.log("[SampleManagementView/toggle] SHOWING FORM");
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                toggle_form_button_element.innerHTML = Helpers_get_icon_svg('list', ['currentColor'], 18) + `<span>${Translation_t('show_existing_samples')}</span>`;
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') {
                    //  console.log("[SampleManagementView/toggle] Calling AddSampleFormComponent.render()");
                     add_sample_form_component_instance.render(sample_id_to_edit); 
                } else { console.error("[SampleManagementView/toggle] AddSampleFormComponent.render is not a function or instance is null"); }
            } else { 
                // console.log("[SampleManagementView/toggle] SHOWING LIST");
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                toggle_form_button_element.innerHTML = Helpers_get_icon_svg('add', ['currentColor'], 18) + `<span>${Translation_t('add_new_sample')}</span>`;
                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                    //  console.log("[SampleManagementView/toggle] Calling SampleListComponent.render()");
                     sample_list_component_instance.render(); 
                } else { console.error("[SampleManagementView/toggle] SampleListComponent.render is not a function or instance is null"); }
            }
        } else {
            console.error("[SampleManagementView/toggle] One or more critical elements/functions are missing for toggle.");
        }
        update_button_states();
    }
    
    function update_button_states() {
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        const is_readonly = current_audit && current_audit.auditStatus !== 'not_started';

        if (toggle_form_button_element) {
            toggle_form_button_element.disabled = is_readonly;
            toggle_form_button_element.classList.toggle('button-disabled', is_readonly);
        }

        if (start_audit_button_element) { 
            const can_start = current_audit && current_audit.samples && current_audit.samples.length > 0 && current_audit.auditStatus === 'not_started';
            start_audit_button_element.disabled = !can_start;
            start_audit_button_element.classList.toggle('button-disabled', !can_start);
        }
    }

    function handle_start_audit() {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("[SampleManagementView] DRING DRING! handle_start_audit ANROPADES.");
        const ca = State_getCurrentAudit ? State_getCurrentAudit() : null;
        console.error("Nuvarande auditStatus:", ca ? ca.auditStatus : "State_getCurrentAudit är null eller current_audit är null");
        console.error("Antal samples:", ca && ca.samples ? ca.samples.length : "N/A");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        
        if (window.NotificationComponent && typeof NotificationComponent_show_global_message === 'function') {
            NotificationComponent_show_global_message("handle_start_audit anropades - detta ska bara hända vid klick på 'Starta Granskning'-knappen.", "warning");
        }
        // Den faktiska logiken är utkommenterad för test
    }

    async function init(_app_container, _router_cb) {
        console.log("[SampleManagementView] INIT CALLED - TOP");
        if (!assign_globals()) {
            console.error("SampleManagementView: Failed to assign global dependencies in init. Component will likely fail.");
            return; 
        }
        app_container_ref = _app_container; 
        router_ref = _router_cb;
        
        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        } else {
            console.error("SampleManagementView: NotificationComponent_get_global_message_element_reference is not available post assign_globals!");
        }
        
        console.log("[SampleManagementView] About to init_sub_components...");
        await init_sub_components(); 
        console.log("[SampleManagementView] FINISHED init_sub_components.");
        
        if (Helpers_load_css) {
            try { 
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH); 
                }
            } 
            catch (error) { console.warn("Failed to load CSS for SampleManagementViewComponent:", error); }
        }
        console.log("[SampleManagementView] INIT COMPLETED");
    }

    function render() {
        console.log("[SampleManagementView] RENDER CALLED");
        if (!app_container_ref || !Helpers_create_element || !Translation_t || !State_getCurrentAudit) {
             console.error("SampleManagementView: Core dependencies missing for render. Has init completed successfully?");
            if(app_container_ref) app_container_ref.innerHTML = "<p>Kunde inte rendera stickprovshantering på grund av saknade beroenden.</p>";
            return;
        }
        app_container_ref.innerHTML = ''; 
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate sample-management-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }
        
        const current_audit = State_getCurrentAudit();
        const is_readonly_view = current_audit && current_audit.auditStatus !== 'not_started';

        if (global_message_element_ref && NotificationComponent_show_global_message && Translation_t &&
            (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim())) {
            if (!is_readonly_view && !is_form_visible) { 
                NotificationComponent_show_global_message(Translation_t('add_samples_intro_message'), "info");
            } else if (is_form_visible && !current_editing_sample_id) {
                 NotificationComponent_show_global_message(Translation_t('add_sample_form_intro'), "info");
            }
        }

        plate_element.appendChild(Helpers_create_element('h1', { text_content: Translation_t('sample_management_title') }));
        
        const top_actions_div = Helpers_create_element('div', { class_name: 'sample-management-actions' });
        toggle_form_button_element = Helpers_create_element('button', { class_name: ['button', 'button-default'] });
        toggle_form_button_element.addEventListener('click', () => {
            const editing_id_if_switching_off_form = is_form_visible ? null : undefined; 
            toggle_add_sample_form_visibility(!is_form_visible, editing_id_if_switching_off_form);
        });
        top_actions_div.appendChild(toggle_form_button_element);
        plate_element.appendChild(top_actions_div);

        if (add_sample_form_container_element) {
            plate_element.appendChild(add_sample_form_container_element);
        } else { console.error("[SampleManagementView] add_sample_form_container_element is undefined before append in render!"); }
        if (sample_list_container_element) {
            plate_element.appendChild(sample_list_container_element);
        } else { console.error("[SampleManagementView] sample_list_container_element is undefined before append in render!"); }
        
        const bottom_actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 2rem; justify-content: flex-end;' });
        start_audit_button_element = null; 
        if (current_audit && current_audit.samples && current_audit.samples.length > 0 && current_audit.auditStatus === 'not_started') {
            start_audit_button_element = Helpers_create_element('button', {
                id: 'start-audit-main-btn',
                class_name: ['button', 'button-accent'], 
                html_content: Helpers_get_icon_svg('check_circle_green_yellow', ['currentColor', 'var(--button-accent-hover-bg)'], 18) + `<span>${Translation_t('start_audit')}</span>`
            });
            start_audit_button_element.addEventListener('click', handle_start_audit);
            bottom_actions_div.appendChild(start_audit_button_element);
        }
        if (bottom_actions_div.hasChildNodes()) {
            plate_element.appendChild(bottom_actions_div); 
        }

        let initial_sample_id_to_edit = null; 
        const should_form_be_visible_initially = is_readonly_view ? false : (current_audit && current_audit.samples && current_audit.samples.length === 0 ? true : is_form_visible);
        
        toggle_add_sample_form_visibility(should_form_be_visible_initially, initial_sample_id_to_edit); 
        update_button_states(); 
        // console.log("[SampleManagementView] RENDER COMPLETED");
    }

    function destroy() { 
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.destroy === 'function') {
            add_sample_form_component_instance.destroy();
        }
        if (sample_list_component_instance && typeof sample_list_component_instance.destroy === 'function') {
            sample_list_component_instance.destroy();
        }
        add_sample_form_container_element = null; sample_list_container_element = null;
        toggle_form_button_element = null; start_audit_button_element = null;
        global_message_element_ref = null; 
    }

    return { 
        init, 
        render, 
        destroy 
    };
})();