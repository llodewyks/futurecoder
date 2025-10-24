import React, {useEffect, useMemo, useState} from "react";
import {fetchAdminProgress, progressApiAvailable} from "../services/progressApi";

const stripHtml = (html) => (html || "").replace(/<[^>]+>/g, "");

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return "Not updated yet";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Not updated yet";
  }
  return new Intl.DateTimeFormat(undefined, {dateStyle: "medium", timeStyle: "short"}).format(date);
};

const statusLabels = {
  completed: "Completed",
  inProgress: "In progress",
  notStarted: "Not started",
  noSteps: "No steps defined",
};

const AdminDashboard = ({pages, pagesProgress, user, isAdmin}) => {
  const fallbackUsers = useMemo(() => [
    {
      userId: user?.uid || user?.email || "current-user",
      email: user?.email || "Current learner",
      pagesProgress: pagesProgress || {},
    }
  ], [pagesProgress, user]);
  const [availableUsers, setAvailableUsers] = useState(fallbackUsers);
  const [activeUserId, setActiveUserId] = useState(fallbackUsers[0]?.userId || "");
  const [loading, setLoading] = useState(progressApiAvailable && isAdmin);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!progressApiAvailable) {
      setAvailableUsers(fallbackUsers);
      setActiveUserId(fallbackUsers[0]?.userId || "");
    }
  }, [fallbackUsers, progressApiAvailable]);

  useEffect(() => {
    if (!progressApiAvailable || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchAdminProgress();
        const items = Array.isArray(response?.users) ? response.users : Array.isArray(response) ? response : [];
        const mapped = items
          .map(entry => ({
            userId: entry.userId || entry.uid || entry.id || entry.email,
            email: entry.email || entry.userEmail || entry.user?.email || `(user ${entry.userId || entry.uid || entry.id || entry.email || "unknown"})`,
            pagesProgress: entry.pagesProgress || entry.progress || {},
          }))
          .filter(item => item.userId);
        if (!cancelled && mapped.length) {
          setAvailableUsers(mapped);
          setActiveUserId(prev => mapped.some(item => item.userId === prev) ? prev : mapped[0].userId);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load admin progress from Azure API", err);
          setError("Unable to load progress data from Azure right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const activeUser = useMemo(
    () => availableUsers.find(candidate => candidate.userId === activeUserId) || availableUsers[0] || fallbackUsers[0],
    [availableUsers, activeUserId]
  );

  const summary = useMemo(() => {
    const values = Object.values(pages || {})
      .filter(page => page?.slug && page.slug !== "loading_placeholder")
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map(page => {
        const steps = page.steps || [];
        const progress = activeUser?.pagesProgress?.[page.slug] || {};
        const stepName = progress.step_name || steps[0]?.name || "";
        let stepIndex = steps.findIndex(step => step.name === stepName);
        if (stepIndex === -1) {
          stepIndex = 0;
        }
        const totalSteps = steps.length || 0;
        const hasActivity = Boolean(progress.updated_at) || stepIndex > 0;
        let statusKey = "notStarted";
        let completedSteps = Math.min(stepIndex, totalSteps);
        if (!totalSteps) {
          statusKey = "noSteps";
          completedSteps = 0;
        } else if (hasActivity && stepIndex >= totalSteps - 1) {
          statusKey = "completed";
          completedSteps = totalSteps;
        } else if (hasActivity) {
          statusKey = "inProgress";
        }
        const percent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
        const currentStepNumber = totalSteps ? Math.min(stepIndex + 1, totalSteps) : 0;
        return {
          slug: page.slug,
          title: stripHtml(page.title) || page.slug,
          totalSteps,
          percent,
          statusKey,
          updatedAt: progress.updated_at || null,
          currentStepNumber,
          stepName,
        };
      });

    const totals = values.reduce((acc, row) => {
      acc.percentSum += row.percent;
      if (row.statusKey === "completed") {
        acc.completed += 1;
      } else if (row.statusKey === "inProgress") {
        acc.inProgress += 1;
      } else if (row.statusKey === "notStarted") {
        acc.notStarted += 1;
      }
      return acc;
    }, {percentSum: 0, completed: 0, inProgress: 0, notStarted: 0});

    const overallPercent = values.length ? Math.round(totals.percentSum / values.length) : 0;

    return {
      rows: values,
      overallPercent,
      counts: totals,
      totalPages: values.length,
    };
  }, [pages, activeUser]);

  return (
    <div className="admin-dashboard markdown-body">
      <h1>Admin Progress Dashboard</h1>
      <p className="text-muted">
        Tracking progress for {activeUser?.email || "selected learner"} across {summary.totalPages} pages.
      </p>

      {availableUsers.length > 1 &&
        <div className="mb-3">
          <label className="form-label fw-bold">Select learner</label>
          <select
            className="form-select"
            value={activeUserId}
            onChange={(event) => setActiveUserId(event.target.value)}
          >
            {availableUsers.map(item => (
              <option key={item.userId} value={item.userId}>
                {item.email || item.userId}
              </option>
            ))}
          </select>
        </div>
      }

      {loading &&
        <div className="alert alert-info">Loading progress data from Azure...</div>
      }
      {error &&
        <div className="alert alert-warning">{error}</div>
      }

      <div className="row mb-4">
        <div className="col-md-4 col-sm-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Overall completion</h6>
              <h3 className="card-title">{summary.overallPercent}%</h3>
              <div className="progress" style={{height: "8px"}}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{width: `${summary.overallPercent}%`}}
                  aria-valuenow={summary.overallPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 col-sm-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Pages completed</h6>
              <h3 className="card-title">{summary.counts.completed} / {summary.totalPages}</h3>
              <p className="card-text text-muted small mb-0">In progress: {summary.counts.inProgress}</p>
              <p className="card-text text-muted small mb-0">Not started: {summary.counts.notStarted}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-bordered align-middle">
          <thead className="table-light">
          <tr>
            <th scope="col">Page</th>
            <th scope="col">Current step</th>
            <th scope="col">Progress</th>
            <th scope="col">Status</th>
            <th scope="col">Last updated</th>
          </tr>
          </thead>
          <tbody>
          {summary.rows.length === 0
            ? (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  Course content is still loading. Please check back shortly.
                </td>
              </tr>
            )
            : summary.rows.map(row => (
              <tr key={row.slug}>
                <th scope="row">{row.title}</th>
                <td>
                  {row.totalSteps
                    ? (
                      <>
                        <div>Step {row.currentStepNumber} of {row.totalSteps}</div>
                        <div className="text-muted small">{row.stepName}</div>
                      </>
                    )
                    : "No steps available"}
                </td>
                <td style={{minWidth: "160px"}}>
                  <div className="progress" style={{height: "8px"}}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{width: `${row.percent}%`}}
                      aria-valuenow={row.percent}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                  </div>
                  <div className="small text-muted mt-1">{row.percent}%</div>
                </td>
                <td>{statusLabels[row.statusKey] || row.statusKey}</td>
                <td>{formatTimestamp(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
