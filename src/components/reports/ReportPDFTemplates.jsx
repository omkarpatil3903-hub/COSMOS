/**
 * PDF Report Templates using @react-pdf/renderer
 * Replaces html2canvas approach for cleaner, faster PDF generation
 */
import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from '@react-pdf/renderer';

// Register fonts (optional - uses default if not registered)
// Font.register({ family: 'Times-Roman', src: '...' });

// Styles for PDF documents
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 11,
        fontFamily: 'Times-Roman',
    },
    title: {
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    hr: {
        borderBottomWidth: 1,
        borderBottomColor: '#999',
        marginVertical: 10,
    },
    table: {
        display: 'table',
        width: '100%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        marginBottom: 15,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableHeader: {
        backgroundColor: '#f0f0f0',
    },
    tableCell: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        padding: 6,
        flex: 1,
    },
    tableCellSmall: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        padding: 6,
        width: '25%',
    },
    tableCellLarge: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        padding: 6,
        width: '50%',
    },
    boldText: {
        fontWeight: 'bold',
    },
    paragraph: {
        marginBottom: 8,
        lineHeight: 1.5,
    },
    signature: {
        marginTop: 40,
        textAlign: 'right',
    },
    signatureLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 2,
        fontStyle: 'italic',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 9,
        color: '#666',
    },
});

/**
 * Daily Report PDF Template
 */
export const DailyReportPDF = ({ reportData, tasksCompletedToday, todayTasks, pendingTasks }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Daily Progress Report</Text>
            <View style={styles.hr} />

            {/* Metadata Table */}
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Report No.</Text>
                    <Text style={styles.tableCellSmall}>MFI_DR_{new Date().getDate()}</Text>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Day & Date</Text>
                    <Text style={styles.tableCellSmall}>{reportData.reportDate}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Client Name</Text>
                    <Text style={[styles.tableCell, { width: '75%' }]}>{reportData.clientName}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Project Name</Text>
                    <Text style={[styles.tableCell, { width: '75%' }]}>{reportData.projectName}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Consultant</Text>
                    <Text style={[styles.tableCell, { width: '75%' }]}>{reportData.employeeName}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Daily Hours</Text>
                    <Text style={[styles.tableCell, { width: '75%' }]}>{reportData.dailyHours} Hours</Text>
                </View>
            </View>

            {/* Objective */}
            <Text style={styles.subtitle}>Objective for the Day:</Text>
            <Text style={styles.paragraph}>{reportData.objective || '(No objective specified)'}</Text>

            {/* Key Activities */}
            <Text style={styles.subtitle}>1. Key Activities Completed:</Text>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCellLarge, styles.boldText]}>Task Detail</Text>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Status</Text>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Remarks</Text>
                </View>
                {tasksCompletedToday && tasksCompletedToday.length > 0 ? (
                    tasksCompletedToday.map((task, index) => (
                        <View key={task.id || index} style={styles.tableRow}>
                            <Text style={styles.tableCellLarge}>{index + 1}. {task.title}</Text>
                            <Text style={styles.tableCellSmall}>Completed</Text>
                            <Text style={styles.tableCellSmall}>{task.priority}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { textAlign: 'center' }]}>No tasks completed today</Text>
                    </View>
                )}
            </View>

            {/* Challenges */}
            <Text style={styles.subtitle}>2. Obstacles / Challenges:</Text>
            <Text style={styles.paragraph}>{reportData.obstacles || '(None reported)'}</Text>

            {/* Next Action Plan */}
            <Text style={styles.subtitle}>3. Next Action Plan:</Text>
            <Text style={styles.paragraph}>{reportData.nextActionPlan || '(No action plan specified)'}</Text>

            {/* Summary */}
            <Text style={styles.subtitle}>Summary:</Text>
            <Text style={styles.paragraph}>
                • Completed Today: {tasksCompletedToday?.length || 0}{'\n'}
                • Pending Today: {todayTasks?.length || 0}{'\n'}
                • Total Pending: {pendingTasks || 0}
            </Text>

            {/* Signature */}
            <View style={styles.signature}>
                <Text>Consultant Signature: </Text>
                <Text style={styles.signatureLine}>{reportData.employeeName}</Text>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
                Generated on: {reportData.reportDate} at {reportData.reportTime}
            </Text>
        </Page>
    </Document>
);

/**
 * Weekly Report PDF Template
 */
export const WeeklyReportPDF = ({ reportData }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Weekly Performance Report</Text>
            <View style={styles.hr} />

            {/* Metadata */}
            <View style={styles.table}>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Employee</Text>
                    <Text style={styles.tableCell}>{reportData.employeeName}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Week</Text>
                    <Text style={styles.tableCell}>{reportData.weekNumber}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Date Range</Text>
                    <Text style={styles.tableCell}>{reportData.weekStartDate} - {reportData.weekEndDate}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Weekly Hours</Text>
                    <Text style={styles.tableCell}>{reportData.weeklyHours} Hours</Text>
                </View>
            </View>

            {/* Key Achievements */}
            <Text style={styles.subtitle}>Key Achievements:</Text>
            <Text style={styles.paragraph}>{reportData.keyAchievements || '(No achievements listed)'}</Text>

            {/* Challenges */}
            <Text style={styles.subtitle}>Challenges:</Text>
            <Text style={styles.paragraph}>{reportData.obstacles || '(No challenges listed)'}</Text>

            {/* Urgent Actions */}
            <Text style={styles.subtitle}>Urgent Action Items:</Text>
            <Text style={styles.paragraph}>{reportData.urgentActions || '(No urgent actions listed)'}</Text>

            {/* Summary */}
            <Text style={styles.subtitle}>Summary of Activities:</Text>
            <Text style={styles.paragraph}>{reportData.summary || '(No summary provided)'}</Text>

            {/* Footer */}
            <Text style={styles.footer}>
                Generated on: {new Date().toLocaleDateString()}
            </Text>
        </Page>
    </Document>
);

/**
 * Monthly Report PDF Template
 */
export const MonthlyReportPDF = ({ reportData, companyName }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Monthly Performance Report</Text>
            <View style={styles.hr} />

            {/* Metadata */}
            <View style={styles.table}>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Employee</Text>
                    <Text style={styles.tableCell}>{reportData.employeeName}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Month</Text>
                    <Text style={styles.tableCell}>{reportData.monthName}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[styles.tableCellSmall, styles.boldText]}>Date</Text>
                    <Text style={styles.tableCell}>{reportData.reportDate}</Text>
                </View>
            </View>

            {/* Executive Summary */}
            <Text style={styles.subtitle}>Executive Summary:</Text>
            <Text style={styles.paragraph}>{reportData.executiveSummary || '(No executive summary provided)'}</Text>

            {/* Key Activities */}
            <Text style={styles.subtitle}>Key Activities:</Text>
            <Text style={styles.paragraph}>{reportData.objective || '(No key activities listed)'}</Text>

            {/* Achievements */}
            <Text style={styles.subtitle}>Achievements / Highlights:</Text>
            <Text style={styles.paragraph}>{reportData.keyAchievements || '(No achievements listed)'}</Text>

            {/* Challenges */}
            <Text style={styles.subtitle}>Challenges & Risks:</Text>
            <Text style={styles.paragraph}>{reportData.obstacles || '(No challenges listed)'}</Text>

            {/* Learnings */}
            <Text style={styles.subtitle}>Learnings & Observations:</Text>
            <Text style={styles.paragraph}>{reportData.learnings || '(No learnings listed)'}</Text>

            {/* Next Month Objectives */}
            <Text style={styles.subtitle}>Next Month's Objectives:</Text>
            <Text style={styles.paragraph}>{reportData.nextMonthObjectives || '(No objectives listed)'}</Text>

            {/* Consultant Note */}
            <Text style={styles.subtitle}>Consultant's Note:</Text>
            <Text style={styles.paragraph}>{reportData.consultantNote || '(No notes provided)'}</Text>

            {/* Signature */}
            <View style={styles.signature}>
                <Text>Consultant Signature: </Text>
                <Text style={styles.signatureLine}>{reportData.employeeName}, {companyName}</Text>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
                Generated on: {new Date().toLocaleDateString()}
            </Text>
        </Page>
    </Document>
);
