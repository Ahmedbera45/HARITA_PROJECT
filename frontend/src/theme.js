import { createTheme } from '@mui/material/styles';

// Logodan ilham alınan Kurumsal Renk Paleti
const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a8a', // ANA RENK: Logodaki koyu mavi/lacivert (Burayı logonun ana rengiyle değiştirebilirsin)
      light: '#60a5fa',
      dark: '#172554',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b', // İKİNCİL RENK: Altın sarısı / Turuncu (Vurgular ve butonlar için)
      contrastText: '#000000',
    },
    background: {
      default: '#f8fafc', // Arka plan: Saf beyaz değil, çok çok açık gri-mavi (Gözü dinlendirir)
      paper: '#ffffff',   // Kartlar ve Formlar: Saf beyaz
    },
    text: {
      primary: '#1e293b', // Yazılar: Simsiyah değil, laciverte çalan koyu gri (Okunabilirlik artar)
      secondary: '#64748b',
    },
    error: {
      main: '#ef4444', // Hata mesajları için standart kırmızı
    },
    success: {
      main: '#10b981', // Başarı mesajları için yeşil
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif', // Modern font ailesi
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600, letterSpacing: '-0.5px' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: {
      textTransform: 'none', // Buton yazıları "BAĞIRMASIN" (Sadece baş harf büyük)
      fontWeight: 600,
    }
  },
  shape: {
    borderRadius: 10, // Modern, hafif yuvarlatılmış köşeler
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          padding: '10px 24px',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', // Hover efekti
            transform: 'translateY(-1px)' // Hafif yukarı kalkma hissi
          },
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #1e3a8a 30%, #2563eb 90%)', // Butonlara hafif degrade
        }
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff', // Input içleri beyaz olsun
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Yumuşak gölge
        }
      }
    }
  }
});

export default theme;