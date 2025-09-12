// js/state.js

const APP_STATE_KEY = 'digitalTillsynAppCentralState';
const APP_AUTOSAVE_KEY = 'digitalTillsynAppAutosave';
const APP_STATE_VERSION = '2.1.0'; // Version bumped to reflect new scoring model

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
    SET_UI_FILTER_SETTINGS: 'SET_UI_FILTER_SETTINGS',
    STAGE_SAMPLE_CHANGES: 'STAGE_SAMPLE_CHANGES',
    CLEAR_STAGED_SAMPLE_CHANGES: 'CLEAR_STAGED_SAMPLE_CHANGES',
    // --- START OF CHANGE: Add new action types ---
    CONFIRM_SINGLE_REVIEWED_REQUIREMENT: 'CONFIRM_SINGLE_REVIEWED_REQUIREMENT',
    CONFIRM_ALL_REVIEWED_REQUIREMENTS: 'CONFIRM_ALL_REVIEWED_REQUIREMENTS'
    // --- END OF CHANGE ---
};

const initial_state = {
    saveFileVersion: APP_STATE_VERSION,
    ruleFileContent: null,
    auditMetadata: {
        caseNumber: '',
        actorName: '',
        actorLink: '',
        auditorName: '',
        caseHandler: '',
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
    auditCalculations: {}, 
    pendingSampleChanges: null
};

let internal_state = { ...initial_state };
let listeners = [];
let autosaveDebounceTimer = null;

function get_current_iso_datetime_utc_internal() {
    return new Date().toISOString();
}

function root_reducer(current_state, action) {
    let new_state;

    switch (action.type) {
        // --- START OF CHANGE: Add new reducer cases ---
        case ActionTypes.CONFIRM_SINGLE_REVIEWED_REQUIREMENT:
            const { sampleId, requirementId } = action.payload;
            return {
                ...current_state,
                samples: current_state.samples.map(sample => {
                    if (sample.id === sampleId && sample.requirementResults?.[requirementId]?.needsReview) {
                        const newResults = { ...sample.requirementResults };
                        const newReqResult = { ...newResults[requirementId] };
                        delete newReqResult.needsReview;
                        newResults[requirementId] = newReqResult;
                        return { ...sample, requirementResults: newResults };
                    }
                    return sample;
                })
            };

        case ActionTypes.CONFIRM_ALL_REVIEWED_REQUIREMENTS:
            return {
                ...current_state,
                samples: current_state.samples.map(sample => {
                    const newResults = {};
                    let hasChanged = false;
                    Object.keys(sample.requirementResults || {}).forEach(reqId => {
                        const originalResult = sample.requirementResults[reqId];
                        if (originalResult?.needsReview) {
                            hasChanged = true;
                            newResults[reqId] = { ...originalResult };
                            delete newResults[reqId].needsReview;
                        } else {
                            newResults[reqId] = originalResult;
                        }
                    });
                    return hasChanged ? { ...sample, requirementResults: newResults } : sample;
                })
            };
        // --- END OF CHANGE ---

        case ActionTypes.STAGE_SAMPLE_CHANGES:
            return {
                ...current_state,
                pendingSampleChanges: action.payload
            };

        case ActionTypes.CLEAR_STAGED_SAMPLE_CHANGES:
            return {
                ...current_state,
                pendingSampleChanges: null
            };
        
        case ActionTypes.INITIALIZE_NEW_AUDIT:
            return {
                ...initial_state,
                saveFileVersion: APP_STATE_VERSION,
                ruleFileContent: action.payload.ruleFileContent,
                uiSettings: JSON.parse(JSON.stringify(initial_state.uiSettings))
            };

        case ActionTypes.LOAD_AUDIT_FROM_FILE:
            if (action.payload && typeof action.payload === 'object') {
                const loaded_data = action.payload;
                const new_state_base = JSON.parse(JSON.stringify(initial_state));
                const merged_state = {
                    ...new_state_base,
                    ...loaded_data,
                    uiSettings: {
                        ...new_state_base.uiSettings,
                        ...(loaded_data.uiSettings || {})
                    },
                    saveFileVersion: APP_STATE_VERSION
                };
                (merged_state.samples || []).forEach(sample => {
                    Object.values(sample.requirementResults || {}).forEach(reqResult => {
                        Object.values(reqResult.checkResults || {}).forEach(checkResult => {
                            if (checkResult.passCriteria) {
                                Object.keys(checkResult.passCriteria).forEach(pcId => {
                                    const pcValue = checkResult.passCriteria[pcId];
                                    if (typeof pcValue === 'string') {
                                        checkResult.passCriteria[pcId] = {
                                            status: pcValue,
                                            observationDetail: '',
                                            timestamp: merged_state.startTime || null 
                                        };
                                    }
                                });
                            }
                        });
                    });
                });
                if (!merged_state.deficiencyCounter) {
                    merged_state.deficiencyCounter = 1;
                }
                return window.AuditLogic.updateIncrementalDeficiencyIds(merged_state);
            }
            console.warn('[State.js] LOAD_AUDIT_FROM_FILE: Invalid payload.', action.payload);
            return current_state;

        case ActionTypes.UPDATE_METADATA:
            return {
                ...current_state,
                auditMetadata: { ...current_state.auditMetadata, ...action.payload }
            };

        case ActionTypes.ADD_SAMPLE:
            const new_sample_with_defaults = {
                sampleCategory: '',
                sampleType: '',
                ...action.payload
            };
            return { ...current_state, samples: [...current_state.samples, new_sample_with_defaults] };

        case ActionTypes.UPDATE_SAMPLE:
            return {
                ...current_state,
                samples: current_state.samples.map(s => s.id === action.payload.sampleId ? { ...s, ...action.payload.updatedSampleData } : s)
            };
        
        case ActionTypes.DELETE_SAMPLE:
            new_state = { ...current_state, samples: current_state.samples.filter(s => s.id !== action.payload.sampleId) };
            return window.AuditLogic.updateIncrementalDeficiencyIds(new_state);

        case ActionTypes.UPDATE_REQUIREMENT_RESULT:
            const { sampleId: updateSampleId, requirementId: updateRequirementId, newRequirementResult } = action.payload;
            const result_to_save = { ...newRequirementResult };
            delete result_to_save.needsReview;
            new_state = {
                ...current_state,
                samples: current_state.samples.map(sample => 
                    (sample.id === updateSampleId)
                        ? { ...sample, requirementResults: { ...(sample.requirementResults || {}), [updateRequirementId]: result_to_save }}
                        : sample
                )
            };
            return window.AuditLogic.updateIncrementalDeficiencyIds(new_state);

        case ActionTypes.SET_AUDIT_STATUS:
            const newStatus = action.payload.status;
            let timeUpdate = {};
            let state_before_status_change = current_state;

            if (newStatus === 'locked' && current_state.auditStatus === 'in_progress') {
                if (current_state.deficiencyCounter === 1) {
                    state_before_status_change = window.AuditLogic.assignSortedDeficiencyIdsOnLock(current_state);
                }
                timeUpdate.endTime = state_before_status_change.endTime || get_current_iso_datetime_utc_internal();
            } 
            else if (newStatus === 'in_progress' && current_state.auditStatus === 'locked') {
                timeUpdate.endTime = null;
            } 
            else if (newStatus === 'in_progress' && current_state.auditStatus === 'not_started') {
                timeUpdate.startTime = get_current_iso_datetime_utc_internal();
            }

            return { ...state_before_status_change, auditStatus: newStatus, ...timeUpdate };

        case ActionTypes.REPLACE_RULEFILE_AND_RECONCILE:
            if (!action.payload || !action.payload.ruleFileContent || !action.payload.samples) {
                console.error('[State.js] REPLACE_RULEFILE_AND_RECONCILE: Invalid payload.');
                return current_state;
            }
            return {
                ...action.payload,
                saveFileVersion: APP_STATE_VERSION
            };

        case ActionTypes.SET_RULE_FILE_CONTENT:
            return {
                ...current_state,
                ruleFileContent: action.payload.ruleFileContent
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

        default:
            return current_state;
    }
}


function saveStateToLocalStorage(state_to_save) {
    if (!state_to_save || state_to_save.auditStatus === 'not_started') {
        return;
    }
    try {
        const autosave_payload = {
            auditState: state_to_save,
            lastKnownHash: window.location.hash
        };
        const serializedState = JSON.stringify(autosave_payload);
        localStorage.setItem(APP_AUTOSAVE_KEY, serializedState);
    } catch (e) {
        console.error("[State.js] Could not save state to localStorage:", e);
    }
}

function forceSaveStateToLocalStorage(state_to_save) {
    if (!state_to_save || state_to_save.auditStatus === 'not_started') {
        return;
    }
    try {
        const autosave_payload = {
            auditState: state_to_save,
            lastKnownHash: window.location.hash
        };
        const serializedState = JSON.stringify(autosave_payload);
        localStorage.setItem(APP_AUTOSAVE_KEY, serializedState);
        console.log("[State.js] State forcefully saved to localStorage on page exit.");
    } catch (e) {
        console.error("[State.js] Could not perform final save to localStorage:", e);
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

            clearTimeout(autosaveDebounceTimer);
            autosaveDebounceTimer = setTimeout(() => {
                saveStateToLocalStorage(internal_state);
            }, 3000);

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
    setTimeout(() => {
        listeners.forEach(listener => {
            try {
                listener(currentSnapshot);
            } catch (error) {
                console.error('[State.js] Error in listener function:', error);
            }
        });
    }, 0);
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

function loadStateFromLocalStorage() {
    const serializedState = localStorage.getItem(APP_AUTOSAVE_KEY);
    if (serializedState === null) return null;
    try {
        const storedPayload = JSON.parse(serializedState);
        
        if (storedPayload && storedPayload.auditState && storedPayload.lastKnownHash) {
            const storedState = storedPayload.auditState;
            if (storedState.saveFileVersion && storedState.saveFileVersion.startsWith(APP_STATE_VERSION.split('.')[0])) {
                return storedPayload; 
            }
        } else {
            const storedState = storedPayload;
            if (storedState.saveFileVersion && storedState.saveFileVersion.startsWith(APP_STATE_VERSION.split('.')[0])) {
                return { auditState: storedState, lastKnownHash: '#audit_overview' };
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}

function clearAutosavedState() {
    localStorage.removeItem(APP_AUTOSAVE_KEY);
    console.log("[State.js] Autosaved state cleared from localStorage.");
}

function initState() {
    internal_state = loadStateFromSessionStorage();
    if (window.AuditLogic && typeof window.AuditLogic.updateIncrementalDeficiencyIds === 'function') {
        internal_state = window.AuditLogic.updateIncrementalDeficiencyIds(internal_state);
        saveStateToSessionStorage(internal_state);
    } else {
        console.error("[State.js] AuditLogic not available during initState. State may be inconsistent.");
    }
}

export { 
    dispatch, 
    getState, 
    subscribe, 
    initState, 
    ActionTypes as StoreActionTypes, 
    initial_state as StoreInitialState,
    loadStateFromLocalStorage,
    clearAutosavedState,
    forceSaveStateToLocalStorage
};