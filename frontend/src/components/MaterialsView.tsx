import React, { useState, useEffect, useRef } from 'react';
import {
  FolderArchive,
  Upload,
  FileText,
  FileCode,
  Image as ImageIcon,
  Presentation,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileCheck
} from 'lucide-react';
import { Material, MaterialPreview, Subject } from '../types';
import { api } from '../services/api';
import { formatBytes, formatDate } from '../utils/formatters';

interface MaterialsViewProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelectSubject: (sub: Subject) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  subjects,
  selectedSubject,
  onSelectSubject
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewMaterial, setPreviewMaterial] = useState<MaterialPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedSubject) {
      loadMaterials(selectedSubject.id);
    }
  }, [selectedSubject]);

  const loadMaterials = async (subjectId: number) => {
    setLoading(true);
    try {
      const data = await api.getMaterials(subjectId);
      setMaterials(data);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedSubject) return;
    setUploading(true);
    try {
      const fileArray = Array.from(files);
      const res = await api.uploadMaterials(selectedSubject.id, fileArray);
      alert(res.message);
      await loadMaterials(selectedSubject.id);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (materialId: number) => {
    if (!confirm('Are you sure you want to delete this study file?')) return;
    try {
      await api.deleteMaterial(materialId);
      if (selectedSubject) loadMaterials(selectedSubject.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleReprocess = async (materialId: number) => {
    try {
      await api.reprocessMaterial(materialId);
      if (selectedSubject) loadMaterials(selectedSubject.id);
    } catch (err: any) {
      alert(err.message || 'Failed to reprocess file');
    }
  };

  const handleOpenPreview = async (materialId: number) => {
    setPreviewLoading(true);
    try {
      const data = await api.getMaterialPreview(materialId);
      setPreviewMaterial(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    if (t.includes('ppt')) return <Presentation className="w-5 h-5 text-amber-500" />;
    if (t.includes('doc')) return <FileCode className="w-5 h-5 text-blue-500" />;
    if (['jpg', 'jpeg', 'png', 'webp'].some(ext => t.includes(ext))) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    return <FileText className="w-5 h-5 text-indigo-500" />;
  };

  const filteredMaterials = materials.filter(m =>
    m.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Study Materials & Document Processing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Scalable multi-format ingestion: PDFs, presentations, DOCX, handwritten notes, and scanned images
          </p>
        </div>

        {/* Upload Trigger Button */}
        <div>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.webp"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !selectedSubject}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Processing Batch...' : 'Upload Files & Notes'}</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/40 transition-all text-center cursor-pointer group"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Drag & Drop Multi-Format Study Files Here
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Supports batch upload of <strong>PDF, PPTX, DOCX, TXT, JPG, PNG, WEBP</strong> and scanned notes. Document chunks are automatically indexed for RAG tutoring.
        </p>
      </div>

      {/* Search & Subject Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search uploaded file names and summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredMaterials.length} file(s) for{' '}
          <strong className="text-slate-700 dark:text-slate-300">
            {selectedSubject?.name || 'All'}
          </strong>
        </span>
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading study files...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <FolderArchive className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Materials Uploaded Yet
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Drop course slides, past papers, or syllabus outlines to equip your AI agents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => {
            const isReady = mat.status === 'ready';
            const isError = mat.status === 'error';
            return (
              <div
                key={mat.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                        {getFileIcon(mat.file_type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={mat.filename}>
                          {mat.filename}
                        </h4>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {mat.file_type} &middot; {formatBytes(mat.file_size_bytes)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPreview(mat.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                        title="Preview & Extracted Chunks"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        title="Delete Material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {mat.summary ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {mat.summary}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      {isError ? `Error: ${mat.error_message}` : 'Extracting content and semantic vectors...'}
                    </p>
                  )}
                </div>

                {/* Status bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready & Indexed</span>
                      </span>
                    ) : isError ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Error</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Processing Chunks</span>
                      </span>
                    )}
                    {mat.page_count > 0 && (
                      <span className="text-slate-400">{mat.page_count} Pages</span>
                    )}
                  </div>

                  {!isReady && (
                    <button
                      onClick={() => handleReprocess(mat.id)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Reprocess
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Chunk Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col relative">
            <button
              onClick={() => setPreviewMaterial(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate pr-8">
                {previewMaterial.filename}
              </h3>
              <span className="text-[11px] text-slate-400">
                {previewMaterial.page_count} Pages/Slides &middot; Status: {previewMaterial.status}
              </span>
            </div>

            {previewMaterial.summary && (
              <div className="p-3 mb-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300">
                <strong>AI Summary:</strong> {previewMaterial.summary}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Indexed Semantic Chunks & Page Citations
              </h4>
              {previewMaterial.chunks?.map((chunk, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Chunk #{chunk.chunk_index}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      Page/Slide {chunk.page_or_slide}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-mono text-[11px]">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

