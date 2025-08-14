// js/features/markdown_toolbar.js

(function () { // IIFE för att undvika globala konflikter
    'use-strict';

    // Definiera en global placeholder om den inte redan finns
    window.MarkdownToolbar = window.MarkdownToolbar || {};

    const CSS_PATH = 'css/features/markdown_toolbar.css';
    const DEBOUNCE_DELAY_MS = 250;
    let initialized = false;
    let observer = null;
    
    // Använder en Map för att hålla reda på varje textrutas unika tillstånd (t.ex. om förhandsgranskning är synlig)
    const instanceMap = new Map();

    /**
     * Huvudfunktion för att initiera modulen.
     * Denna funktion ska anropas en gång från main.js.
     * Den hittar alla befintliga textrutor och startar en MutationObserver
     * för att hitta textrutor som läggs till dynamiskt i DOM.
     */
    function init() {
        if (initialized) {
            console.warn("MarkdownToolbar is already initialized.");
            return;
        }

        // Ladda den tillhörande CSS-filen dynamiskt med hjälp av befintlig hjälpfunktion
        if (window.Helpers && window.Helpers.load_css) {
            window.Helpers.load_css(CSS_PATH).catch(err => console.error(err));
        }

        // Bearbeta alla textrutor som redan finns på sidan vid initiering
        document.querySelectorAll('textarea').forEach(processTextarea);

        // Skapa och starta en MutationObserver för att upptäcka nya textrutor som läggs till i DOM
        observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Om noden själv är en textarea
                            if (node.matches('textarea')) {
                                processTextarea(node);
                            }
                            // Sök efter textrutor inuti den tillagda noden
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
        // Hoppa över om denna textarea redan har en verktygsrad (säkerhetsåtgärd)
        if (textarea.closest('.markdown-editor-wrapper')) {
            return;
        }
        
        // Ge textrutan ett unikt ID om den inte redan har ett. Detta är viktigt för ARIA och för att spåra instanser.
        if (!textarea.id) {
            textarea.id = `md-editor-${window.Helpers.generate_uuid_v4()}`;
        }

        // Hämta det tidigare sparade tillståndet för denna textarea (om det finns) innan vi bygger om DOM.
        const existingInstance = instanceMap.get(textarea.id);
        const wasPreviewVisible = existingInstance ? existingInstance.previewVisible : false;

        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-editor-wrapper';

        const toolbar = createToolbar(textarea, wasPreviewVisible);
        const previewDiv = document.createElement('div');
        previewDiv.className = 'md-preview';
        
        // Sätt initial synlighet baserat på det sparade tillståndet
        previewDiv.style.display = wasPreviewVisible ? 'block' : 'none';

        // Flytta textrutan in i wrappern och lägg till de nya elementen
        textarea.parentNode.insertBefore(wrapper, textarea);
        wrapper.appendChild(toolbar);
        wrapper.appendChild(textarea);
        wrapper.appendChild(previewDiv);

        // Spara (eller uppdatera) instansinformationen i vår Map, med det bevarade tillståndet
        instanceMap.set(textarea.id, {
            previewVisible: wasPreviewVisible,
            previewDiv: previewDiv
        });

        // Uppdatera förhandsgranskningen direkt om den var synlig
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
            { type: 'spacer' }, // Flexibel separator för att trycka nästa knapp till höger
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
                // Sätt initialt ARIA-tillstånd korrekt
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
                    e.preventDefault(); // Förhindra eventuellt formulär-submit
                    applyFormat(textarea, btnConfig.format);
                });
            }

            toolbar.appendChild(button);
        });

        return toolbar;
    }

    /**
     * Applicerar Markdown-formatering på den markerade texten i en textruta.
     * @param {HTMLTextAreaElement} textarea - Mål-textrutan.
     * @param {string} format - Vilken formatering som ska appliceras ('bold', 'italic', etc.).
     */
    function applyFormat(textarea, format) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let replacement = selectedText;

        const linePrefixFormats = {
            'heading': '## ',
            'ul': '- ',
        };
        
        if (linePrefixFormats[format] || format === 'ol') {
            // Logik för listor och rubriker (rad-för-rad)
            const lines = selectedText.split('\n');
            let counter = 1;
            const formattedLines = lines.map(line => {
                if (line.trim() === '') return line;
                if (format === 'ol') {
                    return `${counter++}. ${line}`;
                }
                return linePrefixFormats[format] + line;
            });
            replacement = formattedLines.join('\n');
        } else {
            // Logik för att omsluta text (bold, italic, etc.)
            const leadingSpaceMatch = selectedText.match(/^\s*/);
            const trailingSpaceMatch = selectedText.match(/\s*$/);
            
            const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
            const trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : '';
            
            const trimmedText = selectedText.trim();

            // Om markeringen bara består av mellanslag, gör ingenting.
            if (trimmedText === '') {
                textarea.focus();
                textarea.setSelectionRange(start, end);
                return; // Avsluta funktionen
            }

            const wrappers = {
                'bold': '**',
                'italic': '*',
                'code': '`',
                'link': '[',
            };
            const wrapper = wrappers[format];

            const formattedText = `${wrapper}${trimmedText}${wrapper === '[' ? '](url)' : wrapper}`;
            replacement = `${leadingSpace}${formattedText}${trailingSpace}`;
        }
        
        textarea.setRangeText(replacement, start, end, 'select');
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    // *** UPPDATERAD FUNKTION ***
    /**
     * Uppdaterar förhandsgranskningens innehåll genom att konvertera Markdown till HTML.
     * @param {HTMLTextAreaElement} textarea - Käll-textrutan.
     * @param {HTMLElement} previewDiv - Mål-diven för förhandsgranskningen.
     */
    function updatePreview(textarea, previewDiv) {
        if (typeof marked === 'undefined') {
            previewDiv.innerHTML = '<p style="color: red;">Error: marked.js library not loaded.</p>';
            return;
        }

        let markdownText = textarea.value;

        // Förbehandling: Hitta slutet på listor och lägg till en extra nyrad om det behövs.
        const listEndRegex = /(^(\s*(\*|\-|\+)\s|[0-9]+\.\s).*\n)(?!\s*(\*|\-|\+)\s|[0-9]+\.\s|\s*$)/gm;
        markdownText = markdownText.replace(listEndRegex, '$1\n');
        
        // Skapa en anpassad renderer för att hantera länkar
        const renderer = new marked.Renderer();
        // Spara en referens till den ursprungliga länk-funktionen
        const originalLinkRenderer = renderer.link.bind(renderer);
        // Skriv över länk-funktionen med vår anpassade version
        renderer.link = (href, title, text) => {
            // Anropa den ursprungliga funktionen för att få standard-HTML
            const link = originalLinkRenderer(href, title, text);
            // Modifiera den för att lägga till säkra attribut
            return link.replace('<a', '<a target="_blank" rel="noopener noreferrer"');
        };

        try {
            // Konvertera och rendera med de nya GFM-inställningarna
            previewDiv.innerHTML = marked.parse(markdownText, {
                breaks: true,
                gfm: true,
                renderer: renderer
            });
        } catch (error) {
            console.error("Error parsing Markdown:", error);
            previewDiv.innerHTML = `<p style="color: red;">Error rendering preview. Check console for details.</p>`;
        }
    }
    
    /**
     * En klassisk debounce-funktion.
     * @param {Function} func - Funktionen som ska anropas efter fördröjningen.
     * @param {number} delay - Fördröjning i millisekunder.
     * @returns {Function} - Den "debouncade" funktionen.
     */
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    // Exponera init-funktionen globalt så att main.js kan anropa den
    window.MarkdownToolbar.init = init;

})();