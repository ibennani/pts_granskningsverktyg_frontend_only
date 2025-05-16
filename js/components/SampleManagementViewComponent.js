// js/components/SampleManagementViewComponent.js
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SampleListComponent } from './SampleListComponent.js';

const SampleManagementViewComponent_internal = (function () { // Namnändring för intern IIFE
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
    let toggle_form_button_element; // Beålls som referens om den renderas

    let global_message_element_ref;
    let is_form_visible = false;
    let intro_text_element = null;

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

    function assign_globals() {
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
        return all_assigned;
    }

    async function init_sub_components() {
        if (!Helpers_create_element) { console.error("SampleManagementView: Helpers_create_element not available for init_sub_components."); return; }
        add_sample_form_container_element = Helpers_create_element('div', { id: 'add-sample-form-area' });
        sample_list_container_element = Helpers_create_element('div', { id: 'sample-list-area' });

        add_sample_form_component_instance = AddSampleFormComponent; // Detta är redan ett objekt från import
        if (add_sample_form_component_instance && typeof add_sample_form_component_instance.init === 'function') {
            await add_sample_form_component_instance.init(add_sample_form_container_element, on_sample_saved, toggle_add_sample_form_visibility);
        } else { console.error("SampleManagement: AddSampleFormComponent is not correctly initialized or init function is missing."); }

        sample_list_component_instance = SampleListComponent; // Detta är redan ett objekt från import
        if (sample_list_component_instance && typeof sample_list_component_instance.init === 'function') {
            await sample_list_component_instance.init(sample_list_container_element, handle_edit_sample_request, handle_delete_sample_request, router_ref);
        } else { console.error("SampleManagement: SampleListComponent is not correctly initialized or init function is missing."); }
    }

    function on_sample_saved() {
        if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
            sample_list_component_instance.render();
        }
        toggle_add_sample_form_visibility(false); // Göm formuläret efter sparande
        if (typeof render === 'function') { // Anropa den yttre render-funktionen (SampleManagementViewComponent.render)
            render();
        } else {
            console.error("[SampleManagementView/on_sample_saved] Outer render function is not available.");
        }
    }


    function handle_edit_sample_request(sample_id) {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (current_audit && current_audit.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
            return;
        }
        if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        toggle_add_sample_form_visibility(true, sample_id);
    }

    function handle_delete_sample_request(sample_id) {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        if (!current_audit || current_audit.auditStatus !== 'not_started') {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
            return;
        }
        const sample_to_delete = current_audit.samples.find(s => s.id === sample_id);
        const sample_name_for_confirm = sample_to_delete && Helpers_escape_html ? Helpers_escape_html(sample_to_delete.description) : sample_id;

        if (confirm(t('confirm_delete_sample', {sampleName: sample_name_for_confirm }))) {
            current_audit.samples = current_audit.samples.filter(s => s.id !== sample_id);
            if(State_setCurrentAudit) State_setCurrentAudit(current_audit);

            if (is_form_visible && add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function' && add_sample_form_component_instance.current_editing_sample_id === sample_id) {
                toggle_add_sample_form_visibility(false); 
            } else if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                sample_list_component_instance.render(); 
            }

            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('sample_deleted_successfully', {sampleName: sample_name_for_confirm}), "success");

             if (typeof render === 'function') { // Anropa den yttre render-funktionen (SampleManagementViewComponent.render)
                render();
            } else {
                console.error("[SampleManagementView] handle_delete_sample_request: render function is not defined for re-render!");
            }
        }
    }

    function toggle_add_sample_form_visibility(show, sample_id_to_edit = null) {
        const t = get_t_internally();
        is_form_visible = !!show; // Konvertera till boolean
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;
        const is_readonly = current_audit && current_audit.auditStatus !== 'not_started';

        if (is_readonly && is_form_visible) {
            is_form_visible = false; 
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
        }

        // Hantera toggle_form_button_element även om det är null (om det inte renderades)
        if (add_sample_form_container_element && sample_list_container_element && Helpers_get_icon_svg && t) {
            if (is_form_visible) {
                add_sample_form_container_element.removeAttribute('hidden');
                sample_list_container_element.setAttribute('hidden', 'true');
                if (toggle_form_button_element) { // Knappen finns bara om inte is_readonly
                    toggle_form_button_element.innerHTML = `<span>${t('show_existing_samples')}</span>` + (Helpers_get_icon_svg('list', ['currentColor'], 18) || '');
                }
                if (intro_text_element) intro_text_element.setAttribute('hidden', 'true');
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function') {
                     add_sample_form_component_instance.render(sample_id_to_edit);
                } else { console.error("[SampleManagementView/toggle] AddSampleFormComponent.render is not a function or instance is null"); }
            } else { // Göm formuläret, visa listan
                add_sample_form_container_element.setAttribute('hidden', 'true');
                sample_list_container_element.removeAttribute('hidden');
                if (toggle_form_button_element) { // Knappen finns bara om inte is_readonly
                    toggle_form_button_element.innerHTML = `<span>${t('add_new_sample')}</span>` + (Helpers_get_icon_svg('add', ['currentColor'], 18) || '');
                }
                if (intro_text_element && !is_readonly) intro_text_element.removeAttribute('hidden');
                else if (intro_text_element && is_readonly) intro_text_element.setAttribute('hidden', 'true');

                if (sample_list_component_instance && typeof sample_list_component_instance.render === 'function') {
                     sample_list_component_instance.render();
                } else { console.error("[SampleManagementView/toggle] SampleListComponent.render is not a function or instance is null"); }
                if (add_sample_form_component_instance && typeof add_sample_form_component_instance.render === 'function' && !sample_id_to_edit) {
                    add_sample_form_component_instance.render(null); // "Återställ" formuläret internt
                }
            }
        } else {
            console.warn("[SampleManagementView/toggle] Core elements for toggle_add_sample_form_visibility might be missing. This might be OK if view is readonly.");
        }
    }

    function handle_start_audit() {
        const t = get_t_internally();
        const current_audit = State_getCurrentAudit ? State_getCurrentAudit() : null;

        if (!current_audit || !t || !Helpers_get_current_iso_datetime_utc || !State_setCurrentAudit || !NotificationComponent_show_global_message || !router_ref) {
            console.error("[SampleManagementView/handle_start_audit] Kritiska beroenden saknas!");
            if (NotificationComponent_show_global_message) NotificationComponent_show_global_message(t('error_internal_cannot_start_audit_deps_missing'), "error");
            return;
        }

        if (current_audit.samples && current_audit.samples.length > 0 && current_audit.auditStatus === 'not_started') {
            current_audit.auditStatus = 'in_progress';
            current_audit.startTime = Helpers_get_current_iso_datetime_utc();
            State_setCurrentAudit(current_audit);

            NotificationComponent_show_global_message(t('audit_started_successfully'), "success");

            if (typeof render === 'function') { // Anropa yttre render för att uppdatera UI
                render();
            }

            setTimeout(() => {
                if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
                router_ref('audit_overview');
            }, 500);
        } else if (current_audit.auditStatus !== 'not_started') {
            NotificationComponent_show_global_message(t('audit_already_started_or_locked'), "info");
        } else {
            NotificationComponent_show_global_message(t('error_no_samples_to_start_audit'), "warning");
        }
    }

    async function init(_app_container, _router_cb) {
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
    }

    function render() {
        const t = get_t_internally();
        if (!app_container_ref || !Helpers_create_element || !t || !State_getCurrentAudit) {
             console.error("SampleManagementView: Core dependencies missing for render. Has init completed successfully?");
            if(app_container_ref) app_container_ref.innerHTML = `<p>${t('error_render_sample_management_view_deps_missing')}</p>`;
            return;
        }
        app_container_ref.innerHTML = ''; // Rensa tidigare innehåll
        const plate_element = Helpers_create_element('div', { class_name: 'content-plate sample-management-view-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
        }

        const current_audit = State_getCurrentAudit();
        const is_readonly_view = current_audit && current_audit.auditStatus !== 'not_started';

        plate_element.appendChild(Helpers_create_element('h1', { text_content: t('sample_management_title') }));

        intro_text_element = Helpers_create_element('p', {
            class_name: 'view-intro-text',
            text_content: t('add_samples_intro_message')
        });
        plate_element.appendChild(intro_text_element);
        // Dölj introtext om formuläret ska visas initialt eller om vyn är readonly
        if ((current_audit && current_audit.samples && current_audit.samples.length === 0 && !is_readonly_view) || is_form_visible || is_readonly_view) {
            intro_text_element.setAttribute('hidden', 'true');
        }


       if (is_form_visible && global_message_element_ref && NotificationComponent_show_global_message &&
            (global_message_element_ref.hasAttribute('hidden') || !global_message_element_ref.textContent.trim())) {
            NotificationComponent_show_global_message(t('add_sample_form_intro'), "info");
       }

        const top_actions_div = Helpers_create_element('div', { class_name: 'sample-management-actions' });
        toggle_form_button_element = null; // Återställ referensen
        if (!is_readonly_view) { // Rendera "Lägg till nytt stickprov / Visa lista"-knappen BARA om vyn INTE är readonly
            toggle_form_button_element = Helpers_create_element('button', { class_name: ['button', 'button-default'] });
            // Text och ikon sätts i toggle_add_sample_form_visibility
            toggle_form_button_element.addEventListener('click', () => {
                const editing_id_if_switching_off_form = is_form_visible ? null : undefined;
                toggle_add_sample_form_visibility(!is_form_visible, editing_id_if_switching_off_form);
            });
            top_actions_div.appendChild(toggle_form_button_element);
        }
        
        if (top_actions_div.hasChildNodes()) { // Lägg bara till denna div om knappen faktiskt renderades
            plate_element.appendChild(top_actions_div);
        }


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

        // "Starta granskning"-knappen renderas bara om villkoren är uppfyllda
        if (current_audit && current_audit.samples && current_audit.samples.length > 0 && current_audit.auditStatus === 'not_started') {
            const local_start_audit_button = Helpers_create_element('button', {
                id: 'start-audit-main-btn',
                class_name: ['button', 'button-success'],
                html_content: `<span>${t('start_audit')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('check_circle_green_yellow', ['var(--button-success-text)', 'var(--button-success-hover-bg)'], 18) : '')
            });
            local_start_audit_button.addEventListener('click', handle_start_audit);
            right_group_bottom.appendChild(local_start_audit_button);
        }
        
        bottom_actions_div.appendChild(left_group_bottom); // Alltid för space-between
        if (right_group_bottom.hasChildNodes()) { // Lägg bara till höger grupp och hela raden om det finns knappar i höger grupp
            bottom_actions_div.appendChild(right_group_bottom);
            plate_element.appendChild(bottom_actions_div);
        }
        
        // Bestäm initial synlighet för formuläret/listan
        let initial_sample_id_to_edit = null; 
        let should_form_be_visible_initially;

        if (is_readonly_view) {
            should_form_be_visible_initially = false; // Visa aldrig formulär om vyn är readonly
        } else if (current_audit && current_audit.samples && current_audit.samples.length === 0) {
            should_form_be_visible_initially = true; // Visa formulär om inga stickprov finns och inte readonly
        } else {
            should_form_be_visible_initially = is_form_visible; // Annars, behåll nuvarande synlighet (om inte readonly)
        }

        toggle_add_sample_form_visibility(should_form_be_visible_initially, initial_sample_id_to_edit);
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
        global_message_element_ref = null;
        intro_text_element = null;
        is_form_visible = false;
    }

    return {
        init,
        render,
        destroy
    };
})(); // IIFE avslutas här

// KORREKT EXPORT-SATS:
export const SampleManagementViewComponent = SampleManagementViewComponent_internal;