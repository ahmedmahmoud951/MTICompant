'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Filter,
  FolderOpen,
  MapPin,
  CheckSquare,
  FileText,
  Compass,
  FileSpreadsheet,
  Users,
  MessageSquare,
  Cpu,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { searchService, SearchResultItem } from '@/services/search.service';
import { Language, formatDateCairo } from '@/lib/i18n';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
  onSelectResult?: (result: SearchResultItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setTotalCount(0);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() || selectedType) {
        performSearch();
      } else {
        setResults([]);
        setTotalCount(0);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selectedType]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const res = await searchService.globalSearch({
        q: query.trim() || undefined,
        entityType: selectedType || undefined
      });
      if (res && res.results) {
        setResults(res.results);
        setTotalCount(res.totalResults);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const entityTypes = [
    { id: '', labelAr: 'الكل', labelEn: 'All' },
    { id: 'Project', labelAr: 'المشاريع', labelEn: 'Projects' },
    { id: 'Site', labelAr: 'المواقع', labelEn: 'Sites' },
    { id: 'Task', labelAr: 'المهام', labelEn: 'Tasks' },
    { id: 'Document', labelAr: 'المستندات', labelEn: 'Documents' },
    { id: 'Drawing', labelAr: 'المخططات', labelEn: 'Drawings' },
    { id: 'DailyReport', labelAr: 'التقارير اليومية', labelEn: 'Daily Reports' },
    { id: 'DataSheet', labelAr: 'لوائح البيانات', labelEn: 'Data Sheets' },
    { id: 'User', labelAr: 'المستخدمين', labelEn: 'Users' },
    { id: 'Team', labelAr: 'فرق العمل', labelEn: 'Teams' },
    { id: 'Message', labelAr: 'الرسائل', labelEn: 'Messages' }
  ];

  const getResultIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('project')) return <FolderOpen className="w-4 h-4 text-sky-400" />;
    if (t.includes('site')) return <MapPin className="w-4 h-4 text-cyan-400" />;
    if (t.includes('task')) return <CheckSquare className="w-4 h-4 text-amber-400" />;
    if (t.includes('drawing')) return <Compass className="w-4 h-4 text-purple-400" />;
    if (t.includes('dailyreport')) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (t.includes('datasheet')) return <Cpu className="w-4 h-4 text-rose-400" />;
    if (t.includes('document')) return <FileText className="w-4 h-4 text-blue-400" />;
    if (t.includes('user') || t.includes('team')) return <Users className="w-4 h-4 text-indigo-400" />;
    if (t.includes('message')) return <MessageSquare className="w-4 h-4 text-pink-400" />;
    return <Search className="w-4 h-4 text-cyan-300" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#09111e] border border-cyan-400/30 rounded-2xl shadow-[0_0_50px_rgba(14,165,233,0.25)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header Bar */}
        <div className="p-4 border-b border-slate-700/60 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'البحث الشامل في المشاريع، المواقع، المخططات، المستندات، المهام، الرسائل...'
                : 'Enterprise search projects, sites, drawings, documents, tasks, messages...'
            }
            autoFocus
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white border border-slate-700 font-mono"
          >
            ESC
          </button>
        </div>

        {/* Entity Type Filter Pills */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          {entityTypes.map((et) => {
            const active = selectedType === et.id;
            return (
              <button
                key={et.id}
                onClick={() => setSelectedType(et.id)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                  active
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {lang === 'ar' ? et.labelAr : et.labelEn}
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>{lang === 'ar' ? 'جارٍ البحث في نطاق الصلاحيات المسموح بها...' : 'Searching authorized resources...'}</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              {query ? (
                <>
                  <Search className="w-8 h-8 text-slate-600 mb-1" />
                  <span>{lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching results found'}</span>
                  <span className="text-[11px] text-slate-500">{lang === 'ar' ? 'يتم عرض النتائج المصرح لك بالوصول إليها فقط' : 'Only authorized resources are displayed'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-8 h-8 text-cyan-400/50 mb-1" />
                  <span>{lang === 'ar' ? 'اكتب كلمة البحث للبدء في الاستعلام السريع' : 'Type to search across the enterprise'}</span>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                <span>{lang === 'ar' ? `النتائج (${totalCount})` : `Results (${totalCount})`}</span>
                <span className="text-slate-500">{lang === 'ar' ? 'نظام البحث المؤسسي الموحد' : 'Enterprise Search'}</span>
              </div>
              {results.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    if (onSelectResult) onSelectResult(item);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800/80 hover:border-cyan-400/40 cursor-pointer transition-all flex items-center justify-between gap-3 group text-start"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 group-hover:scale-105 transition-transform">
                      {getResultIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 font-medium">
                          {item.type}
                        </span>
                        {item.status && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-[10px] text-slate-400">
                            {item.status}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 group-hover:text-cyan-400 transition-colors">
                    <span className="text-[10px] font-mono">{formatDateCairo(item.createdAt, lang)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
