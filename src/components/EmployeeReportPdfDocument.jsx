
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    // Metadata Table Styles
    metaTable: {
        width: '100%',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#000',
    },
    metaRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    metaLabel: {
        width: '25%',
        padding: 5,
        backgroundColor: '#f3f4f6', // gray-100
        fontWeight: 'bold',
        borderRightWidth: 1,
        borderRightColor: '#000',
    },
    metaValue: {
        width: '25%',
        padding: 5,
        borderRightWidth: 1, // Optional: if adjacent to another cell
        borderRightColor: '#000',
    },
    metaValueFull: {
        width: '75%',
        padding: 5,
    },
    // Content Table Styles
    table: {
        width: '100%',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#000',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    tableHeader: {
        backgroundColor: '#f3f4f6',
        fontWeight: 'bold',
    },
    tableCell: {
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: '#000',
    },
    tableCellLast: {
        borderRightWidth: 0,
    },
    text: {
        marginBottom: 4,
        lineHeight: 1.4,
    },
    noData: {
        padding: 10,
        textAlign: 'center',
        color: '#6b7280',
        fontStyle: 'italic',
    }
});

// Helper component for Metadata Rows
const MetaRow = ({ label1, value1, label2, value2 }) => (
    <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{label1}</Text>
        <Text style={[styles.metaValue, !label2 && styles.metaValueFull]}>{value1}</Text>
        {label2 && (
            <>
                <Text style={styles.metaLabel}>{label2}</Text>
                <Text style={[styles.metaValue, styles.tableCellLast]}>{value2}</Text>
            </>
        )}
    </View>
);

const DailyReportView = ({ data, tasksCompletedToday }) => (
    <>
        <Text style={styles.title}>Daily Performance Report</Text>

        <View style={styles.metaTable}>
            <MetaRow
                label1="Report No." value1={`MFI_DR_${new Date().getDate()}`}
                label2="Day & Date" value2={data.reportDate}
            />
            <MetaRow label1="Client Name -" value1={data.clientName} />
            <MetaRow label1="Project Name -" value1={data.projectName} />
            <MetaRow label1="Consultant Name:" value1={data.employeeName} />
            <MetaRow label1="Daily Hours:" value1={`Hours Worked: ${data.dailyHours}`} />
        </View>

        <View>
            <Text style={styles.sectionTitle}>Objective for the Day:</Text>
            <Text style={[styles.text, { marginLeft: 10 }]}>{data.objective || "-"}</Text>
        </View>

        <View>
            <Text style={styles.sectionTitle}>1. Key Activities Completed:</Text>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, { width: '50%' }]}>Task Detail</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>Task Status</Text>
                    <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>Comments/Remarks</Text>
                </View>
                {tasksCompletedToday && tasksCompletedToday.length > 0 ? (
                    tasksCompletedToday.map((task, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '50%' }]}>{index + 1}. {task.title}</Text>
                            <Text style={[styles.tableCell, { width: '25%' }]}>{task.status}</Text>
                            <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>{task.completionComment || "-"}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.tableCellLast, styles.noData, { width: '100%' }]}>No tasks completed today</Text>
                    </View>
                )}
            </View>
        </View>

        <View>
            <Text style={styles.sectionTitle}>Obstacles/Challenges Faced/ Roadblocks (if any)</Text>
            <View style={styles.table}>
                {data.obstacles && data.obstacles.trim() ? (
                    data.obstacles.split('\n').filter(l => l.trim()).map((line, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{index + 1}</Text>
                            <Text style={[styles.tableCell, styles.tableCellLast, { width: '90%' }]}>{line}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>1</Text>
                        <Text style={[styles.tableCell, styles.tableCellLast, { width: '90%' }]}></Text>
                    </View>
                )}
            </View>
        </View>

        <View>
            <Text style={styles.sectionTitle}>Next Action Plan</Text>
            <View style={styles.table}>
                {data.nextActionPlan && data.nextActionPlan.trim() ? (
                    data.nextActionPlan.split('\n').filter(l => l.trim()).map((line, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{index + 1}</Text>
                            <Text style={[styles.tableCell, styles.tableCellLast, { width: '90%' }]}>{line}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>1</Text>
                        <Text style={[styles.tableCell, styles.tableCellLast, { width: '90%' }]}></Text>
                    </View>
                )}
            </View>
        </View>

        <View>
            <Text style={styles.sectionTitle}>Summary:</Text>
            <Text style={[styles.text, { marginLeft: 10, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 20 }]}>
                {data.summary}
            </Text>
        </View>
    </>
);

const WeeklyReportView = ({ data, tasks }) => {
    // Pre-calculate filtered tasks to ensure consistency
    const filteredTasks = React.useMemo(() => {
        if (!tasks || !data.weekStartDate || !data.weekEndDate) return [];

        const [startDay, startMonth, startYear] = data.weekStartDate.split('/').map(Number);
        const [endDay, endMonth, endYear] = data.weekEndDate.split('/').map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        endDate.setHours(23, 59, 59, 999);

        return tasks.filter(t => {
            let activityDate = null;
            if (t.updatedAt) {
                activityDate = t.updatedAt.toDate ? t.updatedAt.toDate() : new Date(t.updatedAt);
            } else if (t.createdAt) {
                activityDate = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
            }

            if (!activityDate) return false;
            return activityDate >= startDate && activityDate <= endDate;
        });
    }, [tasks, data.weekStartDate, data.weekEndDate]);

    return (
        <>
            <Text style={styles.title}>Weekly Progress Report</Text>

            <View style={styles.metaTable}>
                <MetaRow
                    label1="Week No." value1={data.weekNumber}
                    label2="Date Range" value2={`${data.weekStartDate} - ${data.weekEndDate}`}
                />
                <MetaRow label1="Client Name -" value1={data.clientName} />
                <MetaRow label1="Project Name -" value1={data.projectName} />
                <MetaRow label1="Consultant Name:" value1={data.employeeName} />
            </View>

            {/* Similar sections for Weekly */}
            <View>
                <Text style={styles.sectionTitle}>1. Activity Report (Timesheet)</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.tableCell, { width: '50%' }]}>Task Detail</Text>
                        <Text style={[styles.tableCell, { width: '25%' }]}>Task Status</Text>
                        <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>Comments</Text>
                    </View>

                    {filteredTasks.length > 0 ? (
                        filteredTasks.slice(0, 10).map((task, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '50%' }]}>{index + 1}. {task.title}</Text>
                                <Text style={[styles.tableCell, { width: '25%' }]}>{task.status}</Text>
                                <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>{task.completionComment || "-"}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.tableCellLast, { width: '100%', textAlign: 'center', color: '#666', fontStyle: 'italic' }]}>
                                No activity recorded this week
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View>
                <Text style={styles.sectionTitle}>2. Key Achievements</Text>
                <View style={styles.table}>
                    {data.keyAchievements && data.keyAchievements.split('\n').filter(l => l.trim()).map((line, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{index + 1}</Text>
                            <Text style={[styles.tableCell, styles.tableCellLast, { width: '90%' }]}>{line}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View>
                <Text style={styles.sectionTitle}>3. Challenges</Text>
                <View style={styles.table}>
                    {data.obstacles && data.obstacles.split('\n').filter(l => l.trim()).map((line, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{index + 1}</Text>
                            <Text style={[styles.tableCell, styles.tableCellLast, { width: '90%' }]}>{line}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View>
                <Text style={styles.sectionTitle}>4. Urgent Action Items</Text>
                <View style={styles.table}>
                    {data.urgentActions && data.urgentActions.split('\n').filter(l => l.trim()).map((line, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{index + 1}</Text>
                            <Text style={[styles.tableCell, styles.tableCellLast, { width: '90%' }]}>{line}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View>
                <Text style={styles.sectionTitle}>Summary:</Text>
                <Text style={[styles.text, { marginLeft: 10, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 20 }]}>
                    {data.summary}
                </Text>
            </View>
        </>
    );
};

const MonthlyReportView = ({ data }) => (
    <>
        <Text style={styles.title}>Monthly Performance Report</Text>

        <View style={styles.metaTable}>
            <MetaRow
                label1="Month" value1={data.monthName}
                label2="Date" value2={data.reportDate}
            />
            <MetaRow label1="Client Name -" value1={data.clientName} />
            <MetaRow label1="Project Name -" value1={data.projectName} />
            <MetaRow label1="Consultant Name:" value1={data.employeeName} />
        </View>

        <View>
            <Text style={styles.sectionTitle}>1. Executive Summary</Text>
            <Text style={[styles.text, { marginLeft: 10, borderWidth: 1, borderColor: '#000', padding: 5, minHeight: 40 }]}>
                {data.executiveSummary || "-"}
            </Text>
        </View>

        <View>
            <Text style={styles.sectionTitle}>2. Key Activities Completed</Text>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, { width: '25%' }]}>Area / Department</Text>
                    <Text style={[styles.tableCell, { width: '50%' }]}>Activities Done</Text>
                    <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>Outcome / Impact</Text>
                </View>
                {data.objective && data.objective.split('\n').filter(l => l.trim()).length > 0 ? (
                    data.objective.split('\n').filter(l => l.trim()).map((line, index) => {
                        const parts = line.split("|");
                        return (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '25%' }]}>{parts[0]?.trim() || "-"}</Text>
                                <Text style={[styles.tableCell, { width: '50%' }]}>{parts[1]?.trim() || "-"}</Text>
                                <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>{parts[2]?.trim() || "-"}</Text>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '25%' }]}></Text>
                        <Text style={[styles.tableCell, { width: '50%' }]}></Text>
                        <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}></Text>
                    </View>
                )}
            </View>
        </View>

        <View>
            <Text style={styles.sectionTitle}>3. Achievements / Highlights of the Month</Text>
            <Text style={[styles.text, { marginLeft: 10, borderWidth: 1, borderColor: '#000', padding: 5, minHeight: 40 }]}>
                {data.keyAchievements || "-"}
            </Text>
        </View>

        <View>
            <Text style={styles.sectionTitle}>4. Challenges & Risks Identified</Text>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, { width: '25%' }]}>Challenge / Risk</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>Cause</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>Impact</Text>
                    <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>Action Taken / Plan</Text>
                </View>
                {data.obstacles && data.obstacles.split('\n').filter(l => l.trim()).length > 0 ? (
                    data.obstacles.split('\n').filter(l => l.trim()).map((line, index) => {
                        const parts = line.split("|");
                        return (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '25%' }]}>{parts[0]?.trim() || "-"}</Text>
                                <Text style={[styles.tableCell, { width: '25%' }]}>{parts[1]?.trim() || "-"}</Text>
                                <Text style={[styles.tableCell, { width: '25%' }]}>{parts[2]?.trim() || "-"}</Text>
                                <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}>{parts[3]?.trim() || "-"}</Text>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '25%' }]}></Text>
                        <Text style={[styles.tableCell, { width: '25%' }]}></Text>
                        <Text style={[styles.tableCell, { width: '25%' }]}></Text>
                        <Text style={[styles.tableCell, styles.tableCellLast, { width: '25%' }]}></Text>
                    </View>
                )}
            </View>
        </View>

        <View>
            <Text style={styles.sectionTitle}>5. Learnings & Observations</Text>
            <Text style={[styles.text, { marginLeft: 10, borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 20 }]}>
                {data.learnings}
            </Text>
        </View>

        <View>
            <Text style={styles.sectionTitle}>6. Next Month's Objective & Key Results</Text>
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, { width: '50%' }]}>Objectives</Text>
                    <Text style={[styles.tableCell, styles.tableCellLast, { width: '50%' }]}>Key Results</Text>
                </View>
                {data.nextMonthObjectives && data.nextMonthObjectives.split('\n').filter(l => l.trim()).length > 0 ? (
                    data.nextMonthObjectives.split('\n').filter(l => l.trim()).map((line, index) => {
                        const parts = line.split("|");
                        return (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '50%' }]}>{parts[0]?.trim() || "-"}</Text>
                                <Text style={[styles.tableCell, styles.tableCellLast, { width: '50%' }]}>{parts[1]?.trim() || "-"}</Text>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '50%' }]}></Text>
                        <Text style={[styles.tableCell, styles.tableCellLast, { width: '50%' }]}></Text>
                    </View>
                )}
            </View>
        </View>

        <View>
            <Text style={styles.sectionTitle}>Consultant's Note / Recommendations</Text>
            <Text style={[styles.text, { marginLeft: 10, borderWidth: 1, borderColor: '#000', padding: 5, minHeight: 40 }]}>
                {data.consultantNote}
            </Text>
        </View>

        <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Consultant Signature: </Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', marginLeft: 5, paddingLeft: 5, paddingRight: 5 }}>
                <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{data.employeeName}, Triology Solutions</Text>
            </View>
        </View>

    </>
);

const EmployeeReportPdfDocument = ({ reportType, data, tasks, tasksCompletedToday }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {reportType === 'Daily' && <DailyReportView data={data} tasksCompletedToday={tasksCompletedToday} />}
                {reportType === 'Weekly' && <WeeklyReportView data={data} tasks={tasks} />}
                {reportType === 'Monthly' && <MonthlyReportView data={data} />}

                {/* Footer */}
                <View style={{ position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#666' }}>
                    <Text>Generated on {new Date().toLocaleDateString()}</Text>
                    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};

export default EmployeeReportPdfDocument;
