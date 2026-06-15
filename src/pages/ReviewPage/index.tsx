import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as d3 from 'd3';
import {
  Plus,
  Trash2,
  Calendar,
  User,
  Ship,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  BarChart3,
  Map,
  FileText,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import ReachCanvas from '@/components/Canvas/ReachCanvas';
import { useAppStore } from '@/store/useAppStore';
import type {
  TrainingSession,
  GatePass,
  Mistake,
  MistakeType,
  Gate,
} from '@/types';
import {
  MISTAKE_TYPE_LABELS,
  BOAT_TYPE_LABELS,
} from '@/types';

interface FilterState {
  dateRange: [number | null, number | null];
  reachId: string | null;
  athleteId: string | null;
  boatId: string | null;
}

interface NewSessionForm {
  reachId: string;
  gateConfigId: string;
  athleteId: string;
  boatId: string;
  date: number;
}

const SEVERITY_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#eab308',
  3: '#ef4444',
};

const SEVERITY_LABELS: Record<number, string> = {
  1: '轻微',
  2: '中等',
  3: '严重',
};

const DEVIATION_THRESHOLD = 0.5;

export default function ReviewPage() {
  const {
    reaches,
    gateConfigs,
    trainingSessions,
    athletes,
    boats,
    waterFeatures,
    currentReachId,
    addTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
  } = useAppStore();

  const [filters, setFilters] = useState<FilterState>({
    dateRange: [null, null],
    reachId: currentReachId,
    athleteId: null,
    boatId: null,
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedMistakeId, setSelectedMistakeId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [isAddingMistake, setIsAddingMistake] = useState(false);
  const [newMistakeType, setNewMistakeType] = useState<MistakeType>('touch');
  const [newMistakeSeverity, setNewMistakeSeverity] = useState<1 | 2 | 3>(2);
  const [editingMistake, setEditingMistake] = useState<Mistake | null>(null);
  const [chartTooltip, setChartTooltip] = useState<{
    x: number;
    y: number;
    data: { gateNumber: number; time: number; targetTime: number; deviation: number; hasMistake: boolean };
  } | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  const [newSessionForm, setNewSessionForm] = useState<NewSessionForm>({
    reachId: currentReachId || '',
    gateConfigId: '',
    athleteId: '',
    boatId: '',
    date: Date.now(),
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      reachId: currentReachId,
    }));
    setSelectedSessionId(null);
    setSelectedMistakeId(null);
    setExpandedDates(new Set());
  }, [currentReachId]);

  const currentReach = useMemo(
    () => reaches.find((r) => r.id === filters.reachId) || null,
    [reaches, filters.reachId]
  );

  const currentGateConfig = useMemo(() => {
    if (!selectedSessionId) return null;
    const session = trainingSessions.find((s) => s.id === selectedSessionId);
    if (!session) return null;
    return gateConfigs.find((c) => c.id === session.gateConfigId) || null;
  }, [trainingSessions, gateConfigs, selectedSessionId]);

  const gates = useMemo(
    () => currentGateConfig?.gates || [],
    [currentGateConfig]
  );

  const sortedGates = useMemo(
    () => [...gates].sort((a, b) => a.number - b.number),
    [gates]
  );

  const filteredSessions = useMemo(() => {
    return trainingSessions.filter((session) => {
      if (filters.reachId && session.reachId !== filters.reachId) return false;
      if (filters.athleteId && session.athleteId !== filters.athleteId) return false;
      if (filters.boatId && session.boatId !== filters.boatId) return false;
      if (filters.dateRange[0] && session.date < filters.dateRange[0]) return false;
      if (filters.dateRange[1] && session.date > filters.dateRange[1]) return false;
      return true;
    });
  }, [trainingSessions, filters]);

  const sessionsByDate = useMemo(() => {
    const groups: Record<string, TrainingSession[]> = {};
    filteredSessions.forEach((session) => {
      const dateKey = new Date(session.date).toLocaleDateString('zh-CN');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });
    return groups;
  }, [filteredSessions]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(sessionsByDate).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [sessionsByDate]);

  const selectedSession = useMemo(
    () => trainingSessions.find((s) => s.id === selectedSessionId) || null,
    [trainingSessions, selectedSessionId]
  );

  const selectedMistake = useMemo(() => {
    if (!selectedSession || !selectedMistakeId) return null;
    return selectedSession.mistakes.find((m) => m.id === selectedMistakeId) || null;
  }, [selectedSession, selectedMistakeId]);

  const statistics = useMemo(() => {
    if (!selectedSession) return null;

    const gatePasses = selectedSession.gatePasses;
    const totalTargetTime = gatePasses.reduce((sum, gp) => sum + gp.targetTime, 0);
    const totalActualTime = gatePasses.reduce((sum, gp) => sum + gp.time, 0);
    const totalDeviation = totalActualTime - totalTargetTime;
    const avgDeviation = gatePasses.length > 0 ? totalDeviation / gatePasses.length : 0;
    const touches = gatePasses.filter((gp) => gp.touches).length;
    const mistakesCount = selectedSession.mistakes.length;
    const overDeviationCount = gatePasses.filter((gp) => Math.abs(gp.deviation) > DEVIATION_THRESHOLD).length;

    const segmentStats = [];
    for (let i = 0; i < gatePasses.length; i += 5) {
      const segment = gatePasses.slice(i, i + 5);
      const segTarget = segment.reduce((sum, gp) => sum + gp.targetTime, 0);
      const segActual = segment.reduce((sum, gp) => sum + gp.time, 0);
      segmentStats.push({
        start: i + 1,
        end: Math.min(i + 5, gatePasses.length),
        targetTime: segTarget,
        actualTime: segActual,
        deviation: segActual - segTarget,
      });
    }

    return {
      totalTargetTime,
      totalActualTime,
      totalDeviation,
      avgDeviation,
      touches,
      mistakesCount,
      overDeviationCount,
      segmentStats,
    };
  }, [selectedSession]);

  const getGateNumber = useCallback(
    (gateId: string) => {
      const gate = gates.find((g) => g.id === gateId);
      return gate?.number || '?';
    },
    [gates]
  );

  const hasMistakeAtGate = useCallback(
    (gateId: string) => {
      if (!selectedSession) return false;
      const gate = gates.find((g) => g.id === gateId);
      if (!gate) return false;
      return selectedSession.mistakes.some((m) => {
        const dist = Math.sqrt(
          Math.pow(m.position.x - gate.x, 2) + Math.pow(m.position.y - gate.y, 2)
        );
        return dist < 60;
      });
    },
    [selectedSession, gates]
  );

  const drawChart = useCallback(() => {
    if (!chartRef.current || !selectedSession || sortedGates.length === 0) return;

    const container = chartRef.current;
    const width = container.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };

    d3.select(container).selectAll('svg').remove();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const chartData = sortedGates.map((gate) => {
      const gatePass = selectedSession.gatePasses.find((gp) => gp.gateId === gate.id);
      return {
        gateNumber: gate.number,
        targetTime: gatePass?.targetTime || 0,
        actualTime: gatePass?.time || 0,
        deviation: gatePass?.deviation || 0,
        hasMistake: hasMistakeAtGate(gate.id) || (gatePass?.touches || false) || Math.abs(gatePass?.deviation || 0) > DEVIATION_THRESHOLD,
      };
    });

    const x = d3
      .scaleBand()
      .domain(chartData.map((d) => d.gateNumber.toString()))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const maxTime = d3.max(chartData, (d) => Math.max(d.targetTime, d.actualTime)) || 10;
    const y = d3
      .scaleLinear()
      .domain([0, maxTime * 1.1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
      g
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .call((g) => g.select('.domain').attr('stroke', '#475569'))
        .call((g) => g.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '12px'))
        .call((g) => g.selectAll('line').attr('stroke', '#475569'));

    const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
      g
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}s`))
        .call((g) => g.select('.domain').attr('stroke', '#475569'))
        .call((g) => g.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '11px'))
        .call((g) => g.selectAll('line').attr('stroke', '#475569'))
        .call((g) =>
          g
            .selectAll('.tick line')
            .attr('stroke-dasharray', '3,3')
            .attr('stroke-opacity', 0.5)
        );

    svg.append('g').call(xAxis);
    svg.append('g').call(yAxis);

    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '12px')
      .text('门号');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '12px')
      .text('时间 (秒)');

    const barWidth = x.bandwidth() / 2 - 2;

    svg
      .selectAll('.target-bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'target-bar')
      .attr('x', (d) => x(d.gateNumber.toString())! + 1)
      .attr('y', (d) => y(d.targetTime))
      .attr('width', barWidth)
      .attr('height', (d) => height - margin.bottom - y(d.targetTime))
      .attr('fill', d => d.hasMistake ? '#fca5a5' : '#60a5fa')
      .attr('opacity', 0.7)
      .attr('rx', 2);

    svg
      .selectAll('.actual-bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'actual-bar')
      .attr('x', (d) => x(d.gateNumber.toString())! + barWidth + 3)
      .attr('y', (d) => y(d.actualTime))
      .attr('width', barWidth)
      .attr('height', (d) => height - margin.bottom - y(d.actualTime))
      .attr('fill', d => d.hasMistake ? '#ef4444' : '#22c55e')
      .attr('rx', 2)
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
        const [mouseX, mouseY] = d3.pointer(event, container);
        setChartTooltip({
          x: mouseX,
          y: mouseY - 10,
          data: d,
        });
      })
      .on('mousemove', function (event) {
        const [mouseX, mouseY] = d3.pointer(event, container);
        setChartTooltip((prev) =>
          prev ? { ...prev, x: mouseX, y: mouseY - 10 } : null
        );
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        setChartTooltip(null);
      });

    const legend = svg
      .append('g')
      .attr('transform', `translate(${width - margin.right - 180}, ${margin.top})`);

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', '#60a5fa')
      .attr('rx', 2);

    legend
      .append('text')
      .attr('x', 18)
      .attr('y', 10)
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .text('目标时间');

    legend
      .append('rect')
      .attr('x', 80)
      .attr('y', 0)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', '#22c55e')
      .attr('rx', 2);

    legend
      .append('text')
      .attr('x', 98)
      .attr('y', 10)
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .text('实际时间');
  }, [selectedSession, sortedGates, hasMistakeAtGate]);

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const handleCreateSession = () => {
    if (!newSessionForm.reachId || !newSessionForm.gateConfigId || !newSessionForm.athleteId || !newSessionForm.boatId) {
      return;
    }

    const relevantGateConfig = gateConfigs.find((c) => c.id === newSessionForm.gateConfigId);
    const sessionGates = relevantGateConfig?.gates || [];

    const gatePasses: GatePass[] = sessionGates.map((gate) => {
      const baseTime = 2 + Math.random() * 2;
      const targetTime = +(baseTime + gate.energyLoss * 2).toFixed(2);
      const time = +(targetTime + (Math.random() - 0.5) * 1).toFixed(2);
      return {
        gateId: gate.id,
        time,
        targetTime,
        deviation: +(time - targetTime).toFixed(2),
        entryAngle: gate.entryAngle,
        touches: Math.random() < 0.15,
      };
    });

    const totalTime = gatePasses.reduce((sum, gp) => sum + gp.time, 0);

    const newSession: TrainingSession = {
      id: uuidv4(),
      reachId: newSessionForm.reachId,
      gateConfigId: newSessionForm.gateConfigId,
      athleteId: newSessionForm.athleteId,
      boatId: newSessionForm.boatId,
      date: newSessionForm.date,
      totalTime,
      gatePasses,
      mistakes: [],
      notes: '',
    };

    addTrainingSession(newSession);
    setSelectedSessionId(newSession.id);
    setShowNewSessionForm(false);
    setNewSessionForm({
      reachId: currentReachId || '',
      gateConfigId: '',
      athleteId: '',
      boatId: '',
      date: Date.now(),
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm('确定要删除这条训练记录吗？')) {
      deleteTrainingSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setSelectedMistakeId(null);
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAddingMistake || !selectedSession) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / 1;
    const y = (e.clientY - rect.top) / 1;

    const newMistake: Mistake = {
      id: uuidv4(),
      timestamp: Date.now(),
      position: { x, y },
      type: newMistakeType,
      severity: newMistakeSeverity,
      readingJudgment: '',
      correction: '',
    };

    const updatedSession: TrainingSession = {
      ...selectedSession,
      mistakes: [...selectedSession.mistakes, newMistake],
    };

    updateTrainingSession(updatedSession);
    setSelectedMistakeId(newMistake.id);
    setIsAddingMistake(false);
  };

  const handleUpdateMistake = (updatedMistake: Mistake) => {
    if (!selectedSession) return;

    const updatedSession: TrainingSession = {
      ...selectedSession,
      mistakes: selectedSession.mistakes.map((m) =>
        m.id === updatedMistake.id ? updatedMistake : m
      ),
    };

    updateTrainingSession(updatedSession);
    setEditingMistake(null);
  };

  const handleDeleteMistake = (mistakeId: string) => {
    if (!selectedSession) return;

    const updatedSession: TrainingSession = {
      ...selectedSession,
      mistakes: selectedSession.mistakes.filter((m) => m.id !== mistakeId),
    };

    updateTrainingSession(updatedSession);
    if (selectedMistakeId === mistakeId) {
      setSelectedMistakeId(null);
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (!selectedSession) return;

    const updatedSession: TrainingSession = {
      ...selectedSession,
      notes,
    };

    updateTrainingSession(updatedSession);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : `${secs}s`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTimeForInput = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseDateTimeInput = (value: string) => {
    if (!value) return Date.now();
    return new Date(value).getTime();
  };

  const getAthleteName = (athleteId: string) => {
    return athletes.find((a) => a.id === athleteId)?.name || '未知';
  };

  const getBoatInfo = (boatId: string) => {
    const boat = boats.find((b) => b.id === boatId);
    return boat ? `${BOAT_TYPE_LABELS[boat.type]} - ${boat.model}` : '未知';
  };

  const getReachName = (reachId: string) => {
    return reaches.find((r) => r.id === reachId)?.name || '未知';
  };

  const availableGateConfigs = useMemo(() => {
    return gateConfigs.filter((c) => c.reachId === newSessionForm.reachId);
  }, [gateConfigs, newSessionForm.reachId]);

  useEffect(() => {
    if (availableGateConfigs.length > 0 && !newSessionForm.gateConfigId) {
      setNewSessionForm((prev) => ({ ...prev, gateConfigId: availableGateConfigs[0].id }));
    }
  }, [availableGateConfigs, newSessionForm.gateConfigId]);

  return (
    <div className="h-full flex flex-col bg-deep-sea-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-deep-sea-900 border-b border-deep-sea-700/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-500" />
              训练回溯分析
            </h1>
            <button
              onClick={() => {
                setNewSessionForm({
                  reachId: currentReachId || '',
                  gateConfigId: '',
                  athleteId: '',
                  boatId: '',
                  date: Date.now(),
                });
                setShowNewSessionForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增训练记录
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">筛选:</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                className="px-3 py-1.5 bg-deep-sea-800 border border-deep-sea-700 rounded text-sm text-white"
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value).getTime() : null;
                  setFilters((prev) => ({ ...prev, dateRange: [date, prev.dateRange[1]] }));
                }}
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                className="px-3 py-1.5 bg-deep-sea-800 border border-deep-sea-700 rounded text-sm text-white"
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value).getTime() : null;
                  setFilters((prev) => ({ ...prev, dateRange: [prev.dateRange[0], date] }));
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <select
                value={filters.reachId || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, reachId: e.target.value || null }))}
                className="px-3 py-1.5 bg-deep-sea-800 border border-deep-sea-700 rounded text-sm text-white min-w-[140px]"
              >
                <option value="">全部河段</option>
                {reaches.map((reach) => (
                  <option key={reach.id} value={reach.id}>
                    {reach.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <select
                value={filters.athleteId || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, athleteId: e.target.value || null }))}
                className="px-3 py-1.5 bg-deep-sea-800 border border-deep-sea-700 rounded text-sm text-white min-w-[120px]"
              >
                <option value="">全部运动员</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4 text-gray-400" />
              <select
                value={filters.boatId || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, boatId: e.target.value || null }))}
                className="px-3 py-1.5 bg-deep-sea-800 border border-deep-sea-700 rounded text-sm text-white min-w-[140px]"
              >
                <option value="">全部艇型</option>
                {boats.map((boat) => (
                  <option key={boat.id} value={boat.id}>
                    {BOAT_TYPE_LABELS[boat.type]} - {boat.model}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-sm text-gray-400 ml-2">
              共 {filteredSessions.length} 条记录
            </span>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 flex flex-col bg-deep-sea-900 border-r border-deep-sea-700/50">
            <div className="p-4 border-b border-deep-sea-700/50">
              <h2 className="text-lg font-semibold text-white">训练记录</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sortedDateKeys.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无训练记录</p>
                  <p className="text-sm mt-1">点击右上角新增训练记录</p>
                </div>
              ) : (
                <div className="p-2">
                  {sortedDateKeys.map((dateKey) => (
                    <div key={dateKey} className="mb-2">
                      <button
                        onClick={() => toggleDateGroup(dateKey)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-300 hover:bg-deep-sea-800 rounded transition-colors"
                      >
                        {expandedDates.has(dateKey) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Calendar className="w-4 h-4" />
                        {dateKey}
                        <span className="ml-auto text-xs text-gray-500">
                          {sessionsByDate[dateKey].length} 条
                        </span>
                      </button>

                      {expandedDates.has(dateKey) && (
                        <div className="ml-4 space-y-1">
                          {sessionsByDate[dateKey].map((session) => (
                            <div
                              key={session.id}
                              onClick={() => {
                                setSelectedSessionId(session.id);
                                setSelectedMistakeId(null);
                              }}
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                selectedSessionId === session.id
                                  ? 'bg-deep-sea-700 border-l-4 border-orange-500'
                                  : 'bg-deep-sea-800/50 border-l-4 border-transparent hover:bg-deep-sea-800'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-white">
                                  {formatDateTime(session.date)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(session.id);
                                  }}
                                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-xs text-gray-400 space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {getAthleteName(session.athleteId)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Ship className="w-3 h-3" />
                                  {getBoatInfo(session.boatId).split(' - ')[0]}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(session.totalTime)}
                                </div>
                                {session.mistakes.length > 0 && (
                                  <div className="flex items-center gap-1 text-yellow-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    {session.mistakes.length} 个失误
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedSession ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">选择一条训练记录查看详情</p>
                  <p className="text-sm mt-1">或点击右上角新增训练记录</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-deep-sea-900 border-b border-deep-sea-700/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {formatDate(selectedSession.date)} 训练详情
                      </h2>
                      <p className="text-sm text-gray-400">
                        {getReachName(selectedSession.reachId)} · {getAthleteName(selectedSession.athleteId)} · {getBoatInfo(selectedSession.boatId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {formatTime(selectedSession.totalTime)}
                        </div>
                        <div className={`text-sm flex items-center justify-end gap-1 ${
                          statistics && statistics.totalDeviation > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {statistics && statistics.totalDeviation > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {statistics ? `${statistics.totalDeviation > 0 ? '+' : ''}${statistics.totalDeviation.toFixed(2)}s` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {statistics && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-deep-sea-800 rounded-lg p-3 border border-deep-sea-700/50">
                        <div className="text-xs text-gray-400 mb-1">平均偏差</div>
                        <div className={`text-xl font-bold ${
                          statistics.avgDeviation > DEVIATION_THRESHOLD ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {statistics.avgDeviation > 0 ? '+' : ''}{statistics.avgDeviation.toFixed(2)}s
                        </div>
                      </div>
                      <div className="bg-deep-sea-800 rounded-lg p-3 border border-deep-sea-700/50">
                        <div className="text-xs text-gray-400 mb-1">碰门次数</div>
                        <div className={`text-xl font-bold ${
                          statistics.touches > 0 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {statistics.touches}
                        </div>
                      </div>
                      <div className="bg-deep-sea-800 rounded-lg p-3 border border-deep-sea-700/50">
                        <div className="text-xs text-gray-400 mb-1">失误数</div>
                        <div className={`text-xl font-bold ${
                          statistics.mistakesCount > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {statistics.mistakesCount}
                        </div>
                      </div>
                      <div className="bg-deep-sea-800 rounded-lg p-3 border border-deep-sea-700/50">
                        <div className="text-xs text-gray-400 mb-1">偏差过大</div>
                        <div className={`text-xl font-bold ${
                          statistics.overDeviationCount > 0 ? 'text-orange-400' : 'text-green-400'
                        }`}>
                          {statistics.overDeviationCount} 道门
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    <div className="bg-deep-sea-900 rounded-lg border border-deep-sea-700/50 overflow-hidden">
                      <div className="p-4 border-b border-deep-sea-700/50 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-400" />
                          过门时间对比
                        </h3>
                        <div className="text-xs text-gray-400">
                          蓝色: 目标时间 · 绿色: 实际时间 · 红色: 有问题
                        </div>
                      </div>
                      <div className="p-4 relative">
                        <div ref={chartRef} className="w-full" style={{ height: '300px' }} />
                        {chartTooltip && (
                          <div
                            className="absolute pointer-events-none bg-deep-sea-950 border border-deep-sea-600 rounded-lg p-3 shadow-xl z-10"
                            style={{
                              left: chartTooltip.x + 10,
                              top: chartTooltip.y - 10,
                              transform: 'translateY(-100%)',
                            }}
                          >
                            <div className="text-sm font-medium text-white mb-2">
                              第 {chartTooltip.data.gateNumber} 道门
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-400">目标时间:</span>
                                <span className="text-blue-400 font-medium">{chartTooltip.data.targetTime.toFixed(2)}s</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-400">实际时间:</span>
                                <span className="text-green-400 font-medium">{chartTooltip.data.actualTime.toFixed(2)}s</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-gray-400">偏差:</span>
                                <span className={`font-medium ${
                                  Math.abs(chartTooltip.data.deviation) > DEVIATION_THRESHOLD ? 'text-red-400' : 'text-gray-300'
                                }`}>
                                  {chartTooltip.data.deviation > 0 ? '+' : ''}{chartTooltip.data.deviation.toFixed(2)}s
                                </span>
                              </div>
                              {chartTooltip.data.hasMistake && (
                                <div className="flex items-center gap-1 text-yellow-400 mt-2 pt-2 border-t border-deep-sea-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  存在问题
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {statistics && statistics.segmentStats.length > 1 && (
                      <div className="bg-deep-sea-900 rounded-lg border border-deep-sea-700/50 overflow-hidden">
                        <div className="p-4 border-b border-deep-sea-700/50">
                          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            分段时间统计
                          </h3>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-3">
                            {statistics.segmentStats.map((seg, idx) => (
                              <div key={idx} className="bg-deep-sea-800 rounded-lg p-3 border border-deep-sea-700/50">
                                <div className="text-xs text-gray-400 mb-2">
                                  第 {seg.start}-{seg.end} 道门
                                </div>
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-lg font-bold text-white">
                                    {formatTime(seg.actualTime)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    / {formatTime(seg.targetTime)}
                                  </span>
                                </div>
                                <div className={`text-sm flex items-center gap-1 ${
                                  seg.deviation > 0 ? 'text-red-400' : 'text-green-400'
                                }`}>
                                  {seg.deviation > 0 ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3" />
                                  )}
                                  {seg.deviation > 0 ? '+' : ''}{seg.deviation.toFixed(2)}s
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-deep-sea-900 rounded-lg border border-deep-sea-700/50 overflow-hidden">
                      <div className="p-4 border-b border-deep-sea-700/50">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-400" />
                          过门详情
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-deep-sea-800/50">
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">门号</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">目标时间</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">实际时间</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">偏差</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-400">进门角度</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">碰门</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedGates.map((gate) => {
                              const gatePass = selectedSession.gatePasses.find((gp) => gp.gateId === gate.id);
                              if (!gatePass) return null;

                              const hasIssue = gatePass.touches ||
                                Math.abs(gatePass.deviation) > DEVIATION_THRESHOLD ||
                                hasMistakeAtGate(gate.id);

                              return (
                                <tr
                                  key={gate.id}
                                  className={`border-t border-deep-sea-700/30 ${
                                    hasIssue ? 'bg-red-950/20' : ''
                                  }`}
                                >
                                  <td className="px-4 py-2">
                                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                                      gate.type === 'upstream' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                    }`}>
                                      {gate.number}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right text-gray-300">
                                    {gatePass.targetTime.toFixed(2)}s
                                  </td>
                                  <td className="px-4 py-2 text-right text-white font-medium">
                                    {gatePass.time.toFixed(2)}s
                                  </td>
                                  <td className={`px-4 py-2 text-right font-medium ${
                                    Math.abs(gatePass.deviation) > DEVIATION_THRESHOLD
                                      ? 'text-red-400'
                                      : gatePass.deviation > 0
                                      ? 'text-yellow-400'
                                      : 'text-green-400'
                                  }`}>
                                    {gatePass.deviation > 0 ? '+' : ''}{gatePass.deviation.toFixed(2)}s
                                  </td>
                                  <td className="px-4 py-2 text-right text-gray-300">
                                    {gatePass.entryAngle.toFixed(1)}°
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {gatePass.touches ? (
                                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {hasIssue ? (
                                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                                        有问题
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                        正常
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-deep-sea-900 rounded-lg border border-deep-sea-700/50 overflow-hidden">
                      <div className="p-4 border-b border-deep-sea-700/50 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Map className="w-4 h-4 text-cyan-400" />
                          河段示意图
                        </h3>
                        <div className="flex items-center gap-2">
                          {isAddingMistake ? (
                            <>
                              <select
                                value={newMistakeType}
                                onChange={(e) => setNewMistakeType(e.target.value as MistakeType)}
                                className="px-2 py-1 bg-deep-sea-800 border border-deep-sea-700 rounded text-xs text-white"
                              >
                                {Object.entries(MISTAKE_TYPE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                              <select
                                value={newMistakeSeverity}
                                onChange={(e) => setNewMistakeSeverity(Number(e.target.value) as 1 | 2 | 3)}
                                className="px-2 py-1 bg-deep-sea-800 border border-deep-sea-700 rounded text-xs text-white"
                              >
                                <option value={1}>轻微</option>
                                <option value={2}>中等</option>
                                <option value={3}>严重</option>
                              </select>
                              <button
                                onClick={() => setIsAddingMistake(false)}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setIsAddingMistake(true)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-medium transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              标注失误点
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <div
                          className="rounded-lg overflow-hidden border border-deep-sea-700/50"
                          style={{ cursor: isAddingMistake ? 'crosshair' : 'default' }}
                          onClick={handleCanvasClick}
                        >
                          <ReachCanvas
                            reach={currentReach}
                            features={waterFeatures}
                            gates={sortedGates}
                            mistakes={selectedSession.mistakes.map((m) => ({
                              position: m.position,
                              type: m.type,
                              severity: m.severity,
                            }))}
                            showFlowArrows={false}
                            editable={false}
                          />
                        </div>
                        {isAddingMistake && (
                          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <p className="text-sm text-orange-400 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              点击上图中的位置标注失误点
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-deep-sea-900 rounded-lg border border-deep-sea-700/50 overflow-hidden">
                      <div className="p-4 border-b border-deep-sea-700/50">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          训练备注
                        </h3>
                      </div>
                      <div className="p-4">
                        <textarea
                          value={selectedSession.notes}
                          onChange={(e) => handleUpdateNotes(e.target.value)}
                          placeholder="输入本次训练的备注信息..."
                          className="w-full h-24 px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-80 flex flex-col bg-deep-sea-900 border-l border-deep-sea-700/50 overflow-hidden">
            {!selectedSession ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
                <div>
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>选择训练记录查看失误分析</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-deep-sea-700/50">
                  <h2 className="text-lg font-semibold text-white">失误分析</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    共 {selectedSession.mistakes.length} 个失误点
                  </p>
                </div>

                {selectedSession.mistakes.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
                    <div>
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-500" />
                      <p>暂无失误记录</p>
                      <p className="text-sm mt-1">点击"标注失误点"在地图上添加</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-3">
                      {selectedSession.mistakes
                        .sort((a, b) => a.severity - b.severity)
                        .map((mistake, index) => (
                          <div
                            key={mistake.id}
                            onClick={() => {
                              setSelectedMistakeId(mistake.id);
                              setEditingMistake(null);
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedMistakeId === mistake.id
                                ? 'bg-deep-sea-700 border-orange-500'
                                : 'bg-deep-sea-800 border-deep-sea-700/50 hover:bg-deep-sea-750'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                  style={{ backgroundColor: SEVERITY_COLORS[mistake.severity] }}
                                >
                                  {index + 1}
                                </div>
                                <span className="text-sm font-medium text-white">
                                  {MISTAKE_TYPE_LABELS[mistake.type]}
                                </span>
                              </div>
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${SEVERITY_COLORS[mistake.severity]}20`,
                                  color: SEVERITY_COLORS[mistake.severity],
                                }}
                              >
                                {SEVERITY_LABELS[mistake.severity]}
                              </span>
                            </div>

                            {editingMistake?.id === mistake.id ? (
                              <div className="space-y-3 mt-3">
                                <div>
                                  <label className="text-xs text-gray-400 mb-1 block">失误类型</label>
                                  <select
                                    value={editingMistake.type}
                                    onChange={(e) =>
                                      setEditingMistake({
                                        ...editingMistake,
                                        type: e.target.value as MistakeType,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white"
                                  >
                                    {Object.entries(MISTAKE_TYPE_LABELS).map(([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 mb-1 block">严重程度</label>
                                  <div className="flex gap-2">
                                    {[1, 2, 3].map((sev) => (
                                      <button
                                        key={sev}
                                        onClick={() =>
                                          setEditingMistake({
                                            ...editingMistake,
                                            severity: sev as 1 | 2 | 3,
                                          })
                                        }
                                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                                          editingMistake.severity === sev
                                            ? 'text-white'
                                            : 'bg-deep-sea-700 text-gray-400 hover:bg-deep-sea-600'
                                        }`}
                                        style={{
                                          backgroundColor:
                                            editingMistake.severity === sev
                                              ? SEVERITY_COLORS[sev]
                                              : undefined,
                                        }}
                                      >
                                        {SEVERITY_LABELS[sev]}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 mb-1 block">读水判断</label>
                                  <textarea
                                    value={editingMistake.readingJudgment}
                                    onChange={(e) =>
                                      setEditingMistake({
                                        ...editingMistake,
                                        readingJudgment: e.target.value,
                                      })
                                    }
                                    placeholder="分析失误原因，当时的水情判断..."
                                    className="w-full h-20 px-2 py-1.5 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white placeholder-gray-500 resize-none"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs text-gray-400 mb-1 block">纠正方法</label>
                                  <textarea
                                    value={editingMistake.correction}
                                    onChange={(e) =>
                                      setEditingMistake({
                                        ...editingMistake,
                                        correction: e.target.value,
                                      })
                                    }
                                    placeholder="下次遇到类似情况应该如何处理..."
                                    className="w-full h-20 px-2 py-1.5 bg-deep-sea-700 border border-deep-sea-600 rounded text-sm text-white placeholder-gray-500 resize-none"
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateMistake(editingMistake)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                    保存
                                  </button>
                                  <button
                                    onClick={() => setEditingMistake(null)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {mistake.readingJudgment && (
                                  <div className="mb-2">
                                    <div className="text-xs text-gray-400 mb-1">读水判断</div>
                                    <p className="text-sm text-gray-300">
                                      {mistake.readingJudgment}
                                    </p>
                                  </div>
                                )}

                                {mistake.correction && (
                                  <div className="mb-2">
                                    <div className="text-xs text-gray-400 mb-1">纠正方法</div>
                                    <p className="text-sm text-gray-300">
                                      {mistake.correction}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-deep-sea-700/50">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingMistake({ ...mistake });
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:bg-deep-sea-700 rounded transition-colors"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    编辑
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMistake(mistake.id);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-deep-sea-700 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    删除
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {selectedMistake && (
                  <div className="p-4 border-t border-deep-sea-700/50 bg-deep-sea-800/50">
                    <h3 className="text-sm font-semibold text-white mb-2">位置信息</h3>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>X 坐标:</span>
                        <span className="text-gray-300">
                          {Math.round(selectedMistake.position.x)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Y 坐标:</span>
                        <span className="text-gray-300">
                          {Math.round(selectedMistake.position.y)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>记录时间:</span>
                        <span className="text-gray-300">
                          {new Date(selectedMistake.timestamp).toLocaleTimeString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showNewSessionForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-deep-sea-900 rounded-xl border border-deep-sea-700 w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">新增训练记录</h2>
              <button
                onClick={() => setShowNewSessionForm(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">河段</label>
                <select
                  value={newSessionForm.reachId}
                  onChange={(e) =>
                    setNewSessionForm((prev) => ({
                      ...prev,
                      reachId: e.target.value,
                      gateConfigId: '',
                    }))
                  }
                  className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">选择河段</option>
                  {reaches.map((reach) => (
                    <option key={reach.id} value={reach.id}>
                      {reach.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">门位配置</label>
                <select
                  value={newSessionForm.gateConfigId}
                  onChange={(e) =>
                    setNewSessionForm((prev) => ({ ...prev, gateConfigId: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">选择门位配置</option>
                  {availableGateConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} ({config.gates.length} 道门)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">运动员</label>
                <select
                  value={newSessionForm.athleteId}
                  onChange={(e) =>
                    setNewSessionForm((prev) => ({ ...prev, athleteId: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">选择运动员</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name} (Lv.{athlete.skillLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">艇型</label>
                <select
                  value={newSessionForm.boatId}
                  onChange={(e) =>
                    setNewSessionForm((prev) => ({ ...prev, boatId: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">选择艇型</option>
                  {boats.map((boat) => (
                    <option key={boat.id} value={boat.id}>
                      {BOAT_TYPE_LABELS[boat.type]} - {boat.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">训练日期</label>
                <input
                  type="datetime-local"
                  value={formatDateTimeForInput(newSessionForm.date)}
                  onChange={(e) =>
                    setNewSessionForm((prev) => ({
                      ...prev,
                      date: parseDateTimeInput(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 bg-deep-sea-800 border border-deep-sea-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewSessionForm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!newSessionForm.reachId || !newSessionForm.gateConfigId || !newSessionForm.athleteId || !newSessionForm.boatId}
                className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                创建训练记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}