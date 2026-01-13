/**
 * MomPdfDocument Component
 *
 * Purpose: React-PDF document for generating Minutes of Meeting PDFs.
 * Renders structured meeting information in a printable format.
 *
 * Responsibilities:
 * - Render PDF with meeting header and info table
 * - Display attendees (internal and external)
 * - Discussion table with topic and notes
 * - Action items table with task, responsible, deadline
 * - Optional comments section
 * - Footer with generation date and page numbers
 *
 * Dependencies:
 * - @react-pdf/renderer (Document, Page, Text, View, StyleSheet)
 *
 * Props (via data object):
 * - momNo: Meeting number identifier
 * - projectName: Project for the meeting
 * - meetingDate, meetingStartTime, meetingEndTime, meetingVenue
 * - attendees: Array of names/objects
 * - externalAttendees: Array of external participants
 * - momPreparedBy: Meeting preparer name
 * - discussions: Array of { topic, notes }
 * - actionItems: Array of { task, responsiblePerson, deadline }
 * - comments: Array of { author, text }
 *
 * Features:
 * - HTML parsing for notes (bold, lists, line breaks)
 * - Repeatable table headers for multi-page tables
 * - Normalized attendee handling (string/array/object)
 *
 * Last Modified: 2026-01-10
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 20,
        textAlign: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 8,
        backgroundColor: '#f0f0f0',
        padding: 5,
    },
    table: {
        width: '100%',
        marginBottom: 15,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderBottomStyle: 'solid',
    },
    tableHeader: {
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
    },
    tableCell: {
        padding: 6,
        borderRightWidth: 1,
        borderRightColor: '#000',
        borderRightStyle: 'solid',
    },
    tableCellFirst: {
        borderLeftWidth: 1,
        borderLeftColor: '#000',
        borderLeftStyle: 'solid',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    infoLabel: {
        fontWeight: 'bold',
        width: 120,
    },
    infoValue: {
        flex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#666',
    },
    commentSection: {
        marginTop: 15,
    },
    commentRow: {
        marginBottom: 5,
    },
    commentAuthor: {
        fontWeight: 'bold',
    },
    // Repeating table header style
    repeatableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderBottomStyle: 'solid',
        borderTopWidth: 1,
        borderTopColor: '#000',
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
    },
});

// Helper function to parse HTML and convert to structured text components
const parseHtmlToComponents = (html) => {
    if (!html) return [{ text: '—', bold: false }];

    const components = [];
    let currentText = '';
    let isBold = false;

    // First, replace <br/> with newline markers
    let processed = html.replace(/<br\s*\/?>/gi, '\n');

    // Replace </p> with double newlines
    processed = processed.replace(/<\/p>/gi, '\n\n');

    // Handle list items
    processed = processed.replace(/<li>/gi, '\n• ');
    processed = processed.replace(/<\/li>/gi, '');
    processed = processed.replace(/<\/?ul>/gi, '\n');

    // Now parse character by character to handle bold tags
    let i = 0;
    while (i < processed.length) {
        if (processed.substr(i, 3) === '<b>') {
            if (currentText) {
                components.push({ text: currentText, bold: isBold });
                currentText = '';
            }
            isBold = true;
            i += 3;
        } else if (processed.substr(i, 4) === '</b>') {
            if (currentText) {
                components.push({ text: currentText, bold: isBold });
                currentText = '';
            }
            isBold = false;
            i += 4;
        } else if (processed[i] === '<') {
            // Skip other HTML tags
            const closeTag = processed.indexOf('>', i);
            if (closeTag !== -1) {
                i = closeTag + 1;
            } else {
                i++;
            }
        } else {
            currentText += processed[i];
            i++;
        }
    }

    if (currentText) {
        components.push({ text: currentText, bold: isBold });
    }

    return components.length > 0 ? components : [{ text: '—', bold: false }];
};

// Reusable Table Header Component for repeating on each page
const ActionItemsTableHeader = () => (
    <View style={styles.repeatableHeader}>
        <View style={[styles.tableCell, styles.tableCellFirst, { width: '50%' }]}>
            <Text style={{ fontWeight: 'bold' }}>Task</Text>
        </View>
        <View style={[styles.tableCell, { width: '30%' }]}>
            <Text style={{ fontWeight: 'bold' }}>Responsible Person</Text>
        </View>
        <View style={[styles.tableCell, { width: '20%' }]}>
            <Text style={{ fontWeight: 'bold' }}>Deadline</Text>
        </View>
    </View>
);

const DiscussionTableHeader = () => (
    <View style={styles.repeatableHeader}>
        <View style={[styles.tableCell, styles.tableCellFirst, { width: '30%' }]}>
            <Text style={{ fontWeight: 'bold' }}>Topic</Text>
        </View>
        <View style={[styles.tableCell, { width: '70%' }]}>
            <Text style={{ fontWeight: 'bold' }}>Remark/Comments/Notes</Text>
        </View>
    </View>
);

// MOM PDF Document Component
const MomPdfDocument = ({ data }) => {
    const {
        momNo,
        projectName,
        meetingDate,
        meetingStartTime,
        meetingEndTime,
        meetingVenue,
        attendees: rawAttendees = [],
        externalAttendees: rawExternalAttendees = [],
        momPreparedBy,
        discussions = [],
        actionItems = [],
        comments = [],
    } = data;

    // Normalize attendees to array of strings (handles IDs, names, or mixed)
    const attendees = Array.isArray(rawAttendees)
        ? rawAttendees.map(a => typeof a === 'string' ? a : (a?.name || String(a)))
        : (typeof rawAttendees === 'string' && rawAttendees.trim() ? rawAttendees.split(',').map(s => s.trim()) : []);

    // Normalize externalAttendees: can be string, array, or empty
    const externalAttendees = Array.isArray(rawExternalAttendees)
        ? rawExternalAttendees.map(a => typeof a === 'string' ? a : (a?.name || String(a)))
        : (typeof rawExternalAttendees === 'string' && rawExternalAttendees.trim() ? rawExternalAttendees.split(',').map(s => s.trim()) : []);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Minutes of Meeting</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{momNo}</Text>
                </View>

                {/* Meeting Info Table */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
                        <View style={[styles.tableCell, styles.tableCellFirst, { width: '25%' }]}>
                            <Text style={{ fontWeight: 'bold' }}>Project</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '75%' }]}>
                            <Text>{projectName || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.tableCellFirst, { width: '25%' }]}>
                            <Text style={{ fontWeight: 'bold' }}>Date</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '25%' }]}>
                            <Text>{meetingDate || '—'}</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '25%' }]}>
                            <Text style={{ fontWeight: 'bold' }}>Time</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '25%' }]}>
                            <Text>{meetingStartTime || '—'} - {meetingEndTime || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.tableCellFirst, { width: '25%' }]}>
                            <Text style={{ fontWeight: 'bold' }}>Venue</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '75%' }]}>
                            <Text>{meetingVenue || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.tableCellFirst, { width: '25%' }]}>
                            <Text style={{ fontWeight: 'bold' }}>Attendees</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '75%' }]}>
                            <Text>{attendees.join(', ') || '—'}</Text>
                        </View>
                    </View>
                    {externalAttendees.length > 0 && (
                        <View style={styles.tableRow}>
                            <View style={[styles.tableCell, styles.tableCellFirst, { width: '25%' }]}>
                                <Text style={{ fontWeight: 'bold' }}>External</Text>
                            </View>
                            <View style={[styles.tableCell, { width: '75%' }]}>
                                <Text>{externalAttendees.join(', ')}</Text>
                            </View>
                        </View>
                    )}
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.tableCellFirst, { width: '25%' }]}>
                            <Text style={{ fontWeight: 'bold' }}>Prepared By</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '75%' }]}>
                            <Text>{momPreparedBy || '—'}</Text>
                        </View>
                    </View>
                </View>

                {/* Discussion Table */}
                <Text style={styles.sectionTitle}>Discussion:</Text>
                <View style={styles.table}>
                    <DiscussionTableHeader />
                    {discussions.map((disc, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={[styles.tableCell, styles.tableCellFirst, { width: '30%' }]}>
                                <Text style={{ fontWeight: 'bold' }}>{disc.topic || '—'}</Text>
                            </View>
                            <View style={[styles.tableCell, { width: '70%' }]}>
                                {parseHtmlToComponents(disc.notes).map((component, idx) => {
                                    // Split component text by newlines to create separate Text elements
                                    const lines = component.text.split('\n');
                                    return lines.map((line, lineIdx) => (
                                        <Text
                                            key={`${idx}-${lineIdx}`}
                                            style={component.bold ? { fontWeight: 'bold' } : {}}
                                        >
                                            {line || ' '}
                                        </Text>
                                    ));
                                })}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Action Items Table */}
                <Text style={styles.sectionTitle}>Next Action Plan:</Text>
                <View style={styles.table}>
                    <ActionItemsTableHeader />
                    {actionItems.map((item, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={[styles.tableCell, styles.tableCellFirst, { width: '50%' }]}>
                                <Text>{item.task || '—'}</Text>
                            </View>
                            <View style={[styles.tableCell, { width: '30%' }]}>
                                <Text>{item.responsiblePerson || '—'}</Text>
                            </View>
                            <View style={[styles.tableCell, { width: '20%' }]}>
                                <Text>{item.deadline || '—'}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Comments Section */}
                {comments.length > 0 && (
                    <View style={styles.commentSection}>
                        <Text style={styles.sectionTitle}>Comments / Notes</Text>
                        {comments.map((comment, i) => (
                            <View key={i} style={styles.commentRow}>
                                <Text>
                                    <Text style={styles.commentAuthor}>{comment.author || 'Unknown'}</Text>
                                    <Text>: {comment.text || ''}</Text>
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Generated on {new Date().toLocaleDateString()}</Text>
                    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};

export default MomPdfDocument;
