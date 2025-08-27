// js/state.js

const APP_STATE_KEY = 'digitalTillsynAppCentralState';
const APP_STATE_VERSION = '2.0.1';

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
    deficiencyCounter: 1,
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

let internal_state = { ...initial_state };
let listeners = [];

function get_current_iso_datetime_utc_internal() {
    return new Date().toISOString();
}

function root_reducer(current_state, action) {
    let new_state;

    switch (action.type) {
        case ActionTypes.INITIALIZE_NEW_AUDIT:
            return {
                ...initial_state,
                saveFileVersion: APP_STATE_VERSION,
                ruleFileContent: action.payload.ruleFileContent,
                uiSettings: JSON.parse(JSON.stringify(initial_state.uiSettings))
            };

        case ActionTypes.LOAD_AUDIT_FROM_FILE:
            if (action.payload && typeof action.payload === 'object') {
                const loaded_state = {
                    ...JSON.parse(JSON.stringify(initial_state)),
                    ...action.payload,
                    saveFileVersion: APP_STATE_VERSION
                };
                
                // Konvertera gamla dataformat (strängar) till nya (objekt)
                (loaded_state.samples || []).forEach(sample => {
                    Object.values(sample.requirementResults || {}).forEach(reqResult => {
                        Object.values(reqResult.checkResults || {}).forEach(checkResult => {
                            if (checkResult.passCriteria) {
                                Object.keys(checkResult.passCriteria).forEach(pcId => {
                                    const pcValue = checkResult.passCriteria[pcId];
                                    if (typeof pcValue === 'string') {
                                        checkResult.passCriteria[pcId] = {
                                            status: pcValue,
                                            observationDetail: '',
                                            timestamp: loaded_state.startTime || null 
                                        };
                                    }
                                });
                            }
                        });
                    });
                });

                if (!loaded_state.deficiencyCounter) {
                    loaded_state.deficiencyCounter = 1;
                }

                // Kör inkrementell uppdatering för att säkerställa konsistens
                return window.AuditLogic.updateIncrementalDeficiencyIds(loaded_state);
            }
            console.warn('[State.js] LOAD_AUDIT_FROM_FILE: Invalid payload.', action.payload);
            return current_state;

        case ActionTypes.UPDATE_METADATA:
            return {
                ...current_state,
                auditMetadata: { ...current_state.auditMetadata, ...action.payload }
            };

        case ActionTypes.ADD_SAMPLE:
             return { ...current_state, samples: [...current_state.samples, action.payload] };

        case ActionTypes.UPDATE_SAMPLE:
            return {
                ...current_state,
                samples: current_state.samples.map(s => s.id === action.payload.sampleId ? { ...s, ...action.payload.updatedSampleData } : s)
            };
        
        case ActionTypes.DELETE_SAMPLE:
            new_state = { ...current_state, samples: current_state.samples.filter(s => s.id !== action.payload.sampleId) };
            // Kör inkrementell uppdatering för att ta bort eventuella ID:n från den raderade sampel
            return window.AuditLogic.updateIncrementalDeficiencyIds(new_state);

        case ActionTypes.UPDATE_REQUIREMENT_RESULT:
            const { sampleId, requirementId, newRequirementResult } = action.payload;
            const result_to_save = { ...newRequirementResult };
            delete result_to_save.needsReview;
            new_state = {
                ...current_state,
                samples: current_state.samples.map(sample => 
                    (sample.id === sampleId)
                        ? { ...sample, requirementResults: { ...(sample.requirementResults || {}), [requirementId]: result_to_save }}
                        : sample
                )
            };
            // Kör inkrementell uppdatering för att tilldela/ta bort ID vid behov
            return window.AuditLogic.updateIncrementalDeficiencyIds(new_state);

        case ActionTypes.SET_AUDIT_STATUS:
            const newStatus = action.payload.status;
            let timeUpdate = {};
            let state_before_status_change = current_state;

            // KÄRNLOGIK FÖR NY ID-HANTERING
            if (newStatus === 'locked' && current_state.auditStatus === 'in_progress') {
                // Om deficiencyCounter är 1, har vi aldrig låst och numrerat förut.
                // Detta är första låsningen!
                if (current_state.deficiencyCounter === 1) {
                    console.log("[State.js] First lock detected. Assigning sorted deficiency IDs.");
                    state_before_status_change = window.AuditLogic.assignSortedDeficiencyIdsOnLock(current_state);
                }
                timeUpdate.endTime = state_before_status_change.endTime || get_current_iso_datetime_utc_internal();
            } 
            // Vid upplåsning
            else if (newStatus === 'in_progress' && current_state.auditStatus === 'locked') {
                timeUpdate.endTime = null;
            } 
            // Vid allra första start av granskningen
            else if (newStatus === 'in_progress' && current_state.auditStatus === 'not_started') {
                timeUpdate.startTime = get_current_iso_datetime_utc_internal();
            }

            return { ...state_before_status_change, auditStatus: newStatus, ...timeUpdate };

        case ActionTypes.REPLACE_RULEFILE_AND_RECONCILE:
            if (!action.payload || !action.payload.ruleFileContent || !action.payload.samples) {
                console.error('[State.js] REPLACE_RULEFILE_AND_RECONCILE: Invalid payload.');
                return current_state;
            }
            const new_precalculated_data = window.VardetalCalculator.precalculate_rule_data(action.payload.ruleFileContent);
            return {
                ...action.payload,
                auditCalculations: {
                    ...current_state.auditCalculations,
                    ruleData: new_precalculated_data
                },
                saveFileVersion: APP_STATE_VERSION
            };

        case ActionTypes.SET_RULE_FILE_CONTENT:
            return {
                ...current_state,
                ruleFileContent: action.payload.ruleFileContent,
                auditCalculations: { ...initial_state.auditCalculations } 
            };
        
        case ActionTypes.SET_UI_FILTER_SETTINGS:
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
            return {
                ...current_state,
                auditCalculations: {
                    ...current_state.auditCalculations,
                    ruleData: { ...action.payload }
                }
            };

        case ActionTypes.UPDATE_CALCULATED_VARDETAL:
            if (current_state.auditCalculations?.currentVardetal === action.payload.vardetal) {
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
        return { ...initial_state, saveFileVersion: APP_STATE_VERSION };
    }
    try {
        const storedState = JSON.parse(serializedState);
        if (storedState.saveFileVersion && storedState.saveFileVersion.startsWith(APP_STATE_VERSION.split('.')[0])) {
            const mergedState = {
                ...JSON.parse(JSON.stringify(initial_state)),
                ...storedState,
                saveFileVersion: APP_STATE_VERSION
            };
            return mergedState;
        } else {
            sessionStorage.removeItem(APP_STATE_KEY);
            return { ...initial_state, saveFileVersion: APP_STATE_VERSION };
        }
    } catch (e) {
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

// Kör ID-uppdatering direkt vid laddning för att säkerställa att gamla sparfiler får ID:n
internal_state = window.AuditLogic.updateIncrementalDeficiencyIds(internal_state);
saveStateToSessionStorage(internal_state);


export { dispatch, getState, subscribe, ActionTypes as StoreActionTypes, initial_state as StoreInitialState };