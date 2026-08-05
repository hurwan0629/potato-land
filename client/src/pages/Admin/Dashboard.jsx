import { useState, useEffect } from "react";
import { Users, FileText, CheckCircle2, DollarSign } from "lucide-react";
import { adminApi } from "../../api/adminApi";
import DashboardChart from "./DashboardChart";
import "./Dashboard.css";

const STAT_CARDS = [
  {
    key: "activeUserCount",
    label: "총 회원 수",
    unit: "명",
    icon: Users,
    className: "stat-card-orange",
  },
  {
    key: "totalListingCount",
    label: "총 게시글 수",
    unit: "건",
    icon: FileText,
    className: "stat-card-green",
  },
  {
    key: "completedTransactionCount",
    label: "총 거래 수",
    unit: "건",
    icon: CheckCircle2,
    className: "stat-card-purple",
  },
  {
    key: "totalCompletedAmount",
    label: "총 거래 금액",
    unit: "원",
    icon: DollarSign,
    className: "stat-card-pink",
  },
];

const toChartData = (counts) =>
  (counts ?? []).map((c) => ({ label: c.period, value: c.count }));

export default function Dashboard() {
  const [metric, setMetric] = useState("listing");
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    function fetchDashboard() {
      setError(null);

      adminApi
        .getDashboard({ from: "2026-07-01", to: "2026-07-28", interval: "DAY" })
        .then((res) => {
          if (cancelled) return;
          setDashboard(res.data);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message);
        });
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = dashboard
    ? toChartData(metric === "listing" ? dashboard.listingRegistrationCounts : dashboard.completedTransactionCounts)
    : [];

  return (
    <div className="admin-dashboard">
      <h1 className="admin-page-title">대시보드</h1>

      {error && <p>대시보드 정보를 불러오지 못했습니다. ({error})</p>}

      <div className="dashboard-stats">
        {STAT_CARDS.map(({ key, label, unit, icon: Icon, className }) => (
          <div key={key} className={`stat-card ${className}`}>
            <div className="stat-card-icon">
              <Icon size={20} />
            </div>
            <div>
              <p className="stat-card-label">{label}</p>
              <p className="stat-card-value">
                {dashboard ? dashboard[key].toLocaleString() : "-"} <span>{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel-header">
          <h2>
            {metric === "listing" ? "일별 게시물 등록 추이" : "일별 완료된 거래 추이"}
          </h2>
          <span className="dashboard-range">2026.07.01 ~ 2026.07.28</span>
        </div>

        {chartData.length > 0 ? (
          <DashboardChart
            data={chartData}
            metricLabel={metric === "listing" ? "등록 수" : "거래 수"}
            unit={metric === "listing" ? "개" : "건"}
          />
        ) : (
          <p>표시할 데이터가 없습니다.</p>
        )}

        <div className="dashboard-toggle">
          <button
            type="button"
            className={metric === "listing" ? "dashboard-toggle-btn active" : "dashboard-toggle-btn"}
            onClick={() => setMetric("listing")}
          >
            일별 게시물 등록 추이
          </button>
          <button
            type="button"
            className={metric === "transaction" ? "dashboard-toggle-btn active" : "dashboard-toggle-btn"}
            onClick={() => setMetric("transaction")}
          >
            일별 완료된 거래 추이
          </button>
        </div>
      </div>
    </div>
  );
}
