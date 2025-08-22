// js/state.js

const APP_STATE_KEY = 'digitalTillsynAppCentralState';
const APP_STATE_VERSION = '2.0.1'; // Behåll eller uppdatera om strukturen på sparad data ändras signifikant

export const ActionTypes = {
    INITIALIZE_NEW_AUDIT: 'INITIALIZE_NEW_AUDIT',
    LOAD_AUDIT_FROM_FILE: 'LOAD_AUDIT_FROM_FILE',
    UPDATE_METADATA: 'UPDATE_METADATA',
    ADD_SAMPLE: 'ADD_SAMPLE',
    UPDATE_SAMPLE: 'UPDATE_SAMPLE',
    DELETE_SAMPLE: 'DELETE_SAMPLE',
    SET_AUDIT_STATUS: 'SET_AUDIT_STATUS',
    UPDATE_REQUIREMENT_RESULT: 'UPDATE_REQUIREMENT_RESULT',
    SET_RULE_FILE_CONTENT: 'SET_RULE_FILE_CONTENT',
    REPLACE_RULEFILE_AND_RECONCILE: 'REPLACE_RULEFILE_AND_RECONCILE',
    SET_PRECALCULATED_RULE_DATA: 'SET_PRECALCULATED_RULE_DATA',
    UPDATE_CALCULATED_VARDETAL: 'UPDATE_CALCULATED_VARDETAL',
    SET_UI_FILTER_SETTINGS: 'SET_UI_FILTER_SETTINGS' 
};

const initial_state = {
    saveFileVersion: APP_STATE_VERSION,
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
    uiSettings: {
        requirementListFilter: {
            searchText: '',
            sortBy: 'default',
            status: { 
                passed: true, 
                failed: true, 
                partially_audited: true, 
                not_audited: true, 
                updated: true
            }
        }
    },
    auditCalculations: {
        ruleData: {
            weights_map: null,
            rE_total: 0,
            sum_of_all_weights: 0
        },
        currentVardetal: null
    }
};

let internal_state = { ...initial_state }; // Starta med en kopia
let listeners = [];

function get_current_iso_datetime_utc_internal() {
    return new Date().toISOString();
}

function root_reducer(current_state, action) {
    let new_state_slice;

    switch (action.type) {
        case ActionTypes.INITIALIZE_NEW_AUDIT:
            return {
                ...initial_state,
                saveFileVersion: APP_STATE_VERSION,
                ruleFileContent: action.payload.ruleFileContent,
            };

        case ActionTypes.LOAD_AUDIT_FROM_FILE:
            if (action.payload && typeof action.payload === 'object') {
                const loaded_calculations = action.payload.auditCalculations || { ...initial_state.auditCalculations };
                const loaded_ui_settings = action.payload.uiSettings || { ...initial_state.uiSettings };

                let new_loaded_state = {
                    ...action.payload,
                    saveFileVersion: APP_STATE_VERSION,
                    auditCalculations: loaded_calculations,
                    uiSettings: loaded_ui_settings
                };

                if (action.payload.saveFileVersion && action.payload.saveFileVersion !== APP_STATE_VERSION && 
                    !action.payload.saveFileVersion.startsWith(APP_STATE_VERSION.split('.')[0])) {
                    console.warn(`[State.js] LOAD_AUDIT_FROM_FILE: Major version mismatch. File version: ${action.payload.saveFileVersion}, App version: ${APP_STATE_VERSION}. Overwriting with current app state version.`);
                    new_loaded_state.auditCalculations = { ...initial_state.auditCalculations };
                    new_loaded_state.uiSettings = { ...initial_state.uiSettings };
                } else if (action.payload.saveFileVersion && action.payload.saveFileVersion !== APP_STATE_VERSION) {
                     console.warn(`[State.js] LOAD_AUDIT_FROM_FILE: Minor/patch version mismatch. File: ${action.payload.saveFileVersion}, App: ${APP_STATE_VERSION}. Stamping with current app version.`);
                }
                return new_loaded_state;
            }
            console.warn('[State.js] LOAD_AUDIT_FROM_FILE: Invalid payload.', action.payload);
            return current_state;

        case ActionTypes.UPDATE_METADATA:
            return {
                ...current_state,
                auditMetadata: {
                    ...current_state.auditMetadata,
                    ...action.payload
                }
            };

        case ActionTypes.ADD_SAMPLE:
            if (!action.payload || !action.payload.id) {
                console.error('[State.js] ADD_SAMPLE: Payload must be a sample object with an id.');
                return current_state;
            }
            return {
                ...current_state,
                samples: [...current_state.samples, action.payload]
            };

        case ActionTypes.UPDATE_SAMPLE:
            if (!action.payload || !action.payload.sampleId || !action.payload.updatedSampleData) {
                console.error('[State.js] UPDATE_SAMPLE: Invalid payload.');
                return current_state;
            }
            return {
                ...current_state,
                samples: current_state.samples.map(sample =>
                    sample.id === action.payload.sampleId
                        ? { ...sample, ...action.payload.updatedSampleData }
                        : sample
                )
            };

        case ActionTypes.DELETE_SAMPLE:
            if (!action.payload || !action.payload.sampleId) {
                console.error('[State.js] DELETE_SAMPLE: Invalid payload.');
                return current_state;
            }
            return {
                ...current_state,
                samples: current_state.samples.filter(sample => sample.id !== action.payload.sampleId)
            };

        case ActionTypes.SET_AUDIT_STATUS:
            if (!action.payload || !action.payload.status) {
                console.error('[State.js] SET_AUDIT_STATUS: Invalid payload.');
                return current_state;
            }
            new_state_slice = { auditStatus: action.payload.status };
            if (action.payload.status === 'in_progress' && !current_state.startTime) {
                new_state_slice.startTime = get_current_iso_datetime_utc_internal();
                new_state_slice.endTime = null;
            } else if (action.payload.status === 'locked') {
                new_state_slice.endTime = current_state.endTime || get_current_iso_datetime_utc_internal();
            } else if (action.payload.status === 'in_progress' && current_state.auditStatus === 'locked') {
                 new_state_slice.endTime = null;
            }
            return {
                ...current_state,
                ...new_state_slice
            };

        case ActionTypes.UPDATE_REQUIREMENT_RESULT:
            if (!action.payload || !action.payload.sampleId || !action.payload.requirementId || action.payload.newRequirementResult === undefined) {
                console.error('[State.js] UPDATE_REQUIREMENT_RESULT: Invalid payload.', action.payload);
                return current_state;
            }
            const { sampleId, requirementId, newRequirementResult } = action.payload;

            const result_to_save = { ...newRequirementResult };
            delete result_to_save.needsReview;

            return {
                ...current_state,
                samples: current_state.samples.map(sample => {
                    if (sample.id === sampleId) {
                        const updatedRequirementResults = {
                            ...(sample.requirementResults || {}),
                            [requirementId]: result_to_save
                        };
                        return {
                            ...sample,
                            requirementResults: updatedRequirementResults
                        };
                    }
                    return sample;
                })
            };
        
        case ActionTypes.REPLACE_RULEFILE_AND_RECONCILE:
            if (!action.payload || !action.payload.ruleFileContent || !action.payload.samples) {
                console.error('[State.js] REPLACE_RULEFILE_AND_RECONCILE: Invalid payload. Must be a complete new state object.');
                return current_state;
            }
            
            // *** KORRIGERING: Kör om förberäkningen för Värdetalet ***
            const new_precalculated_data = window.VardetalCalculator.precalculate_rule_data(action.payload.ruleFileContent);
            
            return {
                ...action.payload,
                auditCalculations: {
                    ...current_state.auditCalculations, // Behåll eventuellt gammalt Värdetal tills det räknas om
                    ruleData: new_precalculated_data // Spara den nya förberäknade datan
                },
                saveFileVersion: APP_STATE_VERSION
            };

        case ActionTypes.SET_RULE_FILE_CONTENT:
            if (!action.payload || typeof action.payload.ruleFileContent !== 'object') {
                console.error('[State.js] SET_RULE_FILE_CONTENT: Invalid payload. Expected ruleFileContent object.');
                return current_state;
            }
            return {
                ...current_state,
                ruleFileContent: action.payload.ruleFileContent,
                auditCalculations: { ...initial_state.auditCalculations } 
            };
        
        case ActionTypes.SET_UI_FILTER_SETTINGS:
            if (!action.payload || typeof action.payload !== 'object') {
                console.error('[State.js] SET_UI_FILTER_SETTINGS: Invalid payload. Expected an object.');
                return current_state;
            }
            return {
                ...current_state,
                uiSettings: {
                    ...current_state.uiSettings,
                    requirementListFilter: {
                        ...current_state.uiSettings.requirementListFilter,
                        ...action.payload
                    }
                }
            };

        case ActionTypes.SET_PRECALCULATED_RULE_DATA:
            if (!action.payload || typeof action.payload !== 'object' || 
                action.payload.weights_map === undefined || action.payload.rE_total === undefined || action.payload.sum_of_all_weights === undefined) {
                console.error('[State.js] SET_PRECALCULATED_RULE_DATA: Invalid payload. Expected object with weights_map, rE_total, sum_of_all_weights.', action.payload);
                return current_state;
            }
            return {
                ...current_state,
                auditCalculations: {
                    ...current_state.auditCalculations,
                    ruleData: { ...action.payload }
                }
            };

        case ActionTypes.UPDATE_CALCULATED_VARDETAL:
            if (!action.payload || (typeof action.payload.vardetal !== 'number' && action.payload.vardetal !== null)) {
                console.error('[State.js] UPDATE_CALCULATED_VARDETAL: Invalid payload. Expected vardetal to be a number or null.', action.payload);
                return current_state;
            }
            if (current_state.auditCalculations && current_state.auditCalculations.currentVardetal === action.payload.vardetal) {
                return current_state;
            }
            return {
                ...current_state,
                auditCalculations: {
                    ...current_state.auditCalculations,
                    currentVardetal: action.payload.vardetal
                }
            };

        default:
            console.warn(`[State.js] Unknown action type: ${action.type}`);
            return current_state;
    }
}

function dispatch(action) {
    if (!action || typeof action.type !== 'string') {
        console.error('[State.js] Invalid action dispatched. Action must be an object with a "type" property.', action);
        return;
    }
    try {
        const previous_state_for_comparison = internal_state;
        const new_state = root_reducer(internal_state, action);
        
        if (new_state !== previous_state_for_comparison) {
            internal_state = new_state;
            saveStateToSessionStorage(internal_state);
            notify_listeners();
        }
    } catch (error) {
        console.error('[State.js] Error in dispatch or reducer:', error, 'Action:', action);
    }
}

function getState() {
    return JSON.parse(JSON.stringify(internal_state));
}

function subscribe(listener_function) {
    if (typeof listener_function !== 'function') {
        console.error('[State.js] Listener must be a function.');
        return () => {};
    }
    listeners.push(listener_function);
    return () => {
        listeners = listeners.filter(l => l !== listener_function);
    };
}

function notify_listeners() {
    const currentSnapshot = getState();
    listeners.forEach(listener => {
        try {
            listener(currentSnapshot);
        } catch (error) {
            console.error('[State.js] Error in listener function:', error);
        }
    });
}

function loadStateFromSessionStorage() {
    const serializedState = sessionStorage.getItem(APP_STATE_KEY);
    if (serializedState === null) {
        console.log('[State.js] No state found in sessionStorage. Using initial_state.');
        return { ...initial_state, saveFileVersion: APP_STATE_VERSION };
    }
    try {
        const storedState = JSON.parse(serializedState);
        if (storedState.saveFileVersion && storedState.saveFileVersion.startsWith(APP_STATE_VERSION.split('.')[0])) {
            console.log(`[State.js] Loaded state from sessionStorage. Version compatible (File: ${storedState.saveFileVersion}, App: ${APP_STATE_VERSION}).`);
            const calculations = storedState.auditCalculations || { ...initial_state.auditCalculations };
            const uiSettings = storedState.uiSettings || { ...initial_state.uiSettings };
            return { ...storedState, auditCalculations: calculations, uiSettings: uiSettings, saveFileVersion: APP_STATE_VERSION };
        } else {
            console.warn(`[State.js] State version mismatch in sessionStorage. Found ${storedState.saveFileVersion}, expected major version ${APP_STATE_VERSION.split('.')[0]}.x.x. Clearing stored state and using initial_state.`);
            sessionStorage.removeItem(APP_STATE_KEY);
            return { ...initial_state, saveFileVersion: APP_STATE_VERSION };
        }
    } catch (e) {
        console.error("[State.js] Could not load state from sessionStorage due to parsing error:", e);
        sessionStorage.removeItem(APP_STATE_KEY);
        return { ...initial_state, saveFileVersion: APP_STATE_VERSION };
    }
}

function saveStateToSessionStorage(state_to_save) {
    try {
        const complete_state_to_save = { ...state_to_save, saveFileVersion: APP_STATE_VERSION };
        const serializedState = JSON.stringify(complete_state_to_save);
        sessionStorage.setItem(APP_STATE_KEY, serializedState);
    } catch (e) {
        console.error("[State.js] Could not save state to sessionStorage:", e);
        if (window.NotificationComponent && typeof window.NotificationComponent.show_global_message === 'function' && typeof window.Translation?.t === 'function') {
            window.NotificationComponent.show_global_message(window.Translation.t('critical_error_saving_session_data_lost'), 'error');
        }
    }
}

internal_state = loadStateFromSessionStorage();
if (sessionStorage.getItem(APP_STATE_KEY) === null) {
    saveStateToSessionStorage(internal_state);
}

export { dispatch, getState, subscribe, ActionTypes as StoreActionTypes, initial_state as StoreInitialState };

console.log('[State.js] Store initialized and API exported. Current state version:', internal_state.saveFileVersion);