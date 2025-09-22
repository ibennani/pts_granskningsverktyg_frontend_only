// js/components/EditRulefileMetadataViewComponent.js

export const EditRulefileMetadataViewComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/edit_rulefile_metadata_view.css';

    let app_container_ref;
    let router_ref;
    let local_getState;
    let local_dispatch;
    let local_StoreActionTypes;

    let Translation_t;
    let Helpers_create_element;
    let Helpers_load_css;
    let Helpers_init_auto_resize_for_textarea;
    let Helpers_get_icon_svg;
    let Helpers_escape_html;

    let NotificationComponent_show_global_message;

    function assign_globals_once() {
        if (Translation_t) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
        Helpers_load_css = window.Helpers?.load_css;
        Helpers_init_auto_resize_for_textarea = window.Helpers?.init_auto_resize_for_textarea;
        Helpers_get_icon_svg = window.Helpers?.get_icon_svg;
        Helpers_escape_html = window.Helpers?.escape_html;
        NotificationComponent_show_global_message = window.NotificationComponent?.show_global_message;
    }

    async function init(_app_container, _router_cb, _params, _getState, _dispatch, _StoreActionTypes) {
        assign_globals_once();
        app_container_ref = _app_container;
        router_ref = _router_cb;
        local_getState = _getState;
        local_dispatch = _dispatch;
        local_StoreActionTypes = _StoreActionTypes;

        if (Helpers_load_css) {
            await Helpers_load_css(CSS_PATH).catch(err => console.warn('[EditRulefileMetadataView] Failed to load CSS', err));
        }
    }

    function _create_field(label_key, name, value = '', type = 'text', options = {}) {
        const { required = false } = options;
        const container = Helpers_create_element('div', { class_name: 'form-group' });
        const labelText = Translation_t(label_key);
        const label = Helpers_create_element('label', { attributes: { for: name }, text_content: labelText });
        container.appendChild(label);

        if (type === 'textarea') {
            const textarea = Helpers_create_element('textarea', {
                class_name: 'form-control',
                attributes: { id: name, name, rows: '4', ...(required ? { required: 'required' } : {}) }
            });
            textarea.value = value ?? '';
            container.appendChild(textarea);
            Helpers_init_auto_resize_for_textarea?.(textarea);
        } else {
            const input = Helpers_create_element('input', {
                class_name: 'form-control',
                attributes: { id: name, name, type, ...(required ? { required: 'required' } : {}) }
            });
            input.value = value ?? '';
            container.appendChild(input);
        }

        return container;
    }

    function _clone_metadata(metadata) {
        return JSON.parse(JSON.stringify(metadata || {}));
    }

    function _ensure_metadata_defaults(workingMetadata) {
        if (!workingMetadata.monitoringType) {
            workingMetadata.monitoringType = { type: '', text: '' };
        } else {
            workingMetadata.monitoringType.type = workingMetadata.monitoringType.type || '';
            workingMetadata.monitoringType.text = workingMetadata.monitoringType.text || '';
        }

        workingMetadata.pageTypes = Array.isArray(workingMetadata.pageTypes) ? [...workingMetadata.pageTypes] : [];
        workingMetadata.contentTypes = Array.isArray(workingMetadata.contentTypes) ? [...workingMetadata.contentTypes] : [];

        if (!workingMetadata.samples) {
            workingMetadata.samples = { sampleCategories: [], sampleTypes: [] };
        }
        workingMetadata.samples.sampleCategories = Array.isArray(workingMetadata.samples.sampleCategories)
            ? [...workingMetadata.samples.sampleCategories]
            : [];
        workingMetadata.samples.sampleTypes = Array.isArray(workingMetadata.samples.sampleTypes)
            ? [...workingMetadata.samples.sampleTypes]
            : [];

        workingMetadata.taxonomies = Array.isArray(workingMetadata.taxonomies) ? [...workingMetadata.taxonomies] : [];
        workingMetadata.keywords = Array.isArray(workingMetadata.keywords) ? [...workingMetadata.keywords] : [];
        return workingMetadata;
    }

    function _generate_slug(value) {
        if (!value) return '';
        return value.toString().trim().toLowerCase()
            .normalize('NFD').replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-{2,}/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function _ensure_unique_slug(slugSet, preferred, fallback) {
        let base = preferred || fallback || 'item';
        if (!base) base = 'item';
        let candidate = base;
        let counter = 1;
        while (!candidate || slugSet.has(candidate)) {
            candidate = `${base}-${counter++}`;
        }
        slugSet.add(candidate);
        return candidate;
    }

    function _create_inline_input(label_key, value, onChange, options = {}) {
        const { type = 'text', textarea = false, rawLabel = null } = options;
        const wrapper = Helpers_create_element('div', { class_name: 'inline-field' });
        const inputId = `inline-${Math.random().toString(36).substring(2, 10)}`;
        const labelText = rawLabel ?? Translation_t(label_key);
        const label = Helpers_create_element('label', { attributes: { for: inputId }, text_content: labelText });
        wrapper.appendChild(label);

        let input;
        if (textarea) {
            input = Helpers_create_element('textarea', {
                class_name: 'form-control form-control-compact',
                attributes: { id: inputId, rows: '3' }
            });
            input.value = value ?? '';
            Helpers_init_auto_resize_for_textarea?.(input);
            input.addEventListener('input', event => onChange(event.target.value));
        } else {
            input = Helpers_create_element('input', {
                class_name: 'form-control form-control-compact',
                attributes: { id: inputId, type }
            });
            input.value = value ?? '';
            input.addEventListener('input', event => onChange(event.target.value));
        }

        wrapper.appendChild(input);
        return wrapper;
    }

    function _create_checkbox_input(label_key, checked, onChange) {
        const wrapper = Helpers_create_element('div', { class_name: 'form-check-inline' });
        const inputId = `checkbox-${Math.random().toString(36).substring(2, 10)}`;
        const input = Helpers_create_element('input', {
            class_name: 'form-check-input',
            attributes: { id: inputId, type: 'checkbox' }
        });
        input.checked = !!checked;
        input.addEventListener('change', event => onChange(event.target.checked));
        const label = Helpers_create_element('label', {
            attributes: { for: inputId },
            text_content: Translation_t(label_key),
            class_name: 'form-check-label'
        });
        wrapper.append(input, label);
        return wrapper;
    }

    function _create_small_button(text_or_key, icon_name, onClick, variant = 'secondary', options = {}) {
        const { plainText = false, ariaLabel = null } = options;
        const resolveText = (value) => plainText ? value : Translation_t(value);
        const computeHtml = (value) => {
            const label = resolveText(value);
            const safeLabel = Helpers_escape_html ? Helpers_escape_html(label) : label;
            return `<span>${safeLabel}</span>` + (icon_name && Helpers_get_icon_svg ? Helpers_get_icon_svg(icon_name) : '');
        };

        const button = Helpers_create_element('button', {
            class_name: ['button', `button-${variant}`, 'button-small'],
            attributes: { type: 'button' },
            html_content: computeHtml(text_or_key)
        });

        const resolvedAria = ariaLabel || resolveText(text_or_key);
        if (resolvedAria) {
            button.setAttribute('aria-label', resolvedAria);
        }

        button.addEventListener('click', onClick);

        button.updateButtonText = (newText, newAria) => {
            button.innerHTML = computeHtml(newText);
            const aria = newAria || resolveText(newText);
            if (aria) {
                button.setAttribute('aria-label', aria);
            }
        };

        return button;
    }

    function _renderPageTypesEditor(container, workingMetadata) {
        container.innerHTML = '';

        if (!Array.isArray(workingMetadata.pageTypes) || workingMetadata.pageTypes.length === 0) {
            const emptyRow = Helpers_create_element('p', {
                class_name: 'editable-empty',
                text_content: Translation_t('rulefile_metadata_empty_value')
            });
            container.appendChild(emptyRow);
        }

        workingMetadata.pageTypes.forEach((pageType, index) => {
            const row = Helpers_create_element('div', { class_name: 'editable-list-row' });
            const displayName = pageType || Translation_t('rulefile_metadata_untitled_item');
            const removeLabel = Translation_t('rulefile_metadata_remove_page_type', { name: displayName });
            const removeBtn = _create_small_button(removeLabel, 'delete', () => {
                workingMetadata.pageTypes.splice(index, 1);
                _renderPageTypesEditor(container, workingMetadata);
            }, 'danger', { plainText: true, ariaLabel: removeLabel });

            const field = _create_inline_input('rulefile_metadata_field_text', pageType, value => {
                workingMetadata.pageTypes[index] = value;
                const updatedName = value || Translation_t('rulefile_metadata_untitled_item');
                const updatedLabel = Translation_t('rulefile_metadata_remove_page_type', { name: updatedName });
                removeBtn.updateButtonText?.(updatedLabel, updatedLabel);
            }, { rawLabel: Translation_t('rulefile_metadata_field_text') });
            row.append(field, removeBtn);
            container.appendChild(row);
        });

        const addBtn = _create_small_button('rulefile_metadata_add_page_type', 'add', () => {
            workingMetadata.pageTypes.push('');
            _renderPageTypesEditor(container, workingMetadata);
        });
        container.appendChild(addBtn);
    }

    function _renderContentTypesEditor(container, workingMetadata) {
        container.innerHTML = '';

        if (!Array.isArray(workingMetadata.contentTypes) || workingMetadata.contentTypes.length === 0) {
            const emptyRow = Helpers_create_element('p', {
                class_name: 'editable-empty',
                text_content: Translation_t('rulefile_metadata_empty_value')
            });
            container.appendChild(emptyRow);
        }

        workingMetadata.contentTypes.forEach((parent, parentIndex) => {
            if (!parent) {
                workingMetadata.contentTypes[parentIndex] = { id: '', text: '', description: '', types: [] };
                parent = workingMetadata.contentTypes[parentIndex];
            }
            parent.types = Array.isArray(parent.types) ? parent.types : [];

            const card = Helpers_create_element('article', { class_name: 'editable-card' });
            const headingRow = Helpers_create_element('div', { class_name: 'editable-card-header' });
            const heading = Helpers_create_element('h3', { text_content: parent.text || Translation_t('rulefile_metadata_untitled_item') });
            const initialRemoveLabel = Translation_t('rulefile_metadata_remove_content_type', { name: heading.textContent });
            const removeParentBtn = _create_small_button(initialRemoveLabel, 'delete', () => {
                workingMetadata.contentTypes.splice(parentIndex, 1);
                _renderContentTypesEditor(container, workingMetadata);
            }, 'danger', { plainText: true, ariaLabel: initialRemoveLabel });
            headingRow.append(heading, removeParentBtn);
            card.appendChild(headingRow);

            card.appendChild(_create_inline_input('rulefile_metadata_field_text', parent.text || '', value => {
                parent.text = value;
                const displayName = value || Translation_t('rulefile_metadata_untitled_item');
                heading.textContent = displayName;
                const updatedLabel = Translation_t('rulefile_metadata_remove_content_type', { name: displayName });
                removeParentBtn.updateButtonText?.(updatedLabel, updatedLabel);
            }));
            card.appendChild(_create_inline_input('rulefile_metadata_field_description', parent.description || '', value => {
                parent.description = value;
            }, { textarea: true }));

            const childList = Helpers_create_element('div', { class_name: 'editable-sublist' });
            parent.types.forEach((child, childIndex) => {
                if (!child) {
                    parent.types[childIndex] = { id: '', text: '', description: '' };
                    child = parent.types[childIndex];
                }
                const childCard = Helpers_create_element('div', { class_name: 'editable-card editable-child-card' });
                const childDisplayName = child.text || Translation_t('rulefile_metadata_untitled_item');
                const removeChildInitial = Translation_t('rulefile_metadata_remove_content_subtype', { name: childDisplayName });
                const removeChildBtn = _create_small_button(removeChildInitial, 'delete', () => {
                    parent.types.splice(childIndex, 1);
                    _renderContentTypesEditor(container, workingMetadata);
                }, 'danger', { plainText: true, ariaLabel: removeChildInitial });
                childCard.appendChild(removeChildBtn);

                childCard.appendChild(_create_inline_input('rulefile_metadata_field_text', child.text || '', value => {
                    child.text = value;
                    const updatedName = value || Translation_t('rulefile_metadata_untitled_item');
                    const updatedLabel = Translation_t('rulefile_metadata_remove_content_subtype', { name: updatedName });
                    removeChildBtn.updateButtonText?.(updatedLabel, updatedLabel);
                }));
                childCard.appendChild(_create_inline_input('rulefile_metadata_field_description', child.description || '', value => {
                    child.description = value;
                }, { textarea: true }));
                childList.appendChild(childCard);
            });

            const addChildBtn = _create_small_button('rulefile_metadata_add_content_subtype', 'add', () => {
                parent.types.push({ id: '', text: '', description: '' });
                _renderContentTypesEditor(container, workingMetadata);
            });
            childList.appendChild(addChildBtn);
            card.appendChild(childList);
            container.appendChild(card);
        });

        const addParentBtn = _create_small_button('rulefile_metadata_add_content_type', 'add', () => {
            workingMetadata.contentTypes.push({ id: '', text: '', description: '', types: [] });
            _renderContentTypesEditor(container, workingMetadata);
        });
        container.appendChild(addParentBtn);
    }

    function _renderSampleCategoriesEditor(container, workingMetadata) {
        container.innerHTML = '';

        const categories = workingMetadata.samples.sampleCategories || [];
        if (categories.length === 0) {
            container.appendChild(Helpers_create_element('p', {
                class_name: 'editable-empty',
                text_content: Translation_t('rulefile_metadata_empty_value')
            }));
        }

        categories.forEach((category, categoryIndex) => {
            if (!category) {
                categories[categoryIndex] = { id: '', text: '', hasUrl: false, categories: [] };
                category = categories[categoryIndex];
            }
            category.categories = Array.isArray(category.categories) ? category.categories : [];

            const card = Helpers_create_element('article', { class_name: 'editable-card' });
            const headingRow = Helpers_create_element('div', { class_name: 'editable-card-header' });
            const heading = Helpers_create_element('h3', { text_content: category.text || Translation_t('rulefile_metadata_untitled_item') });
            const removeCategoryInitial = Translation_t('rulefile_metadata_remove_sample_category', { name: heading.textContent });
            const removeCategoryBtn = _create_small_button(removeCategoryInitial, 'delete', () => {
                categories.splice(categoryIndex, 1);
                _renderSampleCategoriesEditor(container, workingMetadata);
            }, 'danger', { plainText: true, ariaLabel: removeCategoryInitial });
            headingRow.append(heading, removeCategoryBtn);
            card.appendChild(headingRow);

            card.appendChild(_create_inline_input('rulefile_metadata_field_text', category.text || '', value => {
                category.text = value;
                const updatedName = value || Translation_t('rulefile_metadata_untitled_item');
                const updatedLabel = Translation_t('rulefile_metadata_remove_sample_category', { name: updatedName });
                heading.textContent = updatedName;
                removeCategoryBtn.updateButtonText?.(updatedLabel, updatedLabel);
            }));
            card.appendChild(_create_checkbox_input('rulefile_metadata_field_has_url', category.hasUrl, value => {
                category.hasUrl = value;
            }));

            const subList = Helpers_create_element('div', { class_name: 'editable-sublist' });
            category.categories.forEach((subCategory, subIndex) => {
                if (!subCategory) {
                    category.categories[subIndex] = { id: '', text: '' };
                    subCategory = category.categories[subIndex];
                }
                const row = Helpers_create_element('div', { class_name: 'editable-list-row' });
                const subDisplay = subCategory.text || Translation_t('rulefile_metadata_untitled_item');
                const removeSubInitial = Translation_t('rulefile_metadata_remove_sample_subcategory', { name: subDisplay });
                const removeSubBtn = _create_small_button(removeSubInitial, 'delete', () => {
                    category.categories.splice(subIndex, 1);
                    _renderSampleCategoriesEditor(container, workingMetadata);
                }, 'danger', { plainText: true, ariaLabel: removeSubInitial });
                row.appendChild(_create_inline_input('rulefile_metadata_field_text', subCategory.text || '', value => {
                    subCategory.text = value;
                    const updatedName = value || Translation_t('rulefile_metadata_untitled_item');
                    const updatedLabel = Translation_t('rulefile_metadata_remove_sample_subcategory', { name: updatedName });
                    removeSubBtn.updateButtonText?.(updatedLabel, updatedLabel);
                }));
                row.appendChild(removeSubBtn);
                subList.appendChild(row);
            });

            const addSubBtn = _create_small_button('rulefile_metadata_add_sample_subcategory', 'add', () => {
                category.categories.push({ id: '', text: '' });
                _renderSampleCategoriesEditor(container, workingMetadata);
            });
            subList.appendChild(addSubBtn);
            card.appendChild(subList);
            container.appendChild(card);
        });

        const addCategoryBtn = _create_small_button('rulefile_metadata_add_sample_category', 'add', () => {
            categories.push({ id: '', text: '', hasUrl: false, categories: [] });
            _renderSampleCategoriesEditor(container, workingMetadata);
        });
        container.appendChild(addCategoryBtn);
    }

    function _renderSampleTypesEditor(container, workingMetadata) {
        container.innerHTML = '';
        const sampleTypes = workingMetadata.samples.sampleTypes || [];

        if (sampleTypes.length === 0) {
            container.appendChild(Helpers_create_element('p', {
                class_name: 'editable-empty',
                text_content: Translation_t('rulefile_metadata_empty_value')
            }));
        }

        sampleTypes.forEach((type, index) => {
            const row = Helpers_create_element('div', { class_name: 'editable-list-row' });
            const displayName = type || Translation_t('rulefile_metadata_untitled_item');
            const removeLabel = Translation_t('rulefile_metadata_remove_sample_type', { name: displayName });
            const removeBtn = _create_small_button(removeLabel, 'delete', () => {
                sampleTypes.splice(index, 1);
                _renderSampleTypesEditor(container, workingMetadata);
            }, 'danger', { plainText: true, ariaLabel: removeLabel });
            row.appendChild(_create_inline_input('rulefile_metadata_field_text', type || '', value => {
                sampleTypes[index] = value;
                const updatedName = value || Translation_t('rulefile_metadata_untitled_item');
                const updatedLabel = Translation_t('rulefile_metadata_remove_sample_type', { name: updatedName });
                removeBtn.updateButtonText?.(updatedLabel, updatedLabel);
            }, { rawLabel: Translation_t('rulefile_metadata_field_text') }));
            row.appendChild(removeBtn);
            container.appendChild(row);
        });

        const addBtn = _create_small_button('rulefile_metadata_add_sample_type', 'add', () => {
            sampleTypes.push('');
            _renderSampleTypesEditor(container, workingMetadata);
        });
        container.appendChild(addBtn);
    }

    function _renderTaxonomiesEditor(container, workingMetadata) {
        container.innerHTML = '';
        if (!Array.isArray(workingMetadata.taxonomies) || workingMetadata.taxonomies.length === 0) {
            container.appendChild(Helpers_create_element('p', {
                class_name: 'editable-empty',
                text_content: Translation_t('rulefile_metadata_empty_value')
            }));
        }

        workingMetadata.taxonomies.forEach((taxonomy, taxonomyIndex) => {
            if (!taxonomy) {
                workingMetadata.taxonomies[taxonomyIndex] = { id: '', label: '', version: '', uri: '', concepts: [] };
                taxonomy = workingMetadata.taxonomies[taxonomyIndex];
            }
            taxonomy.concepts = Array.isArray(taxonomy.concepts) ? taxonomy.concepts : [];

            const card = Helpers_create_element('article', { class_name: 'editable-card' });
            const headingRow = Helpers_create_element('div', { class_name: 'editable-card-header' });
            const heading = Helpers_create_element('h3', { text_content: taxonomy.label || Translation_t('rulefile_metadata_untitled_item') });
            const removeTaxonomyInitial = Translation_t('rulefile_metadata_remove_taxonomy', { name: heading.textContent });
            const removeTaxonomyBtn = _create_small_button(removeTaxonomyInitial, 'delete', () => {
                workingMetadata.taxonomies.splice(taxonomyIndex, 1);
                _renderTaxonomiesEditor(container, workingMetadata);
            }, 'danger', { plainText: true, ariaLabel: removeTaxonomyInitial });
            headingRow.append(heading, removeTaxonomyBtn);
            card.appendChild(headingRow);

            card.appendChild(_create_inline_input('rulefile_metadata_field_label', taxonomy.label || '', value => {
                taxonomy.label = value;
                const updatedName = value || Translation_t('rulefile_metadata_untitled_item');
                heading.textContent = updatedName;
                const updatedLabel = Translation_t('rulefile_metadata_remove_taxonomy', { name: updatedName });
                removeTaxonomyBtn.updateButtonText?.(updatedLabel, updatedLabel);
            }));
            card.appendChild(_create_inline_input('rulefile_metadata_field_taxonomy_version', taxonomy.version || '', value => {
                taxonomy.version = value;
            }));
            card.appendChild(_create_inline_input('rulefile_metadata_field_taxonomy_uri', taxonomy.uri || '', value => {
                taxonomy.uri = value;
            }));

            const conceptList = Helpers_create_element('div', { class_name: 'editable-sublist' });
            taxonomy.concepts.forEach((concept, conceptIndex) => {
                if (!concept) {
                    taxonomy.concepts[conceptIndex] = { id: '', label: '' };
                    concept = taxonomy.concepts[conceptIndex];
                }
                const row = Helpers_create_element('div', { class_name: 'editable-list-row' });
                const conceptName = concept.label || Translation_t('rulefile_metadata_untitled_item');
                const removeConceptInitial = Translation_t('rulefile_metadata_remove_taxonomy_concept', { name: conceptName });
                const removeConceptBtn = _create_small_button(removeConceptInitial, 'delete', () => {
                    taxonomy.concepts.splice(conceptIndex, 1);
                    _renderTaxonomiesEditor(container, workingMetadata);
                }, 'danger', { plainText: true, ariaLabel: removeConceptInitial });
                row.appendChild(_create_inline_input('rulefile_metadata_field_label', concept.label || '', value => {
                    concept.label = value;
                    const updatedName = value || Translation_t('rulefile_metadata_untitled_item');
                    const updatedLabel = Translation_t('rulefile_metadata_remove_taxonomy_concept', { name: updatedName });
                    removeConceptBtn.updateButtonText?.(updatedLabel, updatedLabel);
                }));
                row.appendChild(removeConceptBtn);
                conceptList.appendChild(row);
            });

            const addConceptBtn = _create_small_button('rulefile_metadata_add_taxonomy_concept', 'add', () => {
                taxonomy.concepts.push({ id: '', label: '' });
                _renderTaxonomiesEditor(container, workingMetadata);
            });
            conceptList.appendChild(addConceptBtn);

            card.appendChild(conceptList);
            container.appendChild(card);
        });

        const addTaxonomyBtn = _create_small_button('rulefile_metadata_add_taxonomy', 'add', () => {
            workingMetadata.taxonomies.push({ id: '', label: '', version: '', uri: '', concepts: [] });
            _renderTaxonomiesEditor(container, workingMetadata);
        });
        container.appendChild(addTaxonomyBtn);
    }

    function _create_form(metadata) {
        const workingMetadata = _ensure_metadata_defaults(_clone_metadata(metadata));
        const form = Helpers_create_element('form', { class_name: 'rulefile-metadata-edit-form' });

        const general_section = Helpers_create_element('section', { class_name: 'form-section' });
        general_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_general') }));
        general_section.appendChild(_create_field('rulefile_metadata_field_title', 'metadata.title', metadata.title || '', 'text', { required: true }));
        general_section.appendChild(_create_field('rulefile_metadata_field_description', 'metadata.description', metadata.description || '', 'textarea'));
        general_section.appendChild(_create_field('rulefile_metadata_field_version', 'metadata.version', metadata.version || ''));
        general_section.appendChild(_create_field('rulefile_metadata_field_language', 'metadata.language', metadata.language || ''));
        general_section.appendChild(_create_field('rulefile_metadata_field_monitoring_type_key', 'metadata.monitoringType.type', metadata.monitoringType?.type || ''));
        general_section.appendChild(_create_field('rulefile_metadata_field_monitoring_type_label', 'metadata.monitoringType.text', metadata.monitoringType?.text || ''));
        general_section.appendChild(_create_field('rulefile_metadata_field_date_created', 'metadata.dateCreated', metadata.dateCreated || '', 'date'));
        general_section.appendChild(_create_field('rulefile_metadata_field_date_modified', 'metadata.dateModified', metadata.dateModified || '', 'date'));
        general_section.appendChild(_create_field('rulefile_metadata_field_license', 'metadata.license', metadata.license || ''));

        const publisher_section = Helpers_create_element('section', { class_name: 'form-section' });
        publisher_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_publisher') }));
        publisher_section.appendChild(_create_field('rulefile_metadata_field_publisher_name', 'metadata.publisher.name', metadata.publisher?.name || ''));
        publisher_section.appendChild(_create_field('rulefile_metadata_field_publisher_contact', 'metadata.publisher.contactPoint', metadata.publisher?.contactPoint || ''));

        const source_section = Helpers_create_element('section', { class_name: 'form-section' });
        source_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_source') }));
        source_section.appendChild(_create_field('rulefile_metadata_field_source_url', 'metadata.source.url', metadata.source?.url || '', 'url'));
        source_section.appendChild(_create_field('rulefile_metadata_field_source_title', 'metadata.source.title', metadata.source?.title || ''));
        source_section.appendChild(_create_field('rulefile_metadata_field_source_retrieved', 'metadata.source.retrievedDate', metadata.source?.retrievedDate || '', 'date'));
        source_section.appendChild(_create_field('rulefile_metadata_field_source_format', 'metadata.source.format', metadata.source?.format || ''));

        const keywords_section = Helpers_create_element('section', { class_name: 'form-section' });
        keywords_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_keywords') }));
        const keywords_text = Array.isArray(metadata.keywords) ? metadata.keywords.join('\n') : '';
        const keywords_field = _create_field('rulefile_metadata_field_keywords', 'metadata.keywords', keywords_text, 'textarea');
        keywords_field.appendChild(Helpers_create_element('p', {
            class_name: 'field-hint',
            text_content: Translation_t('rulefile_metadata_field_keywords_hint')
        }));
        keywords_section.appendChild(keywords_field);

        const page_types_section = Helpers_create_element('section', { class_name: 'form-section' });
        page_types_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_page_types') }));
        const page_types_body = Helpers_create_element('div', { class_name: 'editable-list-container' });
        page_types_section.appendChild(page_types_body);
        _renderPageTypesEditor(page_types_body, workingMetadata);

        const content_types_section = Helpers_create_element('section', { class_name: 'form-section' });
        content_types_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_content_types') }));
        const content_types_body = Helpers_create_element('div', { class_name: 'editable-card-list' });
        content_types_section.appendChild(content_types_body);
        _renderContentTypesEditor(content_types_body, workingMetadata);

        const samples_section = Helpers_create_element('section', { class_name: 'form-section' });
        samples_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_samples') }));
        samples_section.appendChild(Helpers_create_element('h3', { text_content: Translation_t('rulefile_metadata_sample_categories_title') }));
        const sample_categories_body = Helpers_create_element('div', { class_name: 'editable-card-list' });
        samples_section.appendChild(sample_categories_body);
        _renderSampleCategoriesEditor(sample_categories_body, workingMetadata);
        samples_section.appendChild(Helpers_create_element('h3', { text_content: Translation_t('rulefile_metadata_sample_types_title') }));
        const sample_types_body = Helpers_create_element('div', { class_name: 'editable-list-container' });
        samples_section.appendChild(sample_types_body);
        _renderSampleTypesEditor(sample_types_body, workingMetadata);

        const taxonomies_section = Helpers_create_element('section', { class_name: 'form-section' });
        taxonomies_section.appendChild(Helpers_create_element('h2', { text_content: Translation_t('rulefile_metadata_section_taxonomies') }));
        const taxonomies_body = Helpers_create_element('div', { class_name: 'editable-card-list' });
        taxonomies_section.appendChild(taxonomies_body);
        _renderTaxonomiesEditor(taxonomies_body, workingMetadata);

        form.append(
            general_section,
            publisher_section,
            source_section,
            keywords_section,
            page_types_section,
            content_types_section,
            samples_section,
            taxonomies_section
        );

        form.addEventListener('submit', event => {
            event.preventDefault();
            _handle_submit(form, metadata, workingMetadata);
        });

        const footerActions = Helpers_create_element('div', { class_name: 'metadata-edit-form-footer-actions' });
        const footerSaveButton = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            attributes: { type: 'button' },
            html_content: `<span>${Translation_t('rulefile_metadata_save_metadata')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('save') : '')
        });
        footerSaveButton.addEventListener('click', () => form.requestSubmit());

        const footerCancelButton = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            attributes: { type: 'button' },
            html_content: `<span>${Translation_t('rulefile_metadata_view_without_saving')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('visibility') : '')
        });
        footerCancelButton.addEventListener('click', () => router_ref('rulefile_metadata'));

        footerActions.append(footerSaveButton, footerCancelButton);
        form.appendChild(footerActions);

        return { form, workingMetadata };
    }

    function _handle_submit(form, originalMetadata, workingMetadata) {
        const t = Translation_t;
        const formData = new FormData(form);
        const getValue = name => (formData.get(name) || '').toString().trim();

        const keywords_input = getValue('metadata.keywords');
        const keywords = keywords_input
            ? keywords_input.split(/[\n\r,]+/).map(entry => entry.trim()).filter(Boolean)
            : [];

        const cleanedPageTypes = (workingMetadata.pageTypes || [])
            .map(entry => (entry || '').trim())
            .filter(Boolean);

        const cleanedContentTypes = (workingMetadata.contentTypes || []).map(parent => {
            const cleanedParent = {
                id: (parent.id || '').trim(),
                text: (parent.text || '').trim(),
                description: (parent.description || '').trim()
            };
            const childTypes = Array.isArray(parent.types) ? parent.types : [];
            cleanedParent.types = childTypes
                .map(child => ({
                    id: (child?.id || '').trim(),
                    text: (child?.text || '').trim(),
                    description: (child?.description || '').trim()
                }))
                .filter(child => child.id || child.text || child.description);
            return cleanedParent;
        }).filter(parent => parent.id || parent.text || parent.description || (parent.types && parent.types.length > 0));

        const cleanedSampleCategories = (workingMetadata.samples?.sampleCategories || []).map(category => {
            const cleanedCategory = {
                id: (category?.id || '').trim(),
                text: (category?.text || '').trim(),
                hasUrl: !!category?.hasUrl
            };
            const subCategories = Array.isArray(category?.categories) ? category.categories : [];
            cleanedCategory.categories = subCategories
                .map(sub => ({
                    id: (sub?.id || '').trim(),
                    text: (sub?.text || '').trim()
                }))
                .filter(sub => sub.id || sub.text);
            return cleanedCategory;
        }).filter(cat => cat.id || cat.text || (cat.categories && cat.categories.length > 0));

        const cleanedSampleTypes = (workingMetadata.samples?.sampleTypes || [])
            .map(entry => (entry || '').trim())
            .filter(Boolean);

        const cleanedTaxonomies = (workingMetadata.taxonomies || []).map(taxonomy => {
            const cleanedTaxonomy = {
                id: (taxonomy?.id || '').trim(),
                label: (taxonomy?.label || '').trim(),
                version: (taxonomy?.version || '').trim(),
                uri: (taxonomy?.uri || '').trim()
            };
            const concepts = Array.isArray(taxonomy?.concepts) ? taxonomy.concepts : [];
            cleanedTaxonomy.concepts = concepts
                .map(concept => ({
                    id: (concept?.id || '').trim(),
                    label: (concept?.label || '').trim()
                }))
                .filter(concept => concept.id || concept.label);
            return cleanedTaxonomy;
        }).filter(taxonomy => taxonomy.id || taxonomy.label || taxonomy.version || taxonomy.uri || (taxonomy.concepts && taxonomy.concepts.length > 0));

        const contentTypeSlugSet = new Set(cleanedContentTypes.map(ct => ct.id).filter(Boolean));
        cleanedContentTypes.forEach(parent => {
            if (!parent.id) {
                parent.id = _ensure_unique_slug(contentTypeSlugSet, _generate_slug(parent.text), 'content-type');
            } else {
                contentTypeSlugSet.add(parent.id);
            }

            const childSlugSet = new Set(parent.types.map(child => child.id).filter(Boolean));
            parent.types.forEach(child => {
                if (!child.id) {
                    const childSlug = _generate_slug(child.text);
                    const base = parent.id || _generate_slug(parent.text) || 'content';
                    const preferred = childSlug ? `${base}-${childSlug}` : '';
                    child.id = _ensure_unique_slug(childSlugSet, preferred, `${base}-child`);
                } else {
                    childSlugSet.add(child.id);
                }
            });
        });

        const sampleCategorySlugSet = new Set(cleanedSampleCategories.map(cat => cat.id).filter(Boolean));
        cleanedSampleCategories.forEach(category => {
            if (!category.id) {
                category.id = _ensure_unique_slug(sampleCategorySlugSet, _generate_slug(category.text), 'sample-category');
            } else {
                sampleCategorySlugSet.add(category.id);
            }

            const subSlugSet = new Set(category.categories.map(sub => sub.id).filter(Boolean));
            category.categories.forEach(sub => {
                if (!sub.id) {
                    const subSlug = _generate_slug(sub.text);
                    const base = category.id || 'category';
                    const preferred = subSlug ? `${base}-${subSlug}` : '';
                    sub.id = _ensure_unique_slug(subSlugSet, preferred, `${base}-subcategory`);
                } else {
                    subSlugSet.add(sub.id);
                }
            });
        });

        const taxonomySlugSet = new Set(cleanedTaxonomies.map(t => t.id).filter(Boolean));
        cleanedTaxonomies.forEach(taxonomy => {
            if (!taxonomy.id) {
                taxonomy.id = _ensure_unique_slug(taxonomySlugSet, _generate_slug(taxonomy.label), 'taxonomy');
            } else {
                taxonomySlugSet.add(taxonomy.id);
            }

            const conceptSlugSet = new Set(taxonomy.concepts.map(c => c.id).filter(Boolean));
            taxonomy.concepts.forEach(concept => {
                if (!concept.id) {
                    const conceptSlug = _generate_slug(concept.label);
                    const base = taxonomy.id || 'taxonomy';
                    const preferred = conceptSlug ? `${base}-${conceptSlug}` : '';
                    concept.id = _ensure_unique_slug(conceptSlugSet, preferred, `${base}-concept`);
                } else {
                    conceptSlugSet.add(concept.id);
                }
            });
        });

        const updatedMetadata = {
            ...originalMetadata,
            title: getValue('metadata.title'),
            description: formData.get('metadata.description')?.toString() || '',
            version: getValue('metadata.version'),
            language: getValue('metadata.language'),
            monitoringType: {
                ...originalMetadata.monitoringType,
                type: getValue('metadata.monitoringType.type'),
                text: getValue('metadata.monitoringType.text')
            },
            dateCreated: getValue('metadata.dateCreated'),
            dateModified: getValue('metadata.dateModified'),
            license: getValue('metadata.license'),
            publisher: {
                ...originalMetadata.publisher,
                name: getValue('metadata.publisher.name'),
                contactPoint: getValue('metadata.publisher.contactPoint')
            },
            source: {
                ...originalMetadata.source,
                url: getValue('metadata.source.url'),
                title: getValue('metadata.source.title'),
                retrievedDate: getValue('metadata.source.retrievedDate'),
                format: getValue('metadata.source.format')
            },
            keywords,
            pageTypes: cleanedPageTypes,
            contentTypes: cleanedContentTypes,
            samples: {
                ...originalMetadata.samples,
                sampleCategories: cleanedSampleCategories,
                sampleTypes: cleanedSampleTypes
            },
            taxonomies: cleanedTaxonomies
        };

        const state = local_getState();
        const currentRulefile = state?.ruleFileContent || {};
        const updatedRulefileContent = {
            ...currentRulefile,
            metadata: updatedMetadata
        };

        local_dispatch({
            type: local_StoreActionTypes.UPDATE_RULEFILE_CONTENT,
            payload: { ruleFileContent: updatedRulefileContent }
        });

        NotificationComponent_show_global_message?.(t('rulefile_metadata_edit_saved'), 'success');
        router_ref('rulefile_metadata');
    }

    function render() {
        const t = Translation_t;
        const state = local_getState?.();

        if (!state?.ruleFileContent?.metadata) {
            router_ref('edit_rulefile_main');
            return;
        }

        app_container_ref.innerHTML = '';
        const plate = Helpers_create_element('div', { class_name: ['content-plate', 'rulefile-metadata-edit-plate'] });

        const headingWrapper = Helpers_create_element('div', { class_name: 'metadata-edit-header' });
        headingWrapper.appendChild(Helpers_create_element('h1', { text_content: t('rulefile_metadata_edit_title') }));
        const introParagraph = Helpers_create_element('p', {
            class_name: 'view-intro-text',
            text_content: t('rulefile_metadata_edit_intro')
        });
        headingWrapper.appendChild(introParagraph);
        plate.appendChild(headingWrapper);

        const { form } = _create_form(state.ruleFileContent.metadata);

        const actionRow = Helpers_create_element('div', { class_name: 'metadata-edit-actions' });
        const saveTopButton = Helpers_create_element('button', {
            class_name: ['button', 'button-primary'],
            attributes: { type: 'button' },
            html_content: `<span>${t('rulefile_metadata_save_metadata')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('save') : '')
        });
        saveTopButton.addEventListener('click', () => form.requestSubmit());

        const viewWithoutSaveButton = Helpers_create_element('button', {
            class_name: ['button', 'button-default'],
            attributes: { type: 'button' },
            html_content: `<span>${t('rulefile_metadata_view_without_saving')}</span>` + (Helpers_get_icon_svg ? Helpers_get_icon_svg('visibility') : '')
        });
        viewWithoutSaveButton.addEventListener('click', () => router_ref('rulefile_metadata'));

        actionRow.append(saveTopButton, viewWithoutSaveButton);

        plate.appendChild(actionRow);
        plate.appendChild(form);

        app_container_ref.appendChild(plate);
    }

    function destroy() {
        if (app_container_ref) {
            app_container_ref.innerHTML = '';
        }
    }

    return { init, render, destroy };
})();
