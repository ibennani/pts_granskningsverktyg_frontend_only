// js/components/SampleManagementViewComponent.js
import { AddSampleFormComponent } from './AddSampleFormComponent.js';
import { SampleListComponent } from './SampleListComponent.js';

export const SampleManagementViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_management_view_component.css';
    let app_container_ref;
    let router_ref;

    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    // --- Beroenden ---
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_load_css, Helpers_escape_html;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;

    // --- Komponentinstanser och DOM-referenser ---
    let add_sample_form_component_instance;
    let sample_list_component_instance;
    let add_sample_form_container_element;
    let sample_list_container_element;
    let global_message_element_ref;
    let plate_element_ref;

    // --- Internt tillstånd ---
    let is_form_visible = false;
    let current_editing_sample_id = null; // Håller reda på vilket stickprov som redigeras
    let previously_focused_element = null;

    function get_t_internally() {
        if (Translation_t) return Translation_t;
        return (window.Translation?.t) ? window.Translation.t : (key) => `**${key}**`;
    }

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_load_css = window.Helpers?.load_css;
        Helpers_escape_html = window.Helpers?.escape_html;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
        NotificationComponent_clear_global_message = window.NotificationComponent?.clear_global_message;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        
        await init_sub_components();
        await Helpers_load_css(CSS_PATH).catch(e => console.warn(e));
    }

    async function init_sub_components() {
        add_sample_form_container_element = Helpers_create_element('div', { id: 'add-sample-form-area-smv' });
        sample_list_container_element = Helpers_create_element('div', { id: 'sample-list-area-smv' });

        add_sample_form_component_instance = AddSampleFormComponent;
        await add_sample_form_component_instance.init(
            add_sample_form_container_element,
            on_sample_saved_or_updated_in_form,
            () => toggle_add_sample_form_visibility(false),
            local_getState, local_dispatch, local_StoreActionTypes
        );

        sample_list_component_instance = SampleListComponent;
        await sample_list_component_instance.init(
            sample_list_container_element,
            handle_edit_sample_request_from_list,
            handle_delete_sample_request_from_list,
            router_ref, local_getState
        );
    }
    
    // Anropas när formuläret sparas, visar listan igen
    function on_sample_saved_or_updated_in_form() {
        toggle_add_sample_form_visibility(false);
    }

    // Anropas från listan när användaren klickar på "Redigera"
    function handle_edit_sample_request_from_list(sample_id) {
        current_editing_sample_id = sample_id;
        toggle_add_sample_form_visibility(true);
    }

    function handle_delete_sample_request_from_list(sample_id) {
        const t = get_t_internally();
        const current_state = local_getState();
        if (current_state.samples.length <= 1) {
            NotificationComponent_show_global_message(t('error_cannot_delete_last_sample'), "warning");
            return;
        }

        const sample_to_delete = current_state.samples.find(s => s.id === sample_id);
        const sample_name = Helpers_escape_html(sample_to_delete.description);
        previously_focused_element = document.activeElement;

        if (confirm(t('confirm_delete_sample', { sampleName: sample_name }))) {
            local_dispatch({ type: local_StoreActionTypes.DELETE_SAMPLE, payload: { sampleId: sample_id } });
            // Efter en radering, säkerställ att vi visar listan och inte ett tomt redigeringsformulär
            toggle_add_sample_form_visibility(false); 
        } else {
            previously_focused_element?.focus();
        }
    }

    // **ÄNDRING:** Denna funktion styr nu hela vyn
    function toggle_add_sample_form_visibility(show) {
        is_form_visible = !!show;
        
        // Sätt `current_editing_sample_id` till null om vi ska visa "lägg till"-formuläret
        if (show && !current_editing_sample_id) {
            current_editing_sample_id = null;
        }

        render(); // Anropa hela render-funktionen för att bygga om vyn
    }

    function handle_start_audit() {
        local_dispatch({ type: local_StoreActionTypes.SET_AUDIT_STATUS, payload: { status: 'in_progress' } });
        router_ref('audit_overview');
    }

    function render() {
        assign_globals_once();
        const t = get_t_internally();
        const current_state = local_getState();

        // Skapa huvudbehållaren ("plattan") om den inte finns
        if (!plate_element_ref || !app_container_ref.contains(plate_element_ref)) {
            app_container_ref.innerHTML = '';
            plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate sample-management-view-plate' });
            app_container_ref.appendChild(plate_element_ref);
        }
        
        plate_element_ref.innerHTML = ''; // Rensa alltid plattan

        // Lägg till meddelandefältet om det finns
        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
            plate_element_ref.appendChild(global_message_element_ref);
        }

        // **ÄNDRING:** Dynamisk H1-rubrik
        const title_text = is_form_visible
            ? (current_editing_sample_id ? t('edit_sample') : t('add_new_sample'))
            : t('sample_management_title');
        plate_element_ref.appendChild(Helpers_create_element('h1', { text_content: title_text }));

        // **ÄNDRING:** Visa olika innehåll beroende på om formulär eller lista är aktiv
        if (is_form_visible) {
            // Visa formuläret
            add_sample_form_component_instance.render(current_editing_sample_id);
            plate_element_ref.appendChild(add_sample_form_container_element);
        } else {
            // Visa lista och knappar
            plate_element_ref.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('add_samples_intro_message') }));
            
            const top_actions_div = Helpers_create_element('div', { class_name: 'sample-management-actions' });
            const add_button = Helpers_create_element('button', {
                class_name: ['button', 'button-primary'],
                html_content: `<span>${t('add_new_sample')}</span>` + Helpers_get_icon_svg('add')
            });
            add_button.addEventListener('click', () => {
                current_editing_sample_id = null; // Säkerställ att vi är i "lägg till"-läge
                toggle_add_sample_form_visibility(true);
            });
            top_actions_div.appendChild(add_button);
            plate_element_ref.appendChild(top_actions_div);

            sample_list_component_instance.render();
            plate_element_ref.appendChild(sample_list_container_element);
        }
        
        // **ÄNDRING:** Nedre knappraden visas bara när listan är synlig
        if (!is_form_visible) {
            const bottom_actions_div = Helpers_create_element('div', { class_name: ['form-actions', 'space-between-groups'], style: 'margin-top: 2rem; width: 100%;' });
            const right_group_bottom = Helpers_create_element('div', { class_name: 'action-group-right' });
            
            if (current_state.samples.length > 0) {
                const start_audit_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-success'],
                    html_content: `<span>${t('start_audit')}</span>` + Helpers_get_icon_svg('check_circle')
                });
                start_audit_button.addEventListener('click', handle_start_audit);
                right_group_bottom.appendChild(start_audit_button);
            }
            
            // Se till att den tomma vänstra gruppen finns för korrekt justering
            bottom_actions_div.appendChild(Helpers_create_element('div', { class_name: 'action-group-left' }));
            bottom_actions_div.appendChild(right_group_bottom);
            plate_element_ref.appendChild(bottom_actions_div);
        }
    }

    function destroy() {
        add_sample_form_component_instance?.destroy();
        sample_list_component_instance?.destroy();
        plate_element_ref = null;
        current_editing_sample_id = null;
    }

    return { init, render, destroy };
})();