import { useEffect, useMemo, useRef } from 'react';
import { Chart as ChartJS } from 'chart.js/auto';
import { FiTrendingDown, FiTrendingUp } from 'react-icons/fi';

function getLast7DaysLabels() {
  const formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
  return Array.from({ length: 7 }, (_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - idx));
    return formatter.format(date);
  });
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

function mobileFriendlyTick(value, index, scale) {
  const fullLabel = scale.getLabelForValue(value);
  if (!isMobileViewport()) return fullLabel;
  if (index % 2 !== 0) return '';
  return fullLabel.split(' ')[0];
}

const searchData = [870, 780, 120, 60, 760, 1080, 540];
const profileData = [42, 58, 35, 64, 78, 71, 90];

function buildCommonXAxis() {
  return {
    grid: { display: false },
    ticks: {
      color: '#64748B',
      autoSkip: true,
      maxRotation: 0,
      minRotation: 0,
      font: { size: 11 },
      callback(value, index) {
        return mobileFriendlyTick(value, index, this);
      },
    },
  };
}

export default function AnalyticsCharts() {
  const lineCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const lineChartInstanceRef = useRef(null);
  const barChartInstanceRef = useRef(null);
  const labels = useMemo(() => getLast7DaysLabels(), []);

  useEffect(() => {
    if (!lineCanvasRef.current || !barCanvasRef.current) return undefined;

    ChartJS.getChart(lineCanvasRef.current)?.destroy();
    ChartJS.getChart(barCanvasRef.current)?.destroy();
    lineChartInstanceRef.current?.destroy();
    barChartInstanceRef.current?.destroy();

    try {
      lineChartInstanceRef.current = new ChartJS(lineCanvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Search appearances',
              data: searchData,
              borderColor: '#7C3AED',
              backgroundColor: 'rgba(124, 58, 237, 0.12)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#7C3AED',
              pointRadius: 4,
              pointHoverRadius: 5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#E2E8F0', borderDash: [5, 5] },
              ticks: { color: '#64748B' },
            },
            x: buildCommonXAxis(),
          },
        },
      });

      barChartInstanceRef.current = new ChartJS(barCanvasRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Recruiter actions',
              data: profileData,
              backgroundColor: '#2563EB',
              borderRadius: 8,
              maxBarThickness: 28,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#E2E8F0' },
              ticks: { color: '#64748B' },
            },
            x: buildCommonXAxis(),
          },
        },
      });
    } catch (error) {
      lineChartInstanceRef.current?.destroy();
      lineChartInstanceRef.current = null;
      barChartInstanceRef.current?.destroy();
      barChartInstanceRef.current = null;
      throw error;
    }

    return () => {
      lineChartInstanceRef.current?.destroy();
      lineChartInstanceRef.current = null;
      barChartInstanceRef.current?.destroy();
      barChartInstanceRef.current = null;
    };
  }, [labels]);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">4167 Search appearances in last 7 days</h2>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-rose-500">
              <FiTrendingDown /> 27% since last week
            </p>
          </div>
        </div>
        <div className="h-56 sm:h-64">
          <canvas ref={lineCanvasRef} />
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recruiter actions trend in last 7 days</h2>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-600">
              <FiTrendingUp /> 14% better than last week
            </p>
          </div>
        </div>
        <div className="h-56 sm:h-64">
          <canvas ref={barCanvasRef} />
        </div>
      </article>
    </div>
  );
}
