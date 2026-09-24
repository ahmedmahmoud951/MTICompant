'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCw, Move,
  MapPin, Square, Circle, ArrowUpRight, Minus, Type, Cloud,
  MessageSquare, Trash2, Save, Download, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { drawingsService } from '@/services/drawings.service';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMarkups();
  }, [drawing.id]);

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

  const isPdf = drawing.fileExtension?.toLowerCase() === '.pdf' || drawing.fileName?.toLowerCase().endsWith('.pdf');
  const isImage = !isPdf;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden"
    >
      {/* Top Header & Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded font-mono text-xs font-semibold">
            {drawing.drawingNumber}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {drawing.drawingTitle}
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                Rev: {drawing.revision} | Ver: {drawing.version}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {drawing.projectName} {drawing.siteName ? `• ${drawing.siteName}` : ''} • Discipline: {drawing.discipline}
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-2 text-slate-300 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            onClick={handleFitToScreen}
            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            title="Fit to Screen"
          >
            Fit
          </button>
          <button
            onClick={handleRotate}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowMarkups(!showMarkups)}
            className={`p-1.5 rounded transition ${showMarkups ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            title="Toggle Markups Visibility"
          >
            {showMarkups ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {drawing.downloadUrl && (
            <a
              href={drawing.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Markups ({markups.length})
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
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
            onClick={() => setActiveTool('select')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'select' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Select / Pointer"
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('pan')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'pan' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Pan / Drag Canvas"
          >
            <Move className="w-4 h-4 rotate-45" />
          </button>

          <div className="w-8 h-px bg-slate-800 my-1" />

          {/* DRAW-02 Markup Tools */}
          <button
            onClick={() => setActiveTool('Pin')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Pin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Place Pin"
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('Rectangle')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Rectangle' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Draw Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('Circle')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Circle' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Draw Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('Arrow')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Arrow' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Draw Arrow"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('Line')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Line' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Draw Line"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('Text')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Text' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Add Text"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('Cloud')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Cloud' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Revision Cloud"
          >
            <Cloud className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('Comment')}
            className={`p-2.5 rounded-lg transition ${activeTool === 'Comment' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Add Comment Tag"
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
          className={`flex-1 bg-slate-950 overflow-hidden flex items-center justify-center relative ${activeTool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
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
            {drawing.downloadUrl ? (
              isPdf ? (
                <div className="w-[1000px] h-[750px] bg-slate-900 rounded-lg shadow-2xl relative border border-slate-800 overflow-hidden">
                  <iframe
                    src={`${drawing.downloadUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0 pointer-events-none"
                    title={drawing.drawingTitle}
                  />
                  {renderMarkups()}
                </div>
              ) : (
                <div className="relative inline-block bg-slate-900 rounded-lg shadow-2xl border border-slate-800 overflow-hidden">
                  <img
                    src={drawing.downloadUrl}
                    alt={drawing.drawingTitle}
                    className="max-w-[1200px] max-h-[850px] object-contain pointer-events-none"
                    draggable={false}
                  />
                  {renderMarkups()}
                </div>
              )
            ) : (
              <div className="w-[800px] h-[550px] bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center">
                <p className="text-slate-400 text-sm mb-2">No direct preview URL available for this file.</p>
                <p className="text-slate-500 text-xs">File: {drawing.fileName || drawing.drawingNumber}</p>
              </div>
            )}
          </div>

          {/* Hint Overlay */}
          <div className="absolute bottom-3 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 pointer-events-none">
            Active: <span className="text-slate-200 font-semibold">{activeTool}</span> • Alt + Drag to Pan • Scroll to Zoom
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
    </div>
  );
};
