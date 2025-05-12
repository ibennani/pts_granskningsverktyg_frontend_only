(function () { // IIFE start
    'use-strict';

    function generate_uuid_v4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function load_css(href) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${href}"]`)) {
                resolve(); 
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = (err) => reject(new Error(`Failed to load CSS: ${href}`));
            document.head.appendChild(link);
        });
    }

    function format_iso_to_local_datetime(iso_string) {
        if (!iso_string) return '';
        try {
            const date = new Date(iso_string);
            if (isNaN(date.getTime())) { return 'Ogiltigt datum'; }
            return date.toLocaleString('sv-SE', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } catch (e) { console.error("Error formatting date:", iso_string, e); return 'Formateringsfel'; }
    }

    function get_current_iso_datetime_utc() {
        return new Date().toISOString();
    }

    function escape_html(unsafe_string) {
        if (typeof unsafe_string !== 'string') {
            return unsafe_string; // Returnera direkt om det inte är en sträng
        }
        return unsafe_string
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    

    function create_element(tag_name, options = {}) {
        const element = document.createElement(tag_name);
        if (options.class_name) {
            if (Array.isArray(options.class_name)) {
                element.classList.add(...options.class_name.filter(cn => cn && typeof cn === 'string'));
            } else if (typeof options.class_name === 'string') {
                options.class_name.split(' ').forEach(className => {
                    if (className) element.classList.add(className);
                });
            }
        }
        if (options.id) element.id = options.id;
        if (options.hasOwnProperty('value')) {
            if (['option', 'input', 'textarea', 'select'].includes(tag_name.toLowerCase())) {
                element.value = options.value;
                if (tag_name.toLowerCase() === 'option') { element.setAttribute('value', options.value); }
            } else { element.setAttribute('value', options.value); }
        }
        if (options.text_content) element.textContent = options.text_content;
        if (options.html_content) element.innerHTML = options.html_content;
        if (options.attributes) {
            for (const attr in options.attributes) {
                if (attr.toLowerCase() === 'value' && options.hasOwnProperty('value')) continue;
                element.setAttribute(attr, options.attributes[attr]);
            }
        }
        if (options.event_listeners) {
            for (const event_type in options.event_listeners) {
                element.addEventListener(event_type, options.event_listeners[event_type]);
            }
        }
        if (options.children) {
            options.children.forEach(child => { if (child) element.appendChild(child); });
        }
        return element;
    }

    // ========================================================================
    // KLISTRA IN DIN FULLSTÄNDIGA get_icon_svg FUNKTION HÄR!
    // Se till att den har alla case-satser och ett default-fall.
    // Exempelstruktur:
    function get_icon_svg(icon_name, colors = [], size = 24) {
        const fill = colors[0] || 'currentColor';
        let svg_path = '';
        switch (icon_name) {
            case 'upload': svg_path = `<path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>`; break;
            case 'start_new': svg_path = `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>`; break;
            case 'load_existing': svg_path = `<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>`; break;
            case 'add': svg_path = `<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>`; break;
            case 'save': svg_path = `<path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>`; break;
            case 'list': svg_path = `<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-10V7h14v2H7z"/>`; break;
            case 'edit': svg_path = `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>`; break;
            case 'delete': svg_path = `<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>`; break;
            case 'arrow_back': svg_path = `<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>`; break;
            case 'arrow_forward': svg_path = `<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>`; break;
            case 'check_circle_green_yellow': /* Din komplexa ikon */ return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" viewBox="0 -960 960 960" width="${size}" aria-hidden="true"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" fill="${colors[0]||'#28a745'}"/><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z" fill="${colors[1]||'#ffc107'}"/></svg>`;
            case 'visit_url': svg_path = `<path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>`; break; // Material Open In New
            case 'audit_sample': svg_path = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-2 11h-2v2H8v-2H6v-2h2V9h2v2h2v2zm4-7V3.5L19.5 7H16z"/>`; break; // Material Note (som placeholder)
            case 'dark_mode': svg_path = `<path d="M12 3a9 9 0 0 0 0 18 9 9 0 0 0 0-18zm0 16.5A7.5 7.5 0 1 1 12 4.5a7.5 7.5 0 0 1 0 15z"/> <path d="M12 5.25A6.75 6.75 0 0 0 12 18.75V5.25z"/>`; break; // Bättre måne
            case 'light_mode': svg_path = `<path d="M12 7a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 12 7zM12 13.75a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75zM17.628 8.372a.75.75 0 0 1 1.06 0l1.768 1.768a.75.75 0 1 1-1.06 1.06l-1.768-1.768a.75.75 0 0 1 0-1.06zM5.372 15.628a.75.75 0 0 1 1.06 0l1.768 1.768a.75.75 0 0 1-1.06 1.06L5.372 16.688a.75.75 0 0 1 0-1.06zM7 12a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 7 12zm8.25.75a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 0 1.5h-2.5zM15.628 5.372a.75.75 0 0 1 0 1.06L13.86 8.199a.75.75 0 0 1-1.06-1.06l1.768-1.768a.75.75 0 0 1 1.06 0zm-9.196 9.196a.75.75 0 0 1 0 1.06L4.664 17.4a.75.75 0 1 1-1.06-1.06l1.768-1.768a.75.75 0 0 1 1.06 0zM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18.5a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17z"/>`; break; // Bättre sol
            // ... (lägg till fler case för andra ikoner som 'lock_audit', 'unlock_audit', 'export' etc.)
            default:
                console.warn(`[Helpers.get_icon_svg] Ikonnamn "${icon_name}" ej funnet. Returnerar fallback-ikon (cirkel).`);
                svg_path = `<circle cx="12" cy="12" r="10" stroke="${fill}" stroke-width="1.5" fill="none" />`; 
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" viewBox="0 0 24 24" width="${size}" fill="${fill}" aria-hidden="true">${svg_path}</svg>`;
    }
    // ========================================================================

    // ========================================================================
    // KLISTRA IN DIN FULLSTÄNDIGA add_protocol_if_missing FUNKTION HÄR!
    // Exempelstruktur:
    function add_protocol_if_missing(url_string) {
        if (!url_string || typeof url_string !== 'string') {
            return '';
        }
        if (!/^(?:f|ht)tps?:\/\//i.test(url_string)) { // Lade till i för case-insensitive
            return "https://" + url_string;
        }
        return url_string;
    }
    // ========================================================================


    const public_api = {
        generate_uuid_v4,
        load_css,
        format_iso_to_local_datetime,
        get_current_iso_datetime_utc,
        escape_html,
        create_element,
        get_icon_svg, // Viktigt att denna är med
        add_protocol_if_missing // Viktigt att denna är med
    };

    window.Helpers = public_api;

    console.log("[helpers.js] IIFE executed. typeof window.Helpers:", typeof window.Helpers);
    if (typeof window.Helpers === 'object' && window.Helpers !== null) {
        console.log("[helpers.js] window.Helpers keys:", Object.keys(window.Helpers));
    }
})();