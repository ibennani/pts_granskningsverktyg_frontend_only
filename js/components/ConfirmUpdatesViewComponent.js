// js/components/ConfirmUpdatesViewComponent.js

export const ConfirmUpdatesViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/confirm_updates_view_component.css';
    let app_container_ref;
    let router_ref;
    
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_escape_html, Helpers_load_css;
    let NotificationComponent_get_global_message_element_reference;

    let plate_element_ref;
    let list_container_for_delegation;
    let h1_ref;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_escape_html = window.Helpers?.escape_html;
        Helpers_load_css = window.Helpers?.load_css;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;
    }
    
    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        await Helpers_load_css(CSS_PATH);
    }

    function handle_list_item_click(event) {
        const button = event.target.closest('button[data-action="confirm-single"]');
        if (!button) return;

        // --- START OF NEW, ROBUST FOCUS LOGIC ---
        const current_li = button.closest('li');
        const next_li = current_li.nextElementSibling;
        const prev_li = current_li.previousElementSibling;

        let target_selector_for_button = null;

        if (next_li) {
            const next_button = next_li.querySelector('button[data-action="confirm-single"]');
            if (next_button) {
                target_selector_for_button = `button[data-sample-id="${next_button.dataset.sampleId}"][data-requirement-id="${next_button.dataset.requirementId}"]`;
            }
        } else if (prev_li) {
            const prev_button = prev_li.querySelector('button[data-action="confirm-single"]');
            if (prev_button) {
                target_selector_for_button = `button[data-sample-id="${prev_button.dataset.sampleId}"][data-requirement-id="${prev_button.dataset.requirementId}"]`;
            }
        }
        
        const { sampleId, requirementId } = button.dataset;
        local_dispatch({
            type: local_StoreActionTypes.CONFIRM_SINGLE_REVIEWED_REQUIREMENT,
            payload: { sampleId, requirementId }
        });
        
        setTimeout(() => {
            if (target_selector_for_button) {
                const target_button = plate_element_ref.querySelector(target_selector_for_button);
                if (target_button && target_button.previousElementSibling?.tagName === 'A') {
                    target_button.previousElementSibling.focus();
                } else if (h1_ref) {
                    h1_ref.focus();
                }
            } else if (h1_ref) {
                h1_ref.focus();
            }
        }, 0);
        // --- END OF NEW, ROBUST FOCUS LOGIC ---
    }

    function handle_list_item_keydown(event) {
        // Handle keyboard navigation for accessibility
        if (event.key === 'Enter' || event.key === ' ') {
            const button = event.target.closest('button[data-action="confirm-single"]');
            if (!button) return;
            
            event.preventDefault();
            // Trigger the same action as click
            handle_list_item_click(event);
        }
    }

    function get_updated_reqs_data() {
        const state = local_getState();
        const updated_reqs_by_sample = {};
        let total_count = 0;

        state.samples.forEach(sample => {
            const sample_reqs = [];
            Object.keys(sample.requirementResults || {}).forEach(reqId => {
                if (sample.requirementResults[reqId]?.needsReview === true) {
                    const req_def = state.ruleFileContent.requirements[reqId];
                    if (req_def) {
                        sample_reqs.push({
                            id: reqId,
                            title: req_def.title,
                            reference: req_def.standardReference?.text || '',
                            status: sample.requirementResults[reqId].status
                        });
                        total_count++;
                    }
                }
            });
            if (sample_reqs.length > 0) {
                updated_reqs_by_sample[sample.id] = {
                    sampleName: sample.description,
                    requirements: sample_reqs
                };
            }
        });

        return { updated_reqs_by_sample, total_count };
    }

    function get_status_presentation(status) {
        const mapping = {
            passed: { textKey: 'audit_status_passed', className: 'status-tag--approved' },
            failed: { textKey: 'audit_status_failed', className: 'status-tag--rejected' },
            needs_review: { textKey: 'status_updated_needs_review', className: 'status-tag--pending' }
        };
        return mapping[status] || { textKey: 'status_updated', className: 'status-tag--pending' };
    }

    function render_action_buttons(position) {
        const t = Translation_t;
        const actions_div = Helpers_create_element('div', {
            class_name: ['form-actions', 'confirm-updates-actions']
        });

        const confirm_all_btn = Helpers_create_element('button', {
            id: `${position}-confirm-all-btn`,
            class_name: ['button', 'button--success'],
            text_content: t('confirm_all_assessments_button')
        });
        confirm_all_btn.addEventListener('click', () => router_ref('final_confirm_updates'));

        const return_btn = Helpers_create_element('button', {
            class_name: ['button', 'button--secondary'],
            text_content: t('return_to_audit_overview')
        });
        return_btn.addEventListener('click', () => router_ref('audit_overview'));

        actions_div.append(confirm_all_btn, return_btn);
        return actions_div;
    }

    function render() {
        assign_globals_once();
        const t = Translation_t;
        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers_create_element('div', { class_name: 'content-plate' });
        app_container_ref.appendChild(plate_element_ref);

        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) {
            plate_element_ref.appendChild(global_message_element);
        }

        const { updated_reqs_by_sample, total_count } = get_updated_reqs_data();
        
        const hero_section = Helpers_create_element('section', { class_name: ['section', 'confirm-updates-hero'] });
        h1_ref = Helpers_create_element('h1', { attributes: { tabindex: '-1' } });
        hero_section.appendChild(h1_ref);
        plate_element_ref.appendChild(hero_section);

        if (total_count === 0) {
            h1_ref.textContent = t('all_updates_handled_title');
            hero_section.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('all_updates_handled_text') }));
            
            const return_btn = Helpers_create_element('button', {
                class_name: ['button', 'button--primary'],
                text_content: t('return_to_audit_overview')
            });
            return_btn.addEventListener('click', () => router_ref('audit_overview'));
            const empty_actions = Helpers_create_element('div', { class_name: ['form-actions', 'confirm-updates-actions'] });
            empty_actions.appendChild(return_btn);
            hero_section.appendChild(empty_actions);

            h1_ref.focus();
            return;
        }

        h1_ref.textContent = t('handle_updated_assessments_title', { count: total_count });
        hero_section.appendChild(Helpers_create_element('p', { class_name: 'view-intro-text', text_content: t('handle_updated_assessments_intro') }));
        
        const body_section = Helpers_create_element('section', { class_name: ['section', 'confirm-updates-body'] });
        body_section.appendChild(render_action_buttons('top'));

        list_container_for_delegation = Helpers_create_element('div', { class_name: 'confirm-updates-collection' });
        list_container_for_delegation.addEventListener('click', handle_list_item_click);
        list_container_for_delegation.addEventListener('keydown', handle_list_item_keydown);

        for (const sampleId in updated_reqs_by_sample) {
            const data = updated_reqs_by_sample[sampleId];
            const sample_section = Helpers_create_element('section', {
                class_name: 'confirm-updates-sample',
                attributes: { 'aria-label': `${t('sample_label')}: ${data.sampleName}` }
            });
            
            const header_wrapper = Helpers_create_element('div', { class_name: 'confirm-updates-sample__header' });
            const h2 = Helpers_create_element('h2', { 
                text_content: `${t('sample_label')}: ${data.sampleName}`,
                attributes: { tabindex: '-1' }
            });
            header_wrapper.appendChild(h2);
            sample_section.appendChild(header_wrapper);

            const ul = Helpers_create_element('ul', { class_name: 'confirm-updates-list', attributes: { role: 'list' } });
            data.requirements.forEach(req => {
                const li = Helpers_create_element('li', { class_name: ['row', 'confirm-update-row'], attributes: { role: 'listitem' } });
                
                const link_text = req.reference
                    ? t('requirement_with_reference', { title: req.title, reference: req.reference })
                    : req.title;
                const link = Helpers_create_element('a', {
                    class_name: 'confirm-update-row__title',
                    text_content: link_text,
                    attributes: { href: '#' },
                    event_listeners: { click: (e) => { e.preventDefault(); router_ref('requirement_audit', { sampleId, requirementId: req.id }); }}
                });

                const details = Helpers_create_element('div', { class_name: 'confirm-update-row__details' });
                details.appendChild(link);

                const status_presentation = get_status_presentation(req.status);
                const status_tag = Helpers_create_element('span', {
                    class_name: ['status-tag', status_presentation.className],
                    text_content: t(status_presentation.textKey)
                });
                details.appendChild(status_tag);

                let btn_text_key = 'confirm_status_and_return';
                let btn_class = 'button--secondary';
                if (req.status === 'passed') {
                    btn_text_key = 'keep_passed_button';
                    btn_class = 'button--success';
                } else if (req.status === 'failed') {
                    btn_text_key = 'keep_failed_button';
                    btn_class = 'button--danger';
                }

                const confirm_button = Helpers_create_element('button', {
                    class_name: ['button', btn_class, 'button-small'],
                    text_content: t(btn_text_key),
                    attributes: {
                        'data-action': 'confirm-single',
                        'data-sample-id': sampleId,
                        'data-requirement-id': req.id,
                        'aria-label': `${t(btn_text_key)} ${t('for_requirement')} ${link_text}`
                    }
                });

                const actions_wrapper = Helpers_create_element('div', { class_name: 'confirm-update-row__actions' });
                actions_wrapper.appendChild(confirm_button);

                li.append(details, actions_wrapper);
                ul.appendChild(li);
            });
            sample_section.appendChild(ul);
            list_container_for_delegation.appendChild(sample_section);
        }
        
        body_section.appendChild(list_container_for_delegation);
        body_section.appendChild(render_action_buttons('bottom'));
        plate_element_ref.appendChild(body_section);
    }

    function destroy() {
        if (list_container_for_delegation) {
            list_container_for_delegation.removeEventListener('click', handle_list_item_click);
            list_container_for_delegation.removeEventListener('keydown', handle_list_item_keydown);
        }
        app_container_ref.innerHTML = '';
        plate_element_ref = null;
        list_container_for_delegation = null;
        h1_ref = null;
    }

    return {
        init,
        render,
        destroy
    };
})();
