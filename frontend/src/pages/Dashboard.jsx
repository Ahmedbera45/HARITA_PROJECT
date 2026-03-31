// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Button, CircularProgress } from '@mui/material';
import {
  Assignment,
  People,
  Map,
  PendingActions,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/Task/summary')
      .then(res => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
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

      <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider' }}>
        <Typography variant="h6" color="text.secondary">
          Son Hareketler Tablosu Buraya Gelecek
        </Typography>
        <Button endIcon={<ArrowForward />} sx={{ mt: 2 }} onClick={() => navigate('/tasks')}>
          Görev Panosuna Git
        </Button>
      </Paper>
    </Box>
  );
}
