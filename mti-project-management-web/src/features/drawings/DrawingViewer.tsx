'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCw, Move,
  MapPin, Square, Circle, ArrowUpRight, Minus, Type, Cloud,
  MessageSquare, Trash2, Save, Download, RefreshCw, Eye, EyeOff,
  Lock, Unlock, CheckCircle2, AlertOctagon, History, Archive, Plus, Shield
} from 'lucide-react';
import { drawingsService } from '@/services/drawings.service';
import { mediaService } from '@/services/media.service';
import { DrawingDto, DrawingMarkupDto, DrawingMarkupType } from '@/types';

interface DrawingViewerProps {
  drawing: DrawingDto;
  onClose: () => void;
  onDrawingUpdated?: (updated: DrawingDto) => void;
}

type ToolType = 'select' | 'pan' | DrawingMarkupType;

interface Point {
  x: number;
  y: number;
}

interface NewShape {
  type: DrawingMarkupType;
  start: Point;
  end: Point;
  text: string;
  color: string;
}

const MARKUP_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Green', hex: '#10b981' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'White', hex: '#ffffff' },
];

export const DrawingViewer: React.FC<DrawingViewerProps> = ({ drawing, onClose, onDrawingUpdated }) => {
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeColor, setActiveColor] = useState<string>('#ef4444');
  const [markups, setMarkups] = useState<DrawingMarkupDto[]>([]);
  const [showMarkups, setShowMarkups] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [loadingMarkups, setLoadingMarkups] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [newShape, setNewShape] = useState<NewShape | null>(null);
  const [selectedMarkup, setSelectedMarkup] = useState<DrawingMarkupDto | null>(null);
  const [commentText, setCommentText] = useState<string>('');

  // DRAW-03 & DRAW-04 Revision & Admin State
  const [currentDrawing, setCurrentDrawing] = useState<DrawingDto>(drawing);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<any | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [newRevCode, setNewRevCode] = useState<string>('Rev B');
  const [newRevReason, setNewRevReason] = useState<string>('');
  const [newRevFile, setNewRevFile] = useState<File | null>(null);
  const [isRevUploading, setIsRevUploading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isApproved = currentDrawing.status === 'Approved' || selectedRevision?.status === 'Approved';
  const isLocked = currentDrawing.isLocked;
  const isReadOnly = isApproved || isLocked;

  useEffect(() => {
    loadMarkups();
    loadRevisions();
  }, [drawing.id]);

  const loadRevisions = async () => {
    try {
      const res = await drawingsService.getRevisions(drawing.id);
      if (res.success && res.data) {
        setRevisions(res.data);
        const curr = res.data.find((r: any) => r.isCurrent) || res.data[0];
        if (curr) setSelectedRevision(curr);
      }
    } catch (e) {
      console.error('Failed to load revisions', e);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this drawing? Approved drawings become read-only.')) return;
    try {
      setActionLoading(true);
      const res = await drawingsService.approveDrawing(drawing.id, 'Approved via Drawing Viewer');
      if (res.success) {
        const updated = { ...currentDrawing, status: 'Approved' };
        setCurrentDrawing(updated);
        if (onDrawingUpdated) onDrawingUpdated(updated);
        loadRevisions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      const res = await drawingsService.rejectDrawing(drawing.id, reason);
      if (res.success) {
        const updated = { ...currentDrawing, status: 'Rejected' };
        setCurrentDrawing(updated);
        if (onDrawingUpdated) onDrawingUpdated(updated);
        loadRevisions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async () => {
    try {
      setActionLoading(true);
      const newLockState = !currentDrawing.isLocked;
      const res = await drawingsService.lockDrawing(drawing.id, newLockState);
      if (res.success) {
        const updated = { ...currentDrawing, isLocked: newLockState };
        setCurrentDrawing(updated);
        if (onDrawingUpdated) onDrawingUpdated(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this drawing?')) return;
    try {
      setActionLoading(true);
      const res = await drawingsService.archiveDrawing(drawing.id);
      if (res.success) {
        const updated = { ...currentDrawing, status: 'Archived' };
        setCurrentDrawing(updated);
        if (onDrawingUpdated) onDrawingUpdated(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this drawing? Deleted drawings cannot be recovered.')) return;
    try {
      setActionLoading(true);
      const res = await drawingsService.deleteDrawing(drawing.id);
      if (res.success) {
        onClose();
      } else {
        alert(res.message || 'Cannot delete drawing according to policy');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevFile || !newRevCode.trim() || !newRevReason.trim()) {
      alert('Please select a file and provide revision code and change reason.');
      return;
    }

    try {
      setIsRevUploading(true);
      const uploaded = await mediaService.uploadFile(newRevFile, {
        projectId: drawing.projectId,
        siteId: drawing.siteId || undefined,
        entityType: 'Drawing'
      });

      if (!uploaded || !uploaded.id) {
        throw new Error('File upload failed');
      }

      const res = await drawingsService.createRevision(drawing.id, {
        revision: newRevCode.trim(),
        storageKey: uploaded.id,
        fileName: newRevFile.name,
        fileExtension: `.${newRevFile.name.split('.').pop()}`,
        fileSizeBytes: newRevFile.size,
        changeReason: newRevReason.trim()
      });

      if (res.success) {
        setShowRevisionModal(false);
        setNewRevFile(null);
        setNewRevReason('');
        loadRevisions();
        // Update drawing current revision
        const updated = {
          ...currentDrawing,
          revision: newRevCode.trim(),
          status: 'Submitted',
          downloadUrl: uploaded.downloadUrl || currentDrawing.downloadUrl
        };
        setCurrentDrawing(updated);
        if (onDrawingUpdated) onDrawingUpdated(updated);
      } else {
        alert(res.message || 'Failed to create revision');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred creating revision');
    } finally {
      setIsRevUploading(false);
    }
  };

  const loadMarkups = async () => {
    try {
      setLoadingMarkups(true);
      const res = await drawingsService.getMarkups(drawing.id);
      if (res.success && res.data) {
        setMarkups(res.data);
      }
    } catch (err) {
      console.error('Failed to load markups', err);
    } finally {
      setLoadingMarkups(false);
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.25));
  const handleFitToScreen = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (activeTool === 'select') return;

    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);

    if (activeTool === 'Pin' || activeTool === 'Comment') {
      const text = prompt(activeTool === 'Pin' ? 'Enter Pin label/note:' : 'Enter comment text:') || '';
      if (text.trim()) {
        saveMarkup({
          type: activeTool,
          positionJson: JSON.stringify({ x: coords.x, y: coords.y }),
          text: text.trim(),
          color: activeColor
        });
      }
      setIsDrawing(false);
      return;
    }

    setNewShape({
      type: activeTool as DrawingMarkupType,
      start: coords,
      end: coords,
      text: commentText,
      color: activeColor
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing || !newShape) return;
    const coords = getCanvasCoordinates(e);
    setNewShape({ ...newShape, end: coords });
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !newShape) return;
    setIsDrawing(false);

    let text = newShape.text;
    if (newShape.type === 'Text') {
      text = prompt('Enter annotation text:') || '';
      if (!text.trim()) {
        setNewShape(null);
        return;
      }
    }

    const pos = {
      x1: Math.min(newShape.start.x, newShape.end.x),
      y1: Math.min(newShape.start.y, newShape.end.y),
      x2: Math.max(newShape.start.x, newShape.end.x),
      y2: Math.max(newShape.start.y, newShape.end.y),
      startX: newShape.start.x,
      startY: newShape.start.y,
      endX: newShape.end.x,
      endY: newShape.end.y
    };

    saveMarkup({
      type: newShape.type,
      positionJson: JSON.stringify(pos),
      text: text,
      color: newShape.color
    });

    setNewShape(null);
  };

  const saveMarkup = async (data: { type: DrawingMarkupType; positionJson: string; text: string; color: string }) => {
    try {
      const res = await drawingsService.addMarkup(drawing.id, data);
      if (res.success && res.data) {
        setMarkups(prev => [res.data, ...prev]);
        if (onDrawingUpdated) {
          onDrawingUpdated({
            ...drawing,
            markupsCount: drawing.markupsCount + 1
          });
        }
      }
    } catch (err) {
      console.error('Failed to save markup', err);
      alert('Failed to save markup');
    }
  };

  const handleDeleteMarkup = async (markupId: string) => {
    if (!confirm('Are you sure you want to delete this markup?')) return;
    try {
      const res = await drawingsService.deleteMarkup(drawing.id, markupId);
      if (res.success) {
        setMarkups(prev => prev.filter(m => m.id !== markupId));
        if (selectedMarkup?.id === markupId) setSelectedMarkup(null);
        if (onDrawingUpdated) {
          onDrawingUpdated({
            ...drawing,
            markupsCount: Math.max(0, drawing.markupsCount - 1)
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete markup', err);
    }
  };

  const renderMarkups = () => {
    if (!showMarkups) return null;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        {markups.map(m => {
          let pos: any = {};
          try {
            pos = JSON.parse(m.positionJson);
          } catch {
            return null;
          }

          const color = m.color || '#ef4444';
          const isSelected = selectedMarkup?.id === m.id;

          switch (m.type) {
            case 'Pin':
            case 'Comment':
              return (
                <g key={m.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedMarkup(m)}>
                  <circle cx={pos.x} cy={pos.y} r={14} fill={color} fillOpacity={0.85} stroke="#ffffff" strokeWidth={2} />
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold">
                    {m.type === 'Pin' ? '📍' : '💬'}
                  </text>
                  {m.text && (
                    <text x={pos.x + 18} y={pos.y + 4} fill={color} fontSize={12} fontWeight="bold" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))">
                      {m.text}
                    </text>
                  )}
                </g>
              );

            case 'Rectangle':
              return (
                <g key={m.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedMarkup(m)}>
                  <rect
                    x={pos.x1}
                    y={pos.y1}
                    width={Math.max(10, pos.x2 - pos.x1)}
                    height={Math.max(10, pos.y2 - pos.y1)}
                    fill={color}
                    fillOpacity={0.15}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isSelected ? '4 2' : 'none'}
                  />
                  {m.text && (
                    <text x={pos.x1 + 4} y={pos.y1 - 6} fill={color} fontSize={12} fontWeight="bold">
                      {m.text}
                    </text>
                  )}
                </g>
              );

            case 'Circle':
              const cx = (pos.x1 + pos.x2) / 2;
              const cy = (pos.y1 + pos.y2) / 2;
              const rx = Math.max(5, (pos.x2 - pos.x1) / 2);
              const ry = Math.max(5, (pos.y2 - pos.y1) / 2);
              return (
                <g key={m.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedMarkup(m)}>
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    fill={color}
                    fillOpacity={0.15}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {m.text && (
                    <text x={cx} y={cy - ry - 6} textAnchor="middle" fill={color} fontSize={12} fontWeight="bold">
                      {m.text}
                    </text>
                  )}
                </g>
              );

            case 'Line':
            case 'Arrow':
              return (
                <g key={m.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedMarkup(m)}>
                  <line
                    x1={pos.startX}
                    y1={pos.startY}
                    x2={pos.endX}
                    y2={pos.endY}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {m.type === 'Arrow' && (
                    <circle cx={pos.endX} cy={pos.endY} r={5} fill={color} />
                  )}
                  {m.text && (
                    <text x={(pos.startX + pos.endX) / 2} y={(pos.startY + pos.endY) / 2 - 6} fill={color} fontSize={12} fontWeight="bold">
                      {m.text}
                    </text>
                  )}
                </g>
              );

            case 'Text':
              return (
                <g key={m.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedMarkup(m)}>
                  <rect x={pos.x1 - 4} y={pos.y1 - 16} width={Math.max(60, m.text.length * 8 + 12)} height={24} fill="#0f172a" fillOpacity={0.8} rx={4} />
                  <text x={pos.x1} y={pos.y1} fill={color} fontSize={13} fontWeight="bold">
                    {m.text}
                  </text>
                </g>
              );

            case 'Cloud':
              return (
                <g key={m.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedMarkup(m)}>
                  <rect
                    x={pos.x1}
                    y={pos.y1}
                    width={Math.max(10, pos.x2 - pos.x1)}
                    height={Math.max(10, pos.y2 - pos.y1)}
                    fill={color}
                    fillOpacity={0.12}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    rx={12}
                  />
                  {m.text && (
                    <text x={pos.x1 + 6} y={pos.y1 - 6} fill={color} fontSize={12} fontWeight="bold">
                      {m.text}
                    </text>
                  )}
                </g>
              );

            default:
              return null;
          }
        })}

        {newShape && (
          <rect
            x={Math.min(newShape.start.x, newShape.end.x)}
            y={Math.min(newShape.start.y, newShape.end.y)}
            width={Math.abs(newShape.end.x - newShape.start.x)}
            height={Math.abs(newShape.end.y - newShape.start.y)}
            fill={newShape.color}
            fillOpacity={0.2}
            stroke={newShape.color}
            strokeWidth={2}
            strokeDasharray="3 3"
          />
        )}
      </svg>
    );
  };

  const activeRevCode = selectedRevision?.revision || currentDrawing.revision;
  const activeStatus = selectedRevision?.status || currentDrawing.status;
  const activeUrl = selectedRevision?.downloadUrl || currentDrawing.downloadUrl;
  const activeExt = (selectedRevision?.fileExtension || currentDrawing.fileExtension || '').toLowerCase();
  const isPdf = activeExt === '.pdf' || activeUrl?.toLowerCase().includes('.pdf');
  const isImage = !isPdf;

  const handleToolClick = (tool: ToolType) => {
    if (isReadOnly && tool !== 'select' && tool !== 'pan') {
      alert('This drawing is Approved / Locked and is strictly READ-ONLY. Direct edits and markups are disabled on approved versions according to DRAW-03 policy. Please click "+ New Revision" to propose modifications.');
      return;
    }
    setActiveTool(tool);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden"
    >
      {/* Read-Only Banner if Approved or Locked */}
      {isReadOnly && (
        <div className="bg-amber-950/80 border-b border-amber-600/40 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">
              {isApproved ? 'Approved Drawing (Read-Only)' : 'Locked Drawing (Read-Only)'}
            </span>
            <span className="text-amber-300/80">
              — Direct modifications to this version are locked according to DRAW-03/04 policy.
            </span>
          </div>
          <button
            onClick={() => setShowRevisionModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition"
          >
            <Plus className="w-3 h-3" />
            Create New Revision
          </button>
        </div>
      )}

      {/* Top Header & Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-mono text-xs font-semibold">
            {currentDrawing.drawingNumber}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {currentDrawing.drawingTitle}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                activeStatus === 'Approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : activeStatus === 'Rejected'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {activeStatus === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                {activeStatus}
              </span>
              {currentDrawing.isLocked && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              {currentDrawing.projectName} {currentDrawing.siteName ? `• ${currentDrawing.siteName}` : ''} • Discipline: {currentDrawing.discipline}
            </p>
          </div>
        </div>

        {/* Revision Selector (DRAW-04) & View Controls */}
        <div className="flex items-center gap-2">
          {/* Revision Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 text-[11px]">Rev:</span>
            <select
              value={selectedRevision?.id || ''}
              onChange={(e) => {
                const rev = revisions.find(r => r.id === e.target.value);
                if (rev) setSelectedRevision(rev);
              }}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-semibold"
            >
              {revisions.length > 0 ? (
                revisions.map((r: any) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    {r.revision} {r.isCurrent ? '(Current)' : ''} - {r.status}
                  </option>
                ))
              ) : (
                <option value="" className="bg-slate-900 text-slate-200">
                  {currentDrawing.revision} (Current)
                </option>
              )}
            </select>
          </div>

          {/* View Zoom & Rotate Controls */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono px-1.5 text-slate-300 min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="h-3.5 w-px bg-slate-800 mx-0.5" />
            <button
              onClick={handleFitToScreen}
              className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              title="Fit to Screen"
            >
              Fit
            </button>
            <button
              onClick={handleRotate}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMarkups(!showMarkups)}
              className={`p-1 rounded transition ${showMarkups ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
              title="Toggle Markups Visibility"
            >
              {showMarkups ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right Action Buttons: Admin Actions & Controls */}
        <div className="flex items-center gap-1.5">
          {/* New Revision Button */}
          <button
            onClick={() => setShowRevisionModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition"
            title="Create New Revision (DRAW-04)"
          >
            <Plus className="w-3.5 h-3.5" />
            + New Revision
          </button>

          {/* Admin Approval / Rejection */}
          {!isApproved && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-medium rounded-lg transition"
                title="Approve Drawing (Locks as Read-Only)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-medium rounded-lg transition"
                title="Reject Drawing"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}

          {/* Lock / Unlock Toggle */}
          <button
            onClick={handleToggleLock}
            disabled={actionLoading}
            className={`p-1.5 rounded-lg border text-xs font-medium transition ${
              currentDrawing.isLocked
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600 hover:text-white'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={currentDrawing.isLocked ? 'Unlock Drawing' : 'Lock Drawing'}
          >
            {currentDrawing.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Archive Drawing */}
          <button
            onClick={handleArchive}
            disabled={actionLoading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg text-xs transition"
            title="Archive Drawing"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>

          {/* Delete Drawing according to policy */}
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="p-1.5 bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-lg text-xs transition"
            title="Delete Drawing (According to Policy)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {activeUrl && (
            <a
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Markups ({markups.length})
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Markup Tools Palette */}
        <div className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 gap-2 z-10">
          <button
            onClick={() => handleToolClick('select')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'select' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Select / Pointer"
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('pan')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'pan' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Pan / Drag Canvas"
          >
            <Move className="w-4 h-4 rotate-45" />
          </button>

          <div className="w-8 h-px bg-slate-800 my-1" />

          {/* DRAW-02 Markup Tools with read-only awareness */}
          <button
            onClick={() => handleToolClick('Pin')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Pin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Place Pin'}
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('Rectangle')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Rectangle' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Draw Rectangle'}
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('Circle')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Circle' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Draw Circle'}
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('Arrow')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Arrow' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Draw Arrow'}
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('Line')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Line' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Draw Line'}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('Text')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Text' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Add Text'}
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('Cloud')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Cloud' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Revision Cloud'}
          >
            <Cloud className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToolClick('Comment')}
            className={`p-2.5 rounded-lg transition ${
              isReadOnly ? 'opacity-40 hover:opacity-60 cursor-not-allowed' : ''
            } ${activeTool === 'Comment' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title={isReadOnly ? 'Read-only on approved revision' : 'Add Comment Tag'}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <div className="w-8 h-px bg-slate-800 my-1" />

          {/* Color Palettes */}
          <div className="flex flex-col gap-1.5">
            {MARKUP_COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setActiveColor(c.hex)}
                className={`w-5 h-5 rounded-full border-2 transition ${activeColor === c.hex ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className={`flex-1 bg-slate-950 overflow-hidden flex items-center justify-center relative ${activeTool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : activeTool !== 'select' && !isReadOnly ? 'cursor-crosshair' : 'cursor-default'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div
            ref={canvasRef}
            className="relative transition-transform duration-75 select-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {activeUrl ? (
              isPdf ? (
                <div className="w-[1000px] h-[750px] bg-slate-900 rounded-lg shadow-2xl relative border border-slate-800 overflow-hidden">
                  <iframe
                    src={`${activeUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0 pointer-events-none"
                    title={currentDrawing.drawingTitle}
                  />
                  {renderMarkups()}
                </div>
              ) : (
                <div className="relative inline-block bg-slate-900 rounded-lg shadow-2xl border border-slate-800 overflow-hidden">
                  <img
                    src={activeUrl}
                    alt={currentDrawing.drawingTitle}
                    className="max-w-[1200px] max-h-[850px] object-contain pointer-events-none"
                    draggable={false}
                  />
                  {renderMarkups()}
                </div>
              )
            ) : (
              <div className="w-[800px] h-[550px] bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center">
                <p className="text-slate-400 text-sm mb-2">No direct preview URL available for this file.</p>
                <p className="text-slate-500 text-xs">File: {currentDrawing.fileName || currentDrawing.drawingNumber}</p>
              </div>
            )}
          </div>

          {/* Hint Overlay */}
          <div className="absolute bottom-3 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 pointer-events-none">
            Active: <span className="text-slate-200 font-semibold">{activeTool}</span> • Alt + Drag to Pan • Scroll to Zoom
            {isReadOnly && <span className="text-amber-400 ml-2 font-semibold">🔒 Read-Only</span>}
          </div>
        </div>

        {/* Right Markups & Comments Sidebar */}
        {sidebarOpen && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Drawing Markups & Notes
              </h3>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-mono">
                {markups.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {loadingMarkups ? (
                <div className="flex items-center justify-center py-10 text-slate-500 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Loading annotations...
                </div>
              ) : markups.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No annotations yet.<br />
                  Use the toolbar on the left to pin comments, draw boxes, or clouds.
                </div>
              ) : (
                markups.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMarkup(m)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${selectedMarkup?.id === m.id ? 'bg-blue-950/40 border-blue-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1.5"
                        style={{ backgroundColor: `${m.color}20`, color: m.color }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.type}
                      </span>
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMarkup(m.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 transition p-1"
                          title="Delete markup"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {m.text && (
                      <p className="text-xs text-slate-200 mb-2 leading-relaxed">
                        {m.text}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>{m.userName}</span>
                      <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Note on DRAW-02 Architecture */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500">
              🔒 <span className="font-semibold text-slate-400">Non-destructive overlay:</span> All markups are stored separately in the database and never alter the original CAD/PDF file.
            </div>
          </div>
        )}
      </div>

      {/* DRAW-04 Create Drawing Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Create New Drawing Revision
              </h3>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRevisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Revision Code (e.g. Rev B, Rev C, Rev 02) *
                </label>
                <input
                  type="text"
                  required
                  value={newRevCode}
                  onChange={(e) => setNewRevCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="Rev B"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Change / Modifications *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newRevReason}
                  onChange={(e) => setNewRevReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="Describe what changed in this revision..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Revision CAD / PDF File *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                  onChange={(e) => setNewRevFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg text-xs text-blue-300">
                <p className="font-semibold mb-1">🛡️ DRAW-04 Revision Policy:</p>
                Approved originals are never overwritten. Historical revisions remain archived with their uploader, approval logs, and change reasons.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRevUploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
                >
                  {isRevUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isRevUploading ? 'Uploading & Creating...' : 'Save New Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
