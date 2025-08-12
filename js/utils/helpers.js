// js/utils/helpers.js
(function () { // IIFE start
    'use strict';

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
            link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
            document.head.appendChild(link);
        });
    }

    function format_iso_to_local_datetime(iso_string) {
        if (!iso_string) return '';
        try {
            const date = new Date(iso_string);
            const t_func = (typeof window.Translation?.t === 'function')
                ? window.Translation.t
                : (key) => `**${key}** (t not found)`;

            if (isNaN(date.getTime())) return t_func('invalid_date_format');

            return date.toLocaleString('sv-SE', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } catch (e) {
            console.error("Error formatting date:", iso_string, e);
            const t_func = (typeof window.Translation?.t === 'function')
                ? window.Translation.t
                : (key) => `**${key}** (t not found)`;

            return t_func('date_formatting_error');
        }
    }

    function get_current_iso_datetime_utc() {
        return new Date().toISOString();
    }

    function escape_html(unsafe_string) {
        if (typeof unsafe_string !== 'string') {
            if (unsafe_string !== null && unsafe_string !== undefined) {
                console.warn(`[Helpers.escape_html] Expected string but got ${typeof unsafe_string}:`, unsafe_string);
            }
            return unsafe_string;
        }
        return unsafe_string
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function create_element(tag_name, options = {}) {
        const element = document.createElement(tag_name);
        if (options.class_name) {
            const classes = Array.isArray(options.class_name) ? options.class_name : options.class_name.split(' ');
            classes.filter(Boolean).forEach(c => element.classList.add(c));
        }
        if (options.id) element.id = options.id;
        if (options.hasOwnProperty('value')) {
            const tag = tag_name.toLowerCase();
            if (['input', 'textarea', 'select', 'option'].includes(tag)) {
                element.value = options.value;
                if (tag === 'option') element.setAttribute('value', options.value);
            } else {
                element.setAttribute('value', options.value);
            }
        }
        if (options.text_content) element.textContent = options.text_content;
        if (options.html_content) element.innerHTML = options.html_content;

        if (options.attributes) {
            for (const attr in options.attributes) {
                if (attr === 'value' && options.hasOwnProperty('value')) continue;
                element.setAttribute(attr, options.attributes[attr]);
            }
        }

        if (options.event_listeners) {
            for (const type in options.event_listeners) {
                element.addEventListener(type, options.event_listeners[type]);
            }
        }

        if (options.children) {
            options.children.forEach(child => { if (child) element.appendChild(child); });
        }

        return element;
    }

    function get_icon_svg(icon_name, colors = [], size = 24) {
        const fill_color = colors[0] || 'currentColor';
        const second_color = colors[1] || fill_color; 
        let svg_path = '';

        // Bas-ikoner (Material Icons stil)
        const base_paths = {
            'arrow_back': `<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>`,
            'arrow_forward': `<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>`,
            'arrow_back_ios': `<path d="M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z"/>`,
            'arrow_forward_ios': `<path d="M6.23 20.23L8 22l10-10L8 2l-1.77 1.77L14.46 12z"/>`,
            'arrow_forward_alt': `<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>`,
            'list': `<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>`,
            'add': `<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>`,
            'save': `<path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>`,
            'edit': `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>`,
            'delete': `<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>`,
            'lock_audit': `<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>`,
            'unlock_audit': `<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.71 1.39-3.1 3.1-3.1S13.81 4.29 15 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>`,
            'export': `<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5v-2z"/>`,
            'light_mode': `<path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>`,
            'dark_mode': `<path d="M10 2c-1.82 0-3.53.5-5 1.35C7.99 5.08 10 8.3 10 12s-2.01 6.92-5 8.65C6.47 21.5 8.18 22 10 22c5.52 0 10-4.48 10-10S15.52 2 10 2z"/>`,
            'upload_file': `<path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>`,
            'start_new': `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
            'load_existing': `<path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>`,
            'visit_url': `<path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>`,
            'audit_sample': `<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>`,
            'thumb_up': `<path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>`,
            'thumb_down': `<path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79-.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>`,
            'check_circle_green_yellow': `<path fill="${fill_color}" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
            'check_circle': `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>`,
            'cancel': `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>`,
            'check': `<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>`,
            'close': `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`
        };

        svg_path = base_paths[icon_name];

        if (!svg_path) {
            console.warn(`[Helpers.get_icon_svg] Unknown icon "${icon_name}". Using default placeholder (question mark).`);
            svg_path = `<circle cx="12" cy="12" r="9" stroke-width="1.5" stroke="${fill_color}" fill="none"/><text x="12" y="17" font-size="12" text-anchor="middle" fill="${fill_color}">?</text>`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" width="${size}" viewBox="0 0 24 24" fill="${fill_color}" aria-hidden="true">${svg_path}</svg>`;
    }

    function add_protocol_if_missing(url_string) {
        if (typeof url_string !== 'string') return '';
        return /^(?:f|ht)tps?:\/\//i.test(url_string) ? url_string : `https://${url_string}`;
    }

    function auto_resize_textarea_handler(event) {
        const textarea = event.target;
        // Beräkna höjden på en rad text för att kunna lägga till den extra raden
        const computed_style = window.getComputedStyle(textarea);
        const line_height = parseFloat(computed_style.lineHeight);

        // Nollställ höjden tillfälligt för att kunna mäta den verkliga scrollHeight
        // Detta är tricket för att få den att krympa korrekt också
        textarea.style.height = 'auto';

        // Sätt den nya höjden till innehållets höjd + en extra rad
        const new_height = textarea.scrollHeight + line_height;
        textarea.style.height = `${new_height}px`;
    }

    function init_auto_resize_for_textarea(textarea_element) {
        if (!textarea_element || textarea_element.tagName.toLowerCase() !== 'textarea') return;
        
        // Koppla event listener för framtida ändringar
        textarea_element.addEventListener('input', auto_resize_textarea_handler);
        
        // Trigga en första justering ifall fältet redan har innehåll när det renderas
        // Använder en liten timeout för att säkerställa att elementet är fullt renderat i DOM
        setTimeout(() => {
            const event = new Event('input');
            textarea_element.dispatchEvent(event);
        }, 100);
    }

    window.Helpers = {
        generate_uuid_v4,
        load_css,
        format_iso_to_local_datetime,
        get_current_iso_datetime_utc,
        escape_html,
        create_element,
        get_icon_svg,
        add_protocol_if_missing,
        init_auto_resize_for_textarea
    };
})();