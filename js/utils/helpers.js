(function () { // IIFE start
    'use-strict';

    // ... (generate_uuid_v4, load_css, etc. som tidigare) ...
    function generate_uuid_v4(){ /*...*/ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
    function load_css(href){ return new Promise((resolve, reject) => { if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; } const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; link.onload = () => resolve(); link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`)); document.head.appendChild(link); }); }
    function format_iso_to_local_datetime(iso_string){ if (!iso_string) return ''; try { const date = new Date(iso_string); if (isNaN(date.getTime())) { return 'Ogiltigt datum'; } return date.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { console.error("Error formatting date:", iso_string, e); return 'Formateringsfel'; } }
    function get_current_iso_datetime_utc(){ return new Date().toISOString(); }
    function escape_html(unsafe_string){ if (typeof unsafe_string !== 'string') { return unsafe_string; } return unsafe_string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }


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
        
        // Hantera value specifikt och robust, särskilt för option
        if (options.hasOwnProperty('value')) {
            if (tag_name.toLowerCase() === 'option' || tag_name.toLowerCase() === 'input' || tag_name.toLowerCase() === 'textarea' || tag_name.toLowerCase() === 'select') {
                element.value = options.value;
                // För <option>, sätt även value-attributet explicit för maximal kompatibilitet
                if (tag_name.toLowerCase() === 'option') {
                    element.setAttribute('value', options.value);
                }
                // console.log(`[Helpers] Set value="${options.value}" on <${tag_name}> (id: ${options.id || 'N/A'})`);
            } else {
                // För andra element, om 'value' är meningsfullt som ett attribut
                element.setAttribute('value', options.value);
            }
        }

        // text_content sätts EFTER value för <option> för att undvika att value skrivs över av textContent i vissa webbläsare
        if (options.text_content) element.textContent = options.text_content;
        if (options.html_content) element.innerHTML = options.html_content;
        
        if (options.attributes) {
            for (const attr in options.attributes) {
                // Undvik att sätta 'value' igen om den redan hanterats, såvida den inte finns i attributes
                if (attr.toLowerCase() === 'value' && options.hasOwnProperty('value')) continue;
                element.setAttribute(attr, options.attributes[attr]);
            }
        }

        if (options.event_listeners) { /* ... som tidigare ... */ }
        if (options.children) { /* ... som tidigare ... */ }
        return element;
    }

    // ... (get_icon_svg, add_protocol_if_missing som tidigare) ...
    function get_icon_svg(icon_name, colors = [], size = 24){ let fill = colors[0]||'currentColor'; let svg_path=''; switch(icon_name){case 'upload':svg_path=`<path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>`;break; case 'start_new':svg_path=`<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>`;break; case 'load_existing':svg_path=`<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>`;break; case 'settings':svg_path=`<path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>`;break; case 'add':svg_path=`<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>`;break; case 'edit':svg_path=`<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>`;break; case 'delete':svg_path=`<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>`;break; case 'save':svg_path=`<path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>`;break; case 'export':svg_path=`<path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>`;break; case 'check_circle_green_yellow': return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" viewBox="0 -960 960 960" width="${size}" aria-hidden="true"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" fill="${colors[0]||'#28a745'}"/><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z" fill="${colors[1]||'#ffc107'}"/></svg>`; case 'check':svg_path=`<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>`;break; case 'error_triangle_red_yellow': return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" viewBox="0 -960 960 960" width="${size}" aria-hidden="true"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z" fill="${colors[1]||'#ffc107'}"/><path d="m40 816 440-760 440 760H40Zm80-80h720L480 220 120 736Zm360-256Z" fill="${colors[0]||'#dc3545'}"/></svg>`; case 'warning':svg_path=`<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>`;break; case 'info':svg_path=`<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>`;break; case 'visibility':svg_path=`<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>`;break; case 'visibility_off':svg_path=`<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75C21.27 7.61 17 4.5 12 4.5c-1.77 0-3.38.49-4.77 1.36l2.07 2.07c.57-.23 1.18-.36 1.83-.36zm-2.01 7.99l2.08 2.08c-.27.03-.54.05-.82.05-2.76 0-5-2.24-5-5 0-.28.02-.55.05-.82l2.08 2.08c.01.25.01.5.01.74zm-2.25-2.25L9.82 10.6C9.1 10.83 8.43 11.33 8.03 12c1.73 4.39 6 7.5 11 7.5 1.55 0 2.98-.5 4.25-1.32L19.3 16.7C17.89 17.57 16.23 18 14.5 18c-2.76 0-5-2.24-5-5 0-.66.13-1.27.36-1.83zm-5.33.83L3.42 4.62 2 6.04l3.17 3.17C3.88 10.04 2.73 11.22 2 12c1.73 4.39 6 7.5 11 7.5 1.56 0 3-.49 4.29-1.33l3.58 3.58 1.41-1.41L4.42 6.58z"/>`;break; case 'dark_mode': svg_path=`<path d="M9.37 5.51A7.35 7.35 0 0 0 9.37 5.51zM12 2c-1.1 0-2.15.25-3.12.72a9.931 9.931 0 0 1 5.4 11.06A9.933 9.933 0 0 1 12.01 22C6.47 22 2 17.52 2 12S6.47 2 12 2z"/>`;break; case 'light_mode': svg_path=`<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5 5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.64 6.36c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.06 1.06c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L5.64 6.36zm12.72 12.72c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l1.06 1.06c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.06-1.06zM5.64 17.64l-1.06-1.06c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0l1.06 1.06c.39.39.39 1.02 0 1.41s-1.02.39-1.41 0zm12.72-12.72l-1.06-1.06c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0l1.06 1.06c.39.39.39 1.02 0 1.41s-1.02.39-1.41 0z"/>`;break; case 'arrow_back':svg_path=`<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>`;break; case 'arrow_forward':svg_path=`<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>`;break; case 'close':svg_path=`<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`;break; case 'menu':svg_path=`<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>`;break; case 'download':svg_path=`<path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/>`;break; case 'list': svg_path = `<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-10V7h14v2H7z"/>`; break; case 'lock_audit': svg_path = `<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>`; break; case 'unlock_audit': svg_path = `<path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>`; break; default:svg_path=`<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>`;}
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${size}" viewBox="0 0 24 24" width="${size}" fill="${fill}" aria-hidden="true">${svg_path}</svg>`;
    }
    function add_protocol_if_missing(url_string){ if(!url_string||typeof url_string!=='string'){return '';} if(!/^(?:f|ht)tps?:\/\//.test(url_string)){return "https://"+url_string;} return url_string; }

    const public_api = {
        generate_uuid_v4, load_css, format_iso_to_local_datetime, get_current_iso_datetime_utc,
        escape_html, create_element, get_icon_svg, add_protocol_if_missing
    };
    window.Helpers = public_api;
})();