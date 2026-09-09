# Rules and Conventions for TDS DT Application

## Entity-Specific Rules

### 1. MR-MGA Maintenance Régionale de Magenta
- **Weekly Synthesis Calculation**:
  - Do **NOT** include weekends (Saturdays and Sundays) when generating the weekly synthesized statuses from daily records.
- **Weekly Status Priorities**:
  - In case of equality when aggregating weekly status from daily values, pick the status with the highest priority based on this scale:
    `AE > EPI > TRV > TLT > FOR > MIS > ABS_V > EXC > CET > ABS_D > OFF`
- **Yearly Grid cell Hover Info**:
  - Show the full status label, description, and comment on cell hover inside the `YearlyGrid`.
- **Weekly Print Layout**:
  - Hide the "Légende Tableau de Service" section entirely when printing the weekly view of MR-MGA, keeping only the "Légende Planning" section.
  - Comments in the print view must preserve line-breaks (`whitespace-pre-wrap` formatted, using mini monospaced typography).
