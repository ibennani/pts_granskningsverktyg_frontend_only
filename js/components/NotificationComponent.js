(function () { // IIFE start
    'use-strict';

    const CSS_PATH = 'css/components/notification_component.css';
    const GLOBAL_MESSAGE_CONTAINER_ID = 'global-message-area';

    let global_message_element = null;
    // Translation och Helpers kommer att hämtas från window när de behövs inuti funktioner
    // Detta gör komponenten mindre beroende av att de finns exakt när assign_globals körs,
    // men assign_globals i andra komponenter kommer fortfarande att fejla om de inte finns.

    async function init() {
        if (window.Helpers && typeof window.Helpers.load_css === 'function') {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if(!link_tag) await window.Helpers.load_css(CSS_PATH);
            } catch (error) {
                console.error("NotificationComponent: Failed to load CSS:", error);
            }
        } else {
            console.warn("NotificationComponent: Helpers.load_css not available for CSS loading.");
        }

        return Promise.resolve().then(() => { // Defer DOM access
            global_message_element = document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID);
            if (!global_message_element && window.Helpers && typeof window.Helpers.create_element === 'function') {
                // console.warn("NotificationComponent: Global message container not found, creating it.");
                global_message_element = window.Helpers.create_element('div', {
                    id: GLOBAL_MESSAGE_CONTAINER_ID,
                    attributes: { 'aria-live': 'polite', hidden: 'true' }
                });
                // Denna kommer att läggas till av vyn som använder den.
            } else if (!window.Helpers) {
                console.error("NotificationComponent: Helpers module not available to create message container.");
            }
        });
    }

    function _update_global_message_content(message, type){
        if (!global_message_element || !window.Translation || !window.Helpers) {
            console.error("NotificationComponent: Cannot update message, core dependencies missing or element not ready.");
            return;
        }
        const { t } = window.Translation;
        const { create_element } = window.Helpers;

        global_message_element.innerHTML = '';

        if (message && message.trim() !== '') {
            global_message_element.textContent = message;
            global_message_element.className = '';
            global_message_element.classList.add('global-message-content');
            global_message_element.classList.add(`message-${type}`);

            if (type === 'error' || type === 'warning') {
                const close_button = create_element('button', {
                    class_name: 'global-message-close-btn', html_content: '×',
                    attributes: { 'aria-label': t('close'), title: t('close') }
                });
                close_button.addEventListener('click', clear_global_message, { once: true });
                global_message_element.appendChild(close_button);
                global_message_element.setAttribute('role', 'alert');
            } else {
                global_message_element.removeAttribute('role');
            }
            global_message_element.removeAttribute('hidden');
        } else {
            clear_global_message();
        }
    }

    function show_global_message(message, type = 'info') {
        if (!global_message_element) {
            // console.warn("NotificationComponent: Global message element not initialized in show_global_message. Attempting init.");
            init().then(() => { // Försök initiera om den inte redan är det
                if(global_message_element) _update_global_message_content(message, type);
                else console.error("NotificationComponent: Still cannot show message, container not established after re-init.");
            });
            return;
        }
        _update_global_message_content(message, type);
    }

    function clear_global_message() {
        if (global_message_element) {
            global_message_element.textContent = '';
            global_message_element.setAttribute('hidden', 'true');
            global_message_element.className = 'global-message-content';
            global_message_element.removeAttribute('role');
            const btn = global_message_element.querySelector('.global-message-close-btn');
            if(btn) btn.remove();
        }
    }

    function get_global_message_element_reference() {
        if (!global_message_element) {
            // console.warn("NotificationComponent: get_global_message_element_reference called before init fully established the element. Forcing creation if possible.");
            // Detta init-anrop är mest för att säkerställa att elementet skapas om det inte finns,
            // även om init i main.js bör ha kört.
            if (window.Helpers && typeof window.Helpers.create_element === 'function' && !document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID)) {
                 global_message_element = window.Helpers.create_element('div', {
                    id: GLOBAL_MESSAGE_CONTAINER_ID,
                    attributes: { 'aria-live': 'polite', hidden: 'true' }
                });
            } else if (!document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID)) {
                // Fallback om Helpers inte är redo, men detta bör inte hända.
                global_message_element = document.createElement('div');
                global_message_element.id = GLOBAL_MESSAGE_CONTAINER_ID;
                global_message_element.setAttribute('aria-live', 'polite');
                global_message_element.hidden = true;
            } else {
                 global_message_element = document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID);
            }
        }
        return global_message_element;
    }

    const public_api = {
        init,
        show_global_message,
        clear_global_message,
        get_global_message_element_reference
    };

    window.NotificationComponent = public_api;

    console.log("[NotificationComponent.js] IIFE executed. typeof window.NotificationComponent:", typeof window.NotificationComponent);
    if (typeof window.NotificationComponent === 'object' && window.NotificationComponent !== null) {
        console.log("[NotificationComponent.js] window.NotificationComponent keys:", Object.keys(window.NotificationComponent));
    }
})();