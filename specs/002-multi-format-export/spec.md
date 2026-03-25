# Feature Specification: Multi-Format Export

**Feature Branch**: `002-multi-format-export`
**Created**: 2026-03-23
**Status**: Draft
**Input**: User description: "Add PDF export button for each dashboard page, export buttons for each chart as PNG/PDF/SVG, export table data as Excel, let users choose export format"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export Individual Chart as Image (Priority: P1)

A dashboard user views a chart and wants to share or save it as an image for presentations, reports, or documentation. The user should be able to select their preferred image format and download it immediately.

**Why this priority**: Core feature that enables users to repurpose dashboard data; most frequently used export capability based on common analytics workflows.

**Independent Test**: Export a single Recharts chart to PNG and verify image quality and data representation. This alone delivers immediate user value and can be demonstrated independently.

**Acceptance Scenarios**:

1. **Given** a user is viewing a chart on the dashboard, **When** they click the export button, **Then** a format selector appears (PNG, PDF, SVG options)
2. **Given** a user selects PNG format from the export menu, **When** they confirm, **Then** a PNG file downloads with the chart data intact
3. **Given** a user selects PDF format, **When** they confirm, **Then** a PDF file downloads preserving chart dimensions and colors
4. **Given** a user selects SVG format, **When** they confirm, **Then** an SVG file downloads that remains editable in design tools
5. **Given** export is in progress, **When** user initiates the action, **Then** a loading indicator appears and export completes within 3 seconds

---

### User Story 2 - Export Full Dashboard Page to PDF (Priority: P1)

A dashboard user wants to export an entire dashboard page (all charts, metrics, tables) as a single PDF file for sharing with stakeholders or archival purposes.

**Why this priority**: Critical for reporting workflows; enables users to bundle entire analysis into a portable, shareable format. Equal priority to chart export as it's a complete dashboard use case.

**Independent Test**: Export a full dashboard page to PDF and verify all visible elements (charts, tables, KPI cards) are included with proper layout.

**Acceptance Scenarios**:

1. **Given** a user is viewing a complete dashboard page, **When** they click the dashboard export button, **Then** a PDF export option appears
2. **Given** the user confirms PDF export, **When** the action is triggered, **Then** a single PDF file downloads containing all visible dashboard elements
3. **Given** the dashboard has multiple sections, **When** exported to PDF, **Then** all sections are rendered with proper page breaks if needed
4. **Given** the dashboard contains charts and tables, **When** exported to PDF, **Then** data accuracy is preserved (numbers match on-screen values)
5. **Given** export is processing, **When** initiated, **Then** a loading state is shown and completes within 5 seconds

---

### User Story 3 - Export Table Data to Excel (Priority: P2)

A dashboard user viewing tabular data (patient statistics, performance metrics) wants to export it to Excel for further analysis, pivot tables, or sharing with team members who prefer spreadsheet tools.

**Why this priority**: Common workflow for data analysts; enables Excel-based workflows. Slightly lower priority than full-page dashboard export as it's a secondary use case (table is part of dashboard).

**Independent Test**: Export a visible table with all columns to Excel and verify all rows and data types are accurately represented.

**Acceptance Scenarios**:

1. **Given** a user is viewing a data table on the dashboard, **When** they click the table export button, **Then** an Excel export option is available
2. **Given** the user confirms Excel export, **When** the action is triggered, **Then** an XLSX file downloads with all visible columns and rows
3. **Given** the table contains numeric data, **When** exported to Excel, **Then** numbers are exported as numeric type (not text) for calculations
4. **Given** the table contains dates, **When** exported to Excel, **Then** dates are properly formatted and recognized as date type
5. **Given** the table has hidden columns, **When** exported, **Then** only visible columns are included in the export

---

### User Story 4 - Format Selector UI (Priority: P1)

A dashboard user needs an intuitive, consistent way to choose export format across all exportable elements (charts, dashboards, tables) without confusion about which formats are available for which components.

**Why this priority**: UX foundation that enables all other export stories; ensures user clarity and consistency. Required for all export scenarios.

**Independent Test**: A user can access format selector for any exportable element and clearly understand available formats before export.

**Acceptance Scenarios**:

1. **Given** a user clicks an export button on any component, **When** the action is triggered, **Then** available export formats are clearly displayed
2. **Given** a chart export is initiated, **When** the format selector appears, **Then** PNG, PDF, and SVG options are visible and labeled
3. **Given** a dashboard export is initiated, **When** the format selector appears, **Then** only PDF option is shown (as it's the only suitable format)
4. **Given** a table export is initiated, **When** the format selector appears, **Then** only Excel option is shown
5. **Given** a user hovers over a format option, **When** hovering, **Then** a tooltip explains the format and its use case (e.g., "SVG: Editable vector format for design tools")
6. **Given** a user selects a format and clicks export, **When** confirmed, **Then** no additional dialogs appear and download starts immediately

---

### Edge Cases

- What happens when a chart contains very large datasets (1000+ data points)? Export should still complete within timeout window with optimized rendering.
- How does the system handle special characters in chart titles when generating filenames? Filenames should be sanitized to be filesystem-safe.
- What if a user attempts to export a dashboard page that's wider than standard PDF width? Layout should be adjusted to fit within PDF bounds with readable text.
- How does the system handle network interruptions during large file exports? A retry mechanism or clear error message should be provided.
- What happens when exporting a table with more rows than can fit in a single Excel sheet? Multiple sheets or a note about row limits should be provided.
- What if a chart uses custom colors that don't render properly in SVG? Fallback to standard colors or notify user of potential color differences.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide export functionality for all Recharts chart components on the dashboard
- **FR-002**: System MUST support PNG, PDF, and SVG export formats for charts
- **FR-003**: System MUST provide export functionality for full dashboard pages
- **FR-004**: System MUST support PDF format for dashboard page exports
- **FR-005**: System MUST provide export functionality for data tables displayed on the dashboard
- **FR-006**: System MUST support Excel (XLSX) format for table data exports
- **FR-007**: System MUST display a format selector UI before executing export (except for single-format scenarios)
- **FR-008**: System MUST include chart title/table title in exported files as filename or document title
- **FR-009**: System MUST preserve data accuracy (numbers, dates, labels) in all exported formats
- **FR-010**: System MUST generate filesystem-safe filenames by sanitizing special characters
- **FR-011**: System MUST complete chart exports within 3 seconds and dashboard exports within 5 seconds
- **FR-012**: System MUST display loading/progress indicators during export processing
- **FR-013**: System MUST provide user feedback on successful export (e.g., toast notification)
- **FR-014**: System MUST handle export errors gracefully with user-friendly error messages
- **FR-015**: System MUST respect current data filter state when exporting (export only visible/filtered data)
- **FR-016**: System MUST support exporting tables with any number of columns and rows (with appropriate UX for large datasets)

### Key Entities

- **ExportFormat**: Enum type representing supported formats (PNG, PDF, SVG for charts; PDF for dashboard; XLSX for tables)
- **ExportConfig**: Configuration object containing format selection, source component reference, and filename
- **ExportJob**: Represents an in-flight export operation with status (pending, in-progress, complete, failed) and progress tracking

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can export any chart to their preferred format in under 3 seconds from initial click to file download
- **SC-002**: Users can export a full dashboard page to PDF in under 5 seconds from initial click to file download
- **SC-003**: Users can export a table with up to 1000 rows and 20 columns to Excel within 5 seconds
- **SC-004**: 95% of export operations complete successfully without errors on first attempt
- **SC-005**: Exported file sizes are appropriate to content (PNG chart ~100-500KB, PDF dashboard ~1-5MB, Excel table ~200KB-2MB)
- **SC-006**: 90% of users can successfully export a chart without requiring help or documentation
- **SC-007**: 100% of exported files open correctly in standard applications (PNG in image viewers, PDF in readers, XLSX in spreadsheet apps)
- **SC-008**: Data accuracy in exports matches on-screen display for all numeric, date, and text values
- **SC-009**: Exported filenames are human-readable and reflect the source component (e.g., "Patient_Count_Chart.png")
- **SC-010**: No performance degradation to dashboard when export functionality is present (load time same as baseline)

## Assumptions

- Users have standard applications available to open exported files (image viewer for PNG, PDF reader, Excel/spreadsheet app)
- Dashboard contains Recharts components for charts and HTML table elements or similar for data tables
- Export operations occur client-side for privacy (no server-side file generation required for basic formats)
- BMS Session authentication remains valid throughout export operation
- Current chart/table data visible in UI is the data to be exported (no historical data export)
- Users' browsers support File Download API (Blob, URL.createObjectURL)

## Dependencies & Constraints

- Must integrate with existing Recharts chart library without major refactoring
- PDF generation must work with existing frontend stack (React 19, Vite, TypeScript)
- Excel generation must produce compatible XLSX files
- Export buttons must not introduce significant UI clutter or break existing component layouts
- All export operations must be non-blocking to maintain responsive UI
- File downloads must be initiated client-side (no server intermediaries required)