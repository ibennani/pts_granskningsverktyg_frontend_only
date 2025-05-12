(function () { // Start på IIFE
    'use-strict';

    // Beroenden kommer att hämtas från window-objektet när de behövs
    // let LocalTranslation, LocalNotificationComponent, LocalState, LocalHelpers;

    // function ensure_dependencies() {
    //     if (!LocalTranslation && window.Translation) LocalTranslation = window.Translation;
    //     if (!LocalNotificationComponent && window.NotificationComponent) LocalNotificationComponent = window.NotificationComponent;
    //     if (!LocalState && window.State) LocalState = window.State;
    //     if (!LocalHelpers && window.Helpers) LocalHelpers = window.Helpers;

    //     return LocalTranslation && LocalNotificationComponent && LocalState && LocalHelpers;
    // }
    // I denna modul används de direkt från window-objektet i funktionerna för enkelhetens skull just nu.

    async function export_to_csv(current_audit) {
        // if (!ensure_dependencies()) {
        //     console.error("ExportLogic: CSV Export dependencies not loaded.");
        //     alert("Exportfunktionens beroenden kunde inte laddas.");
        //     return;
        // }
        // Använder window.Translation etc direkt istället

        const t = window.Translation ? window.Translation.t : (key => key); // Fallback för t

        if (!current_audit || current_audit.auditStatus !== 'locked') {
            const status_text = current_audit ? t(`audit_status_${current_audit.auditStatus}`) : t('not_started');
            const message = `Granskningen måste vara låst för att exportera. Nuvarande status: ${status_text}.`;
            if (window.NotificationComponent) window.NotificationComponent.show_notification(message, 'warning');
            else alert(message);
            return;
        }

        const failed_requirements_data = [];
        if (current_audit.samples && current_audit.ruleFileContent && current_audit.ruleFileContent.requirements) {
            current_audit.samples.forEach(sample => {
                if (sample.requirementResults) {
                    for (const req_id in sample.requirementResults) {
                        const result = sample.requirementResults[req_id];
                        const requirement = current_audit.ruleFileContent.requirements[req_id];
                        if (result.status === 'failed' && requirement) {
                            failed_requirements_data.push({
                                sampleName: sample.description || '',
                                sampleUrl: sample.url || '',
                                standardReference: requirement.standardReference ? requirement.standardReference.text : '',
                                expectedObservation: requirement.expectedObservation || '',
                                actualObservation: result.actualObservation || '',
                                commentToActor: result.commentToActor || ''
                            });
                        }
                    }
                }
            });
        }


        if (failed_requirements_data.length === 0) {
            if (window.NotificationComponent) window.NotificationComponent.show_notification(t('no_failed_requirements_to_export'), 'info');
            else alert(t('no_failed_requirements_to_export'));
            return;
        }

        const headers = [
            t('excel_col_sample_name'),
            t('excel_col_sample_url'),
            t('excel_col_standard_ref'),
            t('excel_col_expected_obs'),
            t('excel_col_actual_obs'),
            t('excel_col_comment_to_actor')
        ];

        let csv_content = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n'; // Ensure headers are also quoted

        failed_requirements_data.forEach(row_data => {
            const csv_row_values = [
                row_data.sampleName,
                row_data.sampleUrl,
                row_data.standardReference,
                row_data.expectedObservation,
                row_data.actualObservation,
                row_data.commentToActor
            ];
            const csv_row_string = csv_row_values.map(val => `"${(String(val) || '').replace(/"/g, '""')}"`).join(',');
            csv_content += csv_row_string + '\r\n';
        });
        
        const rule_file_title_part = current_audit.ruleFileContent && current_audit.ruleFileContent.metadata ?
            (current_audit.ruleFileContent.metadata.title || 'regelfil').toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0,30) : 'regelfil';
        const date_now = new Date();
        const date_string = `${date_now.getFullYear()}-${String(date_now.getMonth() + 1).padStart(2, '0')}-${String(date_now.getDate()).padStart(2, '0')}-${String(date_now.getHours()).padStart(2, '0')}-${String(date_now.getMinutes()).padStart(2, '0')}-${String(date_now.getSeconds()).padStart(2, '0')}`;
        const filename = `granskning_${rule_file_title_part}_${date_string}_failed.csv`;

        const blob = new Blob([csv_content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined && window.Helpers) { // Check for Helpers for create_element pattern
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            if(window.NotificationComponent) window.NotificationComponent.show_notification('CSV-export genererad.', 'success');
        } else {
            if(window.NotificationComponent) window.NotificationComponent.show_notification('CSV-export misslyckades: webbläsaren stödjer inte nedladdning.', 'error');
            else alert('CSV-export misslyckades: webbläsaren stödjer inte nedladdning.');
        }
    }

    async function export_to_excel(current_audit) {
        // if (!ensure_dependencies()) {
        //     console.error("ExportLogic: Excel Export dependencies not loaded.");
        //     alert("Exportfunktionens beroenden kunde inte laddas.");
        //     return;
        // }

        const t = window.Translation ? window.Translation.t : (key => key);
        const Helpers = window.Helpers; // Antag att Helpers finns

        if (!current_audit || current_audit.auditStatus !== 'locked') {
             const status_text = current_audit ? t(`audit_status_${current_audit.auditStatus}`) : t('not_started');
            const message = `Granskningen måste vara låst för att exportera. Nuvarande status: ${status_text}.`;
            if (window.NotificationComponent) window.NotificationComponent.show_notification(message, 'warning');
            else alert(message);
            return;
        }

        if (typeof XLSX === 'undefined') {
            const message = 'XLSX exportbibliotek (SheetJS) är inte laddat. Inkludera det i index.html.';
            if (window.NotificationComponent) window.NotificationComponent.show_notification(message, 'error');
            else alert(message);
            console.error("SheetJS (XLSX) library is not loaded.");
            return;
        }

        const wb = XLSX.utils.book_new();

        // Flik 1: Allmän info
        const general_info_data = [
            [t('app_title'), current_audit.ruleFileContent?.metadata?.title || t('unknown_value', {val: "Regelfilstitel"})],
            [t('case_number'), current_audit.auditMetadata?.caseNumber || ''],
            [t('actor_name'), current_audit.auditMetadata?.actorName || ''],
            [t('actor_link'), current_audit.auditMetadata?.actorLink || ''],
            [t('auditor_name'), current_audit.auditMetadata?.auditorName || ''],
            [t('internal_comment'), current_audit.auditMetadata?.internalComment || ''],
            [t('status'), t(`audit_status_${current_audit.auditStatus}`)],
            [t('start_time'), current_audit.startTime && Helpers ? Helpers.format_iso_to_local_datetime(current_audit.startTime) : ''],
            [t('end_time'), current_audit.endTime && Helpers ? Helpers.format_iso_to_local_datetime(current_audit.endTime) : ''],
            ["Regelfil version", current_audit.ruleFileContent?.metadata?.version || ''],
            ["Sparfil version", current_audit.saveFileVersion || ''],
        ];
        const ws1_name = t('excel_sheet_general_info').substring(0,31); // Bladnamn får max vara 31 tecken
        const ws1 = XLSX.utils.aoa_to_sheet(general_info_data);
        ws1['!cols'] = [ {wch: 25}, {wch: 50}]; // Kolumnbredder
        XLSX.utils.book_append_sheet(wb, ws1, ws1_name);

        // Flik 2: Granskningsrapport
        const failed_requirements_rows = [];
        const headers_report = [
            t('excel_col_sample_name'), t('excel_col_sample_url'), t('excel_col_standard_ref'),
            t('excel_col_expected_obs'), t('excel_col_actual_obs'), t('excel_col_comment_to_actor'),
            t('excel_col_status')
        ];
        failed_requirements_rows.push(headers_report);

        if (current_audit.samples && current_audit.ruleFileContent && current_audit.ruleFileContent.requirements) {
            current_audit.samples.forEach(sample => {
                if (sample.requirementResults) {
                    for (const req_id in sample.requirementResults) {
                        const result = sample.requirementResults[req_id];
                        const requirement = current_audit.ruleFileContent.requirements[req_id];
                        if (result.status === 'failed' && requirement) {
                            failed_requirements_rows.push([
                                sample.description || '',
                                sample.url || '',
                                requirement.standardReference ? requirement.standardReference.text : '',
                                requirement.expectedObservation || '',
                                result.actualObservation || '',
                                result.commentToActor || '',
                                t('excel_status_failed')
                            ]);
                        }
                    }
                }
            });
        }


        const ws2_name = t('excel_sheet_audit_report').substring(0,31);
        if (failed_requirements_rows.length <= 1) {
            failed_requirements_rows.push([t('no_failed_requirements_to_export'), '', '', '', '', '', '']);
        }
        const ws2 = XLSX.utils.aoa_to_sheet(failed_requirements_rows);
        
        ws2['!cols'] = [ {wch: 30}, {wch: 40}, {wch: 30}, {wch: 50}, {wch: 50}, {wch: 50}, {wch: 20} ];

        if (failed_requirements_rows.length > 1 && failed_requirements_rows[1][0] !== t('no_failed_requirements_to_export')) { // Om det finns data (inte bara header + "inga krav")
            const status_options_string = [
                t('excel_status_failed'), t('excel_status_fixed'), t('excel_status_wont_fix')
            ].join(",");

            for (let i = 1; i < failed_requirements_rows.length; i++) {
                const cell_address = XLSX.utils.encode_cell({r: i, c: 6}); // Kolumn G (index 6)
                if (!ws2[cell_address]) ws2[cell_address] = { t: 's', v: t('excel_status_failed') };
                else ws2[cell_address].v = t('excel_status_failed');
                
                if (!ws2['!dataValidations']) ws2['!dataValidations'] = [];
                 // SheetJS Community version might not fully support complex !dataValidations array object,
                 // it might expect it on the cell directly. For Pro, this structure is more common.
                 // Let's try simplified for community:
                ws2[cell_address].DataValidation = { // Prova att sätta direkt på cellen
                    type: "list",
                    allowBlank: "0", // false
                    showInputMessage: "1", // true
                    showErrorMessage: "1", // true
                    errorStyle: "stop", // "stop", "warning", "information"
                    errorTitle: "Ogiltigt val",
                    error: t('excel_status_select_from_list', { list: status_options_string }), // Example, make a new translation
                    formulas: [status_options_string] // The list
                };
            }
        }
        XLSX.utils.book_append_sheet(wb, ws2, ws2_name);

        const rule_file_title_part = current_audit.ruleFileContent && current_audit.ruleFileContent.metadata ?
            (current_audit.ruleFileContent.metadata.title || 'regelfil').toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0,30) : 'regelfil';
        const date_now = new Date();
        const date_string = `${date_now.getFullYear()}-${String(date_now.getMonth() + 1).padStart(2, '0')}-${String(date_now.getDate()).padStart(2, '0')}-${String(date_now.getHours()).padStart(2, '0')}-${String(date_now.getMinutes()).padStart(2, '0')}-${String(date_now.getSeconds()).padStart(2, '0')}`;
        const filename = `granskning_${rule_file_title_part}_${date_string}.xlsx`;

        XLSX.writeFile(wb, filename);
        if(window.NotificationComponent) window.NotificationComponent.show_notification('Excel-export genererad.', 'success');
    }

    const public_api = {
        export_to_csv,
        export_to_excel
    };

    // Expose to global scope
    window.ExportLogic = public_api;

})(); // Slut på IIFE