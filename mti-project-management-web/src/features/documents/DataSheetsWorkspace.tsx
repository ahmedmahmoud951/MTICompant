'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu, Upload, Search, Download, Trash2, Plus, ChevronRight,
  X, Server, Shield, Wifi, HardDrive, Zap, Tag, CheckCircle2
} from 'lucide-react';
import { dataSheetsService } from '@/services/datasheets.service';
import { ProductDataSheetDto, Project, Site } from '@/types';
import { projectService, siteService } from '@/services/project.service';
import { mediaService } from '@/services/media.service';

interface DataSheetsWorkspaceProps {
  initialProjectId?: string;
  initialSiteId?: string;
}

export const DataSheetsWorkspace: React.FC<DataSheetsWorkspaceProps> = ({
  initialProjectId,
  initialSiteId
}) => {
  const [dataSheets, setDataSheets] = useState<ProductDataSheetDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId || '');
  const [selectedSite, setSelectedSite] = useState<string>(initialSiteId || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProduct, setUploadProduct] = useState<string>('');
  const [uploadManufacturer, setUploadManufacturer] = useState<string>('');
  const [uploadModel, setUploadModel] = useState<string>('');
  const [uploadPartNumber, setUploadPartNumber] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('CCTV Camera');
  const [uploadProjectId, setUploadProjectId] = useState<string>(initialProjectId || '');
  const [uploadSiteId, setUploadSiteId] = useState<string>(initialSiteId || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadSites();
    loadCategories();
  }, []);

  useEffect(() => {
    loadDataSheets();
  }, [selectedProject, selectedSite, selectedCategory, searchQuery]);

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

  const loadCategories = async () => {
    try {
      const res = await dataSheetsService.getCategories();
      if (res.success && res.data) setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDataSheets = async () => {
    try {
      setLoading(true);
      const res = await dataSheetsService.getDataSheets({
        projectId: selectedProject || undefined,
        siteId: selectedSite || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery || undefined
      });

      if (res.success && res.data) {
        setDataSheets(res.data);
      }
    } catch (e) {
      console.error('Failed to load data sheets', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadProduct || !uploadManufacturer || !uploadModel || !uploadCategory) {
      setUploadError('Please fill in all required fields.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      let storageKey: string | undefined;
      let fileName: string | undefined;
      let fileSize = 0;

      if (uploadFile) {
        const uploaded = await mediaService.uploadFile(uploadFile, {
          projectId: uploadProjectId || undefined,
          siteId: uploadSiteId || undefined,
          entityType: 'DataSheet'
        });
        if (uploaded && uploaded.id) {
          storageKey = uploaded.id;
          fileName = uploadFile.name;
          fileSize = uploadFile.size;
        }
      }

      const createRes = await dataSheetsService.createDataSheet({
        projectId: uploadProjectId || undefined,
        siteId: uploadSiteId || undefined,
        product: uploadProduct.trim(),
        manufacturer: uploadManufacturer.trim(),
        model: uploadModel.trim(),
        partNumber: uploadPartNumber.trim() || undefined,
        category: uploadCategory,
        storageKey,
        fileName,
        fileSizeBytes: fileSize
      });

      if (createRes.success) {
        setShowUploadModal(false);
        resetUploadForm();
        loadDataSheets();
      } else {
        setUploadError(createRes.message || 'Failed to create data sheet');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload data sheet');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadProduct('');
    setUploadManufacturer('');
    setUploadModel('');
    setUploadPartNumber('');
    setUploadCategory('CCTV Camera');
    setUploadError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this data sheet?')) return;
    try {
      const res = await dataSheetsService.deleteDataSheet(id);
      if (res.success) {
        setDataSheets(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-900 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Data Sheet Management Center
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Technical product specifications, manufacturer datasheets, hardware manuals, and equipment catalogs.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Data Sheet
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${selectedCategory === 'All' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          All Categories ({dataSheets.length})
        </button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${selectedCategory === c ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Search & Selectors */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-slate-900/40 border-b border-slate-800">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product, manufacturer, model, part #..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedProject}
          onChange={(e) => {
            setSelectedProject(e.target.value);
            setSelectedSite('');
          }}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Sites</option>
          {sites
            .filter(s => !selectedProject || s.projectId === selectedProject)
            .map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
        </select>
      </div>

      {/* Data Sheets Catalog Table / Cards */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            Loading data sheets catalog...
          </div>
        ) : dataSheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Cpu className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No data sheets found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Register product specifications and datasheets to attach to projects, sites, and hardware assets.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
            >
              Add First Data Sheet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataSheets.map(ds => (
              <div
                key={ds.id}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 shadow transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[11px] font-semibold">
                      {ds.category}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      v{ds.version}.0
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 mb-1">
                    {ds.product}
                  </h3>
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                    <span className="text-slate-300 font-semibold">{ds.manufacturer}</span>
                    <span>•</span>
                    <span>Model: {ds.model}</span>
                    {ds.partNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-400">P/N: {ds.partNumber}</span>
                      </>
                    )}
                  </div>

                  {(ds.projectName || ds.siteName) && (
                    <div className="p-2 bg-slate-950 rounded-lg text-xs text-slate-400 mb-3">
                      📍 {ds.projectName || 'Enterprise Wide'} {ds.siteName ? `• ${ds.siteName}` : ''}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    By {ds.uploaderName} • {new Date(ds.uploadedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ds.downloadUrl && (
                      <a
                        href={ds.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                        title="Download Data Sheet PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(ds.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                <Cpu className="w-4 h-4 text-emerald-400" />
                Register Product Data Sheet
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product / Device Name *
                  </label>
                  <input
                    type="text"
                    value={uploadProduct}
                    onChange={(e) => setUploadProduct(e.target.value)}
                    placeholder="e.g. 4K IR Dome Camera"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    value={uploadManufacturer}
                    onChange={(e) => setUploadManufacturer(e.target.value)}
                    placeholder="e.g. Hikvision, Cisco, Bosch"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={uploadModel}
                    onChange={(e) => setUploadModel(e.target.value)}
                    placeholder="e.g. DS-2CD2185G0-IMS"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Part Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadPartNumber}
                    onChange={(e) => setUploadPartNumber(e.target.value)}
                    placeholder="e.g. PN-99482"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Project (Optional)
                  </label>
                  <select
                    value={uploadProjectId}
                    onChange={(e) => setUploadProjectId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Enterprise Wide (No Project)</option>
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
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All Sites</option>
                    {sites
                      .filter(s => !uploadProjectId || s.projectId === uploadProjectId)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Specification File (PDF or Doc)
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  {isUploading ? 'Saving...' : 'Register Data Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
