// src/layouts/MainLayout.jsx
import { useState, useMemo, useEffect } from 'react';
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
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Map as MapIcon,
  BeachAccess as LeaveIcon,
  FileUpload as ImportIcon,
  Calculate as CalculateIcon,
  AdminPanelSettings as AdminIcon,
  Logout,
  Settings,
  MergeType as TevhidIcon,
  DynamicFeed as DynamicPageIcon,
  TableChart as TableIcon,
  SettingsApplications as ManageIcon,
  Lock as LockIcon,
  AccountBalance as ImarIcon,
} from '@mui/icons-material';
import { logout } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import dynamicPageService from '../services/dynamicPageService';
import logo from '../assets/logo.png';

const DRAWER_WIDTH = 260;

// Sabit menü öğeleri
// roles: boş = herkes | dolu = sadece bu roller
// module: varsa Staff için canView kontrolü yapılır
const STATIC_MENU_ITEMS = [
  { text: 'Ana Sayfa',       icon: <DashboardIcon />,  path: '/dashboard',       roles: [] },
  { text: 'Kurum Rehberi',   icon: <PeopleIcon />,     path: '/directory',       roles: [],                    module: 'rehber' },
  { text: 'Görev Takip',     icon: <AssignmentIcon />, path: '/tasks',           roles: [],                    module: 'gorev' },
  { text: 'İzin Yönetimi',   icon: <LeaveIcon />,      path: '/leaves',          roles: [],                    module: 'izin' },
  { text: 'Veri Yükle',      icon: <ImportIcon />,     path: '/import',          roles: [],                    module: 'veriYukleme' },
  { text: 'Harç Hesaplama',  icon: <CalculateIcon />,  path: '/fee-calculation', roles: [],                    module: 'harc' },
  { text: 'Tevhid Harcı',    icon: <TevhidIcon />,     path: '/tevhid',          roles: [],                    module: 'tevhid' },
  { text: 'İmar Planları',   icon: <ImarIcon />,        path: '/imar-planlari',   roles: [],                    module: 'imarPlanlari' },
  { text: 'Harita / CBS',    icon: <MapIcon />,         path: '/map',             roles: [] },
  // Yönetici menüleri
  { text: 'Sayfa Yönetimi',  icon: <ManageIcon />,     path: '/pages',           roles: ['Admin', 'Manager'] },
  { text: 'Kullanıcı Yön.', icon: <AdminIcon />,       path: '/users',           roles: ['Admin', 'Manager'] },
  { text: 'Yetki Grupları',  icon: <LockIcon />,        path: '/permissions',     roles: ['Admin'] },
];

function parseJwtUser() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { name: '', department: '' };
    const payload = JSON.parse(atob(token.split('.')[1]));
    const fullName = payload['FullName'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '';
    const department = payload['Department'] || '';
    return { name: fullName, department };
  } catch {
    return { name: '', department: '' };
  }
}

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { role, canView, isStaff } = useAuth();

  const currentUser = useMemo(() => parseJwtUser(), []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dynamicPages, setDynamicPages] = useState([]);

  // Dinamik sayfaları yükle — herkes görsün
  useEffect(() => {
    dynamicPageService.getAllPages()
      .then(setDynamicPages)
      .catch(() => {}); // sessizce hata yut
  }, [location.pathname]); // sayfa değiştiğinde yenile (yeni sayfa eklenince görünsün)

  // Sabit menü öğelerini role ve izinlere göre filtrele
  const staticItems = STATIC_MENU_ITEMS.filter(item => {
    // Rol kısıtlaması varsa kontrol et
    if (item.roles.length > 0 && !item.roles.includes(role)) return false;
    // Staff için modül bazlı canView kontrolü
    if (isStaff && item.module) return canView(item.module);
    return true;
  });

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => { logout(); navigate('/login'); };

  const renderMenuItem = (item) => {
    const isActive = location.pathname === item.path;
    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          onClick={() => navigate(item.path)}
          sx={{
            borderRadius: 2,
            bgcolor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            py: 0.8,
          }}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>{item.icon}</ListItemIcon>
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 400 }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'primary.main', color: 'white' }}>
      {/* Logo */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <img src={logo} alt="Logo" style={{ height: '40px', filter: 'brightness(0) invert(1)' }} />
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ px: 2, mt: 1, flexGrow: 1, overflowY: 'auto' }}>
        {/* Sabit menü öğeleri */}
        {staticItems.map(renderMenuItem)}

        {/* Dinamik sayfalar — herkes görür */}
        {dynamicPages.length > 0 && (
          <>
            <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 1 }} />
            {dynamicPages.map(page =>
              renderMenuItem({
                text: page.title,
                icon: <TableIcon />,
                path: `/pages/${page.id}`,
              })
            )}
          </>
        )}
      </List>

      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.1)' }}>
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', opacity: 0.6 }}>
          © 2026 Çayırova Bel.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" fontWeight="bold">{currentUser.name || 'Kullanıcı'}</Typography>
              <Typography variant="caption" color="text.secondary">{currentUser.department}</Typography>
            </Box>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5, border: '1px solid', borderColor: 'divider' }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                {(currentUser.name || 'K')[0]}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon> Ayarlar
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon> Çıkış Yap
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none' } }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* İçerik */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
