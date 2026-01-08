// src/pages/Register.jsx
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
  MenuItem,
  Slide
} from '@mui/material';
import { 
  Email, 
  Lock, 
  Badge, 
  Person, 
  Business 
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { register } from '../services/authService'; 
import { useNavigate } from 'react-router-dom';

// Görseller (Login ile uyum olsun diye aynısını kullandık, istersen değiştirebilirsin)
import logo from '../assets/logo.png'; 
import arkaPlanResmi from '../assets/arka_plan.jpg'; 

// Belediye Birimleri Listesi (Select İçin)
const DEPARTMENTS = [
  { value: 'İmar ve Şehircilik Md.', label: 'İmar ve Şehircilik Md.' },
  { value: 'Fen İşleri Md.', label: 'Fen İşleri Md.' },
  { value: 'Harita Planlama Servisi', label: 'Harita Planlama Servisi' },
  { value: 'Emlak ve İstimlak Md.', label: 'Emlak ve İstimlak Md.' },
];

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Backend'deki RegisterDto ile birebir uyumlu alanlar
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    department: '' 
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Form doğrulama (Basit kontrol)
      if (!formData.department) {
        toast.warning("Lütfen birim seçimi yapınız.");
        setLoading(false);
        return;
      }

      const data = await register(formData);
      
      if (data) {
        toast.success("Kayıt Başarılı! Giriş ekranına yönlendiriliyorsunuz...");
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      console.error(error);
      toast.error("Kayıt olunamadı. E-Posta kullanılıyor olabilir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* 1. FORM ALANI (SOLDA) */}
      <Grid 
        item 
        xs={12} 
        sm={8} 
        md={5} 
        component={Paper} 
        elevation={6} 
        square 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
          zIndex: 2,
          overflowY: 'auto' // Mobilde form taşarsa scroll olsun
        }}
      >
        <Slide direction="right" in={true} timeout={800}>
          <Box sx={{ my: 4, mx: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '450px', width: '100%' }}>
            
            <img src={logo} alt="Logo" style={{ height: '60px', marginBottom: '20px' }} />
            
            <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
              Personel Kayıt
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sisteme erişmek için kayıt oluşturun
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              
              {/* Ad ve Soyad Yan Yana */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required fullWidth id="name" label="Ad" name="name"
                    value={formData.name} onChange={handleChange}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><Person color="action" /></InputAdornment>) }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required fullWidth id="surname" label="Soyad" name="surname"
                    value={formData.surname} onChange={handleChange}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><Person color="action" /></InputAdornment>) }}
                  />
                </Grid>
              </Grid>

              {/* Birim Seçimi */}
              <TextField
                select
                margin="normal"
                required
                fullWidth
                id="department"
                label="Görev Yeri / Müdürlük"
                name="department"
                value={formData.department}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (<InputAdornment position="start"><Business color="action" /></InputAdornment>),
                }}
              >
                {DEPARTMENTS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="normal"
                required fullWidth id="email" label="E-Posta Adresi" name="email" autoComplete="email"
                value={formData.email} onChange={handleChange}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Email color="action" /></InputAdornment>) }}
              />

              <TextField
                margin="normal"
                required fullWidth name="password" label="Şifre Oluştur" type="password" id="password"
                value={formData.password} onChange={handleChange}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Lock color="action" /></InputAdornment>) }}
              />
              
              <Button
                type="submit" fullWidth variant="contained" size="large" disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem', borderRadius: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Kayıt Ol'}
              </Button>
              
              <Grid container justifyContent="center">
                <Button variant="text" onClick={() => navigate('/login')} sx={{ textTransform: 'none' }}>
                  Zaten hesabınız var mı? <b>Giriş Yapın</b>
                </Button>
              </Grid>
            </Box>
          </Box>
        </Slide>
      </Grid>

      {/* 2. GÖRSEL ALANI (SAĞDA) */}
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          backgroundImage: `url(${arkaPlanResmi})`,
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) => t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: { xs: 'none', sm: 'block' }
        }}
      >
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(30, 58, 138, 0.4)' }} />
      </Grid>
    </Grid>
  );
}