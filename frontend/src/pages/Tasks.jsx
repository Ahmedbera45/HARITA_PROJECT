import { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Grid, Card, CardContent, 
  Chip, IconButton, Dialog, DialogTitle, DialogContent, 
  TextField, DialogActions, MenuItem, Tooltip
} from '@mui/material';
import { 
  Add, Delete, Edit, ArrowForward, ArrowBack, 
  AccessTime
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import taskService from '../services/taskService';

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
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR');
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'Orta', status: 'Bekliyor', dueDate: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await taskService.getAll();
      setTasks(data);
    } catch (error) {
      console.error(error);
      // Hata mesajını sessizce geçiştiriyoruz, kullanıcıya toast göstermeye gerek yok (Login hatası olabilir)
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({ title: '', description: '', priority: 'Orta', status: 'Bekliyor', dueDate: '' });
    setIsEdit(false);
    setOpenDialog(true);
  };

  const handleOpenEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
    });
    setSelectedId(task.id);
    setIsEdit(true);
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.warning("Görev başlığı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        dueDate: formData.dueDate || null
      };

      if (isEdit) {
        await taskService.update(selectedId, dataToSend);
        toast.success("Görev güncellendi.");
      } else {
        await taskService.create(dataToSend);
        toast.success("Görev oluşturuldu.");
      }
      setOpenDialog(false);
      fetchTasks();
    } catch (error) {
      toast.error("İşlem başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bu görevi silmek istediğinize emin misiniz?")) {
      try {
        await taskService.delete(id);
        toast.success("Görev silindi.");
        fetchTasks();
      } catch (error) {
        toast.error("Silinemedi.");
      }
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
        const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
        setTasks(updatedTasks);
        await taskService.update(task.id, { ...task, status: newStatus });
      } catch (error) {
        toast.error("Durum güncellenemedi.");
        fetchTasks();
      }
    }
  };

  const TaskColumn = ({ title, statusKey, color }) => (
    <Grid size={{ xs: 12, md: 4 }}> {/* GÜNCELLEME: size prop'u kullanıldı */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          bgcolor: 'background.default', 
          height: '100%', 
          borderTop: `4px solid ${color}` 
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
          <Chip label={tasks.filter(t => t.status === statusKey).length} size="small" />
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tasks.filter(t => t.status === statusKey).map((task) => (
            <Card key={task.id} sx={{ '&:hover': { boxShadow: 3 }, transition: '0.3s' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip 
                    label={task.priority} 
                    size="small" 
                    color={task.priority === 'Yüksek' ? 'error' : task.priority === 'Orta' ? 'warning' : 'success'} 
                    variant="outlined"
                  />
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
                  <Tooltip title={task.assignedUserName || "Atanmamış"}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                            width: 24, height: 24, borderRadius: '50%', 
                            bgcolor: stringToColor(task.assignedUserName || 'X'), 
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' 
                        }}>
                            {(task.assignedUserName || 'A')[0]}
                        </Box>
                        <Typography variant="caption" sx={{maxWidth: 80, overflow:'hidden', whiteSpace:'nowrap'}}>
                            {task.assignedUserName?.split(' ')[0]}
                        </Typography>
                    </Box>
                  </Tooltip>

                  <Box>
                    {statusKey !== 'Bekliyor' && (
                      <IconButton size="small" onClick={() => moveTask(task, 'prev')}><ArrowBack fontSize="small" /></IconButton>
                    )}
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(task)}><Edit fontSize="small" /></IconButton>
                    {statusKey !== 'Bitti' ? (
                      <IconButton size="small" color="success" onClick={() => moveTask(task, 'next')}><ArrowForward fontSize="small" /></IconButton>
                    ) : (
                      <IconButton size="small" color="error" onClick={() => handleDelete(task.id)}><Delete fontSize="small" /></IconButton>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          {tasks.filter(t => t.status === statusKey).length === 0 && (
             <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2, display: 'block' }}>Görev yok</Typography>
          )}
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">Görev Takip Panosu</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>Yeni Görev</Button>
      </Box>

      {/* GÜNCELLEME: container için Grid size kullanılmaz, container prop'u yeterlidir */}
      <Grid container spacing={3} sx={{ height: 'calc(100vh - 180px)', overflowY: 'hidden' }}>
        <TaskColumn title="📌 Bekleyen İşler" statusKey="Bekliyor" color="#f59e0b" />
        <TaskColumn title="⚡ İşlemdekiler" statusKey="İşlemde" color="#3b82f6" />
        <TaskColumn title="✅ Tamamlananlar" statusKey="Bitti" color="#10b981" />
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField label="Görev Başlığı" required fullWidth value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Detaylar / Açıklama" fullWidth multiline rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select label="Öncelik" fullWidth value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} >
                <MenuItem value="Düşük">Düşük</MenuItem>
                <MenuItem value="Orta">Orta</MenuItem>
                <MenuItem value="Yüksek">Yüksek</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField type="date" label="Son Tarih" fullWidth InputLabelProps={{ shrink: true }} value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
            </Grid>
             <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">* Görev otomatik olarak size atanacaktır.</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>İptal</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}