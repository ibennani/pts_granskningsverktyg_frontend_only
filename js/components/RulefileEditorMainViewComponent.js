// js/components/RulefileEditorMainViewComponent.js

export const RulefileEditorMainViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/rulefile_editor.css';
    let app_container_ref;
    let router_ref;
    
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;
    
    let Translation_t;
    let Helpers;
    let RulefileEditorLogic;
    let NotificationComponent_get_global_message_element_reference;

    let plate_element_ref;
    let editor_content_container;
    
    let current_sub_view = 'requirements';

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;
        
        Translation_t = window.Translation?.t;
        Helpers = window.Helpers;
        RulefileEditorLogic = window.RulefileEditorLogic;
        NotificationComponent_get_global_message_element_reference = window.NotificationComponent?.get_global_message_element_reference;

        await Helpers.load_css(CSS_PATH);
    }

    function handle_save_metadata(updatedMetadata) {
        const t = Translation_t;
        const current_rulefile = local_getState().ruleFileContent;
        const new_rulefile_content = {
            ...current_rulefile,
            metadata: updatedMetadata
        };

        local_dispatch({
            type: local_StoreActionTypes.UPDATE_RULEFILE_CONTENT,
            payload: { ruleFileContent: new_rulefile_content }
        });

        if (window.NotificationComponent) {
            window.NotificationComponent.show_global_message(t('metadata_updated_successfully'), 'success');
        }
    }
    
    function handle_save_requirement(requirementData, isNew) {
        const t = Translation_t;
        const current_rulefile = local_getState().ruleFileContent;
        const new_requirements = { ...current_rulefile.requirements };
        new_requirements[requirementData.key] = requirementData;
        
        const new_rulefile_content = {
            ...current_rulefile,
            requirements: new_requirements
        };

        local_dispatch({
            type: local_StoreActionTypes.UPDATE_RULEFILE_CONTENT,
            payload: { ruleFileContent: new_rulefile_content }
        });

        if (window.NotificationComponent) {
            // Adding specific keys for add/update success messages
            const messageKey = isNew ? 'requirement_added_successfully' : 'requirement_updated_successfully';
            window.NotificationComponent.show_global_message(t(messageKey, { reqTitle: requirementData.title }), 'success');
        }
    }

    function handle_delete_requirement(reqKey) {
        const t = Translation_t;
        const current_rulefile = local_getState().ruleFileContent;
        const new_requirements = { ...current_rulefile.requirements };
        delete new_requirements[reqKey];

        const new_rulefile_content = { ...current_rulefile, requirements: new_requirements };
        local_dispatch({ type: local_StoreActionTypes.UPDATE_RULEFILE_CONTENT, payload: { ruleFileContent: new_rulefile_content } });
        if (window.NotificationComponent) {
            window.NotificationComponent.show_global_message(t('sample_deleted_successfully', { sampleName: reqKey }), 'success');
        }
    }

    function render() {
        const t = Translation_t;
        const state = local_getState();

        if (!state.ruleFileContent) {
            router_ref('upload');
            return;
        }

        app_container_ref.innerHTML = '';
        plate_element_ref = Helpers.create_element('div', { class_name: 'content-plate' });
        
        const global_message_element = NotificationComponent_get_global_message_element_reference();
        if (global_message_element) plate_element_ref.appendChild(global_message_element);
        
        plate_element_ref.appendChild(Helpers.create_element('h1', { text_content: t('edit_rulefile_title') }));
        plate_element_ref.appendChild(Helpers.create_element('p', { class_name: 'view-intro-text', text_content: t('edit_rulefile_intro') }));
        
        const nav_buttons = Helpers.create_element('div', { class_name: 'editor-nav-buttons' });
        
        const reqs_btn = Helpers.create_element('button', {
            class_name: ['button', current_sub_view === 'requirements' ? 'button-primary' : 'button-default'],
            text_content: t('edit_rulefile_requirements_button')
        });
        reqs_btn.addEventListener('click', () => {
            current_sub_view = 'requirements';
            render();
        });

        const metadata_btn = Helpers.create_element('button', {
            class_name: ['button', current_sub_view === 'metadata' ? 'button-primary' : 'button-default'],
            text_content: t('edit_rulefile_metadata_button')
        });
        metadata_btn.addEventListener('click', () => {
            current_sub_view = 'metadata';
            render();
        });

        nav_buttons.append(reqs_btn, metadata_btn);
        plate_element_ref.appendChild(nav_buttons);

        editor_content_container = Helpers.create_element('div', { id: 'editor-sub-view-container' });
        
        if (current_sub_view === 'metadata') {
            editor_content_container.appendChild(RulefileEditorLogic.buildMetadataEditor(state.ruleFileContent.metadata, handle_save_metadata));
        } else {
            editor_content_container.appendChild(RulefileEditorLogic.buildRequirementsEditor(
                state.ruleFileContent.requirements,
                state.ruleFileContent.metadata.contentTypes, // Pass content types
                handle_save_requirement,
                handle_delete_requirement
            ));
        }
        
        plate_element_ref.appendChild(editor_content_container);
        app_container_ref.appendChild(plate_element_ref);
    }

    function destroy() {
        app_container_ref.innerHTML = '';
        plate_element_ref = null;
        editor_content_container = null;
    }

    return {
        init,
        render,
        destroy
    };
})();