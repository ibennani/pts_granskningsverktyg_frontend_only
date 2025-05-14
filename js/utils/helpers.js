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
            link.onerror = (err) => reject(new Error(`Failed to load CSS: ${href}`));
            document.head.appendChild(link);
        });
    }

    function format_iso_to_local_datetime(iso_string) {
        if (!iso_string) return '';
        try {
            const date = new Date(iso_string);
            const t_func = (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
                ? window.Translation.t
                : (key) => `**${key}** (t not found)`;

            if (isNaN(date.getTime())) {
                return t_func('invalid_date_format');
            }
            return date.toLocaleString('sv-SE', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } catch (e) {
            console.error("Error formatting date:", iso_string, e);
            const t_func = (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
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
            return unsafe_string;
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
            default:
                console.warn(`[Helpers.get_icon_svg] Icon name "${icon_name}" not found. Returning fallback icon (circle).`);
                svg_path = `<circle cx="12" cy="12" r="10" stroke="${fill}" stroke-width="1.5" fill="none" />`;
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" viewBox="0 0 24 24" width="${size}" fill="${fill}" aria-hidden="true">${svg_path}</svg>`;
    }

    function add_protocol_if_missing(url_string) {
        if (!url_string || typeof url_string !== 'string') {
            return '';
        }
        if (!/^(?:f|ht)tps?:\/\//i.test(url_string)) {
            return "https://" + url_string;
        }
        return url_string;
    }

    const public_api = {
        generate_uuid_v4,
        load_css,
        format_iso_to_local_datetime,
        get_current_iso_datetime_utc,
        escape_html,
        create_element,
        get_icon_svg,
        add_protocol_if_missing
    };

    window.Helpers = public_api;

    console.log("[helpers.js] IIFE executed. typeof window.Helpers:", typeof window.Helpers);
    if (typeof window.Helpers === 'object' && window.Helpers !== null) {
        console.log("[helpers.js] window.Helpers keys:", Object.keys(window.Helpers));
    }
})();
