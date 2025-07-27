// frontend/src/components/LearningGraphView.jsx
import React, { useEffect, useRef } from 'react';
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
  Filler // For filling area under line
} from 'chart.js';
import { HEBREW_TEXT } from '../utils/constants';
import './LearningGraphView.css'; // For styling

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

const LearningGraphView = ({
  graphData, // Array of { date: 'YYYY-MM-DD', rating: number | null }
  isLoading,
  error,
  currentRange,
  onFetchData, // Function to call to fetch data for a new range
  onClose,
}) => {
  const chartRef = useRef(null);

  useEffect(() => {
    // Fetch initial data when component mounts or currentRange changes from outside
    if (!graphData.length && !isLoading && !error) {
        onFetchData(currentRange);
    }
  }, [currentRange, onFetchData, graphData.length, isLoading, error]);

  const handleRangeChange = (newRange) => {
    if (newRange !== currentRange) {
      onFetchData(newRange);
    }
  };
  
  const chartLabels = graphData.map(item => {
    const date = new Date(item.date + "T00:00:00"); // Ensure parsed as local
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  });

  const chartDataset = graphData.map(item => item.rating); // Chart.js handles nulls by creating gaps

  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: HEBREW_TEXT.learningGraph?.ratingLabel || 'דירוג לימוד יומי',
        data: chartDataset,
        fill: true,
        backgroundColor: 'rgba(139, 92, 246, 0.2)', // Violet tint
        borderColor: '#8b5cf6', // Violet line
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#8b5cf6',
        tension: 0.1, // Slight curve to the line
        spanGaps: false, // Creates gaps for null values
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 1,
          color: '#a0aec0', // Light gray for tick labels
        },
        grid: {
          color: 'rgba(160, 174, 192, 0.2)', // Lighter grid lines
        },
      },
      x: {
        ticks: {
          color: '#a0aec0',
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          display: false, // Hide vertical grid lines for cleaner look
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e0e0e0', // Light text for legend
        }
      },
      title: {
        display: true,
        text: HEBREW_TEXT.learningGraph?.chartTitle || 'התקדמות בדירוג הלימוד היומי',
        color: '#81e6d9', // Teal for title
        font: {
          size: 18,
        }
      },
      tooltip: {
        backgroundColor: '#2d3748',
        titleColor: '#81e6d9',
        bodyColor: '#e0e0e0',
        callbacks: {
            label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += context.parsed.y;
                } else {
                    label += (HEBREW_TEXT.learningGraph?.noRating || 'אין דירוג');
                }
                return label;
            }
        }
      }
    },
    // Custom styling for points representing null data
    elements: {
        point: {
            radius: (context) => context.raw === null ? 5 : 3, // Larger point for no data
            backgroundColor: (context) => context.raw === null ? 'rgba(255, 99, 132, 0.7)' : '#8b5cf6', // Reddish for no data
            borderColor: (context) => context.raw === null ? 'rgba(255, 99, 132, 1)' : '#fff',
            borderWidth: (context) => context.raw === null ? 2 : 1,
            hoverRadius: (context) => context.raw === null ? 7 : 5,
        }
    }
  };

  return (
    <div className="learning-graph-modal-overlay" onClick={onClose}>
      <div className="learning-graph-modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="learning-graph-modal-close-btn">×</button>
        <h2 className="learning-graph-modal-title">{HEBREW_TEXT.learningGraph?.viewTitle || "גרף התקדמות בלימוד"}</h2>

        <div className="learning-graph-controls">
          {(['week', 'month', 'all']).map(rangeOption => (
            <button
              key={rangeOption}
              onClick={() => handleRangeChange(rangeOption)}
              className={currentRange === rangeOption ? 'active' : ''}
              disabled={isLoading}
            >
              {HEBREW_TEXT.learningGraph?.ranges?.[rangeOption] || rangeOption.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="learning-graph-chart-container">
          {isLoading && <p>{HEBREW_TEXT.learningGraph?.loading || "טוען נתונים..."}</p>}
          {error && <p className="learning-graph-error">{error}</p>}
          {!isLoading && !error && graphData.length === 0 && (
            <p>{HEBREW_TEXT.learningGraph?.noData || "אין נתונים להצגה עבור טווח זה."}</p>
          )}
          {!isLoading && !error && graphData.length > 0 && (
            <Line ref={chartRef} options={options} data={data} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningGraphView;