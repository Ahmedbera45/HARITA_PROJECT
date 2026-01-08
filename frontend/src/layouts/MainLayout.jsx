// src/layouts/MainLayout.jsx
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Dashboard as DashboardIcon, 
  People as PeopleIcon, 
  Assignment as AssignmentIcon, 
  Map as MapIcon,
  Logout,
  Settings,
  ChevronLeft
} from '@mui/icons-material';
import { logout } from '../services/authService';
import logo from '../assets/logo.png'; // Logoyu burada da kullanıyoruz

const DRAWER_WIDTH = 260;

// MENÜ ELEMANLARI
const MENU_ITEMS = [
  { text: 'Ana Sayfa', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Kurum Rehberi', icon: <PeopleIcon />, path: '/directory' }, // İleride yapılacak
  { text: 'Görev Takip', icon: <AssignmentIcon />, path: '/tasks' },   // İleride yapılacak
  { text: 'Harita / CBS', icon: <MapIcon />, path: '/map' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null); // Profil menüsü için

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Yan Menü İçeriği
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'primary.main', color: 'white' }}>
      {/* Sidebar Logo Alanı */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <img src={logo} alt="Logo" style={{ height: '40px', filter: 'brightness(0) invert(1)' }} />
        <Box>

        </Box>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

      {/* Menü Linkleri */}
      <List sx={{ px: 2, mt: 2, flexGrow: 1 }}>
        {MENU_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                onClick={() => navigate(item.path)}
                sx={{ 
                  borderRadius: 2, 
                  bgcolor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: isActive ? 600 : 400 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Alt Kullanıcı Bilgisi (Sidebar Footer) */}
      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.1)' }}>
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', opacity: 0.6 }}>
          © 2026 Çayırova Bel.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* 1. Navbar (Üst Bar) */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, 
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} /> {/* Boşluk bırakarak sağa yasla */}

          {/* Profil ve Çıkış */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" fontWeight="bold">Ahmet Bera Çakmak</Typography>
              <Typography variant="caption" color="text.secondary">İmar ve Şehircilik Md.</Typography>
            </Box>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5, border: '1px solid', borderColor: 'divider' }}>
               <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>A</Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleMenuClose}><ListItemIcon><Settings fontSize="small" /></ListItemIcon> Ayarlar</MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon> Çıkış Yap
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 2. Sidebar (Yan Menü) */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobil Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
        {/* Masaüstü Sabit Sidebar */}
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none' } }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* 3. Ana İçerik Alanı (Outlet) */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Toolbar /> {/* Navbar'ın altında kalmasın diye boşluk */}
        <Outlet /> {/* Değişen sayfalar (Dashboard, Rehber vs.) buraya gelir */}
      </Box>
    </Box>
  );
}