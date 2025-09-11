// js/components/requirement_audit/ChecklistHandler.js

export const ChecklistHandler = (function () {
    'use-strict';

    let container_ref;
    let on_status_change_callback; // Callback to the parent component
    let on_autosave_callback; // Callback for text areas

    // Dependencies
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg;
    
    let is_audit_locked = false;
    let requirement_definition_ref = null;
    let requirement_result_ref = null;

    // --- NYTT: För att undvika full omladdning ---
    let is_dom_built = false;

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
    }

    function init(_container, _callbacks) {
        assign_globals_once();
        container_ref = _container;
        on_status_change_callback = _callbacks.onStatusChange;
        on_autosave_callback = _callbacks.onAutosave;

        // --- NYTT: Rensa DOM-status vid ny initiering ---
        is_dom_built = false;

        container_ref.addEventListener('click', handle_checklist_click);
        container_ref.addEventListener('input', handle_textarea_input);
    }
    
    function handle_checklist_click(event) {
        const target_button = event.target.closest('button[data-action]');
        if (!target_button) return;

        const action = target_button.dataset.action;
        const check_item_element = target_button.closest('.check-item[data-check-id]');
        const pc_item_element = target_button.closest('.pass-criterion-item[data-pc-id]');
        
        if (!check_item_element) return;
        const check_id = check_item_element.dataset.checkId;

        let change_info = { type: null, checkId: check_id };

        if (action === 'set-check-complies') {
            change_info.type = 'check_overall_status_change';
            change_info.newStatus = 'passed';
        } else if (action === 'set-check-not-complies') {
            change_info.type = 'check_overall_status_change';
            change_info.newStatus = 'failed';
        } else if (pc_item_element) {
            const pc_id = pc_item_element.dataset.pcId;
            change_info.pcId = pc_id;
            if (action === 'set-pc-passed') {
                change_info.type = 'pc_status_change';
                change_info.newStatus = 'passed';
            } else if (action === 'set-pc-failed') {
                change_info.type = 'pc_status_change';
                change_info.newStatus = 'failed';
            }
        }
        
        if (change_info.type && on_status_change_callback) {
            on_status_change_callback(change_info);
        }
    }
    
    function handle_textarea_input(event) {
        const textarea = event.target;
        if (!textarea.classList.contains('pc-observation-detail-textarea')) return;
        
        const pc_item = textarea.closest('.pass-criterion-item[data-pc-id]');
        const check_item = textarea.closest('.check-item[data-check-id]');
        if (pc_item && check_item) {
            const check_id = check_item.dataset.checkId;
            const pc_id = pc_item.dataset.pcId;
            if (on_autosave_callback) {
                on_autosave_callback({ 
                    type: 'pc_observation', 
                    checkId: check_id, 
                    pcId: pc_id, 
                    value: textarea.value 
                });
            }
        }
    }

    // --- NY FUNKTION: Bygger den initiala DOM-strukturen ---
    function build_initial_dom() {
        const t = Translation_t;
        container_ref.innerHTML = '';

        if (!requirement_definition_ref?.checks?.length) {
            container_ref.appendChild(Helpers_create_element('p', { class_name: 'text-muted', text_content: t('no_checks_for_this_requirement') }));
            is_dom_built = true;
            return;
        }

        container_ref.appendChild(Helpers_create_element('h2', { text_content: t('checks_title') }));
        
        requirement_definition_ref.checks.forEach(check_definition => {
            const check_wrapper = Helpers_create_element('div', { 
                class_name: 'check-item', // Statusklass läggs till i update_dom
                attributes: {'data-check-id': check_definition.id }
            });

            check_wrapper.appendChild(Helpers_create_element('h3', { class_name: 'check-condition-title', text_content: check_definition.condition }));
            
            const actions_div = Helpers_create_element('div', { class_name: 'condition-actions' });
            actions_div.append(
                Helpers_create_element('button', { 
                    class_name: ['button', 'button-success', 'button-small'],
                    attributes: { 'data-action': 'set-check-complies' },
                    html_content: `<span>${t('check_complies')}</span>` + Helpers_get_icon_svg('check_circle', [], 16)
                }),
                Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small'],
                    attributes: { 'data-action': 'set-check-not-complies' },
                    html_content: `<span>${t('check_does_not_comply')}</span>` + Helpers_get_icon_svg('cancel', [], 16)
                })
            );
            check_wrapper.appendChild(actions_div);
            
            check_wrapper.appendChild(Helpers_create_element('p', { class_name: 'check-status-display' }));
            
            // --- Bygg pass criteria listan ---
            const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });
            (check_definition.passCriteria || []).forEach(pc_def => {
                const pc_item_li = Helpers_create_element('li', { 
                    class_name: 'pass-criterion-item', 
                    attributes: {'data-pc-id': pc_def.id }
                });

                const requirement_content_div = Helpers_create_element('div', { class_name: ['pass-criterion-requirement', 'markdown-content'] });
                if (typeof marked !== 'undefined' && typeof window.Helpers.escape_html === 'function') {
                    const renderer = new marked.Renderer();
                    renderer.link = (href, title, text) => `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                    renderer.html = (html) => window.Helpers.escape_html(html);
                    requirement_content_div.innerHTML = marked.parseInline(pc_def.requirement || '', { renderer });
                } else {
                    requirement_content_div.textContent = pc_def.requirement || '';
                }
                pc_item_li.appendChild(requirement_content_div);
                
                pc_item_li.appendChild(Helpers_create_element('div', { class_name: 'pass-criterion-status' }));
                
                const pc_actions_div = Helpers_create_element('div', { class_name: 'pass-criterion-actions' });
                pc_actions_div.append(
                    Helpers_create_element('button', {
                        class_name: ['button', 'button-success', 'button-small'],
                        attributes: { 'data-action': 'set-pc-passed' },
                        html_content: `<span>${t('pass_criterion_approved')}</span>` + Helpers_get_icon_svg('thumb_up', [], 16)
                    }),
                    Helpers_create_element('button', {
                        class_name: ['button', 'button-danger', 'button-small'],
                        attributes: { 'data-action': 'set-pc-failed' },
                        html_content: `<span>${t('pass_criterion_failed')}</span>` + Helpers_get_icon_svg('thumb_down', [], 16)
                    })
                );
                pc_item_li.appendChild(pc_actions_div);

                const observation_wrapper = Helpers_create_element('div', { class_name: 'pc-observation-detail-wrapper form-group' });
                observation_wrapper.innerHTML = `<label for="pc-observation-${check_definition.id}-${pc_def.id}">${t('pc_observation_detail_label')}</label>`;
                const observation_textarea = Helpers_create_element('textarea', {
                    id: `pc-observation-${check_definition.id}-${pc_def.id}`,
                    class_name: 'form-control pc-observation-detail-textarea',
                    attributes: { rows: '4' }
                });
                observation_wrapper.appendChild(observation_textarea);
                
                pc_item_li.appendChild(observation_wrapper);
                pc_list.appendChild(pc_item_li);
            });
            check_wrapper.appendChild(pc_list);

            check_wrapper.appendChild(Helpers_create_element('p', { class_name: 'text-muted compliance-info-text', style: 'font-style: italic;' }));
            
            container_ref.appendChild(check_wrapper);
        });

        is_dom_built = true;
    }

    // --- NY FUNKTION: Uppdaterar den befintliga DOM-strukturen ---
    function update_dom() {
        const t = Translation_t;
        
        container_ref.querySelectorAll('.check-item[data-check-id]').forEach(check_wrapper => {
            const check_id = check_wrapper.dataset.checkId;
            const check_result_data = requirement_result_ref.checkResults[check_id];
            const calculated_check_status = check_result_data?.status || 'not_audited';
            const overall_manual_status = check_result_data?.overallStatus || 'not_audited';

            // Uppdatera statusklassen på wrappern
            check_wrapper.className = `check-item status-${calculated_check_status}`;

            // Uppdatera huvudknapparnas status
            const complies_btn = check_wrapper.querySelector('button[data-action="set-check-complies"]');
            const not_complies_btn = check_wrapper.querySelector('button[data-action="set-check-not-complies"]');
            
            if (complies_btn && not_complies_btn) {
                complies_btn.classList.toggle('active', overall_manual_status === 'passed');
                not_complies_btn.classList.toggle('active', overall_manual_status === 'failed');
                complies_btn.parentElement.style.display = is_audit_locked ? 'none' : 'flex';
            }
            
            // Uppdatera status-texten
            const status_text_container = check_wrapper.querySelector('.check-status-display');
            const status_text = t(`audit_status_${calculated_check_status}`);
            status_text_container.innerHTML = `<strong>${t('check_status')}:</strong> <span class="status-text status-${calculated_check_status}">${status_text}</span>`;
            
            // Hantera synlighet för pass criteria listan och infomeddelande
            const pc_list = check_wrapper.querySelector('.pass-criteria-list');
            const compliance_info_text = check_wrapper.querySelector('.compliance-info-text');

            pc_list.style.display = (overall_manual_status === 'passed' && pc_list.children.length > 0) ? '' : 'none';
            compliance_info_text.style.display = (overall_manual_status === 'failed') ? '' : 'none';
            if (overall_manual_status === 'failed') {
                compliance_info_text.textContent = t('check_marked_as_not_compliant_criteria_passed');
            }

            // Uppdatera varje pass criterion
            check_wrapper.querySelectorAll('.pass-criterion-item[data-pc-id]').forEach(pc_item_li => {
                const pc_id = pc_item_li.dataset.pcId;
                const pc_data = check_result_data?.passCriteria[pc_id] || { status: 'not_audited', observationDetail: '' };
                const current_pc_status = pc_data.status;

                const pc_status_text_container = pc_item_li.querySelector('.pass-criterion-status');
                const pc_status_text = t(`audit_status_${current_pc_status}`);
                pc_status_text_container.innerHTML = `<strong>${t('status')}:</strong> <span class="status-text status-${current_pc_status}">${pc_status_text}</span>`;

                const passed_btn = pc_item_li.querySelector('button[data-action="set-pc-passed"]');
                const failed_btn = pc_item_li.querySelector('button[data-action="set-pc-failed"]');

                if (passed_btn && failed_btn) {
                    passed_btn.classList.toggle('active', current_pc_status === 'passed');
                    failed_btn.classList.toggle('active', current_pc_status === 'failed');
                    passed_btn.parentElement.style.display = is_audit_locked ? 'none' : 'flex';
                }

                const observation_wrapper = pc_item_li.querySelector('.pc-observation-detail-wrapper');
                const observation_textarea = observation_wrapper.querySelector('textarea');

                const was_hidden = observation_wrapper.hidden;
                observation_wrapper.hidden = (current_pc_status !== 'failed');
                
                // Om textrutan precis blev synlig och var tom, sätt fokus.
                if (was_hidden && !observation_wrapper.hidden && !is_audit_locked) {
                    observation_textarea.focus();
                }
                
                observation_textarea.readOnly = is_audit_locked;
                if (observation_textarea.value !== (pc_data.observationDetail || '')) {
                    observation_textarea.value = pc_data.observationDetail || '';
                }
                if (window.Helpers?.init_auto_resize_for_textarea) {
                    window.Helpers.init_auto_resize_for_textarea(observation_textarea);
                }
            });
        });
    }

    // --- ÄNDRAD RENDER-FUNKTION ---
    function render(requirement_definition, requirement_result, locked_status) {
        requirement_definition_ref = requirement_definition;
        requirement_result_ref = requirement_result;
        is_audit_locked = locked_status;

        if (!is_dom_built) {
            build_initial_dom();
        }

        update_dom();
    }

    function destroy() {
        if (container_ref) {
            container_ref.removeEventListener('click', handle_checklist_click);
            container_ref.removeEventListener('input', handle_textarea_input);
            container_ref.innerHTML = '';
        }
        is_dom_built = false;
    }

    return {
        init,
        render,
        destroy
    };
})();