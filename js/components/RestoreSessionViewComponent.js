// js/components/RestoreSessionViewComponent.js

export const RestoreSessionViewComponent = (function () {
    'use-strict';

    let app_container_ref;
    let on_restore_callback;
    let on_discard_callback;
    let autosaved_state_ref;

    let Translation_t;
    let Helpers_create_element;
    let Helpers_format_iso_to_relative_time;

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_format_iso_to_relative_time = window.Helpers?.format_iso_to_relative_time;
    }

    // Init tar emot beroenden och data från main.js
    async function init(_app_container, _on_restore, _on_discard, _autosaved_state) {
        assign_globals_once();
        app_container_ref = _app_container;
        on_restore_callback = _on_restore;
        on_discard_callback = _on_discard;
        autosaved_state_ref = _autosaved_state;
    }

    function render() {
        if (!app_container_ref || !Translation_t || !Helpers_create_element || !autosaved_state_ref) {
            console.error("[RestoreSessionView] Cannot render, core dependencies or autosaved state missing.");
            app_container_ref.innerHTML = `<p>Error: Could not display restore session options.</p>`;
            return;
        }

        const t = Translation_t;
        app_container_ref.innerHTML = '';

        const plate = Helpers_create_element('div', { class_name: 'content-plate' });
        
        plate.appendChild(Helpers_create_element('h1', { text_content: t('restore_session_title') }));
        plate.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('restore_session_lead_text') }));

        const info_box = Helpers_create_element('div', { style: 'margin-bottom: 2rem; padding: 1rem; background-color: var(--background-color); border-radius: var(--border-radius);' });
        
        const actor_name = autosaved_state_ref.auditMetadata?.actorName || 'Okänd';
        info_box.appendChild(Helpers_create_element('p', { 
            html_content: t('restore_session_info', { actorName: actor_name }),
            style: 'font-weight: 500; font-size: 1.1rem;'
        }));

        const last_update = autosaved_state_ref.samples?.[0]?.requirementResults?.[Object.keys(autosaved_state_ref.samples[0].requirementResults || {})[0]]?.lastStatusUpdate;
        if (last_update && Helpers_format_iso_to_relative_time) {
            info_box.appendChild(Helpers_create_element('p', { 
                text_content: t('restore_session_timestamp', { timestamp: Helpers_format_iso_to_relative_time(last_update) }),
                style: 'color: var(--text-color-muted); font-size: 0.9rem;'
            }));
        }
        
        plate.appendChild(info_box);
        plate.appendChild(Helpers_create_element('p', { text_content: t('restore_session_question') }));

        const actions_div = Helpers_create_element('div', { class_name: 'form-actions', style: 'margin-top: 1.5rem;' });

        const restore_button = Helpers_create_element('button', {
            class_name: ['button', 'button-success'],
            text_content: t('restore_session_confirm_button')
        });
        restore_button.addEventListener('click', on_restore_callback);

        const discard_button = Helpers_create_element('button', {
            class_name: ['button', 'button-danger'],
            text_content: t('restore_session_discard_button')
        });
        discard_button.addEventListener('click', on_discard_callback);

        actions_div.append(restore_button, discard_button);
        plate.appendChild(actions_div);

        app_container_ref.appendChild(plate);
    }

    function destroy() {
        app_container_ref.innerHTML = '';
        on_restore_callback = null;
        on_discard_callback = null;
        autosaved_state_ref = null;
    }

    return {
        init,
        render,
        destroy
    };
})();