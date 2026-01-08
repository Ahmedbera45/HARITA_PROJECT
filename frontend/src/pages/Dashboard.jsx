// src/pages/Dashboard.jsx
import React from 'react';
import { Box, Grid, Paper, Typography, Button } from '@mui/material';
import { 
  Assignment, 
  People, 
  Map, 
  PendingActions,
  ArrowForward 
} from '@mui/icons-material';

// İstatistik Kartı Bileşeni (Kod tekrarını önlemek için)
const StatCard = ({ title, value, icon, color, subText }) => (
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
        {value}
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
  return (
    <Box>
      {/* BAŞLIK ALANI */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Genel Bakış
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hoşgeldiniz, günlük iş özetiniz aşağıdadır.
          </Typography>
        </div>
        <Button variant="contained" startIcon={<PendingActions />}>
          Yeni Talep Oluştur
        </Button>
      </Box>

      {/* İSTATİSTİK KARTLARI */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Bekleyen Görevler" 
            value="12" 
            icon={<Assignment />} 
            color="#f59e0b" // Amber
            subText="3 tanesi acil durumda"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Aktif Ruhsat Süreçleri" 
            value="45" 
            icon={<Map />} 
            color="#3b82f6" // Blue
            subText="Bu ay 8 yeni başvuru"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Kayıtlı Kurum/Kişi" 
            value="1,204" 
            icon={<People />} 
            color="#10b981" // Green
            subText="Rehber veritabanı"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Tamamlanan İşler" 
            value="89%" 
            icon={<PendingActions />} 
            color="#6366f1" // Indigo
            subText="Geçen aya göre +%5 artış"
          />
        </Grid>
      </Grid>

      {/* ALT BİLGİ ALANI (İleride Tablo Gelecek) */}
      <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider' }}>
        <Typography variant="h6" color="text.secondary">
          Son Hareketler Tablosu Buraya Gelecek
        </Typography>
        <Button endIcon={<ArrowForward />} sx={{ mt: 2 }}>
          Tüm Raporları Gör
        </Button>
      </Paper>
    </Box>
  );
}