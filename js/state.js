(function () { // Start på IIFE
    'use strict';

    const CURRENT_AUDIT_KEY = 'current_audit';
    const APP_SAVE_FILE_VERSION = "1.1";

    let current_audit_object = null;

    function get_t_func() {
        return (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function')
            ? window.Translation.t
            : (key, replacements) => {
                let str = `**${key}**`;
                if (replacements) {
                    for (const rKey in replacements) {
                        str += ` (${rKey}: ${replacements[rKey]})`;
                    }
                }
                return str + " (t not found)";
            };
    }

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
                console.error("State.js: Error parsing current_audit from sessionStorage:", e);
                sessionStorage.removeItem(CURRENT_AUDIT_KEY);
                current_audit_object = null;
                if (window.NotificationComponent && typeof window.NotificationComponent.show_global_message === 'function') {
                    const t = get_t_func();
                    NotificationComponent.show_global_message(t('error_reading_session_data_lost'), 'error', 7000);
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
                console.error("State.js: Error stringifying or saving current_audit to sessionStorage:", e);
                if (window.NotificationComponent && typeof window.NotificationComponent.show_global_message === 'function') {
                    const t = get_t_func();
                    NotificationComponent.show_global_message(
                        t('critical_error_saving_session_data_lost'),
                        'error', 10000
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

    function get_current_audit_object_internal() {
        return get_current_audit_from_session();
    }

    function init_new_audit_object() {
        const new_audit = {
            saveFileVersion: APP_SAVE_FILE_VERSION,
            ruleFileContent: null,
            auditMetadata: {
                caseNumber: '', actorName: '', actorLink: '',
                auditorName: '', internalComment: ''
            },
            auditStatus: 'not_started',
            startTime: null, endTime: null,
            samples: [],
        };
        set_current_audit_object(new_audit);
        return new_audit;
    }

    function load_audit_from_file_data(file_content_object) {
        if (typeof file_content_object !== 'object' || file_content_object === null) {
            console.error("State.js: Invalid data type for loading audit from file.");
            return false;
        }
        if (!file_content_object.saveFileVersion) {
            console.error("State.js: Loaded audit data is missing saveFileVersion.");
            return false;
        }

        if (file_content_object.saveFileVersion > APP_SAVE_FILE_VERSION) {
            console.warn(`State.js: Sparfilens version (${file_content_object.saveFileVersion}) är nyare än applikationens version (${APP_SAVE_FILE_VERSION}).`);
            if (window.NotificationComponent && typeof window.NotificationComponent.show_global_message === 'function') {
                const t = get_t_func();
                NotificationComponent.show_global_message(
                    t('warning_save_file_newer_version', {
                        fileVersionInFile: file_content_object.saveFileVersion,
                        appVersion: APP_SAVE_FILE_VERSION
                    }),
                    'warning', 8000);
            }
        }
        set_current_audit_object(file_content_object);
        return true;
    }

    get_current_audit_from_session();

    const public_api = {
        getCurrentAudit: get_current_audit_object_internal,
        setCurrentAudit: set_current_audit_object,
        saveCurrentAudit: save_current_audit_to_session,
        clearCurrentAudit: clear_current_audit_from_session,
        initNewAudit: init_new_audit_object,
        loadAuditFromFileData: load_audit_from_file_data,
        getAppSaveFileVersion: () => APP_SAVE_FILE_VERSION
    };

    window.State = public_api;

    console.log("[state.js] IIFE executed. typeof window.State:", typeof window.State);
    if (typeof window.State === 'object' && window.State !== null) {
        console.log("[state.js] window.State keys:", Object.keys(window.State));
    }
})();
