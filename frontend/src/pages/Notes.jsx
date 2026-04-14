import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, IconButton, Tooltip,
  List, ListItem, ListItemButton, ListItemText, Chip, Paper,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Menu, Switch, FormControlLabel, CircularProgress,
  Select, FormControl, InputLabel, Autocomplete,
} from '@mui/material';
import {
  Add, MoreVert, Delete, Edit, Share, AttachFile,
  Download, InsertDriveFile, Close, FolderOpen, NoteAlt,
  People, Save, Circle,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import noteService from '../services/noteService';
import userService from '../services/userService';
import RichTextEditor from '../components/RichTextEditor';
import { useAuth } from '../hooks/useAuth';

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5270/api').replace('/api', '');

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const PRESET_COLORS = ['#1976d2', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#6d4c41', '#546e7a'];

export default function Notes() {
  const { userId } = useAuth();

  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);  // NoteDetailDto
  const [noteTitle, setNoteTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEdit, setCatEdit] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', color: '#1976d2' });
  const [catMenuAnchor, setCatMenuAnchor] = useState(null);
  const [catMenuTarget, setCatMenuTarget] = useState(null);

  // Share dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [shareUser, setShareUser] = useState(null);
  const [shareCanEdit, setShareCanEdit] = useState(false);
  const [sharing, setSharing] = useState(false);

  // File uploads
  const [uploading, setUploading] = useState(false);

  // Note context menu
  const [noteMenuAnchor, setNoteMenuAnchor] = useState(null);
  const [noteMenuTarget, setNoteMenuTarget] = useState(null);

  // Move to category dialog
  const [moveCatDialogOpen, setMoveCatDialogOpen] = useState(false);
  const [moveCatTarget, setMoveCatTarget] = useState(null);
  const [moveCatSelectedId, setMoveCatSelectedId] = useState('');

  // Auto-save debounce
  const autoSaveTimer = useRef(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCategories();
    userService.getAll().then(setAllUsers).catch(() => {});
  }, []);

  useEffect(() => {
    loadNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    try {
      const data = await noteService.getCategories();
      setCategories(data);
    } catch { toast.error('Kategoriler yüklenemedi.'); }
  };

  const loadNotes = async () => {
    try {
      const data = await noteService.getAll(selectedCategoryId);
      setNotes(data);
    } catch { toast.error('Notlar yüklenemedi.'); }
  };

  // ── Auto-save ────────────────────────────────────────────────────────────
  const triggerAutoSave = useCallback(() => {
    setDirty(true);
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote, noteTitle, editorContent]);

  useEffect(() => {
    return () => clearTimeout(autoSaveTimer.current);
  }, []);

  // ── Note selection ───────────────────────────────────────────────────────
  const handleSelectNote = async (item) => {
    if (dirty && selectedNote) {
      clearTimeout(autoSaveTimer.current);
      await handleSaveImmediate();
    }
    setLoadingNote(true);
    try {
      const detail = await noteService.getById(item.id);
      setSelectedNote(detail);
      setNoteTitle(detail.title);
      setEditorContent(detail.content);
      setDirty(false);
    } catch {
      toast.error('Not yüklenemedi.');
    } finally {
      setLoadingNote(false);
    }
  };

  const handleSaveImmediate = async () => {
    if (!selectedNote) return;
    try {
      const updated = await noteService.update(selectedNote.id, {
        title: noteTitle,
        content: editorContent,
        categoryId: selectedNote.categoryId,
      });
      setSelectedNote(updated);
      setDirty(false);
      setNotes(prev => prev.map(n => n.id === updated.id
        ? { ...n, title: updated.title, updatedAt: updated.updatedAt }
        : n
      ));
    } catch { /* silent on background save */ }
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    setSaving(true);
    try {
      const updated = await noteService.update(selectedNote.id, {
        title: noteTitle,
        content: editorContent,
        categoryId: selectedNote.categoryId,
      });
      setSelectedNote(updated);
      setDirty(false);
      setNotes(prev => prev.map(n => n.id === updated.id
        ? { ...n, title: updated.title, updatedAt: updated.updatedAt }
        : n
      ));
    } catch (e) {
      toast.error('Kaydedilemedi: ' + (e.response?.data || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await noteService.create({
        title: 'Yeni Not',
        content: '',
        categoryId: selectedCategoryId ?? null,
      });
      setNotes(prev => [newNote, ...prev]);
      await handleSelectNote(newNote);
    } catch {
      toast.error('Not oluşturulamadı.');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Bu notu silmek istediğinize emin misiniz?')) return;
    try {
      await noteService.delete(noteId);
      toast.success('Not silindi.');
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setNoteTitle('');
        setEditorContent('');
        setDirty(false);
      }
    } catch { toast.error('Not silinemedi.'); }
  };

  // ── Note category update ─────────────────────────────────────────────────
  const handleNoteCategoryChange = async (catId) => {
    if (!selectedNote) return;
    try {
      const updated = await noteService.update(selectedNote.id, {
        title: noteTitle,
        content: editorContent,
        categoryId: catId || null,
      });
      setSelectedNote(updated);
      setNotes(prev => prev.map(n => n.id === updated.id
        ? { ...n, categoryId: updated.categoryId, categoryName: updated.categoryName, categoryColor: updated.categoryColor }
        : n
      ));
    } catch { toast.error('Kategori güncellenemedi.'); }
  };

  // ── Categories ───────────────────────────────────────────────────────────
  const openCreateCat = () => {
    setCatEdit(null);
    setCatForm({ name: '', color: '#1976d2' });
    setCatDialogOpen(true);
  };

  const openEditCat = (cat) => {
    setCatEdit(cat);
    setCatForm({ name: cat.name, color: cat.color });
    setCatDialogOpen(true);
    setCatMenuAnchor(null);
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    try {
      if (catEdit) {
        const updated = await noteService.updateCategory(catEdit.id, catForm);
        setCategories(prev => prev.map(c => c.id === catEdit.id ? updated : c));
        toast.success('Kategori güncellendi.');
      } else {
        const created = await noteService.createCategory(catForm);
        setCategories(prev => [...prev, created]);
        toast.success('Kategori oluşturuldu.');
      }
      setCatDialogOpen(false);
    } catch { toast.error('Kategori kaydedilemedi.'); }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Kategoriyi silmek istediğinize emin misiniz? Notlar kategorisiz kalır.')) return;
    try {
      await noteService.deleteCategory(catId);
      setCategories(prev => prev.filter(c => c.id !== catId));
      if (selectedCategoryId === catId) setSelectedCategoryId(null);
      toast.success('Kategori silindi.');
    } catch { toast.error('Kategori silinemedi.'); }
    setCatMenuAnchor(null);
  };

  // ── Sharing ──────────────────────────────────────────────────────────────
  const openShareDialog = () => {
    setShareUser(null);
    setShareCanEdit(false);
    setShareDialogOpen(true);
  };

  const handleShare = async () => {
    if (!shareUser) return;
    setSharing(true);
    try {
      const result = await noteService.share(selectedNote.id, {
        sharedWithUserId: shareUser.id,
        canEdit: shareCanEdit,
      });
      setSelectedNote(prev => ({
        ...prev,
        shares: prev.shares.some(s => s.sharedWithUserId === shareUser.id)
          ? prev.shares.map(s => s.sharedWithUserId === shareUser.id ? result : s)
          : [...prev.shares, result],
      }));
      toast.success(`${shareUser.fullName} ile paylaşıldı.`);
      setShareUser(null);
    } catch (e) {
      toast.error(e.response?.data || 'Paylaşım yapılamadı.');
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveShare = async (shareId) => {
    try {
      await noteService.removeShare(selectedNote.id, shareId);
      setSelectedNote(prev => ({ ...prev, shares: prev.shares.filter(s => s.id !== shareId) }));
      toast.success('Paylaşım kaldırıldı.');
    } catch { toast.error('Paylaşım kaldırılamadı.'); }
  };

  // ── Move to category ─────────────────────────────────────────────────────
  const openMoveCat = (note) => {
    setMoveCatTarget(note);
    setMoveCatSelectedId(note.categoryId || '');
    setMoveCatDialogOpen(true);
    setNoteMenuAnchor(null);
  };

  const handleMoveCat = async () => {
    if (!moveCatTarget) return;
    try {
      const detail = await noteService.getById(moveCatTarget.id);
      const updated = await noteService.update(moveCatTarget.id, {
        title: detail.title,
        content: detail.content,
        categoryId: moveCatSelectedId || null,
      });
      setNotes(prev => prev.map(n => n.id === updated.id
        ? { ...n, categoryId: updated.categoryId, categoryName: updated.categoryName, categoryColor: updated.categoryColor }
        : n
      ));
      if (selectedNote?.id === moveCatTarget.id) {
        setSelectedNote(prev => ({ ...prev, categoryId: updated.categoryId, categoryName: updated.categoryName, categoryColor: updated.categoryColor }));
      }
      toast.success('Kategori değiştirildi.');
      setMoveCatDialogOpen(false);
      loadCategories(); // note count refresh
    } catch { toast.error('Kategori değiştirilemedi.'); }
  };

  // ── Files ────────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    for (const file of files) {
      try {
        const uploaded = await noteService.uploadFile(selectedNote.id, file);
        setSelectedNote(prev => ({ ...prev, files: [...(prev.files || []), uploaded] }));
        toast.success(`${file.name} yüklendi.`);
      } catch (err) {
        toast.error(err.response?.data || `${file.name} yüklenemedi.`);
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteFile = async (fileId, fileName) => {
    try {
      await noteService.deleteFile(selectedNote.id, fileId);
      setSelectedNote(prev => ({ ...prev, files: prev.files.filter(f => f.id !== fileId) }));
      toast.success(`${fileName} silindi.`);
    } catch { toast.error('Dosya silinemedi.'); }
  };

  const canEdit = selectedNote
    ? (selectedNote.ownerUserId?.toLowerCase() === userId?.toLowerCase() || selectedNote.canEdit)
    : false;

  const isOwner = selectedNote?.ownerUserId?.toLowerCase() === userId?.toLowerCase();

  // ── Shared users autocomplete (exclude already shared + self) ────────────
  const availableUsers = allUsers.filter(u =>
    u.id?.toLowerCase() !== userId?.toLowerCase() &&
    !selectedNote?.shares?.some(s => s.sharedWithUserId === u.id)
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 0 }}>
      {/* ─── Sol Sidebar ───────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          width: 280,
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {/* Başlık + Yeni Not */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">Notlarım</Typography>
          <Tooltip title="Yeni Not">
            <IconButton size="small" color="primary" onClick={handleCreateNote}>
              <Add />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        {/* Kategoriler */}
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Kategoriler
            </Typography>
            <Tooltip title="Yeni Kategori">
              <IconButton size="small" onClick={openCreateCat}><Add fontSize="small" /></IconButton>
            </Tooltip>
          </Box>

          {/* Tümü */}
          <ListItemButton
            selected={selectedCategoryId === null}
            onClick={() => setSelectedCategoryId(null)}
            sx={{ borderRadius: 1, px: 1, py: 0.5 }}
          >
            <FolderOpen fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <ListItemText primary="Tümü" primaryTypographyProps={{ variant: 'body2' }} />
            <Chip label={notes.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
          </ListItemButton>

          {categories.map(cat => (
            <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center' }}>
              <ListItemButton
                selected={selectedCategoryId === cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                sx={{ borderRadius: 1, px: 1, py: 0.5, flex: 1 }}
              >
                <Circle fontSize="small" sx={{ mr: 1, color: cat.color, fontSize: 10 }} />
                <ListItemText
                  primary={cat.name}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
                <Chip label={cat.noteCount} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
              </ListItemButton>
              <IconButton
                size="small"
                onClick={(e) => { setCatMenuAnchor(e.currentTarget); setCatMenuTarget(cat); }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Not Listesi */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
          {notes.length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
              Not yok
            </Typography>
          )}
          {notes.map(note => {
            const catColor = categories.find(c => c.id === note.categoryId)?.color;
            return (
              <Box key={note.id} sx={{ position: 'relative' }}>
                <ListItemButton
                  selected={selectedNote?.id === note.id}
                  onClick={() => handleSelectNote(note)}
                  sx={{
                    borderRadius: 1,
                    borderLeft: catColor ? `3px solid ${catColor}` : '3px solid transparent',
                    mb: 0.25,
                    pl: 1.5,
                    pr: 4,
                  }}
                >
                  <ListItemText
                    primary={note.title}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.disabled">{formatDate(note.updatedAt)}</Typography>
                        {note.isSharedWithMe && <People sx={{ fontSize: 11, color: 'info.main' }} />}
                        {!note.canEdit && note.isSharedWithMe && (
                          <Typography variant="caption" color="warning.main" sx={{ fontSize: 10 }}>salt okunur</Typography>
                        )}
                      </Box>
                    }
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  />
                </ListItemButton>
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
                  onClick={(e) => { setNoteMenuAnchor(e.currentTarget); setNoteMenuTarget(note); e.stopPropagation(); }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ─── Sağ Panel ─────────────────────────────────────────────────── */}
      {selectedNote ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Başlık + Aksiyonlar */}
          <Box sx={{ px: 3, pt: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <TextField
                variant="standard"
                value={noteTitle}
                onChange={(e) => { setNoteTitle(e.target.value); triggerAutoSave(); }}
                placeholder="Başlık..."
                inputProps={{ style: { fontSize: '1.25rem', fontWeight: 600 } }}
                sx={{ flex: 1, mr: 2 }}
                disabled={!canEdit}
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {dirty && (
                  <Typography variant="caption" color="warning.main" sx={{ alignSelf: 'center' }}>
                    Kaydedilmedi
                  </Typography>
                )}
                {canEdit && (
                  <Tooltip title="Kaydet">
                    <IconButton size="small" color="primary" onClick={handleSave} disabled={saving}>
                      {saving ? <CircularProgress size={18} /> : <Save />}
                    </IconButton>
                  </Tooltip>
                )}
                {isOwner && (
                  <Tooltip title="Notu Paylaş">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Share fontSize="small" />}
                      onClick={openShareDialog}
                      sx={{ minWidth: 'auto' }}
                    >
                      Paylaş
                    </Button>
                  </Tooltip>
                )}
              </Box>
            </Box>

            {/* Kategori seçici */}
            {isOwner && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Kategori</InputLabel>
                <Select
                  label="Kategori"
                  value={selectedNote.categoryId || ''}
                  onChange={(e) => handleNoteCategoryChange(e.target.value)}
                >
                  <MenuItem value=""><em>Kategorisiz</em></MenuItem>
                  {categories.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      <Circle sx={{ fontSize: 10, mr: 1, color: c.color }} />{c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Meta */}
            <Box sx={{ mt: 0.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {selectedNote.isSharedWithMe && (
                <Typography variant="caption" color="text.secondary">
                  Sahibi: <b>{selectedNote.ownerName}</b>
                </Typography>
              )}
              {selectedNote.lastEditedByName && (
                <Typography variant="caption" color="text.secondary">
                  Son düzenleyen: <b>{selectedNote.lastEditedByName}</b> · {formatDate(selectedNote.updatedAt)}
                </Typography>
              )}
              {selectedNote.shares?.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {selectedNote.shares.length} kişiyle paylaşıldı
                </Typography>
              )}
            </Box>
          </Box>

          {/* Editor */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loadingNote ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
            ) : (
              <RichTextEditor
                content={editorContent}
                onChange={(html) => {
                  setEditorContent(html);
                  if (canEdit) triggerAutoSave();
                }}
                minHeight={300}
                placeholder="Notunuzu yazın..."
                readOnly={!canEdit}
              />
            )}

            {/* Dosyalar */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Ekler ({selectedNote.files?.length || 0})
                </Typography>
                {canEdit && (
                  <Button
                    component="label"
                    size="small"
                    startIcon={uploading ? <CircularProgress size={14} /> : <AttachFile />}
                    variant="outlined"
                    disabled={uploading}
                  >
                    {uploading ? 'Yükleniyor...' : 'Dosya Ekle'}
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".pdf,.zip,.rar,.docx,.xlsx,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                    />
                  </Button>
                )}
              </Box>
              {selectedNote.files?.length > 0 && (
                <List dense>
                  {selectedNote.files.map(f => (
                    <ListItem
                      key={f.id}
                      sx={{ px: 0 }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            component="a"
                            href={`${BACKEND_BASE}${f.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download fontSize="small" />
                          </IconButton>
                          {canEdit && (
                            <IconButton size="small" color="error" onClick={() => handleDeleteFile(f.id, f.fileName)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      }
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InsertDriveFile fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>{f.fileName}</Typography>
                          <Typography variant="caption" color="text.secondary">{formatFileSize(f.fileSize)}</Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, color: 'text.disabled' }}>
          <NoteAlt sx={{ fontSize: 64, opacity: 0.3 }} />
          <Typography variant="body1" color="text.disabled">Not seçin veya yeni bir not oluşturun</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateNote}>
            Yeni Not
          </Button>
        </Box>
      )}

      {/* ─── Kategori context menu ──────────────────────────────────────── */}
      <Menu
        anchorEl={catMenuAnchor}
        open={Boolean(catMenuAnchor)}
        onClose={() => setCatMenuAnchor(null)}
      >
        <MenuItem onClick={() => openEditCat(catMenuTarget)}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> Düzenle
        </MenuItem>
        <MenuItem onClick={() => handleDeleteCategory(catMenuTarget?.id)} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Sil
        </MenuItem>
      </Menu>

      {/* ─── Note context menu ──────────────────────────────────────────── */}
      <Menu
        anchorEl={noteMenuAnchor}
        open={Boolean(noteMenuAnchor)}
        onClose={() => setNoteMenuAnchor(null)}
      >
        <MenuItem onClick={() => openMoveCat(noteMenuTarget)}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> Kategori Değiştir
        </MenuItem>
        <MenuItem
          onClick={() => { handleDeleteNote(noteMenuTarget?.id); setNoteMenuAnchor(null); }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Sil
        </MenuItem>
      </Menu>

      {/* ─── Kategori Dialog ────────────────────────────────────────────── */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{catEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Kategori Adı" fullWidth autoFocus sx={{ mt: 1 }}
            value={catForm.name}
            onChange={(e) => setCatForm(f => ({ ...f, name: e.target.value }))}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>Renk</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {PRESET_COLORS.map(c => (
                <IconButton
                  key={c}
                  size="small"
                  onClick={() => setCatForm(f => ({ ...f, color: c }))}
                  sx={{
                    width: 28, height: 28, bgcolor: c,
                    border: catForm.color === c ? '3px solid #000' : '2px solid transparent',
                    '&:hover': { bgcolor: c },
                  }}
                />
              ))}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="color"
                  value={catForm.color}
                  onChange={(e) => setCatForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer' }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSaveCategory} disabled={!catForm.name.trim()}>
            {catEdit ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Paylaşım Dialog ────────────────────────────────────────────── */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Notu Paylaş
          <IconButton size="small" onClick={() => setShareDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          {/* Mevcut paylaşımlar */}
          {selectedNote?.shares?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Paylaşılanlar</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedNote.shares.map(s => (
                  <Chip
                    key={s.id}
                    label={`${s.sharedWithUserName}${s.canEdit ? ' (düzenleyebilir)' : ' (görüntüleyebilir)'}`}
                    onDelete={() => handleRemoveShare(s.id)}
                    color={s.canEdit ? 'primary' : 'default'}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          {/* Yeni paylaşım */}
          <Typography variant="subtitle2" gutterBottom>Kullanıcı Ekle</Typography>
          <Autocomplete
            options={availableUsers}
            getOptionLabel={(u) => `${u.fullName}${u.department ? ` (${u.department})` : ''}`}
            value={shareUser}
            onChange={(_, val) => setShareUser(val)}
            renderInput={(params) => <TextField {...params} label="Kullanıcı Seç" size="small" />}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch checked={shareCanEdit} onChange={(e) => setShareCanEdit(e.target.checked)} />
            }
            label="Düzenleme izni ver"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Kapat</Button>
          <Button
            variant="contained"
            onClick={handleShare}
            disabled={!shareUser || sharing}
            startIcon={sharing ? <CircularProgress size={16} /> : <Share />}
          >
            Paylaş
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Kategori Değiştir Dialog ───────────────────────────────────── */}
      <Dialog open={moveCatDialogOpen} onClose={() => setMoveCatDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Kategori Değiştir</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <b>{moveCatTarget?.title}</b> notunu hangi kategoriye taşımak istiyorsunuz?
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Kategori</InputLabel>
            <Select
              label="Kategori"
              value={moveCatSelectedId}
              onChange={(e) => setMoveCatSelectedId(e.target.value)}
            >
              <MenuItem value=""><em>Kategorisiz</em></MenuItem>
              {categories.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  <Circle sx={{ fontSize: 10, mr: 1, color: c.color }} />{c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveCatDialogOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleMoveCat}>Taşı</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
