// js/components/SampleListComponent.js

const SampleListComponent_internal = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/sample_list_component.css';
    let list_container_ref;
    let on_edit_callback;      // För SampleManagementView
    let on_delete_callback;    // För SampleManagementView
    let router_ref_from_parent; // För AuditOverview och SampleManagementView (för "Granska" / "Visa krav")

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_add_protocol_if_missing, Helpers_load_css;
    let State_getCurrentAudit;
    let AuditLogic_get_relevant_requirements_for_sample, AuditLogic_find_first_incomplete_requirement_key_for_sample, AuditLogic_calculate_requirement_status;
    let NotificationComponent_show_global_message; // Används inte aktivt, men kan vara bra att ha

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
                return str + " (SampleList t not found)";
            };
    }

    function assign_globals() {
        let all_assigned = true;
        if (window.Translation && window.Translation.t) { Translation_t = window.Translation.t; }
        else { console.error("SampleList: Translation.t is missing!"); all_assigned = false; }

        if (window.Helpers) {
            Helpers_create_element = window.Helpers.create_element;
            Helpers_get_icon_svg = window.Helpers.get_icon_svg;
            Helpers_escape_html = window.Helpers.escape_html;
            Helpers_add_protocol_if_missing = window.Helpers.add_protocol_if_missing;
            Helpers_load_css = window.Helpers.load_css;
            if (!Helpers_create_element || !Helpers_get_icon_svg || !Helpers_escape_html || !Helpers_add_protocol_if_missing || !Helpers_load_css) {
                 console.error("SampleList: One or more Helper functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleList: Helpers module is missing!"); all_assigned = false; }

        if (window.State) {
            State_getCurrentAudit = window.State.getCurrentAudit;
             if (!State_getCurrentAudit) {
                console.error("SampleList: State.getCurrentAudit function is missing!"); all_assigned = false;
            }
        } else { console.error("SampleList: State module is missing!"); all_assigned = false; }

        if (window.AuditLogic) {
            AuditLogic_get_relevant_requirements_for_sample = window.AuditLogic.get_relevant_requirements_for_sample;
            AuditLogic_find_first_incomplete_requirement_key_for_sample = window.AuditLogic.find_first_incomplete_requirement_key_for_sample;
            AuditLogic_calculate_requirement_status = window.AuditLogic.calculate_requirement_status;
            if (!AuditLogic_get_relevant_requirements_for_sample || !AuditLogic_find_first_incomplete_requirement_key_for_sample || !AuditLogic_calculate_requirement_status) {
                console.error("SampleList: One or more AuditLogic functions are missing!"); all_assigned = false;
            }
        } else { console.error("SampleList: AuditLogic module is missing!"); all_assigned = false; }

        if (window.NotificationComponent) { // Även om den inte används, bra att ha referensen om den skulle behövas
            NotificationComponent_show_global_message = window.NotificationComponent.show_global_message;
        } else {
            // console.warn("SampleList: NotificationComponent not found, global messages will not be shown from here.");
        }

        return all_assigned;
    }

    async function init(_list_container, _on_edit_cb, _on_delete_cb, _router_cb) {
        if(!assign_globals()) {
            console.error("SampleListComponent: Failed to assign global dependencies in init.");
        }
        list_container_ref = _list_container;
        on_edit_callback = _on_edit_cb;         // Specifikt för SampleManagementView
        on_delete_callback = _on_delete_cb;     // Specifikt för SampleManagementView
        router_ref_from_parent = _router_cb;    // För AuditOverview (granska-knapp) & SampleManagementView (visa krav)

        if (Helpers_load_css) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for SampleListComponent:", error);
            }
        }
    }

    function render() {
        const t = get_t_internally();
        if (!list_container_ref || !t || !State_getCurrentAudit || !Helpers_create_element || !AuditLogic_get_relevant_requirements_for_sample || !AuditLogic_calculate_requirement_status) {
            console.error("SampleListComponent: Core dependencies missing for render. Has init completed successfully?");
            if (list_container_ref) list_container_ref.innerHTML = `<p>${t('error_render_component', {componentName: 'SampleList'})}</p>`;
            return;
        }
        list_container_ref.innerHTML = '';

        const current_audit = State_getCurrentAudit();
        if (!current_audit || !current_audit.ruleFileContent) {
            list_container_ref.textContent = t('error_audit_data_missing_for_list', {defaultValue: "Audit data (rule file) missing for displaying the list."});
            return;
        }

        if (!current_audit.samples || current_audit.samples.length === 0) {
            const no_samples_msg = Helpers_create_element('p', {
                class_name: 'no-samples-message',
                text_content: t('no_samples_added')
            });
            list_container_ref.appendChild(no_samples_msg);
            return;
        }

        const ul = Helpers_create_element('ul', { class_name: 'sample-list item-list' });
        const is_audit_not_started = current_audit.auditStatus === 'not_started';

        current_audit.samples.forEach(sample => {
            const li = Helpers_create_element('li', {
                class_name: 'sample-list-item item-list-item',
                attributes: {'data-sample-id': sample.id}
            });

            const info_div = Helpers_create_element('div', { class_name: 'sample-info' });
            const desc_h3 = Helpers_create_element('h3', { text_content: sample.description || t('undefined_description', {defaultValue: "Undefined description"}) });
            const type_p = Helpers_create_element('p');
            type_p.innerHTML = `<strong>${t('page_type')}:</strong> ${Helpers_escape_html(sample.pageType)}`;
            info_div.appendChild(desc_h3);
            info_div.appendChild(type_p);

            if(sample.url && Helpers_add_protocol_if_missing) {
                const url_p = Helpers_create_element('p');
                const safe_url = Helpers_add_protocol_if_missing(sample.url);
                url_p.innerHTML = `<strong>${t('url')}:</strong> <a href="${Helpers_escape_html(safe_url)}" target="_blank" rel="noopener noreferrer" title="${t('visit_url')}: ${Helpers_escape_html(sample.url)}">${Helpers_escape_html(sample.url)}</a>`;
                info_div.appendChild(url_p);
            }

            const relevant_reqs_for_sample_list = AuditLogic_get_relevant_requirements_for_sample(current_audit.ruleFileContent, sample);
            const total_relevant_reqs = relevant_reqs_for_sample_list.length;
            let audited_reqs_count = 0;

            relevant_reqs_for_sample_list.forEach(req_definition_from_list => {
                const req_object_from_rulefile = current_audit.ruleFileContent.requirements[req_definition_from_list.key]; // Använd .key för att hämta definition
                const req_result_from_sample = sample.requirementResults ? sample.requirementResults[req_definition_from_list.id] : null; // Använd .id för resultat
                
                if (req_object_from_rulefile) {
                    const req_status = AuditLogic_calculate_requirement_status(req_object_from_rulefile, req_result_from_sample);
                    if (req_status === 'passed' || req_status === 'failed') {
                        audited_reqs_count++;
                    }
                } else {
                    console.warn(`SampleList: Could not find full requirement object in ruleFile for key: ${req_definition_from_list.key} (id: ${req_definition_from_list.id})`);
                }
            });

            const progress_p = Helpers_create_element('p');
            progress_p.innerHTML = `<strong>${t('requirements_audited')}:</strong> ${audited_reqs_count} / ${total_relevant_reqs}`;
            info_div.appendChild(progress_p);
            
            if (window.ProgressBarComponent && typeof window.ProgressBarComponent.create === 'function') {
                const progress_bar = window.ProgressBarComponent.create(audited_reqs_count, total_relevant_reqs, {});
                info_div.appendChild(progress_bar);
            }
            if (sample.selectedContentTypes && sample.selectedContentTypes.length > 0 &&
                current_audit.ruleFileContent.metadata && current_audit.ruleFileContent.metadata.contentTypes) {
                const content_types_div = Helpers_create_element('div', { class_name: 'content-types-display' });
                const content_types_strong = Helpers_create_element('strong', { text_content: t('content_types') + ':'});
                const content_types_ul = Helpers_create_element('ul');
                sample.selectedContentTypes.forEach(ct_id => {
                    const ct_object = current_audit.ruleFileContent.metadata.contentTypes.find(c => c.id === ct_id);
                    const ct_text = ct_object ? ct_object.text : ct_id;
                    content_types_ul.appendChild(Helpers_create_element('li', { text_content: Helpers_escape_html(ct_text) }));
                });
                content_types_div.appendChild(content_types_strong);
                content_types_div.appendChild(content_types_ul);
                info_div.appendChild(content_types_div);
            }
            li.appendChild(info_div);

            const actions_wrapper_div = Helpers_create_element('div', { class_name: 'sample-actions-wrapper' });
            const main_actions_div = Helpers_create_element('div', { class_name: 'sample-actions-main' });
            const delete_actions_div = Helpers_create_element('div', { class_name: 'sample-actions-delete' }); // För delete-knappen

            // "Visa alla krav"-knapp (renderas om det finns relevanta krav)
            if (total_relevant_reqs > 0) {
                const view_reqs_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-secondary', 'button-small'],
                    html_content: `<span>${t('view_all_requirements_button')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('list', ['currentColor'], 16) : ''),
                    attributes: { 'aria-label': `${t('view_all_requirements_button')}: ${sample.description}` }
                });
                view_reqs_button.addEventListener('click', () => {
                    if (router_ref_from_parent) router_ref_from_parent('requirement_list', { sampleId: sample.id });
                });
                main_actions_div.appendChild(view_reqs_button);
            } else {
                const no_reqs_info = Helpers_create_element('span', {class_name: 'text-muted button-small', text_content: t('no_relevant_requirements_for_sample_short', {defaultValue: "(No relevant requirements)"})});
                main_actions_div.appendChild(no_reqs_info);
            }

            // "Besök URL"-knapp (renderas om URL finns)
            if (sample.url) {
                const visit_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-secondary', 'button-small'],
                    html_content: `<span>${t('visit_url')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('visit_url', ['currentColor'], 16) : ''),
                    attributes: { 'aria-label': `${t('visit_url')}: ${sample.description}` }
                });
                visit_button.addEventListener('click', () => {
                    if (Helpers_add_protocol_if_missing) window.open(Helpers_add_protocol_if_missing(sample.url), '_blank', 'noopener,noreferrer');
                });
                main_actions_div.appendChild(visit_button);
            }

            // "Granska"-knapp (renderas om granskning är "in_progress" och det finns relevanta krav)
            if (current_audit.auditStatus === 'in_progress' && total_relevant_reqs > 0) {
                const first_incomplete_req_key = AuditLogic_find_first_incomplete_requirement_key_for_sample(current_audit.ruleFileContent, sample);
                let review_button_text_key = first_incomplete_req_key ? 'audit_next_incomplete_requirement' : 'view_audited_sample';
                
                const review_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-primary', 'button-small'],
                    html_content: `<span>${t(review_button_text_key)}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('audit_sample', ['currentColor'], 16) : ''),
                    attributes: { 'aria-label': `${t(review_button_text_key)}: ${sample.description}` }
                });
                review_button.addEventListener('click', () => {
                    if (router_ref_from_parent) {
                        if (first_incomplete_req_key) {
                            router_ref_from_parent('requirement_audit', { sampleId: sample.id, requirementId: first_incomplete_req_key });
                        } else { // Om allt är klart, gå till listan för att se resultaten
                            router_ref_from_parent('requirement_list', { sampleId: sample.id });
                        }
                    }
                });
                main_actions_div.appendChild(review_button);
            }

            // "Redigera"-knapp (renderas om granskning inte startat och callback finns)
            if (is_audit_not_started && typeof on_edit_callback === 'function') {
                const edit_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-default', 'button-small'],
                    html_content: `<span>${t('edit_sample')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('edit', ['currentColor'], 16) : ''),
                    attributes: { 'aria-label': `${t('edit_sample')}: ${sample.description}` }
                });
                edit_button.addEventListener('click', () => {
                    on_edit_callback(sample.id);
                });
                // Lägg till edit-knappen först bland huvudåtgärderna
                if (main_actions_div.firstChild) {
                    main_actions_div.insertBefore(edit_button, main_actions_div.firstChild);
                } else {
                    main_actions_div.appendChild(edit_button);
                }
            }

            // "Radera"-knapp (renderas om granskning inte startat och callback finns)
            if (is_audit_not_started && typeof on_delete_callback === 'function') {
                const delete_button = Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small'],
                    html_content: `<span>${t('delete_sample')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('delete', ['currentColor'], 16) : ''),
                    attributes: { 'aria-label': `${t('delete_sample')}: ${sample.description}` }
                });
                delete_button.addEventListener('click', () => {
                    on_delete_callback(sample.id);
                });
                delete_actions_div.appendChild(delete_button);
            }

            if (main_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(main_actions_div);
            if (delete_actions_div.hasChildNodes()) actions_wrapper_div.appendChild(delete_actions_div);
            if (actions_wrapper_div.hasChildNodes()) li.appendChild(actions_wrapper_div);

            ul.appendChild(li);
        });
        list_container_ref.appendChild(ul);
    }

    function destroy() {
        // Rensa referenser
        list_container_ref = null;
        on_edit_callback = null;
        on_delete_callback = null;
        router_ref_from_parent = null;
    }

    return {
        init,
        render,
        destroy
    };
})();

export const SampleListComponent = SampleListComponent_internal;