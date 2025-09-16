import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './RealtimeChart.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RealtimeChart = ({ data, userRole, loading }) => {
  const [selectedMetric, setSelectedMetric] = useState('air_quality');
  const [timeRange, setTimeRange] = useState('1h');
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);

  // Available metrics based on user role
  const getAvailableMetrics = (role) => {
    const allMetrics = [
      { id: 'air_quality', label: 'Air Quality', color: '#10B981', unit: 'AQI' },
      { id: 'traffic', label: 'Traffic Flow', color: '#F59E0B', unit: '%' },
      { id: 'energy', label: 'Energy Consumption', color: '#8B5CF6', unit: 'MW' },
      { id: 'waste', label: 'Waste Collection', color: '#EF4444', unit: '%' },
      { id: 'water', label: 'Water Quality', color: '#3B82F6', unit: 'pH' }
    ];

    const roleMetrics = {
      admin: allMetrics,
      environment_officer: allMetrics.filter(m => ['air_quality', 'water'].includes(m.id)),
      utility_officer: allMetrics.filter(m => ['energy', 'waste', 'water'].includes(m.id)),
      traffic_control: allMetrics.filter(m => m.id === 'traffic'),
      viewer: allMetrics
    };

    return roleMetrics[role] || allMetrics;
  };

  const availableMetrics = getAvailableMetrics(userRole);

  // Time range options
  const timeRanges = [
    { id: '1h', label: '1 Hour', points: 60 },
    { id: '6h', label: '6 Hours', points: 72 },
    { id: '24h', label: '24 Hours', points: 96 },
    { id: '7d', label: '7 Days', points: 168 }
  ];

  // Process chart data
  useEffect(() => {
    if (!data || !data.sensors) return;

    const selectedMetricData = data.sensors.find(s => s.type === selectedMetric);
    if (!selectedMetricData) return;

    // Generate time labels based on selected range
    const now = new Date();
    const range = timeRanges.find(t => t.id === timeRange);
    const labels = [];
    
    for (let i = range.points - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * (timeRange === '7d' ? 60 * 60 * 1000 : 60 * 1000));
      labels.push(time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        ...(timeRange === '7d' && { 
          month: 'short', 
          day: 'numeric' 
        })
      }));
    }

    // Generate realistic data (in production, this would come from the API)
    const generateRealisticData = (metric, points) => {
      const baseValues = {
        air_quality: 50,
        traffic: 65,
        energy: 150,
        waste: 80,
        water: 7.2
      };

      const variance = {
        air_quality: 20,
        traffic: 25,
        energy: 30,
        waste: 15,
        water: 0.5
      };

      const base = baseValues[metric];
      const var_range = variance[metric];
      const data = [];
      let lastValue = base;

      for (let i = 0; i < points; i++) {
        // Add some randomness but keep it realistic
        const change = (Math.random() - 0.5) * var_range * 0.1;
        lastValue = Math.max(0, lastValue + change);
        
        // Add some patterns based on time of day for realism
        if (metric === 'traffic') {
          const hour = new Date().getHours();
          if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
            lastValue *= 1.2; // Rush hour traffic
          }
        }
        
        data.push(Number(lastValue.toFixed(2)));
      }

      return data;
    };

    const metricInfo = availableMetrics.find(m => m.id === selectedMetric);
    const values = generateRealisticData(selectedMetric, range.points);

    setChartData({
      labels,
      datasets: [
        {
          label: metricInfo.label,
          data: values,
          borderColor: metricInfo.color,
          backgroundColor: `${metricInfo.color}20`,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: metricInfo.color,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2
        }
      ]
    });
  }, [data, selectedMetric, timeRange, availableMetrics]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          title: (context) => {
            return `Time: ${context[0].label}`;
          },
          label: (context) => {
            const metric = availableMetrics.find(m => m.id === selectedMetric);
            return `${context.dataset.label}: ${context.parsed.y} ${metric.unit}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: '#E5E7EB',
          drawBorder: false
        },
        ticks: {
          color: '#6B7280',
          maxTicksLimit: 8
        }
      },
      y: {
        display: true,
        grid: {
          color: '#E5E7EB',
          drawBorder: false
        },
        ticks: {
          color: '#6B7280',
          callback: function(value) {
            const metric = availableMetrics.find(m => m.id === selectedMetric);
            return `${value} ${metric.unit}`;
          }
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    elements: {
      point: {
        hoverRadius: 6
      }
    }
  };

  return (
    <div className="realtime-chart">
      <div className="chart-header">
        <h2>Real-time Monitoring</h2>
        
        <div className="chart-controls">
          <div className="metric-selector">
            <label htmlFor="metric-select">Metric:</label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="control-select"
            >
              {availableMetrics.map(metric => (
                <option key={metric.id} value={metric.id}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="time-selector">
            <label htmlFor="time-select">Range:</label>
            <select
              id="time-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="control-select"
            >
              {timeRanges.map(range => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={`chart-container ${loading ? 'loading' : ''}`}>
        {chartData ? (
          <Line 
            ref={chartRef}
            data={chartData} 
            options={chartOptions}
          />
        ) : (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
            <p>Loading chart data...</p>
          </div>
        )}
      </div>

      {/* Current value display */}
      {chartData && chartData.datasets[0].data.length > 0 && (
        <div className="current-value">
          <div className="value-display">
            <span className="value-label">Current Value:</span>
            <span className="value-number">
              {chartData.datasets[0].data[chartData.datasets[0].data.length - 1]}
              <span className="value-unit">
                {availableMetrics.find(m => m.id === selectedMetric)?.unit}
              </span>
            </span>
          </div>
          
          <div className="value-status">
            <div className={`status-indicator ${getStatusClass(
              chartData.datasets[0].data[chartData.datasets[0].data.length - 1],
              selectedMetric
            )}`}>
              <i className="status-icon"></i>
              <span>{getStatusText(
                chartData.datasets[0].data[chartData.datasets[0].data.length - 1],
                selectedMetric
              )}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for status indication
const getStatusClass = (value, metric) => {
  const thresholds = {
    air_quality: { good: 50, moderate: 100, unhealthy: 150 },
    traffic: { good: 70, moderate: 85, poor: 95 },
    energy: { low: 100, normal: 200, high: 300 },
    waste: { good: 90, moderate: 70, poor: 50 },
    water: { good: [6.5, 8.5], moderate: [6.0, 9.0] }
  };

  const threshold = thresholds[metric];
  if (!threshold) return 'normal';

  if (metric === 'water') {
    if (value >= threshold.good[0] && value <= threshold.good[1]) return 'good';
    if (value >= threshold.moderate[0] && value <= threshold.moderate[1]) return 'moderate';
    return 'poor';
  }

  if (metric === 'air_quality') {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.moderate) return 'moderate';
    if (value <= threshold.unhealthy) return 'poor';
    return 'critical';
  }

  if (metric === 'traffic' || metric === 'waste') {
    if (value >= threshold.good) return 'good';
    if (value >= threshold.moderate) return 'moderate';
    return 'poor';
  }

  if (metric === 'energy') {
    if (value <= threshold.low) return 'low';
    if (value <= threshold.normal) return 'normal';
    return 'high';
  }

  return 'normal';
};

const getStatusText = (value, metric) => {
  const status = getStatusClass(value, metric);
  const statusMap = {
    good: 'Good',
    moderate: 'Moderate',
    poor: 'Poor',
    critical: 'Critical',
    low: 'Low',
    normal: 'Normal',
    high: 'High'
  };
  
  return statusMap[status] || 'Unknown';
};

export default RealtimeChart;