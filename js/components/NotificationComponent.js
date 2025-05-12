(function () { // IIFE start
    'use-strict';

    // CSS-filen behövs fortfarande för styling av själva meddelandet (färger, border etc.)
    const CSS_PATH = 'css/components/notification_component.css';
    const GLOBAL_MESSAGE_CONTAINER_ID = 'global-message-area'; // Nytt ID

    let global_message_element = null;
    const { t } = Translation; // Förutsätter att Translation är tillgängligt

    async function init() {
        try {
            await Helpers.load_css(CSS_PATH);
        } catch (error) {
            console.error("Failed to load CSS for NotificationComponent:", error);
        }

        // Skapa containern om den inte finns. Den kommer att läggas till dynamiskt av komponenter.
        // Eller så kan main.js skapa en placeholder i #app-container
        global_message_element = document.getElementById(GLOBAL_MESSAGE_CONTAINER_ID);
        if (!global_message_element) {
            global_message_element = Helpers.create_element('div', {
                id: GLOBAL_MESSAGE_CONTAINER_ID,
                attributes: {
                    'aria-live': 'polite', // För skärmläsare
                    hidden: 'true' // Dold från början
                }
            });
            // Elementet kommer att infogas av vyn som vill använda det, eller av main.js.
            // Vi skapar det bara här så det är redo.
        }
        return Promise.resolve(); // Behåll async-kompatibilitet
    }

    // Funktion för att visa/uppdatera det globala meddelandet
    // Duration tas bort - meddelandet är persistent tills det rensas eller byts.
    function show_global_message(message, type = 'info') {
        if (!global_message_element) {
            console.error("Global message element not initialized. Call init() first.");
            // Försök initiera igen om det missats, men detta bör inte hända om init_app hanterar det.
            init().then(() => {
                if(global_message_element) _update_global_message_content(message, type);
            });
            return;
        }
        _update_global_message_content(message, type);
    }
    
    function _update_global_message_content(message, type){
        if (!global_message_element) return;

        global_message_element.innerHTML = ''; // Rensa tidigare innehåll (t.ex. gammal stängningsknapp)
        
        if (message && message.trim() !== '') {
            global_message_element.textContent = message;
            // Ta bort gamla typklasser och sätt ny
            global_message_element.className = ''; // Rensa alla klasser först
            global_message_element.classList.add('global-message-content'); // Basklass
            global_message_element.classList.add(`message-${type}`); // Typspecifik klass

            // Lägg till en stängningsknapp om det är ett fel eller varning (eller alltid om så önskas)
            if (type === 'error' || type === 'warning') {
                const close_button = Helpers.create_element('button', {
                    class_name: 'global-message-close-btn',
                    html_content: '&times;',
                    attributes: {
                        'aria-label': t('close'),
                        title: t('close')
                    }
                });
                close_button.addEventListener('click', clear_global_message, { once: true });
                global_message_element.appendChild(close_button);
                global_message_element.setAttribute('role', 'alert'); // För error/warning
            } else {
                global_message_element.removeAttribute('role'); // Ta bort alert-rollen för info/success
            }
            global_message_element.removeAttribute('hidden');
        } else {
            clear_global_message(); // Dölj om meddelandet är tomt
        }
    }

    // Funktion för att rensa/dölja det globala meddelandet
    function clear_global_message() {
        if (global_message_element) {
            global_message_element.textContent = ''; // Rensa text
            global_message_element.setAttribute('hidden', 'true');
            global_message_element.className = 'global-message-content'; // Återställ klasser
            global_message_element.removeAttribute('role');
            // Ta bort eventuell stängningsknapp om den finns dynamiskt tillagd
            const btn = global_message_element.querySelector('.global-message-close-btn');
            if(btn) btn.remove();
        }
    }

    // Ge vyn en referens till det globala meddelandeelementet
    function get_global_message_element_reference() {
        if (!global_message_element) {
            // Detta kan hända om get_global_message_element_reference anropas före init.
            // Vi tvingar en init här för att säkerställa att elementet skapas.
            // console.warn("Global message element was not ready, initializing now for reference.");
            init(); // init är async, men vi returnerar elementet synkront. Det skapas i init.
        }
        return global_message_element;
    }


    const public_api = {
        init,
        show_global_message,
        clear_global_message,
        get_global_message_element_reference // Ny funktion
    };

    window.NotificationComponent = public_api; // Behåll samma globala namn
})(); // IIFE end