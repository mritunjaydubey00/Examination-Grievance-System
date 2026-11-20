import { useCallback, useEffect, useRef, useState } from "react";
import AdminHeader from "../components/ExaminationCell/AdminHeader.jsx";
import UserProfileSection from "../components/UserProfileSection.jsx";
import AdminWorkspace from "../components/ExaminationCell/AdminWorkspace.jsx";
import CaseActionDialog from "../components/ExaminationCell/CaseActionDialog.jsx";
import {
  GrievanceGroupCreateDialog,
  GrievanceGroupForwardDialog,
} from "../components/ExaminationCell/GrievanceGroupDialogs.jsx";
import GrievanceThreadPage from "./GrievanceThreadPage.jsx";
import ToastNotice from "../components/ToastNotice.jsx";
import {
  PortalDashboard,
  PortalPlaceholderPage,
  PortalSidePanel,
} from "../components/PortalNavigation.jsx";
import {
  getDocumentUrl,
  createGrievanceGroup,
  forwardGrievanceGroupSolution,
  getActiveGroupForMaster,
  getGrievanceGroupForForward,
  listPendingGrievanceGroups,
  countGrievancesByFilters,
  listGrievances,
  listGrievanceFilterOptions,
  suggestSimilarGrievances,
  updateGrievance,
} from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";
import PortalLoading from "../components/PortalLoading.jsx";
import "./ExaminationCell.css";

const GRIEVANCE_PAGE_SIZE = 25;
const FILTER_QUERY_KEYS = {
  search: "q",
  department: "department",
  year: "year",
  status: "status",
  category: "category",
  dateFrom: "from",
  dateTo: "to",
};

function readUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    Object.entries(FILTER_QUERY_KEYS).map(([key, queryKey]) => [
      key,
      params.get(queryKey) || (key === "status" ? "ALL" : ""),
    ]),
  );
}

function readUrlPage() {
  const value = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function readUrlView() {
  const view = new URLSearchParams(window.location.search).get("view");
  return [
    "Profile",
    "Guidelines",
    "Notice Board",
    "All Grievances",
    "Active Grievances",
    "Resolved Grievances",
  ].includes(view)
    ? view
    : "Dashboard";
}

function readUrlMetric() {
  const metric = new URLSearchParams(window.location.search).get("metric");
  return [
    "total",
    "resolved",
    "pending",
    "awaiting-response",
    "forwarded",
  ].includes(metric)
    ? metric
    : "";
}

function getUrlWithFilters(
  filters,
  page,
  view = "Dashboard",
  metric = "",
) {
  const url = new URL(window.location.href);
  for (const [key, queryKey] of Object.entries(FILTER_QUERY_KEYS)) {
    url.searchParams.delete(queryKey);
    if (filters[key]) url.searchParams.set(queryKey, filters[key]);
  }
  if (page > 1) url.searchParams.set("page", String(page));
  else url.searchParams.delete("page");
  if (view !== "Dashboard") {
    url.searchParams.set("view", view);
  } else {
    url.searchParams.delete("view");
  }
  if (metric) url.searchParams.set("metric", metric);
  else url.searchParams.delete("metric");
  return url;
}

function ExaminationCell({
  session,
  mobileMenuTarget,
  onLogout,
  onChangePassword,
}) {
  const [grievances, setGrievances] = useState([]);
  const [filters, setFilters] = useState(readUrlFilters);
  const [page, setPage] = useState(readUrlPage);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    "awaiting-response": 0,
    forwarded: 0,
  });
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    admissionYears: [],
    categories: [],
  });
  const [dashboardMetric, setDashboardMetric] = useState(readUrlMetric);
  const [activeAction, setActiveAction] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);
  const [activePage, setActivePage] = useState(readUrlView);
  const [selectedGrievances, setSelectedGrievances] = useState([]);
  const [similarSuggestions, setSimilarSuggestions] = useState([]);
  const [pendingGroups, setPendingGroups] = useState([]);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMasterId, setGroupMasterId] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [pendingGroupForward, setPendingGroupForward] = useState(null);
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState([]);
  const [forwardingGroup, setForwardingGroup] = useState(false);
  const refreshRequest = useRef(0);

  const metricFilter =
    dashboardMetric ||
    (activePage === "Active Grievances"
      ? "active"
      : activePage === "Resolved Grievances"
        ? "resolved"
        : "");

  const examinationCellMetrics = [
    {
      key: "total",
      label: "Total Grievances Received",
      value: summary.total,
      tone: "teal",
    },
    {
      key: "resolved",
      label: "Resolved",
      value: summary.resolved,
      tone: "green",
    },
    {
      key: "pending",
      label: "Pending",
      value: summary.pending,
      tone: "amber",
    },
    {
      key: "awaiting-response",
      label: "Awaiting Student Response",
      value: summary["awaiting-response"],
      tone: "blue",
    },
    {
      key: "forwarded",
      label: "Forwarded to Faculty",
      value: summary.forwarded,
      tone: "teal",
    },
  ];

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequest.current;
    setLoading(true);
    setLoadError("");
    try {
      const [result, counts, options, groups] = await Promise.all([
        listGrievances({
          filters,
          metric: metricFilter,
          page,
          pageSize: GRIEVANCE_PAGE_SIZE,
        }),
        countGrievancesByFilters(filters),
        listGrievanceFilterOptions(),
        listPendingGrievanceGroups(),
      ]);
      if (requestId !== refreshRequest.current) return;
      const lastPage = Math.max(
        1,
        Math.ceil(result.count / GRIEVANCE_PAGE_SIZE),
      );
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setSummary(counts);
      setFilterOptions(options);
      setPendingGroups(groups);
      setTotalCount(result.count);
      const enriched = result.rows.map((row) => ({
        ...row,
        student_name: row.users?.["Full Name"] || row.student_user_id,
        branch: row.users?.Branch || "",
        student_department: row.users?.Department || "",
        assigned_faculty_name: row.assigned_faculty || "ExGrev Unforward",
        supporting_documents: row.supporting_documents || [],
      }));
      setGrievances(enriched);

      const documentErrors = [];
      const rowsWithDocumentUrls = await Promise.all(
        enriched.map(async (row) => ({
          ...row,
          supporting_documents: await Promise.all(
            row.supporting_documents.map(async (file) => {
              try {
                return { ...file, url: await getDocumentUrl(file.path) };
              } catch (error) {
                documentErrors.push(error);
                return file;
              }
            }),
          ),
        })),
      );
      if (requestId !== refreshRequest.current) return;
      setGrievances(rowsWithDocumentUrls);
      if (documentErrors.length) {
        setNoticeType("error");
        setNotice(
          documentErrors[0].message ||
            "Some supporting documents could not be loaded.",
        );
      }
    } catch (error) {
      const message =
        error.message ||
        "Could not load grievances. Apply the Supabase setup SQL and check table policies.";
      if (requestId === refreshRequest.current) {
        setLoadError(message);
        setNoticeType("error");
        setNotice(message);
      }
    } finally {
      if (requestId === refreshRequest.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [filters, metricFilter, page]);

  useEffect(() => {
    if (!selectedGrievances.length) {
      setSimilarSuggestions([]);
      return undefined;
    }

    let active = true;
    suggestSimilarGrievances(selectedGrievances[0].id)
      .then((suggestions) => {
        if (active) {
          setSimilarSuggestions(
            suggestions.filter(
              (suggestion) =>
                !selectedGrievances.some(({ id }) => id === suggestion.id),
            ),
          );
        }
      })
      .catch((error) => {
        if (active) {
          setSimilarSuggestions([]);
          setNoticeType("error");
          setNotice(error.message || "Could not load similar grievances.");
        }
      });

    return () => {
      active = false;
    };
  }, [selectedGrievances]);

  useEffect(() => {
    const url = getUrlWithFilters(
      filters,
      page,
      activePage,
      dashboardMetric,
    );
    window.history.replaceState(window.history.state, "", url);
  }, [activePage, dashboardMetric, filters, page]);

  useEffect(() => {
    function restoreFiltersFromUrl() {
      setFilters(readUrlFilters());
      setPage(readUrlPage());
      setActivePage(readUrlView());
      setDashboardMetric(readUrlMetric());
    }
    window.addEventListener("popstate", restoreFiltersFromUrl);
    return () => window.removeEventListener("popstate", restoreFiltersFromUrl);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("examination-cell-grievances")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grievances" },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const filteredGrievances = grievances;

  function handleFilterChange(key, value) {
    const nextFilters = { ...filters, [key]: value };
    const url = getUrlWithFilters(
      nextFilters,
      1,
      activePage,
      dashboardMetric,
    );
    const updateHistory = key === "search" ? "replaceState" : "pushState";
    window.history[updateHistory](window.history.state, "", url);
    setFilters(nextFilters);
    setPage(1);
  }

  function handlePageChange(nextPage) {
    const url = getUrlWithFilters(
      filters,
      nextPage,
      activePage,
      dashboardMetric,
    );
    window.history.pushState(window.history.state, "", url);
    setPage(nextPage);
  }

  function clearFilters() {
    const nextFilters = {
      search: "",
      department: "",
      year: "",
      status: "ALL",
      category: "",
      dateFrom: "",
      dateTo: "",
    };
    window.history.pushState(
      window.history.state,
      "",
      getUrlWithFilters(nextFilters, 1, activePage),
    );
    setFilters(nextFilters);
    setPage(1);
    setDashboardMetric("");
  }

  function showMetricGrievances(metric) {
    const nextFilters = { ...filters, status: "ALL" };
    const nextPage =
      metric === "total"
        ? "All Grievances"
        : metric === "resolved"
          ? "Resolved Grievances"
          : "Active Grievances";
    window.history.pushState(
      window.history.state,
      "",
      getUrlWithFilters(nextFilters, 1, nextPage, metric),
    );
    setFilters(nextFilters);
    setPage(1);
    setDashboardMetric(metric);
    setActivePage(nextPage);
  }

  function navigateToPage(nextPage) {
    const grievancePages = [
      "All Grievances",
      "Active Grievances",
      "Resolved Grievances",
    ];
    const nextFilters = grievancePages.includes(nextPage)
      ? { ...filters, status: "ALL" }
      : filters;
    window.history.pushState(
      window.history.state,
      "",
      getUrlWithFilters(nextFilters, 1, nextPage),
    );
    setFilters(nextFilters);
    setPage(1);
    setDashboardMetric("");
    setActivePage(nextPage);
  }

  function toggleSelectedGrievance(grievance) {
    setSelectedGrievances((current) => {
      if (current.some(({ id }) => id === grievance.id)) {
        return current.filter(({ id }) => id !== grievance.id);
      }
      if (grievance.status === "Resolved" || grievance.resolution_pending) {
        return current;
      }
      return [...current, grievance];
    });
  }

  function toggleSuggestedGrievance(grievance) {
    toggleSelectedGrievance(grievance);
  }

  function openGroupCreation() {
    if (selectedGrievances.length < 2) return;
    const first = selectedGrievances[0];
    if (
      selectedGrievances.some(
        ({ category, sub_category }) =>
          category !== first.category || sub_category !== first.sub_category,
      )
    ) {
      setNoticeType("error");
      setNotice("Select grievances with the same category and sub-category.");
      return;
    }
    setGroupName(
      `Similar cases · ${selectedGrievances[0]?.grievance_code || "New group"}`,
    );
    setGroupMasterId(selectedGrievances[0]?.id || "");
    setGroupCreateOpen(true);
  }

  async function handleCreateGroup() {
    setSavingGroup(true);
    try {
      await createGrievanceGroup({
        name: groupName,
        masterId: groupMasterId,
        grievanceIds: selectedGrievances.map(({ id }) => id),
      });
      setGroupCreateOpen(false);
      setSelectedGrievances([]);
      setNoticeType("success");
      setNotice("Similar grievance group created.");
      await refresh();
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not create the grievance group.");
    } finally {
      setSavingGroup(false);
    }
  }

  async function openGroupForward(groupId) {
    try {
      const group = await getGrievanceGroupForForward(groupId);
      if (!group || !group.members.length) {
        setNoticeType("error");
        setNotice("This group has no open grievances available to forward.");
        await refresh();
        return;
      }
      setPendingGroupForward(group);
      setSelectedGroupMemberIds(group.members.map(({ id }) => id));
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not load the grouped solution.");
    }
  }

  async function handleForwardGroupSolution() {
    setForwardingGroup(true);
    try {
      const count = await forwardGrievanceGroupSolution({
        groupId: pendingGroupForward.group.id,
        memberIds: selectedGroupMemberIds,
        userId: session.userId,
        masterAttachments:
          pendingGroupForward.master.resolution_attachments || [],
      });
      setPendingGroupForward(null);
      setNoticeType("success");
      setNotice(`Solution forwarded to ${count} grievance(s).`);
      await refresh();
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not forward the grouped solution.");
    } finally {
      setForwardingGroup(false);
    }
  }

  async function submitAction({ faculty, notes, dueDate, priority, files }) {
    try {
      const updatedGrievance = await updateGrievance({
        grievance: activeAction.grievance,
        action: activeAction.action,
        faculty,
        notes,
        userId: session.userId,
        files,
        dueDate,
        priority,
      });
      let groupLoadError = "";
      if (activeAction.action === "resolve") {
        try {
          const group = await getActiveGroupForMaster(activeAction.grievance.id);
          if (group?.members.length) {
            setPendingGroupForward({
              ...group,
              master: updatedGrievance,
            });
            setSelectedGroupMemberIds(
              group.members.map(({ id }) => id),
            );
          }
        } catch (error) {
          groupLoadError =
            error.message || "Could not check for a grouped solution.";
        }
      }
      setActiveAction(null);
      setNoticeType(groupLoadError ? "error" : "success");
      setNotice(groupLoadError
        ? `Resolution proposed, but grouped cases could not be loaded: ${groupLoadError}`
        :
        activeAction.action === "remark"
          ? "Remark sent. Grievance status is now In Progress."
          : activeAction.action === "resolve"
            ? "Resolution proposed. The grievance will be resolved after the student confirms."
            : "Grievance updated.");
      await refresh();
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not update grievance.");
    }
  }

  if (initialLoading) {
    return <PortalLoading label="Loading the Examination Cell…" />;
  }

  if (threadGrievanceId) {
    return (
      <div className="student-page examination-cell-page portal-thread-shell">
        <div className="portal-layout">
          <PortalSidePanel
            role="exam-cell"
            userId={session.userId}
            mobileMenuTarget={mobileMenuTarget}
            activePage={activePage}
            onNavigate={(page) => {
              setThreadGrievanceId(null);
              navigateToPage(page);
            }}
            onLogout={onLogout}
          />
          <div className="portal-content portal-thread-content">
            <GrievanceThreadPage
              grievanceId={threadGrievanceId}
              session={session}
              onBack={() => setThreadGrievanceId(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="student-page examination-cell-page">
      <AdminHeader session={session} />
      <div className="portal-layout">
        <PortalSidePanel
          role="exam-cell"
          mobileMenuTarget={mobileMenuTarget}
          activePage={activePage}
          onNavigate={navigateToPage}
          onLogout={onLogout}
        />
        <div className="portal-content">
          {activePage === "Dashboard" && (
            <PortalDashboard
              role="exam-cell"
              userId={session.userId}
              metrics={examinationCellMetrics}
              canEditContent
              onMetricClick={showMetricGrievances}
            />
          )}
          {["All Grievances", "Active Grievances", "Resolved Grievances"].includes(
            activePage,
          ) && (
            <AdminWorkspace
              grievances={filteredGrievances}
              loading={loading}
              error={loadError}
              filters={filters}
              filterOptions={filterOptions}
              categories={filterOptions.categories}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              totalCount={totalCount}
              page={page}
              pageSize={GRIEVANCE_PAGE_SIZE}
              onPageChange={handlePageChange}
              onAction={(grievance, action) =>
                setActiveAction({ grievance, action })
              }
              onOpenThread={(grievance) => setThreadGrievanceId(grievance.id)}
              selectedGrievances={selectedGrievances}
              onToggleSelection={toggleSelectedGrievance}
              suggestions={similarSuggestions}
              onGroupSelected={openGroupCreation}
              onToggleSuggestion={toggleSuggestedGrievance}
              pendingGroups={pendingGroups}
              onResumeGroup={openGroupForward}
            />
          )}
          {activePage === "Profile" && (
            <UserProfileSection
              session={session}
              onChangePassword={onChangePassword}
            />
          )}
          {["Guidelines", "Notice Board"].includes(activePage) && (
            <PortalPlaceholderPage
              page={activePage}
              canEditContent
              userId={session.userId}
            />
          )}
        </div>
      </div>
      <CaseActionDialog
        grievance={activeAction?.grievance}
        action={activeAction?.action}
        onClose={() => setActiveAction(null)}
        onChooseAction={(action) =>
          setActiveAction((current) => ({ ...current, action }))
        }
        onSubmit={submitAction}
      />
      {groupCreateOpen && (
        <GrievanceGroupCreateDialog
          grievances={selectedGrievances}
          name={groupName}
          masterId={groupMasterId}
          saving={savingGroup}
          onNameChange={setGroupName}
          onMasterChange={setGroupMasterId}
          onClose={() => setGroupCreateOpen(false)}
          onSubmit={handleCreateGroup}
        />
      )}
      {pendingGroupForward && (
        <GrievanceGroupForwardDialog
          group={pendingGroupForward.group}
          members={pendingGroupForward.members}
          master={pendingGroupForward.master}
          selectedIds={selectedGroupMemberIds}
          saving={forwardingGroup}
          onToggle={(id) =>
            setSelectedGroupMemberIds((current) =>
              current.includes(id)
                ? current.filter((memberId) => memberId !== id)
                : [...current, id],
            )
          }
          onClose={() => setPendingGroupForward(null)}
          onConfirm={handleForwardGroupSolution}
        />
      )}
      <ToastNotice
        message={notice}
        type={noticeType}
        onDismiss={() => setNotice("")}
      />
    </main>
  );
}

export default ExaminationCell;
