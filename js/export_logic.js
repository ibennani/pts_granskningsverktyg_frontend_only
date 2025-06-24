// js/export_logic.js
(function () { // Start på IIFE
    'use-strict';

    function get_t_internal() {
        if (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function') {
            return window.Translation.t;
        }
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

    function show_global_message_internal(message, type, duration) {
        if (typeof window.NotificationComponent !== 'undefined' && typeof window.NotificationComponent.show_global_message === 'function') {
            window.NotificationComponent.show_global_message(message, type, duration);
        } else {
            console.warn("NotificationComponent.show_global_message not available. Message:", message);
        }
    }
    
    function escape_html_internal(unsafe_string) {
        if (typeof window.Helpers !== 'undefined' && typeof window.Helpers.escape_html === 'function') {
            return window.Helpers.escape_html(unsafe_string);
        }
        return String(unsafe_string)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    

    function calculate_requirement_status_internal(requirement_object, requirement_result_object) {
        if (typeof window.AuditLogic !== 'undefined' && typeof window.AuditLogic.calculate_requirement_status === 'function') {
            return window.AuditLogic.calculate_requirement_status(requirement_object, requirement_result_object);
        }
        console.warn("AuditLogic.calculate_requirement_status not available. Returning 'not_audited'.");
        return 'not_audited';
    }

    // Hjälpfunktion för att hämta texten för ett passCriterion
    function get_pass_criterion_text(req_definition, check_id, pc_id) {
        if (!req_definition || !req_definition.checks) return pc_id; // Fallback
        const check = req_definition.checks.find(c => c.id === check_id);
        if (!check || !check.passCriteria) return pc_id;
        const pc = check.passCriteria.find(p => p.id === pc_id);
        return pc ? pc.requirement : pc_id;
    }

    function export_to_csv(current_audit) {
        const t = get_t_internal();
        if (!current_audit) {
            show_global_message_internal(t('no_audit_data_to_save'), 'error');
            return;
        }
        
        let csv_content_array = [];
        // Rubriker - Anpassa rubriken för observationer
        csv_content_array.push([
            t('excel_col_sample_name', {defaultValue: "Sample Name"}),
            t('excel_col_sample_url', {defaultValue: "Sample URL"}),
            t('Krav-ID (internt)', {defaultValue: "Requirement ID (internal)"}),
            t('Kravets Titel', {defaultValue: "Requirement Title"}),
            t('excel_col_status', {defaultValue: "Status"}),
            t('excel_col_expected_obs', {defaultValue: "Expected Observation"}),
            t('pc_observation_detail_label_export', {defaultValue: "Observation Details (for failed criteria)"}), // Ny/Anpassad rubrik
            t('excel_col_comment_to_actor', {defaultValue: "Comment to Actor"}),
            t('excel_col_standard_ref', {defaultValue: "Standard Reference"})
        ].join(';'));

        (current_audit.samples || []).forEach(sample => {
            const relevant_requirements = window.AuditLogic.get_relevant_requirements_for_sample(current_audit.ruleFileContent, sample);
            
            relevant_requirements.forEach(req_definition => {
                const req_key_for_results = req_definition.key || req_definition.id;
                const result = (sample.requirementResults || {})[req_key_for_results];
                const status = result ? calculate_requirement_status_internal(req_definition, result) : 'not_audited';
                const status_text = t(`audit_status_${status}`, {defaultValue: status});

                let detailed_observations_for_csv = "";
                if (result && result.checkResults) {
                    Object.keys(result.checkResults).forEach(check_id => {
                        const check_res = result.checkResults[check_id];
                        if (check_res && check_res.passCriteria) {
                            Object.keys(check_res.passCriteria).forEach(pc_id => {
                                const pc_obj = check_res.passCriteria[pc_id]; // Nu ett objekt
                                if (pc_obj && pc_obj.status === 'failed' && pc_obj.observationDetail && pc_obj.observationDetail.trim() !== '') {
                                    const pc_text = get_pass_criterion_text(req_definition, check_id, pc_id);
                                    detailed_observations_for_csv += `[${pc_text.replace(/"/g, '""')}]: ${pc_obj.observationDetail.replace(/"/g, '""').replace(/\n/g, ' ')}; `;
                                }
                            });
                        }
                    });
                }
                if (detailed_observations_for_csv.endsWith('; ')) {
                    detailed_observations_for_csv = detailed_observations_for_csv.slice(0, -2);
                }

                const row_values = [
                    `"${(sample.description || '').replace(/"/g, '""')}"`,
                    `"${(sample.url || '').replace(/"/g, '""')}"`,
                    `"${(req_definition.id || '').replace(/"/g, '""')}"`,
                    `"${(req_definition.title || '').replace(/"/g, '""')}"`,
                    `"${status_text.replace(/"/g, '""')}"`,
                    `"${(req_definition.expectedObservation || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                    `"${detailed_observations_for_csv}"`, // Använd den nya variabeln
                    `"${(result && result.commentToActor ? result.commentToActor.replace(/"/g, '""').replace(/\n/g, ' ') : '')}"`,
                    `"${((req_definition.standardReference && req_definition.standardReference.text) ? req_definition.standardReference.text.replace(/"/g, '""') : '')}"`
                ];
                csv_content_array.push(row_values.join(';'));
            });
        });

        const csv_string = csv_content_array.join('\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv_string], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const filename = `granskningsrapport_${(current_audit.auditMetadata.actorName || 'export').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        show_global_message_internal(t('audit_saved_as_file', {filename: filename}), 'success');
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

            // --- Flik 1: Allmän Information --- (ingen ändring här)
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
            ws_general['!cols'] = [{wch:30}, {wch:70}];
            XLSX.utils.book_append_sheet(wb, ws_general, t('excel_sheet_general_info', {defaultValue: "General Info"}));

            // --- Flik 2: Granskningsrapport (Detaljerad) ---
            const report_data = [];
            const headers = [
                t('excel_col_sample_name', {defaultValue: "Sample Name"}),
                t('excel_col_sample_url', {defaultValue: "Sample URL"}),
                t('Krav-ID (internt)', {defaultValue: "Requirement ID (internal)"}),
                t('Kravets Titel', {defaultValue: "Requirement Title"}),
                t('excel_col_status', {defaultValue: "Status"}),
                t('excel_col_expected_obs', {defaultValue: "Expected Observation"}),
                t('pc_observation_detail_label_export', {defaultValue: "Observation Details (for failed criteria)"}), // Anpassad rubrik
                t('excel_col_comment_to_actor', {defaultValue: "Comment to Actor"}),
                t('excel_col_standard_ref', {defaultValue: "Standard Reference"})
            ];
            report_data.push(headers);

            (current_audit.samples || []).forEach(sample => {
                const relevant_requirements = window.AuditLogic.get_relevant_requirements_for_sample(current_audit.ruleFileContent, sample);
                
                relevant_requirements.forEach(req_definition => {
                    const req_key_for_results = req_definition.key || req_definition.id;
                    const result = (sample.requirementResults || {})[req_key_for_results];
                    const status = result ? calculate_requirement_status_internal(req_definition, result) : 'not_audited';
                    const status_text = t(`audit_status_${status}`, {defaultValue: status});

                    let detailed_observations_for_excel = "";
                    if (result && result.checkResults) {
                        Object.keys(result.checkResults).forEach(check_id => {
                            const check_res = result.checkResults[check_id];
                            if (check_res && check_res.passCriteria) {
                                Object.keys(check_res.passCriteria).forEach(pc_id => {
                                    const pc_obj = check_res.passCriteria[pc_id]; // Nu ett objekt
                                    if (pc_obj && pc_obj.status === 'failed' && pc_obj.observationDetail && pc_obj.observationDetail.trim() !== '') {
                                        const pc_text = get_pass_criterion_text(req_definition, check_id, pc_id);
                                        detailed_observations_for_excel += `[${pc_text}]: ${pc_obj.observationDetail}\n`; // Nyrad för Excel
                                    }
                                });
                            }
                        });
                    }
                    detailed_observations_for_excel = detailed_observations_for_excel.trim();

                    const row = [
                        sample.description || '',
                        sample.url || '',
                        req_definition.id || '',
                        req_definition.title || '',
                        status_text,
                        req_definition.expectedObservation || '',
                        detailed_observations_for_excel, // Använd den nya variabeln
                        result ? (result.commentToActor || '') : '',
                        (req_definition.standardReference && req_definition.standardReference.text) ? req_definition.standardReference.text : ''
                    ];
                    report_data.push(row);
                });
            });
            
            const ws_report = XLSX.utils.aoa_to_sheet(report_data);
            ws_report['!cols'] = [
                {wch:30}, {wch:40}, {wch:20}, {wch:50}, {wch:15}, 
                {wch:50}, {wch:70}, {wch:50}, {wch:30} 
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

    const public_api = {
        export_to_csv,
        export_to_excel
    };

    window.ExportLogic = public_api;

})(); // Slut på IIFE