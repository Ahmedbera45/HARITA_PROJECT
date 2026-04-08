// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Button, CircularProgress, Chip, Divider } from '@mui/material';
import {
  Assignment,
  People,
  Map,
  PendingActions,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import taskService from '../services/taskService';

const StatCard = ({ title, value, icon, color, subText, loading }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
        borderColor: 'transparent'
      }
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color: color }}>
        {icon}
      </Box>
      <Typography variant="h4" fontWeight="bold" color="text.primary">
        {loading ? <CircularProgress size={28} /> : value}
      </Typography>
    </Box>
    <Box>
      <Typography variant="subtitle2" color="text.secondary" fontWeight="600">
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {subText}
      </Typography>
    </Box>
  </Paper>
);

const PRIORITY_COLORS = { Düşük: 'success', Orta: 'warning', Yüksek: 'error' };
const STATUS_COLORS = { Bekliyor: 'warning', İşlemde: 'info', Bitti: 'success' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(true);

  useEffect(() => {
    api.get('/Task/summary')
      .then(res => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    taskService.getAll({ assignedToMe: true })
      .then(setMyTasks)
      .catch(() => {})
      .finally(() => setMyTasksLoading(false));
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Genel Bakış
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hoşgeldiniz, günlük iş özetiniz aşağıdadır.
          </Typography>
        </div>
        <Button variant="contained" startIcon={<PendingActions />} onClick={() => navigate('/tasks')}>
          Görev Takibine Git
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Bekleyen Görevler"
            value={summary?.pending ?? '-'}
            icon={<Assignment />}
            color="#f59e0b"
            subText="Henüz başlanmamış görevler"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Devam Eden Görevler"
            value={summary?.inProgress ?? '-'}
            icon={<Map />}
            color="#3b82f6"
            subText="Şu an üzerinde çalışılanlar"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tamamlanan Görevler"
            value={summary?.done ?? '-'}
            icon={<People />}
            color="#10b981"
            subText="Bitti statüsündeki görevler"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Görev"
            value={summary?.total ?? '-'}
            icon={<PendingActions />}
            color="#6366f1"
            subText="Tüm görevlerin toplamı"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">Benim Görevlerim</Typography>
          <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/tasks')}>
            Tümünü Gör
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {myTasksLoading ? (
          <Box textAlign="center" py={3}><CircularProgress size={28} /></Box>
        ) : myTasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            Size atanmış görev bulunmuyor.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {myTasks.slice(0, 8).map(t => (
              <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'background.default', '&:hover': { bgcolor: 'action.hover' } }}>
                <Chip label={t.priority} size="small" color={PRIORITY_COLORS[t.priority] || 'default'} variant="outlined" sx={{ minWidth: 60 }} />
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>{t.title}</Typography>
                <Chip label={t.status} size="small" color={STATUS_COLORS[t.status] || 'default'} />
                {t.dueDate && (
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'right' }}>
                    {new Date(t.dueDate).toLocaleDateString('tr-TR')}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
