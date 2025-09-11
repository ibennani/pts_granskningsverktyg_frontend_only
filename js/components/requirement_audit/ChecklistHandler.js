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

    function render(requirement_definition, requirement_result, locked_status) {
        requirement_definition_ref = requirement_definition;
        requirement_result_ref = requirement_result;
        is_audit_locked = locked_status;

        const t = Translation_t;
        container_ref.innerHTML = ''; // Clear previous content

        if (!requirement_definition_ref?.checks?.length) {
            container_ref.appendChild(Helpers_create_element('p', { class_name: 'text-muted', text_content: t('no_checks_for_this_requirement') }));
            return;
        }

        container_ref.appendChild(Helpers_create_element('h2', { text_content: t('checks_title') }));
        
        requirement_definition_ref.checks.forEach(check_definition => {
            const check_result_data = requirement_result_ref.checkResults[check_definition.id];
            const calculated_check_status = check_result_data?.status || 'not_audited';
    
            const check_wrapper = Helpers_create_element('div', { 
                class_name: `check-item status-${calculated_check_status}`,
                attributes: {'data-check-id': check_definition.id }
            });

            check_wrapper.appendChild(Helpers_create_element('h3', { class_name: 'check-condition-title', text_content: check_definition.condition }));
            
            const overall_manual_status = check_result_data?.overallStatus || 'not_audited';
    
            if (!is_audit_locked) { 
                const actions_div = Helpers_create_element('div', { class_name: 'condition-actions' });
                const complies_btn = Helpers_create_element('button', { 
                    class_name: ['button', 'button-success', 'button-small', overall_manual_status === 'passed' ? 'active' : ''],
                    attributes: { 'data-action': 'set-check-complies' },
                    html_content: `<span>${t('check_complies')}</span>` + Helpers_get_icon_svg('check_circle', [], 16)
                });
                const not_complies_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small', overall_manual_status === 'failed' ? 'active' : ''],
                    attributes: { 'data-action': 'set-check-not-complies' },
                    html_content: `<span>${t('check_does_not_comply')}</span>` + Helpers_get_icon_svg('cancel', [], 16)
                });
                actions_div.append(complies_btn, not_complies_btn);
                check_wrapper.appendChild(actions_div);
            }
            
            const status_text = t(`audit_status_${calculated_check_status}`);
            check_wrapper.appendChild(Helpers_create_element('p', { 
                class_name: 'check-status-display', 
                html_content: `<strong>${t('check_status')}:</strong> <span class="status-text status-${calculated_check_status}">${status_text}</span>`
            }));
    
            if (overall_manual_status === 'passed' && check_definition.passCriteria?.length) {
                check_wrapper.appendChild(render_pass_criteria_list(check_definition, check_result_data));
            } else if (overall_manual_status === 'failed') {
                check_wrapper.appendChild(Helpers_create_element('p', { 
                    class_name: 'text-muted', 
                    style: 'font-style: italic;', 
                    text_content: t('check_marked_as_not_compliant_criteria_passed')
                }));
            }
            
            container_ref.appendChild(check_wrapper);
        });
    }

    function render_pass_criteria_list(check_definition, check_result_data) {
        const t = Translation_t;
        const pc_list = Helpers_create_element('ul', { class_name: 'pass-criteria-list' });

        check_definition.passCriteria.forEach(pc_def => {
            const pc_item_li = Helpers_create_element('li', { 
                class_name: 'pass-criterion-item', 
                attributes: {'data-pc-id': pc_def.id }
            });

            // --- START OF CHANGE ---
            const requirement_content_div = Helpers_create_element('div', {
                class_name: ['pass-criterion-requirement', 'markdown-content']
            });

            if (typeof marked !== 'undefined' && typeof window.Helpers.escape_html === 'function') {
                const renderer = new marked.Renderer();
                renderer.link = (href, title, text) => `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                renderer.html = (html_token) => {
                    const text_to_escape = (typeof html_token === 'object' && html_token !== null && typeof html_token.text === 'string')
                        ? html_token.text
                        : String(html_token || '');
                    return window.Helpers.escape_html(text_to_escape);
                };
                // Använd parseInline för att undvika att korta texter omges av <p>-taggar
                requirement_content_div.innerHTML = marked.parseInline(pc_def.requirement || '', { renderer });
            } else {
                requirement_content_div.textContent = pc_def.requirement || '';
            }
            pc_item_li.appendChild(requirement_content_div);
            // --- END OF CHANGE ---
            
            const pc_data = check_result_data?.passCriteria[pc_def.id] || {status: 'not_audited', observationDetail: ''};
            const current_pc_status = pc_data.status;
            
            const pc_status_text = t(`audit_status_${current_pc_status}`);
            pc_item_li.appendChild(Helpers_create_element('div', { 
                class_name: 'pass-criterion-status', 
                html_content: `<strong>${t('status')}:</strong> <span class="status-text status-${current_pc_status}">${pc_status_text}</span>`
            }));

            if (!is_audit_locked) {
                const pc_actions_div = Helpers_create_element('div', { class_name: 'pass-criterion-actions' });
                const passed_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-success', 'button-small', current_pc_status === 'passed' ? 'active' : ''],
                    attributes: { 'data-action': 'set-pc-passed' },
                    html_content: `<span>${t('pass_criterion_approved')}</span>` + Helpers_get_icon_svg('thumb_up', [], 16)
                });
                const failed_btn = Helpers_create_element('button', {
                    class_name: ['button', 'button-danger', 'button-small', current_pc_status === 'failed' ? 'active' : ''],
                    attributes: { 'data-action': 'set-pc-failed' },
                    html_content: `<span>${t('pass_criterion_failed')}</span>` + Helpers_get_icon_svg('thumb_down', [], 16)
                });
                pc_actions_div.append(passed_btn, failed_btn);
                pc_item_li.appendChild(pc_actions_div);
            }

            const observation_wrapper = Helpers_create_element('div', { class_name: 'pc-observation-detail-wrapper form-group' });
            observation_wrapper.hidden = (current_pc_status !== 'failed');
            observation_wrapper.innerHTML = `<label for="pc-observation-${check_definition.id}-${pc_def.id}">${t('pc_observation_detail_label')}</label>`;
            
            const observation_textarea = Helpers_create_element('textarea', {
                id: `pc-observation-${check_definition.id}-${pc_def.id}`,
                class_name: 'form-control pc-observation-detail-textarea',
                attributes: { rows: '4', readonly: is_audit_locked }
            });
            observation_textarea.value = pc_data.observationDetail || '';
            if (window.Helpers?.init_auto_resize_for_textarea) {
                window.Helpers.init_auto_resize_for_textarea(observation_textarea);
            }
            observation_wrapper.appendChild(observation_textarea);
            
            pc_item_li.appendChild(observation_wrapper);
            pc_list.appendChild(pc_item_li);
        });

        return pc_list;
    }

    function destroy() {
        if (container_ref) {
            container_ref.removeEventListener('click', handle_checklist_click);
            container_ref.removeEventListener('input', handle_textarea_input);
            container_ref.innerHTML = '';
        }
    }

    return {
        init,
        render,
        destroy
    };
})();