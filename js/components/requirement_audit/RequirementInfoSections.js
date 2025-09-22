// js/components/requirement_audit/RequirementInfoSections.js

import { marked } from '../../utils/markdown.js';

export const RequirementInfoSections = (function () {
    'use-strict';
    
    let container_ref;
    
    // Dependencies
    let Translation_t;
    let Helpers_create_element;
    
    function assign_globals_once() {
        if (Translation_t && Helpers_create_element) return;
        Translation_t = window.Translation?.t;
        Helpers_create_element = window.Helpers?.create_element;
    }
    
    function init(_container) {
        assign_globals_once();
        container_ref = _container;
    }
    
    function render_markdown_section(title_key, content_data) {
        const t = Translation_t;
        if (!content_data || (typeof content_data === 'string' && !content_data.trim())) {
            return null; // Return nothing if there's no content
        }
        
        const section_div = Helpers_create_element('div', { class_name: 'audit-section' });
        section_div.appendChild(Helpers_create_element('h2', { text_content: t(title_key) }));
        
        const content_element = Helpers_create_element('div', { class_name: ['audit-section-content', 'markdown-content'] });
        
        if (typeof marked !== 'undefined' && typeof window.Helpers.escape_html === 'function') {
            const renderer = new marked.Renderer();
            renderer.link = (href, title, text) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            renderer.html = (html_token) => {
                const text_to_escape = (typeof html_token === 'object' && html_token !== null && typeof html_token.text === 'string')
                    ? html_token.text
                    : String(html_token || '');
                return window.Helpers.escape_html(text_to_escape);
            };
            content_element.innerHTML = marked.parse(String(content_data), { renderer: renderer, breaks: true, gfm: true });
        } else {
            content_element.textContent = String(content_data);
        }
        
        section_div.appendChild(content_element);
        return section_div;
    }
    
    function render(requirement_definition, sample, rule_file_metadata) {
        container_ref.innerHTML = '';
        const t = Translation_t;

        const sections_to_render = [
            render_markdown_section('requirement_expected_observation', requirement_definition.expectedObservation),
            render_markdown_section('requirement_instructions', requirement_definition.instructions),
            render_markdown_section('requirement_exceptions', requirement_definition.exceptions),
            render_markdown_section('requirement_common_errors', requirement_definition.commonErrors),
            render_markdown_section('requirement_examples', requirement_definition.examples),
            render_markdown_section('requirement_tips', requirement_definition.tips)
        ];

        // Special handling for metadata/content types
        if (sample?.selectedContentTypes?.length > 0) {
            const metadata_section = Helpers_create_element('div', { class_name: 'audit-section' });
            metadata_section.appendChild(Helpers_create_element('h2', { text_content: t('content_types') }));
            
            const content_types_map = new Map();
            (rule_file_metadata?.contentTypes || []).forEach(parent => {
                (parent.types || []).forEach(child => content_types_map.set(child.id, child.text));
            });
            
            const ul = Helpers_create_element('ul', { class_name: 'requirement-metadata-list' });
            sample.selectedContentTypes.forEach(ct_id => {
                ul.appendChild(Helpers_create_element('li', { text_content: content_types_map.get(ct_id) || ct_id }));
            });

            if (ul.hasChildNodes()) {
                metadata_section.appendChild(ul);
                sections_to_render.push(metadata_section);
            }
        }
        
        sections_to_render.filter(Boolean).forEach(section => container_ref.appendChild(section));
    }
    
    function destroy() {
        if (container_ref) container_ref.innerHTML = '';
    }

    return {
        init,
        render,
        destroy
    };
    
})();
