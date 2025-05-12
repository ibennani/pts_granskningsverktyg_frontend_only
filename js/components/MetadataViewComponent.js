export const MetadataViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/metadata_view_component.css';
    let app_container_ref;
    let router_ref;
    const { t } = Translation;
    const { create_element, get_icon_svg } = Helpers;
    let global_message_element_ref;

    let case_number_input, actor_name_input, actor_link_input, auditor_name_input, internal_comment_input;

    async function init(_app_container, _router) {
        app_container_ref = _app_container;
        router_ref = _router;
        global_message_element_ref = NotificationComponent.get_global_message_element_reference();
        
        try {
            await Helpers.load_css(CSS_PATH);
        } catch (error) {
            console.warn("Failed to load CSS for MetadataViewComponent:", error);
        }
    }

    function save_metadata() {
        const current_audit = State.getCurrentAudit();
        if (!current_audit) {
            NotificationComponent.show_global_message("Fel: Ingen aktiv granskning hittades för att spara metadata.", "error");
            return false;
        }

        if (current_audit.auditStatus !== 'not_started') {
            return true; 
        }
        
        let actor_link_value = actor_link_input.value.trim();
        if (actor_link_value) {
            actor_link_value = Helpers.add_protocol_if_missing(actor_link_value);
        }

        current_audit.auditMetadata = {
            caseNumber: case_number_input.value.trim(),
            actorName: actor_name_input.value.trim(),
            actorLink: actor_link_value,
            auditorName: auditor_name_input.value.trim(),
            internalComment: internal_comment_input.value.trim()
        };
        State.setCurrentAudit(current_audit);
        return true;
    }

    function handle_submit(event) {
        event.preventDefault();
        if (save_metadata()) {
            // Rensa inte det globala meddelandet här, låt nästa vy hantera det
            // NotificationComponent.clear_global_message(); 
            router_ref('sample_management');
        }
    }

    function create_form_field(id, label_key, type = 'text', current_value = '', remove_placeholder = false) {
        const form_group = create_element('div', { class_name: 'form-group' });
        const label = create_element('label', { 
            attributes: { for: id },
            text_content: t(label_key)
        });
        
        let input_element;
        const attributes = { type: type };
        if (remove_placeholder) {
            // Specifikt för att inte ha placeholder, även om type=url normalt kan ha det
        } else if (type === 'url') {
            // Behåll standard placeholder för URL om inte remove_placeholder är true
            // attributes.placeholder = 'https://exempel.se'; // Borttagen enligt önskemål
        }


        if (type === 'textarea') {
            input_element = create_element('textarea', { 
                id: id, 
                class_name: 'form-control',
                attributes: { rows: '3' }
            });
            input_element.value = current_value;
        } else {
            input_element = create_element('input', { 
                id: id, 
                class_name: 'form-control',
                attributes: attributes // Använd de modifierade attributen
            });
            input_element.value = current_value;
        }
        
        form_group.appendChild(label);
        form_group.appendChild(input_element);
        return { form_group, input_element };
    }

    function create_static_field(label_key, value) {
        const p = create_element('p', { class_name: 'static-field' }); // Lade till klass för styling
        const strong = create_element('strong', { text_content: t(label_key) + ':' });
        p.appendChild(strong);
        p.appendChild(document.createTextNode(' ')); // Lägg till ett mellanslag
        p.appendChild(document.createTextNode(value || '---'));
        return p;
    }

    function render() {
        if (!app_container_ref) return;
        app_container_ref.innerHTML = '';

        const current_audit = State.getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent) {
            NotificationComponent.show_global_message("Fel: Ingen regelfil är laddad. Gå tillbaka och ladda upp en regelfil.", "error");
            const back_button = create_element('button', {
                text_content: t('back_to_overview'), // Eller en mer passande text
                class_name: ['button', 'button-default'],
                event_listeners: { click: () => router_ref('upload') }
            });
            app_container_ref.appendChild(back_button);
            return;
        }
        
        // Skapa "plattan"
        const plate_element = create_element('div', { class_name: 'content-plate metadata-view-plate' });
        app_container_ref.appendChild(plate_element);


        // Lägg till globala meddelandefältet inuti plattan, högst upp
        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            // Rensa/visa meddelande för denna vy
            if (!global_message_element_ref.textContent || global_message_element_ref.hasAttribute('hidden')) {
                // Inget aktivt meddelande, så visa inget specifikt för vyn heller,
                // låt det vara tomt tills ett relevant meddelande visas.
                // NotificationComponent.clear_global_message(); // Säkerställ att det är rensat
            }
        }

        const title = create_element('h1', { text_content: t('audit_metadata_title') });
        plate_element.appendChild(title);

        // Texten under rubriken
        const intro_p = create_element('p', { 
            class_name: 'view-intro-text',
            text_content: "Ange metadata för granskningen. Alla fält är frivilliga." 
        });
        plate_element.appendChild(intro_p);


        const form_container = create_element('div', { class_name: 'metadata-form-container' });
        const form = create_element('form');
        form.addEventListener('submit', handle_submit);

        const metadata = current_audit.auditMetadata || {};
        const is_editable = current_audit.auditStatus === 'not_started';

        if (is_editable) {
            const case_field = create_form_field('caseNumber', 'case_number', 'text', metadata.caseNumber);
            case_number_input = case_field.input_element;
            form.appendChild(case_field.form_group);

            const actor_field = create_form_field('actorName', 'actor_name', 'text', metadata.actorName);
            actor_name_input = actor_field.input_element;
            form.appendChild(actor_field.form_group);

            // Ta bort placeholder genom att inte skicka den till create_form_field eller sätta remove_placeholder=true
            const actor_link_field = create_form_field('actorLink', 'actor_link', 'url', metadata.actorLink, true); // true för att ta bort placeholder
            actor_link_input = actor_link_field.input_element;
            // actor_link_input.removeAttribute('placeholder'); // Alternativt sätt att ta bort den
            form.appendChild(actor_link_field.form_group);

            const auditor_field = create_form_field('auditorName', 'auditor_name', 'text', metadata.auditorName);
            auditor_name_input = auditor_field.input_element;
            form.appendChild(auditor_field.form_group);

            const comment_field = create_form_field('internalComment', 'internal_comment', 'textarea', metadata.internalComment);
            internal_comment_input = comment_field.input_element;
            form.appendChild(comment_field.form_group);
            
            form_container.appendChild(form);
        } else { 
            const static_display_div = create_element('div', { class_name: 'static-metadata-display' });
            static_display_div.appendChild(create_static_field('case_number', metadata.caseNumber));
            static_display_div.appendChild(create_static_field('actor_name', metadata.actorName));
            
            const actor_link_p = create_element('p', {class_name: 'static-field'});
            const actor_link_strong = create_element('strong', { text_content: t('actor_link') + ':' });
            actor_link_p.appendChild(actor_link_strong);
            actor_link_p.appendChild(document.createTextNode(' '));
            if (metadata.actorLink) {
                const link_el = create_element('a', {text_content: metadata.actorLink, attributes: {href: Helpers.add_protocol_if_missing(metadata.actorLink), target: '_blank', rel: 'noopener noreferrer'}});
                actor_link_p.appendChild(link_el);
            } else {
                actor_link_p.appendChild(document.createTextNode('---'));
            }
            static_display_div.appendChild(actor_link_p);
            
            static_display_div.appendChild(create_static_field('auditor_name', metadata.auditorName));
            static_display_div.appendChild(create_static_field('internal_comment', metadata.internalComment));
            form_container.appendChild(static_display_div);
        }
        
        plate_element.appendChild(form_container); 
        
        const actions_div = create_element('div', { class_name: 'metadata-actions' });
        const submit_button = create_element('button', {
            class_name: ['button', 'button-primary'],
            attributes: { type: 'submit' }, 
            html_content: get_icon_svg('arrow_forward', ['currentColor'], 18) + `<span>${t('continue_to_samples')}</span>`
        });
        
        if (is_editable) {
            form.appendChild(actions_div); 
        } else {
            // Om inte editerbar, lägg knappen direkt i plattan efter form-containern
            // Detta gör att submit-eventet på formen inte triggas om det inte finns en form,
            // så vi lägger en click listener direkt på knappen för navigering.
            if(!is_editable) {
                 submit_button.removeAttribute('type'); // Ta bort type=submit
                 submit_button.addEventListener('click', (e) => {
                    e.preventDefault(); // Förhindra eventuell default-åtgärd
                    router_ref('sample_management');
                 });
            }
            plate_element.appendChild(actions_div);
        }
        actions_div.appendChild(submit_button);

    }

    function destroy() {
        case_number_input = null;
        actor_name_input = null;
        actor_link_input = null;
        auditor_name_input = null;
        internal_comment_input = null;
    }

    return {
        init,
        render,
        destroy
    };
})();