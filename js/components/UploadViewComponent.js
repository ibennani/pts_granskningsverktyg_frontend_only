// js/components/UploadViewComponent.js

export const UploadViewComponent = (function () {
  'use-strict';

  const CSS_PATH = './css/components/upload_view_component.css';
  let app_container_ref;
  let router_ref;
  let global_message_element_ref;

  let rule_file_input_for_audit;
  let saved_audit_input_element;
  let rule_file_input_for_edit;

  // Local state/dependencies
  let local_getState;
  let local_dispatch;
  let local_StoreActionTypes;

  function get_t_func() {
    return typeof window.Translation !== 'undefined' &&
      typeof window.Translation.t === 'function'
      ? window.Translation.t
      : (key, replacements) => `**${key}**`;
  }

  function handle_audit_rule_file_select(event) {
    const t = get_t_func();
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const json_content = JSON.parse(e.target.result);
        const validation_result =
          window.ValidationLogic.validate_rule_file_json(json_content);

        if (validation_result.isValid) {
          if (
            window.Store &&
            typeof window.Store.clearAutosavedState === 'function'
          ) {
            window.Store.clearAutosavedState();
          }

          if (window.NotificationComponent)
            NotificationComponent.show_global_message(
              validation_result.message,
              'success'
            );

          local_dispatch({
            type: local_StoreActionTypes.INITIALIZE_NEW_AUDIT,
            payload: { ruleFileContent: json_content },
          });

          router_ref('metadata');
        } else {
          if (window.NotificationComponent)
            NotificationComponent.show_global_message(
              validation_result.message,
              'error'
            );
        }
      } catch (error) {
        console.error('Error parsing JSON from rule file for audit:', error);
        if (window.NotificationComponent)
          NotificationComponent.show_global_message(
            t('rule_file_invalid_json'),
            'error'
          );
      } finally {
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function handle_saved_audit_file_select(event) {
    const t = get_t_func();
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const file_content_object = JSON.parse(e.target.result);
        const validation_result =
          window.ValidationLogic.validate_saved_audit_file(file_content_object);

        if (validation_result.isValid) {
          local_dispatch({
            type: local_StoreActionTypes.LOAD_AUDIT_FROM_FILE,
            payload: file_content_object,
          });

          if (window.NotificationComponent)
            NotificationComponent.show_global_message(
              t('saved_audit_loaded_successfully'),
              'success'
            );
          router_ref('audit_overview');
        } else {
          if (window.NotificationComponent)
            NotificationComponent.show_global_message(
              validation_result.message,
              'error'
            );
        }
      } catch (error) {
        console.error('Error parsing JSON from saved audit file:', error);
        if (window.NotificationComponent)
          NotificationComponent.show_global_message(
            t('error_invalid_saved_audit_file'),
            'error'
          );
      } finally {
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function handle_edit_file_select(event) {
    const t = get_t_func();
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const json_content = JSON.parse(e.target.result);
        const validation_result =
          window.ValidationLogic.validate_rule_file_json(json_content);

        if (validation_result.isValid) {
          if (
            window.Store &&
            typeof window.Store.clearAutosavedState === 'function'
          ) {
            window.Store.clearAutosavedState();
          }

          local_dispatch({
            type: local_StoreActionTypes.INITIALIZE_RULEFILE_EDITING,
            payload: {
              ruleFileContent: json_content,
              originalRuleFileContentString: JSON.stringify(
                json_content,
                null,
                2
              ),
              originalRuleFileFilename: file.name || '',
            },
          });

          // --- HÄR ÄR ÄNDRINGEN ---
          router_ref('edit_rulefile_main');
        } else {
          if (window.NotificationComponent)
            NotificationComponent.show_global_message(
              validation_result.message,
              'error'
            );
        }
      } catch (error) {
        console.error('Error parsing rule file for editing:', error);
        if (window.NotificationComponent)
          NotificationComponent.show_global_message(
            t('rule_file_invalid_json'),
            'error'
          );
      } finally {
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function create_upload_action_row(options) {
    const {
      buttonId,
      buttonClasses = ['button'],
      buttonText,
      descriptionId,
      descriptionText,
      iconName
    } = options;

    const iconHtml = window.Helpers?.get_icon_svg
      ? window.Helpers.get_icon_svg(iconName)
      : '';

    const button = window.Helpers.create_element('button', {
      id: buttonId,
      class_name: buttonClasses,
      attributes: { 'aria-describedby': descriptionId, type: 'button' },
      html_content: `<span>${buttonText}</span>` + iconHtml
    });

    const description = window.Helpers.create_element('p', {
      class_name: ['upload-action-description'],
      attributes: { id: descriptionId },
      text_content: descriptionText
    });

    const row = window.Helpers.create_element('div', {
      class_name: ['row', 'upload-action-row']
    });
    row.append(button, description);
    return { row, button };
  }

  async function init(
    _app_container,
    _router,
    _params,
    _getState,
    _dispatch,
    _StoreActionTypes
  ) {
    app_container_ref = _app_container;
    router_ref = _router;

    local_getState = _getState;
    local_dispatch = _dispatch;
    local_StoreActionTypes = _StoreActionTypes;

    if (window.NotificationComponent?.get_global_message_element_reference) {
      global_message_element_ref =
        window.NotificationComponent.get_global_message_element_reference();
    }

    if (window.Helpers?.load_css_safely) {
      try {
        await window.Helpers.load_css_safely(CSS_PATH, 'UploadViewComponent', {
          timeout: 5000,
          maxRetries: 2,
        });
      } catch (error) {
        // Fel hanteras redan i load_css_safely med användarvarning
        console.warn(
          '[UploadViewComponent] Continuing without CSS due to loading failure'
        );
      }
    }
  }

  function render() {
    if (!app_container_ref || !window.Helpers?.create_element) {
      console.error('[UploadViewComponent] render prerequisites missing.');
      return;
    }
    app_container_ref.innerHTML = '';
    const t = get_t_func();

    const Helpers_create_element = window.Helpers.create_element;

    const plate_element = Helpers_create_element('div', {
      class_name: 'content-plate',
    });

    if (global_message_element_ref) {
      plate_element.appendChild(global_message_element_ref);
      if (
        window.NotificationComponent?.clear_global_message &&
        !global_message_element_ref.classList.contains('message-error') &&
        !global_message_element_ref.classList.contains('message-warning')
      ) {
        window.NotificationComponent.clear_global_message();
      }
    }

    const hero_section = Helpers_create_element('section', { class_name: ['section', 'upload-hero'] });
    hero_section.appendChild(Helpers_create_element('h1', { text_content: t('app_title') }));
    hero_section.appendChild(Helpers_create_element('p', {
      class_name: 'view-intro-text',
      text_content: t('upload_view_intro')
    }));

    const actions_section = Helpers_create_element('section', {
      class_name: ['section', 'upload-section', 'upload-action-section'],
    });
    const actions_title = Helpers_create_element('h2', {
      class_name: 'upload-section-title',
      text_content: t('upload_view_actions_title'),
    });
    const loadOngoingAction = create_upload_action_row({
      buttonId: 'load-ongoing-audit-btn',
      buttonClasses: ['button', 'button--secondary'],
      buttonText: t('upload_ongoing_audit'),
      descriptionId: 'upload-help-resume',
      descriptionText: t('upload_view_description_resume_audit'),
      iconName: 'upload_file',
    });
    const startNewAction = create_upload_action_row({
      buttonId: 'start-new-audit-btn',
      buttonClasses: ['button', 'button--primary'],
      buttonText: t('start_new_audit'),
      descriptionId: 'upload-help-start-new',
      descriptionText: t('upload_view_description_start_new'),
      iconName: 'start_new',
    });

    const upload_action_group = Helpers_create_element('div', {
      class_name: ['upload-action-group'],
    });
    upload_action_group.append(loadOngoingAction.row, startNewAction.row);
    actions_section.append(actions_title, upload_action_group);

    const edit_section = Helpers_create_element('section', {
      class_name: ['section', 'upload-section'],
    });
    const edit_section_title = Helpers_create_element('h2', {
      class_name: 'upload-section-title',
      text_content: t('upload_view_title_edit'),
    });
    const edit_action_row = Helpers_create_element('div', {
      class_name: ['upload-edit-row'],
    });
    const edit_description_id = 'upload-help-edit';
    const edit_rulefile_btn = Helpers_create_element('button', {
      id: 'edit-rulefile-btn',
      class_name: ['button', 'button--ghost'],
      attributes: { 'aria-describedby': edit_description_id, type: 'button' },
      html_content:
        `<span>${t('upload_view_button_edit')}</span>` +
        (window.Helpers.get_icon_svg
          ? window.Helpers.get_icon_svg('edit')
          : ''),
    });
    const edit_description = Helpers_create_element('p', {
      class_name: ['upload-action-description'],
      attributes: { id: edit_description_id },
      text_content: t('upload_view_description_edit_rulefile'),
    });
    edit_action_row.append(edit_rulefile_btn, edit_description);
    edit_section.append(edit_section_title, edit_action_row);

    rule_file_input_for_audit = Helpers_create_element('input', {
      id: 'rule-file-input-audit',
      attributes: { type: 'file', accept: '.json', style: 'display: none;' },
    });
    saved_audit_input_element = Helpers_create_element('input', {
      id: 'saved-audit-input',
      attributes: { type: 'file', accept: '.json', style: 'display: none;' },
    });
    rule_file_input_for_edit = Helpers_create_element('input', {
      id: 'rule-file-input-edit',
      attributes: { type: 'file', accept: '.json', style: 'display: none;' },
    });

    plate_element.append(
      hero_section,
      actions_section,
      edit_section,
      rule_file_input_for_audit,
      saved_audit_input_element,
      rule_file_input_for_edit
    );

    app_container_ref.appendChild(plate_element);

    startNewAction.button.addEventListener('click', () =>
      rule_file_input_for_audit.click()
    );
    rule_file_input_for_audit.addEventListener(
      'change',
      handle_audit_rule_file_select
    );

    loadOngoingAction.button.addEventListener('click', () =>
      saved_audit_input_element.click()
    );
    saved_audit_input_element.addEventListener(
      'change',
      handle_saved_audit_file_select
    );

    edit_rulefile_btn.addEventListener('click', () =>
      rule_file_input_for_edit.click()
    );
    rule_file_input_for_edit.addEventListener(
      'change',
      handle_edit_file_select
    );
  }

  function destroy() {
    if (rule_file_input_for_audit)
      rule_file_input_for_audit.removeEventListener(
        'change',
        handle_audit_rule_file_select
      );
    if (saved_audit_input_element)
      saved_audit_input_element.removeEventListener(
        'change',
        handle_saved_audit_file_select
      );
    if (rule_file_input_for_edit)
      rule_file_input_for_edit.removeEventListener(
        'change',
        handle_edit_file_select
      );

    app_container_ref.innerHTML = '';
    local_getState = null;
    local_dispatch = null;
    local_StoreActionTypes = null;
  }

  return {
    init,
    render,
    destroy,
  };
})();
