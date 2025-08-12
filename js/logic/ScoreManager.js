// js/logic/ScoreManager.js
(function () { // IIFE start
    'use-strict';

    // Modul-lokala referenser till store-funktioner och ActionTypes
    let subscribe_to_store;
    let get_current_state;
    let dispatch_action;
    let StoreActionTypes_ref;

    /**
     * Detta är kärnfunktionen. Den körs varje gång något i appens state ändras.
     * Den beräknar det nya Värdetalet och skickar en uppdatering om det har ändrats.
     * @param {object} new_state - Det nya, uppdaterade state-objektet från storen.
     */
    function handle_store_update(new_state) {
        // Hämta de funktioner och data vi behöver för att göra beräkningen
        const calculate_func = window.VardetalCalculator?.calculate_current_vardetal;
        const precalculated_data = new_state.auditCalculations?.ruleData;

        // Om vi saknar något, avbryt.
        if (!calculate_func || !precalculated_data || !precalculated_data.weights_map) {
            // Detta kan hända i början innan en regelfil är laddad, vilket är ok.
            return;
        }
        
        // Räkna ut det nya värdetalet baserat på det nya state:t
        const newly_calculated_vardetal = calculate_func(new_state, precalculated_data);
        const current_vardetal_in_state = new_state.auditCalculations?.currentVardetal;

        // Jämför det nya värdet med det gamla. Skicka bara en uppdatering om de skiljer sig.
        // Detta är SUPERVIKTIGT för att undvika en oändlig loop av uppdateringar.
        if (newly_calculated_vardetal !== current_vardetal_in_state) {
            console.log(`[ScoreManager] Värdetal has changed. Old: ${current_vardetal_in_state}, New: ${newly_calculated_vardetal}. Dispatching update.`);
            
            // Skicka (dispatch) en action för att uppdatera Värdetalet i det centrala state:t.
            dispatch_action({
                type: StoreActionTypes_ref.UPDATE_CALCULATED_VARDETAL,
                payload: { vardetal: newly_calculated_vardetal }
            });
        }
    }

    /**
     * Initierar managern. Denna funktion anropas en gång från main.js när appen startar.
     * Den tar emot funktioner för att interagera med storen och startar prenumerationen.
     */
    function init(_subscribe, _getState, _dispatch, _StoreActionTypes) {
        console.log("[ScoreManager] Initializing...");
        
        // Spara referenser till store-funktionerna så vi kan använda dem i `handle_store_update`
        subscribe_to_store = _subscribe;
        get_current_state = _getState;
        dispatch_action = _dispatch;
        StoreActionTypes_ref = _StoreActionTypes;

        // Starta prenumerationen. Från och med nu kommer `handle_store_update` att köras
        // varje gång något i appens state ändras.
        if (typeof subscribe_to_store === 'function') {
            subscribe_to_store(handle_store_update);
            console.log("[ScoreManager] Successfully subscribed to store updates.");
        } else {
            console.error("[ScoreManager] CRITICAL: Subscribe function was not provided during init. Score will not update.");
        }
    }

    // Exponera init-funktionen globalt så att main.js kan anropa den.
    window.ScoreManager = {
        init
    };

    console.log("[ScoreManager.js] ScoreManager loaded and exposed on window.");

})(); // IIFE end