export const RequirementAuditComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/requirement_audit_component.css';
    let app_container_ref;
    let router_ref;
    let params_ref; // Innehåller { sampleId: '...', requirementId: '...' }
    
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_get_current_iso_datetime_utc;
    let State_getCurrentAudit, State_setCurrentAudit;
    let NotificationComponent_show_global_message, NotificationComponent_clear_global_message, NotificationComponent_get_global_message_element_reference;
    // AuditLogic kommer att behövas senare

    let global_message_element_ref;
    let current_sample_object = null;
    let current_requirement_object = null;
    let current_requirement_result = null; // Resultatet för detta krav i detta stickprov

    // DOM-referenser för inmatningsfält
    let actual_observation_input, comment_to_auditor_input, comment_to_actor_input;

    function assign_globals() {
        if (window.Translation) Translation_t = window.Translation.t;
        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_get_current_iso_datetime_utc = window.Helpers.get_current_iso_datetime_utc;
        }
        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
            State_setCurrentAudit = window.State.setCurrentAudit;
        }
        if (window.NotificationComponent) {
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
            NotificationComponent_clear_global_message = window.NotificationComponent.clear_global_message;
            NotificationComponent_get_global_message_element_reference = window.NotificationComponent.get_global_message_element_reference;
        }
    }

    function load_data() {
        const current_audit = State_getCurrentAudit();
        if (!current_audit || !params_ref || !params_ref.sampleId || !params_ref.requirementId) {
            current_sample_object = null;
            current_requirement_object = null;
            current_requirement_result = null;
            return false;
        }

        current_sample_object = current_audit.samples.find(s => s.id === params_ref.sampleId);
        if (!current_sample_object) {
            current_requirement_object = null;
            current_requirement_result = null;
            return false;
        }

        current_requirement_object = current_audit.ruleFileContent.requirements[params_ref.requirementId];
        if (!current_requirement_object) {
            current_requirement_result = null;
            return false;
        }

        // Hämta eller initiera resultatobjektet för detta krav i detta stickprov
        if (!current_sample_object.requirementResults) {
            current_sample_object.requirementResults = {};
        }
        if (!current_sample_object.requirementResults[current_requirement_object.id]) {
            current_sample_object.requirementResults[current_requirement_object.id] = {
                status: 'not_audited',
                actualObservation: '',
                commentToAuditor: '',
                commentToActor: '',
                lastStatusUpdate: null,
                checkResults: {} // Kommer att fyllas på när checks bedöms
            };
        }
        current_requirement_result = current_sample_object.requirementResults[current_requirement_object.id];
        return true;
    }
    
    // Funktion för att spara textfältsdata (anropas oninput/onchange)
    function auto_save_text_data() {
        if (!current_requirement_result || !State_setCurrentAudit) return;

        current_requirement_result.actualObservation = actual_observation_input ? actual_observation_input.value : '';
        current_requirement_result.commentToAuditor = comment_to_auditor_input ? comment_to_auditor_input.value : '';
        current_requirement_result.commentToActor = comment_to_actor_input ? comment_to_actor_input.value : '';
        
        // Uppdatera tidsstämpel om det inte är en check-statusändring som gör det.
        // Denna funktion anropas ofta, så undvik att sätta lastStatusUpdate om det inte behövs.
        // lastStatusUpdate sätts primärt när statusen (passed/failed) på kravet ändras.
        
        State_setCurrentAudit(State_getCurrentAudit()); // Spara hela audit-objektet
        // console.log("Autosaved text data");
    }


    // --- Funktioner för navigationsknappar (kommer att implementeras mer fullständigt) ---
    function go_to_previous_requirement() { NotificationComponent_show_global_message("TODO: Föregående krav", "info"); }
    function go_to_next_requirement() { NotificationComponent_show_global_message("TODO: Nästa krav", "info"); }
    function go_to_next_unhandled_requirement() { NotificationComponent_show_global_message("TODO: Nästa ohanterade krav", "info"); }


    async function init(_app_container, _router, _params) {
        app_container_ref = _app_container;
        router_ref = _router;
        params_ref = _params;
        
        assign_globals();
        
        if (NotificationComponent_get_global_message_element_reference) {
            global_message_element_ref = NotificationComponent_get_global_message_element_reference();
        }
        
        if (!load_data()) { // Ladda data först så vi vet om vi kan fortsätta
             // Felhantering sker i render
        }

        if (window.Helpers && typeof window.Helpers.load_css === 'function') {
            try {
                await window.Helpers.load_css(CSS_PATH);
            } catch (error) {
                console.warn("Failed to load CSS for RequirementAuditComponent:", error);
            }
        }
    }

    function render_audit_section(title_key, content_data, parent_element) {
        if (content_data && ((typeof content_data === 'string' && content_data.trim() !== '') || (Array.isArray(content_data) && content_data.length > 0))) {
            const section = Helpers_create_element('div', { class_name: 'audit-section' });
            section.appendChild(Helpers_create_element('h2', { text_content: Translation_t(title_key) }));
            if (Array.isArray(content_data)) {
                const ul = Helpers_create_element('ul');
                content_data.forEach(item => {
                    // Om item är ett objekt med 'text', annars bara item
                    const text = (typeof item === 'object' && item.text) ? item.text : item;
                    ul.appendChild(Helpers_create_element('li', { html_content: Helpers_escape_html(text) })); // Använd html_content om texten kan innehålla HTML-liknande saker som behöver renderas som text
                });
                section.appendChild(ul);
            } else {
                // För att hantera nyradstecken från JSON till <br> i HTML
                const p = Helpers_create_element('p');
                p.innerHTML = Helpers_escape_html(content_data).replace(/\n/g, '<br>');
                section.appendChild(p);
            }
            parent_element.appendChild(section);
        }
    }


    function render() {
        if (!app_container_ref || !Helpers_create_element || !Translation_t) {
            console.error("RequirementAuditComponent: Core dependencies for render are missing.");
            if(app_container_ref) app_container_ref.innerHTML = "<p>Kunde inte rendera kravgranskningsvyn.</p>";
            return;
        }
        app_container_ref.innerHTML = ''; 
        load_data(); // Se till att datan är den senaste

        const plate_element = Helpers_create_element('div', { class_name: 'content-plate requirement-audit-plate' });
        app_container_ref.appendChild(plate_element);

        if (global_message_element_ref) {
            plate_element.appendChild(global_message_element_ref);
            if(NotificationComponent_clear_global_message) NotificationComponent_clear_global_message();
        }

        if (!current_sample_object || !current_requirement_object) {
            if(NotificationComponent_show_global_message) NotificationComponent_show_global_message("Fel: Kunde inte ladda data för stickprov eller krav.", "error");
            const back_button = Helpers_create_element('button', {class_name: ['button', 'button-default'], text_content: Translation_t('back_to_requirement_list')});
            back_button.addEventListener('click', () => router_ref('requirement_list', { sampleId: params_ref ? params_ref.sampleId : '' }));
            plate_element.appendChild(back_button);
            return;
        }

        const req = current_requirement_object; // Alias för enklare åtkomst

        // Header med kravtitel och standardreferens
        const header_div = Helpers_create_element('div', { class_name: 'requirement-audit-header' });
        header_div.appendChild(Helpers_create_element('h1', { text_content: req.title }));
        if (req.standardReference && req.standardReference.text) {
            const ref_p = Helpers_create_element('p', { class_name: 'standard-reference' });
            if (req.standardReference.url) {
                const link = Helpers_create_element('a', {
                    text_content: req.standardReference.text,
                    attributes: { href: req.standardReference.url, target: '_blank', rel: 'noopener noreferrer' }
                });
                ref_p.appendChild(link);
            } else {
                ref_p.textContent = req.standardReference.text;
            }
            header_div.appendChild(ref_p);
        }
        plate_element.appendChild(header_div);

        // Informationssektioner
        render_audit_section('requirement_expected_observation', req.expectedObservation, plate_element);
        render_audit_section('requirement_instructions', req.instructions, plate_element);
        render_audit_section('requirement_tips', req.tips, plate_element);
        render_audit_section('requirement_exceptions', req.exceptions, plate_element);
        render_audit_section('requirement_common_errors', req.commonErrors, plate_element);

        // Kravets metadata
        if (req.metadata) {
            const meta_section = Helpers_create_element('div', { class_name: 'audit-section' });
            meta_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('requirement_metadata_title') }));
            const grid = Helpers_create_element('div', { class_name: 'requirement-metadata-grid' });
            if(req.metadata.mainCategory) grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${Translation_t('main_category')}:</strong> ${Helpers_escape_html(req.metadata.mainCategory.text)}`}));
            if(req.metadata.subCategory && req.metadata.subCategory.text) grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${Translation_t('sub_category')}:</strong> ${Helpers_escape_html(req.metadata.subCategory.text)}`}));
            if(req.metadata.impact) grid.appendChild(Helpers_create_element('p', { html_content: `<strong>${Translation_t('impact')}:</strong> ${req.metadata.impact.isCritical ? Translation_t('critical') : 'Normal'}`})); // Antag att 'Normal' är alternativet
            meta_section.appendChild(grid);
            plate_element.appendChild(meta_section);
        }

        // Placeholder för Kontrollpunkter (checks)
        const checks_container = Helpers_create_element('div', { class_name: 'checks-container audit-section' });
        checks_container.appendChild(Helpers_create_element('h2', { text_content: Translation_t('checks_title') }));
        checks_container.appendChild(Helpers_create_element('p', { text_content: "(Kontrollpunkter implementeras här)" }));
        plate_element.appendChild(checks_container);

        // Inmatningsfält
        const input_fields_container = Helpers_create_element('div', { class_name: 'input-fields-container audit-section' });
        input_fields_container.appendChild(Helpers_create_element('h2', { text_content: Translation_t('observations_and_comments_title')})); // Ny översättningsnyckel

        let fg, label;
        // Faktisk observation
        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'actualObservation'}, text_content: Translation_t('actual_observation')});
        actual_observation_input = Helpers_create_element('textarea', {id: 'actualObservation', class_name: 'form-control', attributes: {rows: '4'}});
        actual_observation_input.value = current_requirement_result.actualObservation || '';
        actual_observation_input.addEventListener('input', auto_save_text_data);
        fg.appendChild(label); fg.appendChild(actual_observation_input);
        input_fields_container.appendChild(fg);

        // Kommentar till granskare
        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'commentToAuditor'}, text_content: Translation_t('comment_to_auditor')});
        comment_to_auditor_input = Helpers_create_element('textarea', {id: 'commentToAuditor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_auditor_input.value = current_requirement_result.commentToAuditor || '';
        comment_to_auditor_input.addEventListener('input', auto_save_text_data);
        fg.appendChild(label); fg.appendChild(comment_to_auditor_input);
        input_fields_container.appendChild(fg);
        
        // Kommentar till aktör
        fg = Helpers_create_element('div', {class_name: 'form-group'});
        label = Helpers_create_element('label', {attributes: {for: 'commentToActor'}, text_content: Translation_t('comment_to_actor')});
        comment_to_actor_input = Helpers_create_element('textarea', {id: 'commentToActor', class_name: 'form-control', attributes: {rows: '3'}});
        comment_to_actor_input.value = current_requirement_result.commentToActor || '';
        comment_to_actor_input.addEventListener('input', auto_save_text_data);
        fg.appendChild(label); fg.appendChild(comment_to_actor_input);
        input_fields_container.appendChild(fg);
        plate_element.appendChild(input_fields_container);

        // Navigeringsknappar
        const nav_buttons_div = Helpers_create_element('div', { class_name: 'audit-navigation-buttons' });
        const nav_group_left = Helpers_create_element('div', { class_name: 'nav-group-left' });
        const nav_group_right = Helpers_create_element('div', { class_name: 'nav-group-right' });

        const back_to_list_btn = Helpers_create_element('button', { class_name: ['button', 'button-default'], html_content: Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) + `<span>${Translation_t('back_to_requirement_list')}</span>`});
        back_to_list_btn.addEventListener('click', () => router_ref('requirement_list', {sampleId: params_ref.sampleId}));
        nav_group_left.appendChild(back_to_list_btn);
        
        const prev_req_btn = Helpers_create_element('button', { class_name: ['button', 'button-secondary'], html_content: Helpers_get_icon_svg('arrow_back', ['currentColor'], 18) + `<span>${Translation_t('previous_requirement')}</span>`}); // Ikon kan bytas
        prev_req_btn.addEventListener('click', go_to_previous_requirement);
        nav_group_right.appendChild(prev_req_btn);
        
        const next_req_btn = Helpers_create_element('button', { class_name: ['button', 'button-secondary'], html_content: `<span>${Translation_t('next_requirement')}</span>` + Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) });
        next_req_btn.addEventListener('click', go_to_next_requirement);
        nav_group_right.appendChild(next_req_btn);
        
        const next_unhandled_btn = Helpers_create_element('button', { class_name: ['button', 'button-primary'], html_content: `<span>${Translation_t('next_unhandled_requirement')}</span>` + Helpers_get_icon_svg('arrow_forward', ['currentColor'], 18) }); // Ikon kan bytas
        next_unhandled_btn.addEventListener('click', go_to_next_unhandled_requirement);
        nav_group_right.appendChild(next_unhandled_btn);

        nav_buttons_div.appendChild(nav_group_left);
        nav_buttons_div.appendChild(nav_group_right);
        plate_element.appendChild(nav_buttons_div);
    }

    function destroy() { 
        current_sample_object = null;
        current_requirement_object = null;
        current_requirement_result = null;
        actual_observation_input = null;
        comment_to_auditor_input = null;
        comment_to_actor_input = null;
        // Ta bort eventuella specifika lyssnare om de inte tas bort med innerHTML rensning
    }
    
    return { 
        init, 
        render, 
        destroy 
    };
})();