import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, FormControlLabel,
  Switch, FormControl, InputLabel, Select, OutlinedInput,
  Checkbox, ListItemText, Box, Typography, List, ListItem,
  ListItemIcon, ListItemText as MuiListItemText, IconButton,
  CircularProgress,
} from '@mui/material';
import {
  AttachFile, Delete, Download, InsertDriveFile,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import RichTextEditor from './RichTextEditor';
import taskService from '../services/taskService';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5270/api').replace('/api', '');

export default function TaskFormDialog({
  open,
  onClose,
  onSaved,
  isEdit,
  initialData,
  taskId,
  users = [],
}) {
  const EMPTY_FORM = {
    title: '', description: '', priority: 'Orta', status: 'Bekliyor',
    dueDate: '', assignedUserIds: [], isHerkes: false,
  };

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialData || EMPTY_FORM);
      if (isEdit && taskId) {
        taskService.getFiles(taskId)
          .then(setAttachedFiles)
          .catch(() => setAttachedFiles([]));
      } else {
        setAttachedFiles([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId, isEdit]);

  const buildPayload = (fd) => ({
    title: fd.title,
    description: fd.description || '',
    status: fd.status,
    priority: fd.priority,
    dueDate: fd.dueDate || null,
    assignedUserIds: fd.isHerkes ? [] : (fd.assignedUserIds ?? []),
    isHerkes: fd.isHerkes ?? false,
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.warning('Görev başlığı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await taskService.update(taskId, buildPayload(formData));
        toast.success('Görev güncellendi.');
      } else {
        await taskService.create(buildPayload(formData));
        toast.success('Görev oluşturuldu.');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || 'İşlem başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!taskId) {
      toast.info('Dosya eklemek için önce görevi kaydedin.');
      return;
    }
    setUploading(true);
    for (const file of files) {
      try {
        const uploaded = await taskService.uploadFile(taskId, file);
        setAttachedFiles(prev => [...prev, uploaded]);
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
      await taskService.deleteFile(taskId, fileId);
      setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success(`${fileName} silindi.`);
    } catch {
      toast.error('Dosya silinemedi.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Görev Başlığı" required fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </Grid>

          {/* Zengin Metin Editörü */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Açıklama
            </Typography>
            <RichTextEditor
              content={formData.description}
              onChange={(html) => setFormData(fd => ({ ...fd, description: html }))}
              minHeight={160}
              placeholder="Görev detaylarını girin..."
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField select label="Öncelik" fullWidth value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
              <MenuItem value="Düşük">Düşük</MenuItem>
              <MenuItem value="Orta">Orta</MenuItem>
              <MenuItem value="Yüksek">Yüksek</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField type="date" label="Son Tarih" fullWidth InputLabelProps={{ shrink: true }}
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isHerkes}
                  onChange={(e) => setFormData({ ...formData, isHerkes: e.target.checked, assignedUserIds: [] })}
                  color="secondary"
                />
              }
              label="Herkese Ata (tüm kullanıcılar görür)"
            />
          </Grid>
          {!formData.isHerkes && (
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Atanan Kişiler</InputLabel>
                <Select
                  multiple value={formData.assignedUserIds}
                  onChange={(e) => setFormData({ ...formData, assignedUserIds: e.target.value })}
                  input={<OutlinedInput label="Atanan Kişiler" />}
                  renderValue={(selected) =>
                    users.filter(u => selected.includes(u.id)).map(u => u.fullName).join(', ') || '— Seçilmedi —'
                  }
                >
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id}>
                      <Checkbox checked={formData.assignedUserIds.includes(u.id)} />
                      <ListItemText primary={u.fullName} secondary={u.department} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Dosya Ekleri (yalnızca edit modunda) */}
          {isEdit && taskId && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Ekler ({attachedFiles.length})
                </Typography>
                {attachedFiles.length > 0 && (
                  <List dense sx={{ mb: 1 }}>
                    {attachedFiles.map(f => (
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
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteFile(f.id, f.fileName)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <InsertDriveFile fontSize="small" color="action" />
                        </ListItemIcon>
                        <MuiListItemText
                          primary={f.fileName}
                          secondary={formatFileSize(f.fileSize)}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true, maxWidth: 300 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
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
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
