// js/components/MetadataFormComponent.js

export const MetadataFormComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/metadata_form_component.css';
    let form_container_ref;
    
    // Callbacks passed from parent during init
    let on_submit_callback;
    let on_cancel_callback;

    // Dependencies
    let Translation_t;
    let Helpers_create_element, Helpers_get_icon_svg, Helpers_add_protocol_if_missing, Helpers_load_css;

    // Internal DOM references, live only during render cycle
    let form_element_ref;
    let case_number_input, actor_name_input, actor_link_input, auditor_name_input, internal_comment_input;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_add_protocol_if_missing = window.Helpers?.add_protocol_if_missing;
        Helpers_load_css = window.Helpers?.load_css;
    }

    // MODIFIED: init is now simpler, only taking callbacks and the container.
    async function init(_form_container, _callbacks) {
        assign_globals_once();
        form_container_ref = _form_container;
        
        on_submit_callback = _callbacks.onSubmit;
        on_cancel_callback = _callbacks.onCancel || null;

        await Helpers_load_css(CSS_PATH);
    }

    function handle_form_submit(event) {
        event.preventDefault();
        
        let actor_link_value = actor_link_input.value.trim();
        if (actor_link_value) {
            actor_link_value = Helpers_add_protocol_if_missing(actor_link_value);
        }

        const form_data = {
            caseNumber: case_number_input.value.trim(),
            actorName: actor_name_input.value.trim(),
            actorLink: actor_link_value,
            auditorName: auditor_name_input.value.trim(),
            internalComment: internal_comment_input.value.trim()
        };

        if (typeof on_submit_callback === 'function') {
            on_submit_callback(form_data);
        }
    }

    function create_form_field(id, label_key, type = 'text', current_value = '') {
        const t = Translation_t;
        const form_group = Helpers_create_element('div', { class_name: 'form-group' });
        const label = Helpers_create_element('label', {
            attributes: { for: id },
            text_content: t(label_key)
        });

        let input_element;
        if (type === 'textarea') {
            input_element = Helpers_create_element('textarea', {
                id: id, class_name: 'form-control', attributes: { rows: '4' }
            });
            input_element.value = current_value;
        } else {
            input_element = Helpers_create_element('input', {
                id: id, class_name: 'form-control', attributes: { type: type }
            });
            input_element.value = current_value;
        }

        form_group.appendChild(label);
        form_group.appendChild(input_element);
        return { form_group, input_element };
    }

    // MODIFIED: render now accepts dynamic options.
    function render(options = {}) {
        const {
            initialData = {},
            submitButtonText = 'Submit',
            cancelButtonText = null
        } = options;

        form_container_ref.innerHTML = '';
        const form_wrapper = Helpers_create_element('div', { class_name: 'metadata-form-container' });

        form_element_ref = Helpers_create_element('form');
        form_element_ref.addEventListener('submit', handle_form_submit);

        const case_field = create_form_field('caseNumber', 'case_number', 'text', initialData.caseNumber);
        case_number_input = case_field.input_element;
        form_element_ref.appendChild(case_field.form_group);

        const actor_field = create_form_field('actorName', 'actor_name', 'text', initialData.actorName);
        actor_name_input = actor_field.input_element;
        form_element_ref.appendChild(actor_field.form_group);

        const actor_link_field = create_form_field('actorLink', 'actor_link', 'url', initialData.actorLink);
        actor_link_input = actor_link_field.input_element;
        form_element_ref.appendChild(actor_link_field.form_group);

        const auditor_field = create_form_field('auditorName', 'auditor_name', 'text', initialData.auditorName);
        auditor_name_input = auditor_field.input_element;
        form_element_ref.appendChild(auditor_field.form_group);

        const comment_field = create_form_field('internalComment', 'internal_comment', 'textarea', initialData.internalComment);
        internal_comment_input = comment_field.input_element;
        form_element_ref.appendChild(comment_field.form_group);
        
        if (window.Helpers?.init_auto_resize_for_textarea) {
            window.Helpers.init_auto_resize_for_textarea(internal_comment_input);
        }

        const form_actions_wrapper = Helpers_create_element('div', { class_name: 'form-actions' });
        
        if (cancelButtonText && typeof on_cancel_callback === 'function') {
            const cancel_button = Helpers_create_element('button', {
                class_name: ['button', 'button-default'],
                attributes: { type: 'button' },
                text_content: cancelButtonText
            });
            cancel_button.addEventListener('click', on_cancel_callback);
            form_actions_wrapper.appendChild(cancel_button);
        }

        const submit_button = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            attributes: { type: 'submit' },
            html_content: `<span>${submitButtonText}</span>` + Helpers_get_icon_svg('arrow_forward')
        });
        form_actions_wrapper.appendChild(submit_button);

        form_element_ref.appendChild(form_actions_wrapper);
        form_wrapper.appendChild(form_element_ref);
        form_container_ref.appendChild(form_wrapper);
    }

    function destroy() {
        if (form_element_ref) {
            form_element_ref.removeEventListener('submit', handle_form_submit);
        }
        form_container_ref.innerHTML = '';
        form_element_ref = null;
        on_submit_callback = null;
        on_cancel_callback = null;
    }

    return {
        init,
        render,
        destroy
    };
})();