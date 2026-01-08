// src/pages/Login.jsx
import { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Grid, 
  InputAdornment, 
  CircularProgress,
  Slide,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Email, Lock } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { login } from '../services/authService'; 
import { useNavigate } from 'react-router-dom';

// Görseller
import logo from '../assets/logo.png'; 
import arkaPlanResmi from '../assets/arka_plan.jpg'; 

export default function Login() {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(formData); 
      if (data) { 
        toast.success(`Hoşgeldiniz!`);
        setTimeout(() => navigate('/dashboard'), 500); 
      }
    } catch (error) {
      console.error(error);
      toast.error('Giriş başarısız. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* 1. FORM ALANI (SOL TARAFTA) */}
      <Grid 
        component={Paper} 
        elevation={6} 
        square 
        size={{ xs: 12, sm: 8, md: 5 }} // YENİ SİSTEM: Boyutlar burada
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
          zIndex: 2 
        }}
      >
        <Slide direction="right" in={true} timeout={800}>
          <Box sx={{ my: 8, mx: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '450px', width: '100%' }}>
            
            {/* LOGO */}
            <img 
              src={logo} 
              alt="Logo" 
              style={{ 
                height: '80px', 
                marginBottom: '30px',
                filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' 
              }} 
            />
            
            <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
              PERSONEL GİRİŞİ
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              Yönetim Paneline Erişmek İçin Giriş Yapın
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="E-Posta"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><Email color="action" /></InputAdornment>),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Şifre"
                type="password"
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><Lock color="action" /></InputAdornment>),
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 4, mb: 2, py: 1.5, fontSize: '1rem', borderRadius: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Giriş Yap'}
              </Button>
              
              <Grid container justifyContent="center" sx={{ mt: 2 }}>
                  <Button variant="text" onClick={() => navigate('/register')} sx={{ textTransform: 'none' }}>
                    Hesabınız yok mu? <b>Kayıt Olun</b>
                  </Button>
              </Grid>
            </Box>
          </Box>
        </Slide>
      </Grid>

      {/* 2. HARİTA / GÖRSEL ALANI (SAĞ TARAFTA) */}
      <Grid
        size={{ sm: 4, md: 7 }} // YENİ SİSTEM: Mobilde (xs) boyut vermedik çünkü aşağıda gizleyeceğiz
        sx={{
          backgroundImage: `url(${arkaPlanResmi})`,
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) => t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: { xs: 'none', sm: 'block' } // YENİ SİSTEM: Mobilde (xs) gizle, sm ve üstünde göster
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(30, 58, 138, 0.3)', 
        }} />
      </Grid>

    </Grid>
  );
}