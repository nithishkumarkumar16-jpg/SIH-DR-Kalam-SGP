import React, { useState } from "react";
import "./AnalyticsCharts.css";

/**
 * Accessible Bar Chart with Toggleable Table Alternative
 */
export function BarChartWithTable({
  title,
  subtitle,
  data = [],
  onBarClick,
  unit = "",
  ariaLabel = "Bar chart visualization",
  activeKey = null,
}) {
  const [viewMode, setViewMode] = useState("chart"); // "chart" | "table"

  const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1);

  return (
    <div className="sgp-chart-card" role="region" aria-label={title || ariaLabel}>
      <div className="chart-header-row">
        <div>
          {title && <h4 className="chart-title">{title}</h4>}
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <div className="chart-controls">
          <div className="view-toggle" role="group" aria-label="Display View">
            <button
              type="button"
              className={`toggle-btn ${viewMode === "chart" ? "active" : ""}`}
              onClick={() => setViewMode("chart")}
              aria-pressed={viewMode === "chart"}
              title="View visual chart"
            >
              📊 Chart
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              title="View accessible data table"
            >
              📋 Table
            </button>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="chart-empty-state">No records available for the selected filters.</div>
      ) : viewMode === "chart" ? (
        <div className="chart-visual-wrapper">
          <div className="bar-list-container" role="list">
            {data.map((item, idx) => {
              const label = item.label || item.stageLabel || item.stageName || (item.key ? String(item.key).replace(/_/g, " ") : "Unknown");
              const val = Number(item.value) || 0;
              const barWidth = maxValue > 0 && val > 0 ? Math.min(100, Math.round((val / maxValue) * 100)) : 0;
              const isSelected = activeKey && (item.key === activeKey || label === activeKey);
              const displayValText = val === 0 ? `0 ${unit === "defects" ? "defects" : "applications"}` : `${val.toLocaleString("en-IN")} ${unit || "applications"}`;

              return (
                <div
                  key={item.key || idx}
                  className={`bar-row-item ${onBarClick ? "clickable" : ""} ${isSelected ? "selected-bar" : ""}`}
                  onClick={() => onBarClick && onBarClick({ ...item, label, value: val })}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && onBarClick) {
                      e.preventDefault();
                      onBarClick({ ...item, label, value: val });
                    }
                  }}
                  tabIndex={onBarClick ? 0 : undefined}
                  role={onBarClick ? "button" : "listitem"}
                  aria-label={`${label}: ${displayValText}. ${onBarClick ? "Click to filter queue." : ""}`}
                >
                  <div className="bar-label-col">
                    <span className="bar-label-text" title={label}>
                      {label}
                    </span>
                    {item.sublabel && <span className="bar-sublabel">{item.sublabel}</span>}
                  </div>
                  <div className="bar-track-col">
                    {val > 0 && (
                      <div
                        className="bar-fill"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: item.color || "#2563eb",
                        }}
                      />
                    )}
                  </div>
                  <div className="bar-value-col">
                    <span className={`bar-value-text ${val === 0 ? "zero-val" : ""}`}>
                      {displayValText}
                    </span>
                  </div>
                  <div className="bar-meta-col">
                    <span className="bar-percentage">{item.percentage !== undefined ? `${item.percentage}%` : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {onBarClick && <span className="chart-click-hint">💡 Tip: Click any bar to drill down and filter the matching applications.</span>}
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <table className="chart-table" aria-label={title || "Chart Data Table"}>
            <thead>
              <tr>
                <th scope="col">Category / Stage</th>
                <th scope="col" style={{ textAlign: "right" }}>Count ({unit || "Records"})</th>
                <th scope="col" style={{ textAlign: "right" }}>Share (%)</th>
                {onBarClick && <th scope="col" style={{ textAlign: "center" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const label = item.label || item.stageLabel || item.stageName || (item.key ? String(item.key).replace(/_/g, " ") : "Unknown");
                const val = Number(item.value) || 0;
                return (
                  <tr key={item.key || idx}>
                    <td>
                      <strong>{label}</strong>
                      {item.sublabel && <span className="tbl-subtext"> — {item.sublabel}</span>}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {val === 0 ? `0 ${unit === "defects" ? "defects" : "applications"}` : val.toLocaleString("en-IN")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {item.percentage !== undefined ? `${item.percentage}%` : "—"}
                    </td>
                    {onBarClick && (
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="tbl-drilldown-btn"
                          onClick={() => onBarClick({ ...item, label, value: val })}
                        >
                          Filter Queue →
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Accessible Dual Line Trend Chart
 */
export function DualLineTrendChart({
  title,
  subtitle,
  data = [],
  series1Name,
  series2Name,
  series1Label,
  series2Label,
  series1Color = "#2563eb",
  series2Color = "#10b981",
}) {
  const [viewMode, setViewMode] = useState("chart");

  const s1Name = series1Name || series1Label || "Applications submitted";
  const s2Name = series2Name || series2Label || "Reviews completed";

  const getV1 = (d) => Number(d.submissions ?? d.series1 ?? d.value1 ?? 0);
  const getV2 = (d) => Number(d.reviewsCompleted ?? d.series2 ?? d.value2 ?? 0);

  const getWeekText = (d, i) => {
    if (d.weekLabel) return d.weekLabel;
    if (d.week) return d.week;
    if (d.startDate && d.endDate) return `${d.startDate} – ${d.endDate}`;
    return `Week ${i + 1}`;
  };

  const getAxisDateLabel = (d, i) => {
    const raw = getWeekText(d, i);
    if (raw.includes("(") && raw.includes(")")) {
      return raw.split("(")[1].replace(")", "").trim();
    }
    if (raw.includes("–")) {
      return raw.split("–")[0].trim();
    }
    return raw;
  };

  const maxVal = Math.max(
    ...data.flatMap((d) => [getV1(d), getV2(d)]),
    5
  );

  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (idx) => padLeft + (data.length > 1 ? (idx / (data.length - 1)) * chartW : chartW / 2);
  const getY = (val) => padTop + chartH - (val / maxVal) * chartH;

  const pts1 = data.map((d, i) => `${getX(i)},${getY(getV1(d))}`).join(" ");
  const pts2 = data.map((d, i) => `${getX(i)},${getY(getV2(d))}`).join(" ");

  return (
    <div className="sgp-chart-card" role="region" aria-label={title || "Weekly trend visualization"}>
      <div className="chart-header-row">
        <div>
          {title && <h4 className="chart-title">{title}</h4>}
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <div className="chart-controls">
          <div className="view-toggle">
            <button
              type="button"
              className={`toggle-btn ${viewMode === "chart" ? "active" : ""}`}
              onClick={() => setViewMode("chart")}
            >
              📈 Trend
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              📋 Table
            </button>
          </div>
        </div>
      </div>

      <div className="chart-legend-row">
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: series1Color }}></span>
          {s1Name}
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: series2Color }}></span>
          {s2Name}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="chart-empty-state">No trend records available for the selected period.</div>
      ) : viewMode === "chart" ? (
        <div className="trend-svg-container">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="trend-svg"
            role="img"
            aria-label={`${title}: Trend line chart over ${data.length} weekly periods`}
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padTop + chartH * (1 - pct);
              const val = Math.round(maxVal * pct);
              return (
                <g key={i}>
                  <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Polyline Series 1 */}
            {pts1 && <polyline fill="none" stroke={series1Color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts1} />}

            {/* Polyline Series 2 */}
            {pts2 && <polyline fill="none" stroke={series2Color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" points={pts2} />}

            {/* Markers and X Labels */}
            {data.map((d, i) => {
              const x = getX(i);
              const v1 = getV1(d);
              const v2 = getV2(d);
              const y1 = getY(v1);
              const y2 = getY(v2);
              const fullLabel = getWeekText(d, i);
              const dateAxisLabel = getAxisDateLabel(d, i);

              return (
                <g key={i}>
                  <circle cx={x} cy={y1} r="4" fill={series1Color} stroke="#fff" strokeWidth="1.5">
                    <title>{`${fullLabel} - ${s1Name}: ${v1}`}</title>
                  </circle>
                  <circle cx={x} cy={y2} r="4" fill={series2Color} stroke="#fff" strokeWidth="1.5">
                    <title>{`${fullLabel} - ${s2Name}: ${v2}`}</title>
                  </circle>
                  <text x={x} y={svgHeight - 10} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600">
                    {dateAxisLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <table className="chart-table" aria-label={title || "Weekly trend data table"}>
            <thead>
              <tr>
                <th scope="col">Time Period</th>
                <th scope="col" style={{ textAlign: "right" }}>{s1Name}</th>
                <th scope="col" style={{ textAlign: "right" }}>{s2Name}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i}>
                  <td><strong>{getWeekText(d, i)}</strong></td>
                  <td style={{ textAlign: "right", color: series1Color, fontWeight: 700 }}>
                    {getV1(d).toLocaleString("en-IN")}
                  </td>
                  <td style={{ textAlign: "right", color: series2Color, fontWeight: 700 }}>
                    {getV2(d).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Accessible Application Funnel Chart
 */
export function FunnelChart({ title, subtitle, stages = [], cohortName = "Academic Year 2026-2027" }) {
  const [viewMode, setViewMode] = useState("chart");

  return (
    <div className="sgp-chart-card" role="region" aria-label={title || "Cohort Funnel Visualization"}>
      <div className="chart-header-row">
        <div>
          {title && <h4 className="chart-title">{title}</h4>}
          <p className="chart-subtitle">
            {subtitle || `Tracking application progression for same cohort: ${cohortName}`}
          </p>
        </div>
        <div className="chart-controls">
          <div className="view-toggle">
            <button
              type="button"
              className={`toggle-btn ${viewMode === "chart" ? "active" : ""}`}
              onClick={() => setViewMode("chart")}
            >
              📊 Funnel
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              📋 Table
            </button>
          </div>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="funnel-container">
          {stages.map((st, idx) => {
            const pct = st.percentage ?? 0;
            return (
              <div key={idx} className="funnel-stage-item">
                <div className="funnel-stage-hd">
                  <span className="funnel-stage-title">{st.stageName}</span>
                  <div className="funnel-stage-nums">
                    <strong>{st.count.toLocaleString("en-IN")}</strong>
                    <span className="funnel-stage-pct">({pct}% of cohort)</span>
                  </div>
                </div>
                <div className="funnel-bar-track">
                  <div
                    className="funnel-bar-fill"
                    style={{
                      width: `${Math.max(6, pct)}%`,
                      background: `linear-gradient(90deg, #3b82f6 ${100 - idx * 15}%, #059669 100%)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <table className="chart-table">
            <thead>
              <tr>
                <th scope="col">Workflow Stage</th>
                <th scope="col" style={{ textAlign: "right" }}>Applications Reaching Stage</th>
                <th scope="col" style={{ textAlign: "right" }}>Cohort Conversion (%)</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((st, idx) => (
                <tr key={idx}>
                  <td><strong>{st.stageName}</strong></td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{st.count.toLocaleString("en-IN")}</td>
                  <td style={{ textAlign: "right" }}>{st.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Pending Case Age Buckets Cards
 */
export function AgeBucketCards({
  title = "Pending-Case Age Distribution",
  buckets = [],
  averageAgeDays = null,
  openCasesCount = 0,
  onBucketClick,
}) {
  return (
    <div className="sgp-chart-card">
      <div className="chart-header-row">
        <div>
          <h4 className="chart-title">{title}</h4>
          <p className="chart-subtitle">
            Current open backlog segmented by age since initial student submission ({openCasesCount} open cases)
          </p>
        </div>
        {averageAgeDays !== null && (
          <div className="age-summary-badge">
            Avg Pending Age: <strong>{averageAgeDays} Days</strong>
          </div>
        )}
      </div>

      <div className="age-buckets-grid">
        {buckets.map((b) => {
          const isUrgent = b.bucketKey === "14+";
          return (
            <div
              key={b.bucketKey}
              className={`age-bucket-box ${isUrgent ? "bucket-urgent" : ""} ${onBucketClick ? "clickable" : ""}`}
              onClick={() => onBucketClick && onBucketClick(b)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onBucketClick) {
                  e.preventDefault();
                  onBucketClick(b);
                }
              }}
              tabIndex={onBucketClick ? 0 : undefined}
              role={onBucketClick ? "button" : undefined}
              title={`Click to filter open applications in ${b.label}`}
            >
              <div className="bucket-lbl">{b.label}</div>
              <div className="bucket-val">{b.count}</div>
              <div className="bucket-sub">
                {isUrgent && b.count > 0 ? "⚠️ Overdue Escalation" : "Active verification"}
              </div>
            </div>
          );
        })}
      </div>
      {onBucketClick && <span className="chart-click-hint">💡 Click any bucket to view only cases in that age range.</span>}
    </div>
  );
}

/**
 * Metric Tile Card with Metric Definition and Denominator
 */
export function MetricTile({
  label,
  value,
  sublabel,
  definition,
  sampleSize,
  colorClass = "blue",
  isClickable = false,
  onClick,
  demoBadge = false,
}) {
  return (
    <div
      className={`metric-tile tile-${colorClass} ${isClickable ? "clickable-tile" : ""}`}
      onClick={() => isClickable && onClick && onClick()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && isClickable && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? "button" : undefined}
    >
      <div className="tile-top-row">
        <span className="tile-label">{label}</span>
        {demoBadge && <span className="tile-demo-badge">Demo Data</span>}
      </div>
      <div className="tile-val">{value}</div>
      {sublabel && <div className="tile-sublabel">{sublabel}</div>}
      {definition && <div className="tile-def" title={definition}>{definition}</div>}
      {sampleSize !== undefined && <div className="tile-sample">Sample: {sampleSize} records</div>}
    </div>
  );
}
