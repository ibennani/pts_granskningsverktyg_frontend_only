// js/features/markdown_toolbar.js

(function () { // IIFE för att undvika globala konflikter
    'use-strict';

    // Definiera en global placeholder om den inte redan finns
    window.MarkdownToolbar = window.MarkdownToolbar || {};

    const CSS_PATH = 'css/features/markdown_toolbar.css';
    const DEBOUNCE_DELAY_MS = 250;
    let initialized = false;
    let observer = null;
    
    // Använder en Map för att hålla reda på varje textrutas unika tillstånd
    const instanceMap = new Map();

    /**
     * Huvudfunktion för att initiera modulen.
     */
    function init() {
        if (initialized) {
            console.warn("MarkdownToolbar is already initialized.");
            return;
        }

        if (window.Helpers && window.Helpers.load_css) {
            window.Helpers.load_css(CSS_PATH).catch(err => console.error(err));
        }

        document.querySelectorAll('textarea').forEach(processTextarea);

        observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches('textarea')) {
                                processTextarea(node);
                            }
                            node.querySelectorAll('textarea').forEach(processTextarea);
                        }
                    });
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        initialized = true;
        console.log("MarkdownToolbar initialized and observing for new textareas.");
    }

    /**
     * Bearbetar en enskild textarea: skapar en wrapper, verktygsrad, och förhandsgranskning.
     * @param {HTMLTextAreaElement} textarea - Textrutan som ska bearbetas.
     */
    function processTextarea(textarea) {
        if (textarea.closest('.markdown-editor-wrapper')) {
            return;
        }
        
        if (!textarea.id) {
            textarea.id = `md-editor-${window.Helpers.generate_uuid_v4()}`;
        }

        const existingInstance = instanceMap.get(textarea.id);
        const wasPreviewVisible = existingInstance ? existingInstance.previewVisible : false;

        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-editor-wrapper';

        const toolbar = createToolbar(textarea, wasPreviewVisible);
        const previewDiv = document.createElement('div');
        previewDiv.className = 'md-preview';
        previewDiv.style.display = wasPreviewVisible ? 'block' : 'none';

        textarea.parentNode.insertBefore(wrapper, textarea);
        wrapper.appendChild(toolbar);
        wrapper.appendChild(textarea);
        wrapper.appendChild(previewDiv);

        instanceMap.set(textarea.id, {
            previewVisible: wasPreviewVisible,
            previewDiv: previewDiv,
            debouncedUpdate: debounce(() => updatePreview(textarea, previewDiv), DEBOUNCE_DELAY_MS)
        });

        textarea.addEventListener('input', () => {
            const instance = instanceMap.get(textarea.id);
            if (instance && instance.previewVisible) {
                instance.debouncedUpdate();
            }
        });

        if (wasPreviewVisible) {
            updatePreview(textarea, previewDiv);
        }
    }

    /**
     * Skapar verktygsraden med alla knappar och händelselyssnare.
     * @param {HTMLTextAreaElement} textarea - Textrutan som verktygsraden tillhör.
     * @param {boolean} isPreviewInitiallyVisible - Om förhandsgranskningen ska vara synlig från start.
     * @returns {HTMLElement} - Det färdiga verktygsrads-elementet.
     */
    function createToolbar(textarea, isPreviewInitiallyVisible) {
        const t = window.Translation.t;
        const toolbar = document.createElement('div');
        toolbar.className = 'md-toolbar';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-controls', textarea.id);

        const buttons = [
            { format: 'bold', icon: 'fa-bold', tooltipKey: 'md_tooltip_bold' },
            { format: 'italic', icon: 'fa-italic', tooltipKey: 'md_tooltip_italic' },
            { format: 'code', icon: 'fa-code', tooltipKey: 'md_tooltip_code' },
            { type: 'separator' },
            { format: 'heading', icon: 'fa-heading', tooltipKey: 'md_tooltip_heading' },
            { format: 'ul', icon: 'fa-list-ul', tooltipKey: 'md_tooltip_ul' },
            { format: 'ol', icon: 'fa-list-ol', tooltipKey: 'md_tooltip_ol' },
            { format: 'link', icon: 'fa-link', tooltipKey: 'md_tooltip_link' },
            { type: 'spacer' },
            { format: 'preview', icon: 'fa-eye', tooltipKey: 'md_tooltip_preview' }
        ];

        buttons.forEach(btnConfig => {
            if (btnConfig.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'md-toolbar-separator';
                separator.setAttribute('aria-hidden', 'true');
                separator.textContent = '|';
                toolbar.appendChild(separator);
                return;
            }
            if (btnConfig.type === 'spacer') {
                const spacer = document.createElement('div');
                spacer.style.flexGrow = '1';
                toolbar.appendChild(spacer);
                return;
            }
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'md-toolbar-btn';
            button.setAttribute('aria-label', t(btnConfig.tooltipKey));
            button.title = t(btnConfig.tooltipKey);
            button.innerHTML = `<i class="fa-solid ${btnConfig.icon}" aria-hidden="true"></i>`;

            if (btnConfig.format === 'preview') {
                button.setAttribute('aria-pressed', String(isPreviewInitiallyVisible));
                button.addEventListener('click', () => {
                    const instance = instanceMap.get(textarea.id);
                    if (instance) {
                        instance.previewVisible = !instance.previewVisible;
                        instance.previewDiv.style.display = instance.previewVisible ? 'block' : 'none';
                        button.setAttribute('aria-pressed', instance.previewVisible);
                        if (instance.previewVisible) {
                            updatePreview(textarea, instance.previewDiv);
                        }
                    }
                });
            } else {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    applyFormat(textarea, btnConfig.format);
                });
            }
            toolbar.appendChild(button);
        });
        return toolbar;
    }

    // *** UPPDATERAD FUNKTION ***
    /**
     * Applicerar Markdown-formatering på den markerade texten, med "toggle" och "replace"-logik för listor.
     * @param {HTMLTextAreaElement} textarea - Mål-textrutan.
     * @param {string} format - Vilken formatering som ska appliceras.
     */
    function applyFormat(textarea, format) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let replacement = selectedText;

        const bulletListRegex = /^\s*([*+-])\s+/;
        const numberedListRegex = /^\s*([0-9]+)\.\s+/;

        if (format === 'ul' || format === 'ol') {
            const lines = selectedText.split('\n');
            const nonEmptyLines = lines.filter(line => line.trim() !== '');
            if (nonEmptyLines.length === 0) {
                textarea.focus();
                return; // Gör ingenting om bara tomma rader är markerade
            }

            const targetRegex = (format === 'ul') ? bulletListRegex : numberedListRegex;
            const isAlreadyFormatted = nonEmptyLines.every(line => targetRegex.test(line));

            if (isAlreadyFormatted) {
                // Ta bort formatering
                replacement = lines.map(line => line.replace(targetRegex, '')).join('\n');
            } else {
                // Lägg till eller byt formatering
                let counter = 1;
                replacement = lines.map(line => {
                    if (line.trim() === '') return line;
                    // Ta bort ALLA befintliga listmarkörer först
                    const strippedLine = line.replace(bulletListRegex, '').replace(numberedListRegex, '');
                    if (format === 'ol') {
                        return `${counter++}. ${strippedLine}`;
                    } else { // format === 'ul'
                        return `- ${strippedLine}`;
                    }
                }).join('\n');
            }
        } else if (format === 'heading') {
            // Rubrik är ett specialfall av radprefix
            if (selectedText.startsWith('## ')) {
                replacement = selectedText.substring(3);
            } else {
                replacement = `## ${selectedText}`;
            }
        } else {
            // Logik för att omsluta text (bold, italic, etc.) med smart trimning
            const leadingSpace = selectedText.match(/^\s*/)?.[0] || '';
            const trailingSpace = selectedText.match(/\s*$/)?.[0] || '';
            const trimmedText = selectedText.trim();

            if (trimmedText === '') {
                textarea.focus();
                textarea.setSelectionRange(start, end);
                return;
            }
            
            const wrappers = { 'bold': '**', 'italic': '*', 'code': '`', 'link': '[' };
            const wrapper = wrappers[format];
            const formattedText = `${wrapper}${trimmedText}${wrapper === '[' ? '](url)' : wrapper}`;
            replacement = `${leadingSpace}${formattedText}${trailingSpace}`;
        }
        
        textarea.setRangeText(replacement, start, end, 'select');
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    /**
     * Uppdaterar förhandsgranskningens innehåll.
     * @param {HTMLTextAreaElement} textarea - Käll-textrutan.
     * @param {HTMLElement} previewDiv - Mål-diven för förhandsgranskningen.
     */
    function updatePreview(textarea, previewDiv) {
        if (typeof marked === 'undefined') {
            previewDiv.innerHTML = '<p style="color: red;">Error: marked.js library not loaded.</p>';
            return;
        }
        let markdownText = textarea.value;
        const listEndRegex = /(^(\s*(\*|\-|\+)\s|[0-9]+\.\s).*\n)(?!\s*(\*|\-|\+)\s|[0-9]+\.\s|\s*$)/gm;
        markdownText = markdownText.replace(listEndRegex, '$1\n');
        
        const renderer = new marked.Renderer();
        const originalLinkRenderer = renderer.link.bind(renderer);
        renderer.link = (href, title, text) => {
            const link = originalLinkRenderer(href, title, text);
            return link.replace('<a', '<a target="_blank" rel="noopener noreferrer"');
        };

        try {
            previewDiv.innerHTML = marked.parse(markdownText, { breaks: true, gfm: true, renderer: renderer });
        } catch (error) {
            console.error("Error parsing Markdown:", error);
            previewDiv.innerHTML = `<p style="color: red;">Error rendering preview. Check console for details.</p>`;
        }
    }
    
    /**
     * Debounce-funktion.
     * @param {Function} func - Funktionen att anropa.
     * @param {number} delay - Fördröjning i ms.
     * @returns {Function} - Den debouncade funktionen.
     */
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    // Exponera init-funktionen globalt
    window.MarkdownToolbar.init = init;

})();