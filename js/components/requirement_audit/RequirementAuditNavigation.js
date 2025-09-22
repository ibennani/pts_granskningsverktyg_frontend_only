// js/components/requirement_audit/RequirementAuditNavigation.js

export const RequirementAuditNavigationFactory = function () { // Ändrad till Factory
    'use-strict';

    let container_ref;
    let on_navigate_callback; // Callback to parent

    // Dependencies
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg;
    let AuditLogic_find_first_incomplete_requirement_key_for_sample;

    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        AuditLogic_find_first_incomplete_requirement_key_for_sample = window.AuditLogic?.find_first_incomplete_requirement_key_for_sample;
    }

    function init(_container, _on_navigate_cb) {
        assign_globals_once();
        container_ref = _container;
        on_navigate_callback = _on_navigate_cb;
    }

    function render(options) {
        const {
            is_audit_locked,
            is_first_requirement,
            is_last_requirement,
            sample_object,
            rule_file_content,
            requirement_result,
            current_requirement_id
        } = options;

        const t = Translation_t;
        container_ref.innerHTML = '';

        const nav_group_left = Helpers_create_element('div', { class_name: 'nav-group-left' });
        const nav_group_right = Helpers_create_element('div', { class_name: 'nav-group-right' });

        // "Back to list" button
        const back_btn = Helpers_create_element('button', {
            class_name: 'button button-default',
            html_content: `<span>${t('back_to_requirement_list')}</span>` + Helpers_get_icon_svg('arrow_back', [], 18)
        });
        back_btn.addEventListener('click', () => on_navigate_callback('back_to_list'));
        nav_group_left.appendChild(back_btn);

        // "Confirm status" button for updated requirements
        if (requirement_result?.needsReview === true) {
            const status = requirement_result.status;
            let btn_text_key = 'confirm_status_and_return';
            let btn_class = 'button-secondary';
            if (status === 'passed') { btn_text_key = 'confirm_status_passed'; btn_class = 'button-success'; }
            else if (status === 'failed') { btn_text_key = 'confirm_status_failed'; btn_class = 'button-danger'; }
            
            const confirm_btn = Helpers_create_element('button', {
                class_name: ['button', btn_class],
                html_content: `<span>${t(btn_text_key)}</span>` + Helpers_get_icon_svg('check', [], 18)
            });
            confirm_btn.addEventListener('click', () => on_navigate_callback('confirm_reviewed_status'));
            nav_group_left.appendChild(confirm_btn);
        }

        if (!is_audit_locked) {
            // Previous button
            if (!is_first_requirement) {
                const prev_btn = Helpers_create_element('button', { 
                    class_name: 'button button-secondary',
                    html_content: `<span>${t('previous_requirement')}</span>` + Helpers_get_icon_svg('arrow_back', [], 18)
                });
                prev_btn.addEventListener('click', () => on_navigate_callback('previous'));
                nav_group_right.appendChild(prev_btn);
            }

            // Next button
            if (!is_last_requirement) {
                const next_btn = Helpers_create_element('button', { 
                    class_name: 'button button-secondary',
                    html_content: `<span>${t('next_requirement')}</span>` + Helpers_get_icon_svg('arrow_forward', [], 18)
                });
                next_btn.addEventListener('click', () => on_navigate_callback('next'));
                nav_group_right.appendChild(next_btn);
            }

            // Next unhandled button
            const next_unhandled_key = AuditLogic_find_first_incomplete_requirement_key_for_sample(rule_file_content, sample_object, current_requirement_id);
            if (next_unhandled_key !== null) {
                const next_unhandled_btn = Helpers_create_element('button', { 
                    class_name: 'button button-primary',
                    html_content: `<span>${t('next_unhandled_requirement')}</span>` + Helpers_get_icon_svg('arrow_forward_alt', [], 18)
                });
                next_unhandled_btn.addEventListener('click', () => on_navigate_callback('next_unhandled'));
                nav_group_right.appendChild(next_unhandled_btn);
            }
        }
        
        container_ref.appendChild(nav_group_left);
        if (nav_group_right.hasChildNodes()) {
            container_ref.appendChild(nav_group_right);
        }
    }

    function destroy() {
        if (container_ref) {
            // Ta bort alla event listeners innan vi rensar HTML
            const buttons = container_ref.querySelectorAll('button');
            buttons.forEach(button => {
                // Skapa en kopia av event listeners för att ta bort dem
                button.replaceWith(button.cloneNode(true));
            });
            container_ref.innerHTML = '';
        }
    }

    // Return an object for this specific instance
    return {
        init,
        render,
        destroy
    };
};
