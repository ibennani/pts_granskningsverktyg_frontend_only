(function () { // Start på IIFE
    'use-strict';

    const CURRENT_AUDIT_KEY = 'current_audit';
    const APP_SAVE_FILE_VERSION = "1.1";

    let current_audit_object = null;

    function get_current_audit_from_session() {
        if (current_audit_object) {
            return current_audit_object;
        }
        const stored_audit = sessionStorage.getItem(CURRENT_AUDIT_KEY);
        if (stored_audit) {
            try {
                current_audit_object = JSON.parse(stored_audit);
                return current_audit_object;
            } catch (e) {
                console.error("Error parsing current_audit from sessionStorage:", e);
                sessionStorage.removeItem(CURRENT_AUDIT_KEY);
                current_audit_object = null; // Viktigt att nollställa här
                if (window.NotificationComponent) { // Kolla om NotificationComponent är laddad
                    NotificationComponent.show_notification('Fel vid läsning av sparad session. Tidigare data kan vara förlorad.', 'error', 7000);
                }
                return null;
            }
        }
        return null;
    }

    function save_current_audit_to_session() {
        if (current_audit_object) {
            try {
                sessionStorage.setItem(CURRENT_AUDIT_KEY, JSON.stringify(current_audit_object));
            } catch (e) {
                console.error("Error stringifying or saving current_audit to sessionStorage:", e);
                if (window.NotificationComponent) {
                    NotificationComponent.show_notification(
                        'Kritiskt fel: Kunde inte spara granskningsdata till sessionen. Data kan gå förlorad vid omladdning.',
                        'error',
                        10000
                    );
                }
            }
        } else {
            sessionStorage.removeItem(CURRENT_AUDIT_KEY);
        }
    }
    
    function clear_current_audit_from_session() {
        current_audit_object = null;
        sessionStorage.removeItem(CURRENT_AUDIT_KEY);
    }

    function set_current_audit_object(audit_data) {
        current_audit_object = audit_data;
        save_current_audit_to_session();
    }

    function get_current_audit_object_internal() { // Byt namn för att undvika konflikt med exporten
        return get_current_audit_from_session();
    }

    function init_new_audit_object() {
        const new_audit = {
            saveFileVersion: APP_SAVE_FILE_VERSION,
            ruleFileContent: null,
            auditMetadata: {
                caseNumber: '',
                actorName: '',
                actorLink: '',
                auditorName: '',
                internalComment: ''
            },
            auditStatus: 'not_started',
            startTime: null,
            endTime: null,
            samples: [],
        };
        set_current_audit_object(new_audit);
        return new_audit;
    }

    function load_audit_from_file_data(file_content_object) {
        if (typeof file_content_object !== 'object' || file_content_object === null) {
            console.error("Invalid data type for loading audit from file.");
            return false;
        }
        if (!file_content_object.saveFileVersion || !file_content_object.hasOwnProperty('ruleFileContent') || !file_content_object.hasOwnProperty('auditMetadata')) {
            console.error("Loaded audit data is missing essential properties.");
            return false;
        }
        // Ytterligare validering av `saveFileVersion` kan ske här om det skiljer sig mycket mellan versioner
        if (file_content_object.saveFileVersion > APP_SAVE_FILE_VERSION) {
            console.warn(`Sparfilens version (${file_content_object.saveFileVersion}) är nyare än applikationens version (${APP_SAVE_FILE_VERSION}). Full kompatibilitet kan inte garanteras.`);
            if (window.NotificationComponent) {
                 NotificationComponent.show_notification(`Varning: Sparfilen är från en nyare version av verktyget. (${file_content_object.saveFileVersion} vs ${APP_SAVE_FILE_VERSION}).`, 'warning', 8000);
            }
        }


        set_current_audit_object(file_content_object);
        return true;
    }

    // Initialize on load to populate current_audit_object from sessionStorage if it exists
    get_current_audit_from_session();

    const public_api = {
        getCurrentAudit: get_current_audit_object_internal, // Använd det interna namnet
        setCurrentAudit: set_current_audit_object,
        saveCurrentAudit: save_current_audit_to_session,
        clearCurrentAudit: clear_current_audit_from_session,
        initNewAudit: init_new_audit_object,
        loadAuditFromFileData: load_audit_from_file_data,
        getAppSaveFileVersion: () => APP_SAVE_FILE_VERSION
    };

    // Expose to global scope
    window.State = public_api;

})(); // Slut på IIFE