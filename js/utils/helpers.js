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
            .replace(/'/g, "&#039;");
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
        const fill = colors[0] || 'currentColor';
        let svg_path = '';

        switch (icon_name) {
            case 'arrow_back': svg_path = `<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>`; break;
            default:
                console.warn(`[Helpers.get_icon_svg] Unknown icon "${icon_name}".`);
                svg_path = `<circle cx="12" cy="12" r="10" stroke="${fill}" stroke-width="1.5" fill="none" />`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" width="${size}" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">${svg_path}</svg>`;
    }

    function add_protocol_if_missing(url_string) {
        if (typeof url_string !== 'string') return '';
        return /^(?:f|ht)tps?:\/\//i.test(url_string) ? url_string : `https://${url_string}`;
    }

    window.Helpers = {
        generate_uuid_v4,
        load_css,
        format_iso_to_local_datetime,
        get_current_iso_datetime_utc,
        escape_html,
        create_element,
        get_icon_svg,
        add_protocol_if_missing
    };
})();
