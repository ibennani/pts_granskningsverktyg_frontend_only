// js/components/ErrorBoundaryComponent.js

export const ErrorBoundaryComponent = (function () {
    'use strict';

    const CSS_PATH = 'css/components/error_boundary_component.css';
    let container_element = null;
    let error_info = null;
    let retry_callback = null;
    let is_initialized = false;

    function assign_globals_once() {
        if (is_initialized) return;
        is_initialized = true;
    }

    function load_css() {
        if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_PATH;
        link.type = 'text/css';
        document.head.appendChild(link);
    }

    function create_error_display(error_data) {
        const t = (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => `**${key}**`;

        const error_container = document.createElement('div');
        error_container.className = 'error-boundary-container';
        error_container.setAttribute('role', 'alert');
        error_container.setAttribute('aria-live', 'polite');

        // Huvudrubrik
        const error_title = document.createElement('h1');
        error_title.className = 'error-boundary-title';
        error_title.textContent = t('error_boundary_title');
        error_container.appendChild(error_title);

        // Användarvänligt felmeddelande
        const user_message = document.createElement('div');
        user_message.className = 'error-boundary-user-message';
        user_message.innerHTML = `
            <p>${t('error_boundary_user_message')}</p>
            <p>${t('error_boundary_suggestions')}</p>
        `;
        error_container.appendChild(user_message);

        // Teknisk information (kollapsbar)
        const technical_section = document.createElement('details');
        technical_section.className = 'error-boundary-technical';
        
        const technical_summary = document.createElement('summary');
        technical_summary.textContent = t('error_boundary_technical_details');
        technical_section.appendChild(technical_summary);

        const technical_content = document.createElement('div');
        technical_content.className = 'error-boundary-technical-content';
        
        // Felmeddelande
        const error_message = document.createElement('p');
        const escape_html = (typeof window.Helpers !== 'undefined' && typeof window.Helpers.escape_html === 'function')
            ? window.Helpers.escape_html
            : (str) => str;
        error_message.innerHTML = `<strong>${t('error_boundary_error_message')}:</strong> ${escape_html(error_data.message || t('error_boundary_unknown_error'))}`;
        technical_content.appendChild(error_message);

        // Stack trace (om tillgänglig)
        if (error_data.stack) {
            const stack_trace = document.createElement('details');
            const stack_summary = document.createElement('summary');
            stack_summary.textContent = t('error_boundary_stack_trace');
            stack_trace.appendChild(stack_summary);
            
            const stack_pre = document.createElement('pre');
            stack_pre.className = 'error-boundary-stack';
            stack_pre.textContent = error_data.stack;
            stack_trace.appendChild(stack_pre);
            
            technical_content.appendChild(stack_trace);
        }

        // Komponent information
        if (error_data.component) {
            const component_info = document.createElement('p');
            component_info.innerHTML = `<strong>${t('error_boundary_component')}:</strong> ${escape_html(error_data.component)}`;
            technical_content.appendChild(component_info);
        }

        // Timestamp
        const timestamp = document.createElement('p');
        timestamp.innerHTML = `<strong>${t('error_boundary_timestamp')}:</strong> ${new Date().toLocaleString()}`;
        technical_content.appendChild(timestamp);

        technical_section.appendChild(technical_content);
        error_container.appendChild(technical_section);

        // Åtgärdsknappar
        const actions_container = document.createElement('div');
        actions_container.className = 'error-boundary-actions';

        // Försök igen-knapp (om retry callback finns)
        if (retry_callback && typeof retry_callback === 'function') {
            const retry_button = document.createElement('button');
            retry_button.className = 'error-boundary-retry-button';
            retry_button.textContent = t('error_boundary_retry');
            retry_button.addEventListener('click', () => {
                try {
                    retry_callback();
                } catch (retry_error) {
                    console.error('[ErrorBoundaryComponent] Retry failed:', retry_error);
                    show_error({
                        message: t('error_boundary_retry_failed'),
                        stack: retry_error.stack,
                        component: error_data.component
                    });
                }
            });
            actions_container.appendChild(retry_button);
        }

        // Ladda om sidan-knapp
        const reload_button = document.createElement('button');
        reload_button.className = 'error-boundary-reload-button';
        reload_button.textContent = t('error_boundary_reload_page');
        reload_button.addEventListener('click', () => {
            window.location.reload();
        });
        actions_container.appendChild(reload_button);

        // Gå tillbaka-knapp
        const back_button = document.createElement('button');
        back_button.className = 'error-boundary-back-button';
        back_button.textContent = t('error_boundary_go_back');
        back_button.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.hash = '#upload';
            }
        });
        actions_container.appendChild(back_button);

        error_container.appendChild(actions_container);

        return error_container;
    }

    function log_error(error_data) {
        console.group('[ErrorBoundaryComponent] Component Error');
        console.error('Error:', error_data.message);
        console.error('Component:', error_data.component);
        console.error('Stack:', error_data.stack);
        console.error('Timestamp:', new Date().toISOString());
        console.groupEnd();

        // Skicka fel till externa tjänster om tillgängligt
        if (typeof window.NotificationComponent !== 'undefined' && window.NotificationComponent.show_global_message) {
            const t = (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
                ? window.Translation.t
                : (key) => key;
            
            window.NotificationComponent.show_global_message(
                t('error_boundary_notification_message'),
                'error'
            );
        }
    }

    function show_error(error_data) {
        if (!container_element) {
            console.error('[ErrorBoundaryComponent] Container not initialized');
            return;
        }

        assign_globals_once();
        load_css();
        log_error(error_data);

        error_info = error_data;
        container_element.innerHTML = '';
        container_element.appendChild(create_error_display(error_data));
    }

    function clear_error() {
        if (container_element) {
            container_element.innerHTML = '';
        }
        error_info = null;
    }

    function is_error_displayed() {
        return error_info !== null;
    }

    function get_error_info() {
        return error_info;
    }

    async function init(container, retry_cb = null) {
        if (!container) {
            throw new Error('[ErrorBoundaryComponent] Container element is required');
        }

        container_element = container;
        retry_callback = retry_cb;
        assign_globals_once();
        load_css();

        // Rensa eventuella tidigare fel
        clear_error();
    }

    function destroy() {
        if (container_element) {
            container_element.innerHTML = '';
        }
        container_element = null;
        error_info = null;
        retry_callback = null;
        is_initialized = false;
    }

    // Exponera metoder för extern användning
    return {
        init,
        destroy,
        show_error,
        clear_error,
        is_error_displayed,
        get_error_info
    };
})();
