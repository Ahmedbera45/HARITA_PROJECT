import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent,
  Chip, IconButton, Dialog, DialogTitle, DialogContent,
  TextField, DialogActions, MenuItem, Tooltip, DialogContentText,
  Stack, FormControl, InputLabel, Select, OutlinedInput, Checkbox,
  ListItemText, AvatarGroup, Avatar, Switch, FormControlLabel
} from '@mui/material';
import {
  Add, Delete, Edit, ArrowForward, ArrowBack,
  AccessTime, Warning, FilterList
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import taskService from '../services/taskService';
import userService from '../services/userService';
import { useAuth } from '../hooks/useAuth';

const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('tr-TR');
};

const PRIORITY_COLORS = { Düşük: 'success', Orta: 'warning', Yüksek: 'error' };

const EMPTY_FORM = {
  title: '', description: '', priority: 'Orta', status: 'Bekliyor',
  dueDate: '', assignedUserIds: [], isHerkes: false
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const { isManager, userId } = useAuth();

  useEffect(() => {
    fetchTasks();
    userService.getAll().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filterStatus, filterPriority]);

  const fetchTasks = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const data = await taskService.getAll(params);
      setTasks(data);
    } catch (error) {
      console.error(error);
      toast.error('Görevler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = (task) => isManager || task.createdByUserId === userId;

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEdit(false);
    setOpenDialog(true);
  };

  const handleOpenEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedUserIds: task.assignedUsers?.map(u => u.id) ?? [],
      isHerkes: task.isHerkes ?? false
    });
    setSelectedId(task.id);
    setIsEdit(true);
    setOpenDialog(true);
  };

  const buildPayload = (fd) => ({
    title: fd.title,
    description: fd.description || '',
    status: fd.status,
    priority: fd.priority,
    dueDate: fd.dueDate || null,
    assignedUserIds: fd.isHerkes ? [] : (fd.assignedUserIds ?? []),
    isHerkes: fd.isHerkes ?? false
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.warning('Görev başlığı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await taskService.update(selectedId, buildPayload(formData));
        toast.success('Görev güncellendi.');
      } else {
        await taskService.create(buildPayload(formData));
        toast.success('Görev oluşturuldu.');
      }
      setOpenDialog(false);
      fetchTasks();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || 'İşlem başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await taskService.delete(deleteTargetId);
      toast.success('Görev silindi.');
      fetchTasks();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Silinemedi.');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const moveTask = async (task, direction) => {
    const statuses = ['Bekliyor', 'İşlemde', 'Bitti'];
    const currentIndex = statuses.indexOf(task.status);
    let newStatus = task.status;
    if (direction === 'next' && currentIndex < 2) newStatus = statuses[currentIndex + 1];
    if (direction === 'prev' && currentIndex > 0) newStatus = statuses[currentIndex - 1];
    if (newStatus !== task.status) {
      try {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        await taskService.update(task.id, {
          title: task.title,
          description: task.description || '',
          status: newStatus,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : null,
          assignedUserIds: task.isHerkes ? [] : (task.assignedUsers?.map(u => u.id) ?? []),
          isHerkes: task.isHerkes ?? false
        });
      } catch (e) {
        toast.error(e.response?.data?.message || 'Durum güncellenemedi.');
        fetchTasks();
      }
    }
  };

  // Atanan kişi filtrelemesi frontend'de yapılır
  const filteredTasks = (statusKey) => tasks.filter(t => {
    if (t.status !== statusKey) return false;
    if (filterAssignee) {
      if (filterAssignee === 'herkes') { if (!t.isHerkes) return false; }
      else if (!t.assignedUsers?.some(u => u.id === filterAssignee)) return false;
    }
    return true;
  });

  const TaskColumn = ({ title, statusKey, color }) => (
    <Grid size={{ xs: 12, md: 4 }}>
      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%', borderTop: `4px solid ${color}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
          <Chip label={filteredTasks(statusKey).length} size="small" />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredTasks(statusKey).map((task) => (
            <Card key={task.id} sx={{ '&:hover': { boxShadow: 3 }, transition: '0.3s' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label={task.priority} size="small" color={PRIORITY_COLORS[task.priority] || 'default'} variant="outlined" />
                  {task.dueDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                      <AccessTime fontSize="inherit" /> {formatDate(task.dueDate)}
                    </Box>
                  )}
                </Box>

                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.3, mb: 1 }}>
                  {task.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {task.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {task.isHerkes ? (
                      <Chip size="small" label="Herkes" color="secondary" sx={{ width: 'fit-content' }} />
                    ) : task.assignedUsers && task.assignedUsers.length > 0 ? (
                      <Tooltip title={task.assignedUsers.map(u => u.fullName).join(', ')}>
                        <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.65rem' } }}>
                          {task.assignedUsers.map(u => (
                            <Avatar key={u.id} sx={{ bgcolor: stringToColor(u.fullName), width: 24, height: 24, fontSize: '0.65rem' }}>
                              {(u.fullName || '?')[0]}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">Atanmamış</Typography>
                    )}
                    {task.createdByName && (
                      <Typography variant="caption" color="text.secondary">↑ {task.createdByName}</Typography>
                    )}
                  </Box>

                  <Box>
                    {statusKey !== 'Bekliyor' && (
                      <IconButton size="small" onClick={() => moveTask(task, 'prev')}><ArrowBack fontSize="small" /></IconButton>
                    )}
                    {canEdit(task) && (
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(task)}><Edit fontSize="small" /></IconButton>
                    )}
                    {statusKey !== 'Bitti' && (
                      <IconButton size="small" color="success" onClick={() => moveTask(task, 'next')}><ArrowForward fontSize="small" /></IconButton>
                    )}
                    {(isManager || task.createdByUserId === userId) && (
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(task.id)}><Delete fontSize="small" /></IconButton>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          {filteredTasks(statusKey).length === 0 && (
            <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2, display: 'block' }}>Görev yok</Typography>
          )}
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">Görev Takip Panosu</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>Yeni Görev</Button>
      </Box>

      {/* Filtre Çubukları */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
          <FilterList fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Durum:</Typography>
          {['', 'Bekliyor', 'İşlemde', 'Bitti'].map(s => (
            <Chip key={s || 'all'} label={s || 'Tümü'} onClick={() => setFilterStatus(s)}
              color={filterStatus === s ? 'primary' : 'default'}
              variant={filterStatus === s ? 'filled' : 'outlined'} size="small" />
          ))}
          <Box sx={{ width: 1, display: { xs: 'block', sm: 'none' } }} />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Öncelik:</Typography>
          {['', 'Düşük', 'Orta', 'Yüksek'].map(p => (
            <Chip key={p || 'allp'} label={p || 'Tümü'} onClick={() => setFilterPriority(p)}
              color={filterPriority === p ? 'secondary' : 'default'}
              variant={filterPriority === p ? 'filled' : 'outlined'} size="small" />
          ))}
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Atanan:</Typography>
          <Select
            size="small"
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            displayEmpty
            sx={{ minWidth: 160, height: 32 }}
          >
            <MenuItem value=""><em>Tümü</em></MenuItem>
            <MenuItem value="herkes">Herkes</MenuItem>
            {users.map(u => (
              <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
            ))}
          </Select>
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        <TaskColumn title="📌 Bekleyen İşler" statusKey="Bekliyor" color="#f59e0b" />
        <TaskColumn title="⚡ İşlemdekiler" statusKey="İşlemde" color="#3b82f6" />
        <TaskColumn title="✅ Tamamlananlar" statusKey="Bitti" color="#10b981" />
      </Grid>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" /> Görevi Sil
        </DialogTitle>
        <DialogContent>
          <DialogContentText>Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>

      {/* Görev Oluştur / Düzenle Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField label="Görev Başlığı" required fullWidth
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Detaylar / Açıklama" fullWidth multiline rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
                  <Select multiple value={formData.assignedUserIds}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>İptal</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
