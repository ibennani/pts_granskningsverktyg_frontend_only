// js/export_logic.js
(function () { // Start på IIFE
    'use-strict';

    // Lokal referens till Translation.t, hämtas när funktionen anropas
    function get_t_internal() {
        if (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function') {
            return window.Translation.t;
        }
        // Fallback om Translation.t inte finns (bör inte hända i en fungerande app)
        return (key, replacements) => {
            let str = replacements && replacements.defaultValue ? replacements.defaultValue : `**${key}**`;
            if (replacements && !replacements.defaultValue) {
                for (const rKey in replacements) {
                    str += ` (${rKey}: ${replacements[rKey]})`;
                }
            }
            return str + " (ExportLogic t not found)";
        };
    }

    // Lokal referens till NotificationComponent.show_global_message
    function show_global_message_internal(message, type, duration) {
        if (typeof window.NotificationComponent !== 'undefined' && typeof window.NotificationComponent.show_global_message === 'function') {
            window.NotificationComponent.show_global_message(message, type, duration);
        } else {
            console.warn("NotificationComponent.show_global_message not available. Message:", message);
        }
    }
    
    // Lokal referens till Helpers.escape_html
    function escape_html_internal(unsafe_string) {
        if (typeof window.Helpers !== 'undefined' && typeof window.Helpers.escape_html === 'function') {
            return window.Helpers.escape_html(unsafe_string);
        }
        // Fallback om Helpers.escape_html inte finns
        return String(unsafe_string)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;"); // Eller &apos;, men &#39; är mest kompatibel'
    }

    // Lokal referens till AuditLogic.calculate_requirement_status
    function calculate_requirement_status_internal(requirement_object, requirement_result_object) {
        if (typeof window.AuditLogic !== 'undefined' && typeof window.AuditLogic.calculate_requirement_status === 'function') {
            return window.AuditLogic.calculate_requirement_status(requirement_object, requirement_result_object);
        }
        // Fallback om AuditLogic.calculate_requirement_status inte finns
        console.warn("AuditLogic.calculate_requirement_status not available. Returning 'not_audited'.");
        return 'not_audited';
    }


    function export_to_csv(current_audit) {
        const t = get_t_internal();
        if (!current_audit) {
            show_global_message_internal(t('no_audit_data_to_save'), 'error');
            return;
        }
        // Implementera CSV-exportlogik här
        // Exempel:
        let csv_content = "data:text/csv;charset=utf-8,";
        csv_content += "Ärendenummer;Aktör;Status;KravID;KravTitel;Observation\n"; // Rubriker

        current_audit.samples.forEach(sample => {
            if (sample.requirementResults) {
                for (const req_id in sample.requirementResults) {
                    const result = sample.requirementResults[req_id];
                    const requirement = current_audit.ruleFileContent.requirements[req_id];
                    if (requirement) {
                        const row = [
                            current_audit.auditMetadata.caseNumber || '',
                            current_audit.auditMetadata.actorName || '',
                            result.status || 'not_audited',
                            req_id,
                            requirement.title || '',
                            result.actualObservation ? result.actualObservation.replace(/"/g, '""') : '' // Hantera citationstecken
                        ].join(';');
                        csv_content += row + "\n";
                    }
                }
            }
        });

        const encoded_uri = encodeURI(csv_content);
        const link = document.createElement("a");
        link.setAttribute("href", encoded_uri);
        link.setAttribute("download", "granskningsrapport.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        show_global_message_internal(t('audit_saved_as_file', {filename: "granskningsrapport.csv"}), 'success');
    }

    async function export_to_excel(current_audit) {
        const t = get_t_internal();
        if (!current_audit) {
            show_global_message_internal(t('no_audit_data_to_save'), 'error');
            return;
        }

        if (typeof XLSX === 'undefined') {
            show_global_message_internal(t('excel_library_not_loaded', {defaultValue: "Excel library (XLSX) is not loaded."}), 'error');
            console.error("XLSX library is not loaded. Make sure it's included in index.html.");
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // --- Flik 1: Allmän Information ---
            const general_info_data = [
                [t('case_number', {defaultValue: "Case Number"}), current_audit.auditMetadata.caseNumber || ''],
                [t('actor_name', {defaultValue: "Actor Name"}), current_audit.auditMetadata.actorName || ''],
                [t('actor_link', {defaultValue: "Actor Link"}), current_audit.auditMetadata.actorLink || ''],
                [t('auditor_name', {defaultValue: "Auditor Name"}), current_audit.auditMetadata.auditorName || ''],
                [t('internal_comment', {defaultValue: "Internal Comment"}), current_audit.auditMetadata.internalComment || ''],
                [t('rule_file_title', {defaultValue: "Rule File"}), current_audit.ruleFileContent.metadata.title || ''],
                [t('Version (Regelfil)', {defaultValue: "Rule File Version"}), current_audit.ruleFileContent.metadata.version || ''],
                [t('status', {defaultValue: "Status"}), t(`audit_status_${current_audit.auditStatus}`, {defaultValue: current_audit.auditStatus}) || ''],
                [t('start_time', {defaultValue: "Start Time"}), current_audit.startTime ? escape_html_internal(window.Helpers.format_iso_to_local_datetime(current_audit.startTime)) : ''],
                [t('end_time', {defaultValue: "End Time"}), current_audit.endTime ? escape_html_internal(window.Helpers.format_iso_to_local_datetime(current_audit.endTime)) : '']
            ];
            const ws_general = XLSX.utils.aoa_to_sheet(general_info_data);
             // Ställ in kolumnbredder för Allmän Info
            ws_general['!cols'] = [{wch:30}, {wch:70}];
            XLSX.utils.book_append_sheet(wb, ws_general, t('excel_sheet_general_info', {defaultValue: "General Info"}));


            // --- Flik 2: Granskningsrapport (Detaljerad) ---
            const report_data = [];
            const headers = [
                t('excel_col_sample_name', {defaultValue: "Sample Name"}),          // Kolumn A
                t('excel_col_sample_url', {defaultValue: "Sample URL"}),            // Kolumn B
                t('Krav-ID (internt)', {defaultValue: "Requirement ID (internal)"}),// Kolumn C
                t('Kravets Titel', {defaultValue: "Requirement Title"}),            // Kolumn D
                t('excel_col_status', {defaultValue: "Status"}),                    // Kolumn E
                t('excel_col_expected_obs', {defaultValue: "Expected Observation"}),// Kolumn F
                t('excel_col_actual_obs', {defaultValue: "Actual Observation"}),    // Kolumn G
                t('excel_col_comment_to_actor', {defaultValue: "Comment to Actor"}),// Kolumn H
                t('excel_col_standard_ref', {defaultValue: "Standard Reference"})   // Kolumn I
            ];
            report_data.push(headers);

            (current_audit.samples || []).forEach(sample => {
                const relevant_requirements = window.AuditLogic.get_relevant_requirements_for_sample(current_audit.ruleFileContent, sample);
                
                relevant_requirements.forEach(req_definition => {
                    const req_key_for_results = req_definition.key || req_definition.id;
                    const result = (sample.requirementResults || {})[req_key_for_results];
                    const status = result ? calculate_requirement_status_internal(req_definition, result) : 'not_audited';
                    const status_text = t(`audit_status_${status}`, {defaultValue: status});

                    const row = [
                        sample.description || '',                                   // A
                        sample.url || '',                                           // B
                        req_definition.id || '',                                    // C
                        req_definition.title || '',                                 // D
                        status_text,                                                // E
                        req_definition.expectedObservation || '',                   // F
                        result ? (result.actualObservation || '') : '',             // G
                        result ? (result.commentToActor || '') : '',                // H
                        (req_definition.standardReference && req_definition.standardReference.text) ? req_definition.standardReference.text : '' // I
                    ];
                    report_data.push(row);
                });
            });
            
            const ws_report = XLSX.utils.aoa_to_sheet(report_data);
            // Ställ in kolumnbredder för rapportfliken
            ws_report['!cols'] = [
                {wch:30}, {wch:40}, {wch:20}, {wch:50}, {wch:15}, 
                {wch:50}, {wch:50}, {wch:50}, {wch:30} 
            ];
            XLSX.utils.book_append_sheet(wb, ws_report, t('excel_sheet_audit_report', {defaultValue: "Audit Report"}));
            
            const filename = `granskningsrapport_${(current_audit.auditMetadata.actorName || 'export').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            show_global_message_internal(t('audit_saved_as_file', {filename: filename}), 'success');

        } catch (error) {
            console.error("Error exporting to Excel:", error);
            show_global_message_internal(t('error_exporting_excel', {defaultValue: "Error exporting to Excel."}) + ` ${error.message}`, 'error');
        }
    }

    // Funktion för att spara granskningsdata (hela state) till en JSON-fil
    // DENNA FUNKTION ÄR NU BORTTAGEN HÄRIFRÅN OCH FINNS I save_audit_logic.js

    const public_api = {
        export_to_csv,
        export_to_excel
        // save_audit_to_json_file är borttagen
    };

    window.ExportLogic = public_api;

    console.log("[export_logic.js] ExportLogic loaded (without save_audit_to_json_file).");
    if (typeof window.ExportLogic === 'object' && window.ExportLogic !== null) {
        console.log("[export_logic.js] window.ExportLogic keys:", Object.keys(window.ExportLogic));
    }
})(); // Slut på IIFE