'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass, Upload, Search, Filter, Layers, FileText, CheckCircle2,
  Clock, AlertCircle, Eye, Download, Plus, ChevronRight, X
} from 'lucide-react';
import { drawingsService } from '@/services/drawings.service';
import { DrawingViewer } from './DrawingViewer';
import { DrawingDto, DrawingDiscipline, DrawingType, Project, Site } from '@/types';
import { projectService, siteService } from '@/services/project.service';
import { mediaService } from '@/services/media.service';

const DISCIPLINES: { key: DrawingDiscipline; label: string }[] = [
  { key: 'Architecture', label: 'Architecture' },
  { key: 'Electrical', label: 'Electrical' },
  { key: 'Mechanical', label: 'Mechanical' },
  { key: 'CCTV', label: 'CCTV' },
  { key: 'AccessControl', label: 'Access Control' },
  { key: 'Network', label: 'Network' },
  { key: 'FireAlarm', label: 'Fire Alarm' },
  { key: 'Security', label: 'Security' },
  { key: 'Civil', label: 'Civil' },
  { key: 'Other', label: 'Other' },
];

const DRAWING_TYPES: { key: DrawingType; label: string }[] = [
  { key: 'ShopDrawing', label: 'Shop Drawing' },
  { key: 'AsBuilt', label: 'As-Built Drawing' },
  { key: 'Schematic', label: 'Schematic' },
  { key: 'SingleLineDiagram', label: 'Single Line Diagram' },
  { key: 'Layout', label: 'Layout' },
  { key: 'Detail', label: 'Detail' },
  { key: 'Other', label: 'Other' },
];

interface DrawingsWorkspaceProps {
  initialProjectId?: string;
  initialSiteId?: string;
}

export const DrawingsWorkspace: React.FC<DrawingsWorkspaceProps> = ({
  initialProjectId,
  initialSiteId
}) => {
  const [drawings, setDrawings] = useState<DrawingDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId || '');
  const [selectedSite, setSelectedSite] = useState<string>(initialSiteId || '');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Viewer state
  const [activeViewerDrawing, setActiveViewerDrawing] = useState<DrawingDto | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProjectId, setUploadProjectId] = useState<string>(initialProjectId || '');
  const [uploadSiteId, setUploadSiteId] = useState<string>(initialSiteId || '');
  const [uploadNumber, setUploadNumber] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadDiscipline, setUploadDiscipline] = useState<DrawingDiscipline>('CCTV');
  const [uploadType, setUploadType] = useState<DrawingType>('ShopDrawing');
  const [uploadRevision, setUploadRevision] = useState<string>('Rev 00');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadSites();
  }, []);

  useEffect(() => {
    loadDrawings();
  }, [selectedProject, selectedSite, selectedDiscipline, selectedType, searchQuery]);

  const loadProjects = async () => {
    try {
      const res = await projectService.getProjects();
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.items || []);
        setProjects(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSites = async () => {
    try {
      const res = await siteService.getAllSites();
      if (res.success && res.data) {
        setSites(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDrawings = async () => {
    try {
      setLoading(true);
      const res = await drawingsService.getDrawings({
        projectId: selectedProject || undefined,
        siteId: selectedSite || undefined,
        discipline: selectedDiscipline !== 'All' ? selectedDiscipline : undefined,
        drawingType: selectedType !== 'All' ? selectedType : undefined,
        search: searchQuery || undefined,
        pageSize: 100
      });

      if (res.success && res.data) {
        setDrawings(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch (e) {
      console.error('Failed to load drawings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadProjectId || !uploadNumber || !uploadTitle) {
      setUploadError('Please fill in all required fields and select a file.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Upload file to Backblaze B2 via media service
      const uploaded = await mediaService.uploadFile(uploadFile, {
        projectId: uploadProjectId,
        siteId: uploadSiteId || undefined,
        entityType: 'Drawing'
      });

      if (!uploaded || !uploaded.id) {
        throw new Error('File upload failed');
      }

      // Register Drawing record in DB
      const createRes = await drawingsService.createDrawing({
        projectId: uploadProjectId,
        siteId: uploadSiteId || undefined,
        drawingNumber: uploadNumber.trim(),
        drawingTitle: uploadTitle.trim(),
        discipline: uploadDiscipline,
        drawingType: uploadType,
        revision: uploadRevision.trim() || 'Rev 00',
        storageKey: uploaded.id,
        fileName: uploadFile.name,
        fileExtension: `.${uploadFile.name.split('.').pop()}`,
        fileSizeBytes: uploadFile.size
      });

      if (createRes.success) {
        setShowUploadModal(false);
        resetUploadForm();
        loadDrawings();
      } else {
        setUploadError(createRes.message || 'Failed to register drawing');
      }
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadNumber('');
    setUploadTitle('');
    setUploadRevision('Rev 00');
    setUploadError(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-900 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Drawing Management Module
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Professional CAD, PDF, Shop Drawings, and As-Built drawings with interactive markup viewer.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-600/20 transition"
        >
          <Upload className="w-4 h-4" />
          Upload New Drawing
        </button>
      </div>

      {/* Disciplines Horizontal Filter Ribbon */}
      <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto">
        <button
          onClick={() => setSelectedDiscipline('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${selectedDiscipline === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          All Disciplines ({totalCount})
        </button>
        {DISCIPLINES.map(d => (
          <button
            key={d.key}
            onClick={() => setSelectedDiscipline(d.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${selectedDiscipline === d.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-slate-900/40 border-b border-slate-800">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by drawing number, title..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Project Selector */}
        <select
          value={selectedProject}
          onChange={(e) => {
            setSelectedProject(e.target.value);
            setSelectedSite('');
          }}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Site Selector */}
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Sites</option>
          {sites
            .filter(s => !selectedProject || s.projectId === selectedProject)
            .map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
        </select>

        {/* Type Selector */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="All">All Types</option>
          {DRAWING_TYPES.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Drawings Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            Loading drawings catalog...
          </div>
        ) : drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No drawings found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              No drawings match your current filter criteria. Upload drawings or reset your filters.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Upload Drawing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {drawings.map(d => (
              <div
                key={d.id}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl overflow-hidden shadow transition group flex flex-col"
              >
                {/* Preview Thumbnail area */}
                <div
                  onClick={() => setActiveViewerDrawing(d)}
                  className="h-44 bg-slate-950 border-b border-slate-800/80 relative flex items-center justify-center overflow-hidden cursor-pointer group-hover:bg-slate-900 transition"
                >
                  {d.downloadUrl && (d.fileExtension?.toLowerCase() === '.png' || d.fileExtension?.toLowerCase() === '.jpg' || d.fileExtension?.toLowerCase() === '.jpeg') ? (
                    <img
                      src={d.downloadUrl}
                      alt={d.drawingTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-600 group-hover:text-blue-400 transition">
                      <Compass className="w-10 h-10 mb-2" />
                      <span className="text-[11px] font-mono uppercase tracking-wider">
                        {d.fileExtension || 'CAD/PDF'}
                      </span>
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-blue-600/90 text-white text-[11px] font-mono font-semibold backdrop-blur">
                      {d.revision}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 text-[11px] font-semibold border border-slate-700 backdrop-blur">
                      {d.discipline}
                    </span>
                  </div>

                  {d.markupsCount > 0 && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-amber-500/90 text-slate-950 text-[11px] font-bold shadow">
                      {d.markupsCount} Markups
                    </div>
                  )}

                  {/* Hover Overlay Button */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-lg flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Open in Viewer
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-xs text-blue-400 font-semibold mb-1">
                      {d.drawingNumber}
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 line-clamp-1 mb-2">
                      {d.drawingTitle}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {d.projectName} {d.siteName ? `• ${d.siteName}` : ''}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(d.uploadedAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => setActiveViewerDrawing(d)}
                      className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      View & Annotate
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                Upload New Drawing
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Drawing File (CAD, PDF, or Image) *
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Drawing Number *
                  </label>
                  <input
                    type="text"
                    value={uploadNumber}
                    onChange={(e) => setUploadNumber(e.target.value)}
                    placeholder="e.g. DWG-CCTV-001"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Revision *
                  </label>
                  <input
                    type="text"
                    value={uploadRevision}
                    onChange={(e) => setUploadRevision(e.target.value)}
                    placeholder="e.g. Rev 00"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Drawing Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Ground Floor CCTV Camera Layout"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Project *
                  </label>
                  <select
                    value={uploadProjectId}
                    onChange={(e) => setUploadProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Site (Optional)
                  </label>
                  <select
                    value={uploadSiteId}
                    onChange={(e) => setUploadSiteId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Site</option>
                    {sites
                      .filter(s => !uploadProjectId || s.projectId === uploadProjectId)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Discipline *
                  </label>
                  <select
                    value={uploadDiscipline}
                    onChange={(e) => setUploadDiscipline(e.target.value as DrawingDiscipline)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {DISCIPLINES.map(d => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Drawing Type *
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as DrawingType)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {DRAWING_TYPES.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  {isUploading ? 'Uploading...' : 'Save Drawing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAW-02 Drawing Viewer Modal */}
      {activeViewerDrawing && (
        <DrawingViewer
          drawing={activeViewerDrawing}
          onClose={() => setActiveViewerDrawing(null)}
          onDrawingUpdated={(updated) => {
            setDrawings(prev => prev.map(d => d.id === updated.id ? updated : d));
          }}
        />
      )}
    </div>
  );
};
