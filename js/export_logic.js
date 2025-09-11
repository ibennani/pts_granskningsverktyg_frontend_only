function get_t_internal() {
    if (typeof window.Translation !== 'undefined' && typeof window.Translation.t === 'function') {
        return window.Translation.t;
    }
    return (key, replacements) => `**${key}**`;
}

function show_global_message_internal(message, type, duration) {
    if (typeof window.NotificationComponent !== 'undefined' && typeof window.NotificationComponent.show_global_message === 'function') {
        window.NotificationComponent.show_global_message(message, type, duration);
    }
}

function escape_for_csv(str) {
    if (str === null || str === undefined) {
        return '';
    }
    let result = String(str);
    // Ersätt citattecken med dubbla citattecken
    result = result.replace(/"/g, '""');
    // Ta bort nyradstecken för att hålla varje post på en rad
    result = result.replace(/(\r\n|\n|\r)/gm, " ");
    // Omslut fältet med citattecken om det innehåller kommatecken, semikolon eller citattecken
    if (/[",;]/.test(result)) {
        result = `"${result}"`;
    }
    return result;
}

function calculate_requirement_status_internal(requirement_object, requirement_result_object) {
    if (typeof window.AuditLogic !== 'undefined' && typeof window.AuditLogic.calculate_requirement_status === 'function') {
        return window.AuditLogic.calculate_requirement_status(requirement_object, requirement_result_object);
    }
    return 'not_audited';
}

function get_pass_criterion_text(req_definition, check_id, pc_id) {
    if (!req_definition?.checks) return pc_id;
    const check = req_definition.checks.find(c => c.id === check_id);
    if (!check?.passCriteria) return pc_id;
    const pc = check.passCriteria.find(p => p.id === pc_id);
    return pc ? pc.requirement : pc_id;
}

// ========================================================================
// === NY, OMSKRIVEN FUNKTION FÖR CSV-EXPORT ===
// ========================================================================
function export_to_csv(current_audit) {
    const t = get_t_internal();
    if (!current_audit) {
        show_global_message_internal(t('no_audit_data_to_save'), 'error');
        return;
    }
    
    let csv_content_array = [];
    
    // Steg 1: Definiera rubrikerna
    const headers = [
        t('excel_col_deficiency_id'),
        t('excel_col_req_title'),
        t('excel_col_reference'),
        t('excel_col_sample_name'),
        t('excel_col_sample_url'),
        t('excel_col_control'),
        t('excel_col_observation')
    ];
    csv_content_array.push(headers.join(';'));

    // Steg 2: Samla in data för brister (samma logik som för Excel)
    (current_audit.samples || []).forEach(sample => {
        const all_reqs = Object.values(current_audit.ruleFileContent.requirements || {});
        all_reqs.forEach(req_definition => {
            const req_key = req_definition.key || req_definition.id;
            const result = (sample.requirementResults || {})[req_key];
            if (!result || !result.checkResults) return;

            Object.keys(result.checkResults).forEach(check_id => {
                const check_res = result.checkResults[check_id];
                if (!check_res || !check_res.passCriteria) return;

                Object.keys(check_res.passCriteria).forEach(pc_id => {
                    const pc_obj = check_res.passCriteria[pc_id];
                    if (pc_obj && pc_obj.status === 'failed' && pc_obj.deficiencyId) {
                        const controlText = get_pass_criterion_text(req_definition, check_id, pc_id);
                        
                        const pc_def = req_definition.checks?.find(c=>c.id===check_id)?.passCriteria?.find(p=>p.id===pc_id);
                        const templateObservation = pc_def?.failureStatementTemplate || '';
                        const userObservation = pc_obj.observationDetail || '';
                        
                        let finalObservation = userObservation;
                        if (!userObservation.trim() || userObservation.trim() === templateObservation.trim()) {
                            finalObservation = t('requirement_not_met_default_text');
                        }

                        const row_values = [
                            escape_for_csv(pc_obj.deficiencyId),
                            escape_for_csv(req_definition.title),
                            escape_for_csv(req_definition.standardReference?.text || ''),
                            escape_for_csv(sample.description),
                            escape_for_csv(sample.url),
                            escape_for_csv(controlText),
                            escape_for_csv(finalObservation)
                        ];
                        csv_content_array.push(row_values.join(';'));
                    }
                });
            });
        });
    });

    // Steg 3: Skapa och ladda ner filen
    const csv_string = csv_content_array.join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv_string], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    // Uppdaterat filnamn med översättningsnycklar
    const report_prefix = t('filename_audit_report_prefix');
    const deficiencies_suffix = t('filename_deficiencies_suffix');
    const actor_name = (current_audit.auditMetadata.actorName || t('filename_fallback_actor')).replace(/[^a-z0-9]/gi, '_');
    const filename = `${report_prefix}_${deficiencies_suffix}_${actor_name}_${new Date().toISOString().split('T')[0]}.csv`;

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

    if (typeof ExcelJS === 'undefined') {
        show_global_message_internal(t('excel_library_not_loaded'), 'error');
        console.error("ExcelJS library is not loaded.");
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'PTS Granskningsverktyg';
        workbook.created = new Date();

        // Flik 1: Allmän Information
        const generalSheet = workbook.addWorksheet(t('excel_sheet_general_info'));
        
        // Hämta den aktiva språkkoden för datumformatering
        const lang_code = window.Translation.get_current_language_code();

        const general_info_data = [
            [t('case_number'), current_audit.auditMetadata.caseNumber || ''],
            [t('actor_name'), current_audit.auditMetadata.actorName || ''],
            [t('actor_link'), current_audit.auditMetadata.actorLink || ''],
            [t('auditor_name'), current_audit.auditMetadata.auditorName || ''],
            // --- START OF CHANGE ---
            [t('case_handler'), current_audit.auditMetadata.caseHandler || ''],
            // --- END OF CHANGE ---
            [t('rule_file_title'), current_audit.ruleFileContent.metadata.title || ''],
            [t('version_rulefile'), current_audit.ruleFileContent.metadata.version || ''],
            [t('status'), t(`audit_status_${current_audit.auditStatus}`)],
            [t('start_time'), current_audit.startTime ? window.Helpers.format_iso_to_local_datetime(current_audit.startTime, lang_code) : ''],
            [t('end_time'), current_audit.endTime ? window.Helpers.format_iso_to_local_datetime(current_audit.endTime, lang_code) : '']
        ];
        const vardetalValue = current_audit.auditCalculations?.currentVardetal;
        const displayVardetal = (vardetalValue !== null && vardetalValue !== undefined) ? vardetalValue : '---';
        const vardetalString = `${displayVardetal}/500`;
        general_info_data.push([t('overall_vardetal_label'), vardetalString]);
        generalSheet.addRows(general_info_data);
        generalSheet.getColumn(1).width = 30;
        generalSheet.getColumn(2).width = 70;

        // Flik 2: Brister
        const deficienciesSheet = workbook.addWorksheet(t('excel_sheet_deficiencies'));
        deficienciesSheet.columns = [
            { header: t('excel_col_deficiency_id'), key: 'id', width: 20 },
            { header: t('excel_col_req_title'), key: 'reqTitle', width: 45 },
            { header: t('excel_col_reference'), key: 'reference', width: 40 },
            { header: t('excel_col_sample_name'), key: 'sampleName', width: 30 },
            { header: t('excel_col_sample_url'), key: 'sampleUrl', width: 40 },
            { header: t('excel_col_control'), key: 'control', width: 60 },
            { header: t('excel_col_observation'), key: 'observation', width: 70 }
        ];
        
        const deficiencies_data = [];
        (current_audit.samples || []).forEach(sample => {
            const all_reqs = Object.values(current_audit.ruleFileContent.requirements || {});
            all_reqs.forEach(req_definition => {
                const req_key = req_definition.key || req_definition.id;
                const result = (sample.requirementResults || {})[req_key];
                if (!result || !result.checkResults) return;
                Object.keys(result.checkResults).forEach(check_id => {
                    const check_res = result.checkResults[check_id];
                    if (!check_res || !check_res.passCriteria) return;
                    Object.keys(check_res.passCriteria).forEach(pc_id => {
                        const pc_obj = check_res.passCriteria[pc_id];
                        if (pc_obj && pc_obj.status === 'failed' && pc_obj.deficiencyId) {
                            const pc_def = req_definition.checks?.find(c=>c.id===check_id)?.passCriteria?.find(p=>p.id===pc_id);
                            const templateObservation = pc_def?.failureStatementTemplate || '';
                            const userObservation = pc_obj.observationDetail || '';
                            
                            let finalObservation = userObservation;
                            if (!userObservation.trim() || userObservation.trim() === templateObservation.trim()) {
                                finalObservation = t('requirement_not_met_default_text');
                            }
                            
                            const reference_obj = { text: req_definition.standardReference?.text || '' };
                            if (req_definition.standardReference?.url) {
                                reference_obj.hyperlink = window.Helpers.add_protocol_if_missing(req_definition.standardReference.url);
                            }

                            const url_obj = { text: sample.url || '' };
                            if (sample.url) {
                                url_obj.hyperlink = window.Helpers.add_protocol_if_missing(sample.url);
                            }

                            deficiencies_data.push({
                                id: pc_obj.deficiencyId,
                                reqTitle: req_definition.title,
                                reference: reference_obj,
                                sampleName: sample.description,
                                sampleUrl: url_obj,
                                control: get_pass_criterion_text(req_definition, check_id, pc_id),
                                observation: finalObservation
                            });
                        }
                    });
                });
            });
        });

        deficiencies_data.sort((a, b) => (a.id || '').localeCompare(b.id || '', undefined, { numeric: true }));
        deficienciesSheet.addRows(deficiencies_data);

        const headerRow = deficienciesSheet.getRow(1);
        headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        headerRow.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF002060'} };
        headerRow.alignment = { vertical: 'top', wrapText: true };

        deficienciesSheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
            if (rowNumber > 1) {
                const isEvenRow = rowNumber % 2 === 0;
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEvenRow ? 'FFDDEBF7' : 'FFFFFFFF' } };
                row.font = { color: { argb: 'FF000000' } };
                row.alignment = { vertical: 'top', wrapText: true };

                const referenceCell = row.getCell('reference');
                if (referenceCell.hyperlink) {
                    referenceCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                }
                const sampleUrlCell = row.getCell('sampleUrl');
                if (sampleUrlCell.hyperlink) {
                    sampleUrlCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                }
            }
        });

        deficienciesSheet.autoFilter = { from: 'A1', to: { row: 1, column: deficienciesSheet.columns.length } };
        deficienciesSheet.views = [ { state: 'frozen', ySplit: 1 } ];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Uppdaterat filnamn med översättningsnycklar
        const report_prefix = t('filename_audit_report_prefix');
        const deficiencies_suffix = t('filename_deficiencies_suffix');
        const actor_name = (current_audit.auditMetadata.actorName || t('filename_fallback_actor')).replace(/[^a-z0-9]/gi, '_');
        const filename = `${report_prefix}_${deficiencies_suffix}_${actor_name}_${new Date().toISOString().split('T')[0]}.xlsx`;

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        show_global_message_internal(t('audit_saved_as_file', {filename: filename}), 'success');

    } catch (error) {
        console.error("Error exporting to Excel with ExcelJS:", error);
        show_global_message_internal(t('error_exporting_excel') + ` ${error.message}`, 'error');
    }
}

const public_api = {
    export_to_csv,
    export_to_excel
};

window.ExportLogic = public_api;